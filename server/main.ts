/**
 * Tek süreç, tek port:
 *  - Geliştirmede Vite'ı ara katman olarak çalıştırır (anında yenileme).
 *  - Yayında dist/ klasörünü sunar.
 *  - /live WebSocket'i ile olayları oyun ekranına ve panele dağıtır.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize as normPath } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ClientMessage, ConnectionStatus, LiveEvent, ServerMessage } from '../shared/events.ts';
import { Dedupe } from './dedupe.ts';
import { TikTokSource } from './sources/tiktok.ts';
import { crowd, simulate } from './sources/simulator.ts';

const PORT = Number(process.env.PORT ?? 4300);
const HOST = '127.0.0.1';
const isProd = process.env.NODE_ENV === 'production';
const root = process.cwd();

// ---- Durum ve yayın ------------------------------------------------------
const clients = new Set<WebSocket>();
const dedupe = new Dedupe();
let status: ConnectionStatus = { source: 'none', state: 'idle', username: '', message: 'Bağlı değil' };

function broadcast(msg: ServerMessage) {
  const data = JSON.stringify(msg);
  for (const ws of clients) if (ws.readyState === ws.OPEN) ws.send(data);
}

function publishEvent(event: LiveEvent) {
  if (!dedupe.accept(event.id)) return;
  broadcast({ kind: 'event', event });
}

function setStatus(next: ConnectionStatus) {
  status = next;
  console.log(`[durum] ${next.source}/${next.state}: ${next.message}`);
  broadcast({ kind: 'status', status });
}

const tiktok = new TikTokSource({ onEvent: publishEvent, onStatus: setStatus });
let stopCrowd: (() => void) | null = null;

function handle(msg: ClientMessage) {
  switch (msg.kind) {
    case 'connect':
      if (msg.username.trim()) void tiktok.start(msg.username);
      break;
    case 'disconnect':
      void tiktok.stop();
      break;
    case 'simulate':
      if (msg.event.type === 'crowd') {
        stopCrowd?.();
        stopCrowd = crowd(Math.min(msg.event.seconds, 120), publishEvent);
      } else {
        publishEvent(simulate(msg.event));
      }
      break;
    case 'control':
      broadcast({ kind: 'control', command: msg.command });
      break;
  }
}

// ---- HTTP ---------------------------------------------------------------
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2',
};

const server = createServer();

if (isProd) {
  const dist = join(root, 'dist');
  server.on('request', async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    let path = url.pathname === '/' ? '/index.html' : url.pathname;
    if (path === '/panel') path = '/panel.html';
    const file = normPath(join(dist, path));
    if (!file.startsWith(dist)) return void res.writeHead(403).end();
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end('Bulunamadı');
    }
  });
} else {
  const { createServer: createVite } = await import('vite');
  const vite = await createVite({
    configFile: join(root, 'vite.config.ts'),
    server: { middlewareMode: true, hmr: { server } },
    appType: 'mpa',
  });
  server.on('request', (req, res) => {
    if (req.url === '/panel') req.url = '/panel.html';
    vite.middlewares(req, res);
  });
}

// ---- WebSocket ------------------------------------------------------------
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  if (req.url !== '/live') return; // Vite HMR kendi upgrade'ini işler
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
});

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ kind: 'status', status } satisfies ServerMessage));
  ws.on('message', (data) => {
    try {
      handle(JSON.parse(String(data)) as ClientMessage);
    } catch (err) {
      console.warn('[ws] geçersiz mesaj', err);
    }
  });
  ws.on('close', () => clients.delete(ws));
});

server.listen(PORT, HOST, () => {
  console.log(`\n  Oyun ekranı : http://${HOST}:${PORT}/`);
  console.log(`  Kontrol     : http://${HOST}:${PORT}/panel`);
  console.log(`  Kılavuzlu   : http://${HOST}:${PORT}/?guides=1\n`);
});
