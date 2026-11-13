/** Yayıncı kontrol paneli: TikTok'a bağlan, test olayı gönder, oyunu yönet. */
import type { ControlCommand, LiveEvent, SimulateRequest } from '../../shared/events.ts';
import { KNOWN_GIFTS } from '../../shared/gifts.ts';
import { LiveClient } from './net/live.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const live = new LiveClient();

const simName = () => $<HTMLInputElement>('simName').value.trim() || undefined;
const simulate = (event: SimulateRequest) => live.send({ kind: 'simulate', event });

$('connect').addEventListener('submit', (e) => {
  e.preventDefault();
  live.send({ kind: 'connect', username: $<HTMLInputElement>('username').value });
});
$('disconnect').addEventListener('click', () => live.send({ kind: 'disconnect' }));

$('simComment').addEventListener('click', () =>
  simulate({ type: 'comment', text: $<HTMLInputElement>('simText').value || 'selam', name: simName() }),
);

for (const g of KNOWN_GIFTS) {
  const b = document.createElement('button');
  b.className = 'ghost';
  b.textContent = `${g.name} (${g.diamonds})`;
  b.onclick = () => simulate({ type: 'gift', giftId: g.id, name: simName() });
  $('giftButtons').append(b);
}

document.querySelectorAll<HTMLButtonElement>('[data-sim]').forEach((b) => {
  b.onclick = () => simulate({ ...JSON.parse(b.dataset.sim!), name: simName() });
});
document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach((b) => {
  b.onclick = () => live.send({ kind: 'control', command: b.dataset.control as ControlCommand });
});

function describe(e: LiveEvent): string {
  switch (e.type) {
    case 'comment': return `💬 ${e.viewer.name}: ${e.text}`;
    case 'like': return `❤ ${e.viewer.name} ×${e.count}`;
    case 'gift': return `🎁 ${e.viewer.name}: ${e.giftName} ×${e.count} (${e.value})`;
    default: return `• ${e.viewer.name} ${e.type}`;
  }
}

live.on((msg) => {
  if (msg.kind === 'status') {
    const pill = $('status');
    pill.textContent = `${msg.status.source} · ${msg.status.state}`;
    pill.dataset.state = msg.status.state;
    $('message').textContent = msg.status.message;
  } else if (msg.kind === 'event') {
    const li = document.createElement('li');
    li.textContent = describe(msg.event);
    const log = $('log');
    log.prepend(li);
    while (log.children.length > 80) log.lastElementChild?.remove();
  }
});
