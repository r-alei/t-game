/**
 * Yayın penceresi (Electron). LIVE Studio'da "Pencere yakalama" ile alınır.
 *  - Çerçevesiz: başlık çubuğu / kenarlık yakalamaya girmez.
 *  - İçerik alanı tam 9:16.
 *  - Üstü başka pencereyle kapansa da animasyon yavaşlamaz.
 *  - Sunucu henüz açılmadıysa hazır olana kadar tekrar dener.
 * Pencereyi sürükleyerek taşıyabilirsin; Esc kapatır.
 */
const { app, BrowserWindow, screen, session } = require('electron');

const URL = process.env.OYUN_URL || 'http://127.0.0.1:4300/';
const DAYI_URL = process.env.DAYI_URL;
const TITLE = 'Canlı Oyun · Yayın Ekranı';

// Arka planda / üstü kapalıyken Chromium'un kare hızını düşürmesini engelle
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

app.whenReady().then(() => {
  const localOrigin = (origin) => {
    try {
      const url = new globalThis.URL(origin);
      return ['http:', 'https:'].includes(url.protocol) && ['127.0.0.1', 'localhost'].includes(url.hostname);
    } catch { return false; }
  };
  // Sadece yerel oyun kökeninin ses girişi isteği kabul edilir.
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    callback(permission === 'media' && localOrigin(details.requestingUrl)
      && details.mediaTypes?.includes('audio') && !details.mediaTypes?.includes('video'));
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission, origin, details) =>
    permission === 'media' && localOrigin(origin) && details.mediaType === 'audio');
  // Ekrana sığan en büyük 9:16 boyut (1080p ekranda 576×1024)
  const work = screen.getPrimaryDisplay().workAreaSize;
  const height = Math.min(1920, work.height - (work.height % 16));
  const width = (height / 16) * 9;

  const win = new BrowserWindow({
    width,
    height,
    useContentSize: true,
    x: 0,
    y: 0,
    frame: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    title: TITLE,
    backgroundColor: '#000000',
    show: false,
    webPreferences: { backgroundThrottling: false },
  });

  // Pencere adı sabit kalsın: LIVE Studio'daki seçim kaybolmasın
  win.on('page-title-updated', (e) => e.preventDefault());

  const load = () => win.loadURL(URL).catch(() => {});
  win.webContents.on('did-fail-load', () => setTimeout(load, 1500));
  win.once('ready-to-show', () => win.show());
  load();

  if (DAYI_URL) {
    const scale = Math.min(1, work.width / 1280, work.height / 720);
    const dayi = new BrowserWindow({
      width: Math.floor(1280 * scale), height: Math.floor(720 * scale),
      useContentSize: true, frame: false, resizable: true,
      fullscreenable: false, title: 'Canlı Oyun · Dayı Ekranı',
      backgroundColor: '#422f49', show: false,
      webPreferences: { backgroundThrottling: false },
    });
    dayi.on('page-title-updated', (event) => event.preventDefault());
    const loadDayi = () => dayi.loadURL(DAYI_URL).catch(() => {});
    dayi.webContents.on('did-fail-load', () => setTimeout(() => { if (!dayi.isDestroyed()) loadDayi(); }, 1500));
    dayi.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') dayi.close();
    });
    dayi.once('ready-to-show', () => dayi.show());
    loadDayi();
  }
});

app.on('window-all-closed', () => app.quit());
