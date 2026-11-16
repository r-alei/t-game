# Canlı Oyun (t-game)

TikTok LIVE için three.js ile yazılmış etkileşimli yayın oyunu altyapısı.

İlk oyun: **Boğaz Vapuru** (varsayılan). Kurallar ve hediye eşlemesi: [client/src/games/vapur/README.md](client/src/games/vapur/README.md).

**Düğün Dernek** bahçe düğünü: izleyici kadrosu boş başlar, yayıncının **Düğün Dayısı** ayrı yatay pencerede mikrofon sesine tepki verir. Mikrofon izni yalnız dayı ekranında alınır. Seri sonunda Gül ×1 halaybaşı, Buket ×1 gelin (ad eşleşmesi), Parfüm (`5658`) ×1 damat; GG ×5 davulcu, GG ×10 zurnacı; Parmak Kalp ×10 kaynana yapar. Donut ×1, 12 saniyelik mendilli solo başlatır. Seri sırasında ara roller verilmez. Güncel kurallar: [client/src/games/dugun/README.md](client/src/games/dugun/README.md).

## Başka bilgisayarda kurulum ve birlikte geliştirme

Node.js 24 ile doğrulanmıştır. Git ve Node.js kurulu bilgisayarda:

```bash
git clone https://github.com/r-alei/t-game.git
cd t-game
npm ci
npm run dev
```

Düğün ekranı: `http://127.0.0.1:4300/?game=dugun`. Kontrol paneli: `http://127.0.0.1:4300/panel`. Canlı yayın bağlantısı olmadan paneldeki test düğmeleriyle oynanabilir; Parfüm düğmesi damat rolünü denetir; Buket gerçek yayında adıyla eşleşir. Windows yayın penceresi için `client/src/games/dugun/BASLAT.cmd` çalıştırılır.

Düğün yönetimi: `http://127.0.0.1:4300/panel?game=dugun`. Yayın öncesi isim yazarak gelin/damat/kaynana/halaybaşı atayabilir, başlangıç kadrosu kaydedebilir, hediyeleri ve adetlerini, süreyi, kamerayı ve efektleri yönetebilirsin. Detaylar [Düğün README](client/src/games/dugun/README.md) içinde.

Her değişiklik için `main` üzerinden ayrı dal açıp pull request ile birleştirin:

```bash
git switch main
git pull --ff-only
git switch -c ozellik/degisiklik-adi
```

Göndermeden önce `npm test`, `npm run typecheck` ve `npm run build` çalıştırın. `node_modules/` ve `dist/` yerelde üretilir. Gerektiğinde `EULER_API_KEY` proje kökündeki `.env` dosyasında tutulur; bu dosya Git'e dahil edilmez.

## Dayı ekranı

Dayı, yayıncının Nano Banana ile ürettiği yedi şeffaf 768×768 WebP kareyle çizilen chibi bir PNGtuber'dır. Kareler `client/public/dayi/` içindedir; baştan birlikte yüklenip decode edilir, kapalı ağız karesi hazır olur olmaz gösterilir. Üst üste duran görseller arasında yalnız görünürlük değişir. Kare tuvali pencere yüksekliğinin yaklaşık %92'sini kaplar (dar pencerede genişliğe sığar); karakter ortada, yumuşak gölgenin üstünde, küçük isim şeridi ayakların altındadır.

Animasyon gerçek geçen süreyle ilerler: konuşurken ses seviyesine göre iki ağız karesi 9–12 geçiş/sn hedefiyle oynar, her kare en az 70 ms tutulur; ses kesilince 120 ms sonra ağız kapanır. Konuşmaya hafif zıplama, esneme ve eğilme eşlik eder. Sessizlikte yavaş nefes ve 3–6 saniyede bir 130 ms göz kırpma vardır. `shock` şaşkınlığı 1,8 sn, `cheer` mendilli coşkuyu 2,4 sn, `clap` alkışı 2 sn gösterir; konuşma jestin hareketini artırır, yeni jest eskisini keser. Görsel kaynağı: [KAYNAK.md](client/public/dayi/KAYNAK.md).

