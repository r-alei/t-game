/**
 * Yayın penceresi (Electron). LIVE Studio'da "Pencere yakalama" ile alınır.
 *  - Çerçevesiz: başlık çubuğu / kenarlık yakalamaya girmez.
 *  - İçerik alanı tam 9:16.
 *  - Üstü başka pencereyle kapansa da animasyon yavaşlamaz.
 *  - Sunucu henüz açılmadıysa hazır olana kadar tekrar dener.
 * Pencereyi sürükleyerek taşıyabilirsin; Esc kapatır.
 */
const { app, BrowserWindow, screen } = require('electron');

const URL = process.env.OYUN_URL || 'http://127.0.0.1:4300/';
const TITLE = 'Canlı Oyun · Yayın Ekranı';

// Arka planda / üstü kapalıyken Chromium'un kare hızını düşürmesini engelle
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

app.whenReady().then(() => {
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
});

app.on('window-all-closed', () => app.quit());