Düğün başlatıcısı oyunla birlikte 1280×720, boyutu değiştirilebilir **Canlı Oyun · Dayı Ekranı** penceresini açar. Adres: `http://127.0.0.1:4300/dayi`. LIVE Studio'da **Pencere yakalama** ile **Canlı Oyun · Dayı Ekranı** penceresini ekle ve oyunun üstüne bant olarak yerleştir. `?bg=green` ile krom anahtar (#00b140), `?bg=black` ile siyah fon; `?ad=Mehmet` ile isim değişir. Parametreler birleşebilir: `/dayi?bg=green&ad=Mehmet`. Varsayılan sıcak düğün fonudur; pencere opaktır. Sürükleyerek taşı, Esc ile kapat. Diğer oyunlarda dayı penceresi açılmaz.

Mikrofon varsayılan açıktır; izin ilk açılışta dayı ekranında istenir. Panelde aç/kapa ve eşik ayarlanır, ayarlar dayı ekranının localStorage'ında hatırlanır. Panel → sunucu → dayı: `dayi-command`; dayı → sunucu → panel: `dayi-state` (enabled, threshold, level, status). Oyun → sunucu → dayı: `dayi-cue` (shock/cheer/clap). Mesajlar `/live` üzerinden doğrulanarak yayınlanır; ham ses gönderilmez. Oyun sıfırlanınca dayı ve mikrofon çalışmaya devam eder.

## Yayında kullanım

1. `BASLAT.cmd` dosyasına çift tıkla ve listeden oyunu seç (ya da doğrudan oyunun klasöründeki `BASLAT.cmd`'ye tıkla, ör. `client/src/games/vapur/BASLAT.cmd`). Şunları açar:
   - "SUNUCU" penceresi: yayın boyunca açık kalmalı.
   - Çerçevesiz dikey oyun penceresi (1080p ekranda 576×1024, tam 9:16). Sürükleyerek taşınır, **Esc** kapatır.
   - Tarayıcıda kontrol paneli.
2. LIVE Studio → Kaynak ekle → **Pencere yakalama** → "Canlı Oyun · Yayın Ekranı" penceresini seç ve dikey tuvale tam ekran yay.
   - LIVE Studio'nun "Bağlantı/Link" kaynağı yerel (127.0.0.1) adresleri kabul etmiyor; bu yüzden pencere yakalama kullanılıyor.
   - Pencere siyah görünürse önce Oyun yakalama'yı dene, olmazsa yakalama yöntemini değiştir.
3. TikTok yayınını başlat, panelde kullanıcı adını yaz ve **Bağlan**'a bas.

Oyun penceresinin üstüne başka pencere gelmesi sorun değil, ama pencereyi **küçültme**: küçültülen pencere yakalanmaz.

Bitirince: oyun penceresinde Esc'ye bas, "SUNUCU" penceresini kapat.

Oyun sesleri varsayılan olarak **kapalı**; panelde "Ses aç" ile açılır.

### Performans

- Oyun yalnız pencerenin gösterdiği çözünürlükte çizer. Düğün varsayılan 60 FPS, diğer oyunlar 30 FPS hedefler; `fps` adres parametresiyle değiştirilebilir.
- Ölçüm (13 Kasım 2026, bu bilgisayar): oyun penceresi GPU'nun ~%94'ünü kullanıyordu, düzeltmeden sonra ~%22.
- Daha da azaltmak için `desktop/main.cjs` içindeki adrese `?fps=24` eklenebilir. Daha akıcı görüntü için `?fps=60` (GPU yükü yaklaşık iki katına çıkar).

## Geliştirme

```bash
npm install
npm run dev
```

| Adres | Ne işe yarar |
|---|---|
| http://127.0.0.1:4300/ | Yayın ekranı (LIVE Studio'ya bu eklenir) |
| http://127.0.0.1:4300/?guides=1 | TikTok'un kapattığı alanları gösterir |
| http://127.0.0.1:4300/panel | Bağlan, test olayı gönder, sıfırla |

LIVE Studio: kaynak olarak tarayıcı/pencere ekle, 1080×1920 (dikey). Ekran her pencere boyutuna oranlı sığar.

Diğer komutlar: `npm test` (birim testleri), `npm run typecheck`, `npm start` (derleyip üretim modunda çalıştırır).

## Klasör yapısı

```
shared/            Sunucu ve ekranın ortak tipleri (LiveEvent, hediye kademeleri)
server/
  main.ts          HTTP + WebSocket; geliştirmede Vite'ı içinde çalıştırır
  normalize.ts     TikTok ham verisi → LiveEvent (saf, testli)
  dedupe.ts        Aynı olayın iki kez işlenmesini engeller
  sources/
    tiktok.ts      tiktok-live-connector bağlantısı, yeniden deneme
    simulator.ts   Yayın açmadan sahte izleyici olayları
client/
  index.html       Yayın ekranı
  panel.html       Kontrol paneli
  src/
    engine/        Oyundan bağımsız parçalar: sahne, döngü, kamera, isim etiketi, duyuru, konfeti, güvenli alan
    net/live.ts    WebSocket istemcisi
    games/
      Game.ts      Her oyunun uyduğu arayüz
      registry.ts  Oyun listesi (?game=ad ile seçilir)
      vapur/       Boğaz Vapuru (kendi README.md ve BASLAT.cmd'si içinde)
      dugun/       Düğün Dernek (?game=dugun)
      demo/        Altyapı testi için örnek oyun (?game=demo)
tests/             Vitest testleri
docs/              Oyunlardan bağımsız fikir belgeleri (tek oyuna ait belge oyunun klasörüne gider)
```

## Kurallar

- Oyun kodu TikTok kütüphanesini hiç görmez, yalnız `LiveEvent` alır. Kütüphane değişirse yalnız `server/normalize.ts` ve `server/sources/tiktok.ts` değişir.
- Oyun mantığı tek yerde, ekranda (`client/src/games/<oyun>/`) çalışır. Sunucu yalnız olay taşır.
- **Her oyun kendi klasöründe:** `client/src/games/<ad>/`. O oyuna ait her şey oradadır:
  - kod (`<Ad>Game.ts`, `config.ts`, …)
  - `README.md`: kurallar, hediye menüsü, bilinen eksikler
  - `BASLAT.cmd`: yalnız bu oyunu açar (içeriği: `call "%~dp0..\..\..\..\BASLAT.cmd" <ad>`)
  - oyuna özel görsel ve sesler `assets/` altında, koddan `import` ile kullanılır
- Oyunlar arası ortak olanlar klasör dışında kalır: `engine/` (sahne, kamera, yazı), `shared/` (olaylar, hediye kademeleri), `client/public/gifts/` (TikTok hediye simgeleri).
- Bir oyun başka bir oyunun klasöründen dosya almaz. İki oyun aynı şeye ihtiyaç duyarsa o parça `engine/`'e taşınır.
- Yeni oyun: `games/<ad>/` klasörü + `Game` arayüzü + `registry.ts`'e bir satır + `README.md` ve `BASLAT.cmd`. Kökteki `BASLAT.cmd` klasörleri kendisi listeler.
- Önemli her şey `layout.ts` içindeki `SAFE` alanına konur.
- Kullanıcı adları ekrana yalnız `textContent` veya canvas ile yazılır, asla `innerHTML` ile yazılmaz.
- Sürüm kopyası klasörü (`dist/v2.3.0` gibi) açılmaz; geçmiş git'te tutulur.

## TikTok bağlantısı

Panelde kullanıcı adını yazıp Bağlan'a basılır. Şifre gerekmez. İmzalama servisi sınır koyarsa sunucu `EULER_API_KEY` ortam değişkeniyle başlatılabilir. Hediye kimlikleri `shared/gifts.ts` içindedir ve gerçek odada doğrulanmalıdır.
