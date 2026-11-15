# Canlı Oyun

TikTok LIVE için three.js ile yazılmış etkileşimli yayın oyunu altyapısı.

İlk oyun: **Boğaz Vapuru** (varsayılan). Kurallar ve hediye eşlemesi: [docs/BOGAZ-VAPURU.md](docs/BOGAZ-VAPURU.md).

## Yayında kullanım

1. `BASLAT.cmd` dosyasına çift tıkla. Şunları açar:
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

- Oyun yalnız pencerenin gösterdiği çözünürlükte çizer ve 30 fps ile sınırlıdır (TikTok yayını zaten 30 fps).
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
    engine/        Oyundan bağımsız parçalar: sahne, döngü, isim etiketi, duyuru, güvenli alan
    net/live.ts    WebSocket istemcisi
    games/
      Game.ts      Her oyunun uyduğu arayüz
      registry.ts  Oyun listesi (?game=ad ile seçilir)
      vapur/       Boğaz Vapuru
      demo/        Altyapı testi için örnek oyun (?game=demo)
tests/             Vitest testleri
docs/              Fikir ve tasarım belgeleri
```

## Kurallar

- Oyun kodu TikTok kütüphanesini hiç görmez, yalnız `LiveEvent` alır. Kütüphane değişirse yalnız `server/normalize.ts` ve `server/sources/tiktok.ts` değişir.
- Oyun mantığı tek yerde, ekranda (`client/src/games/<oyun>/`) çalışır. Sunucu yalnız olay taşır.
- Yeni oyun: `games/<ad>/` klasörü + `Game` arayüzü + `registry.ts`'e bir satır.
- Önemli her şey `layout.ts` içindeki `SAFE` alanına konur.
- Kullanıcı adları ekrana yalnız `textContent` veya canvas ile yazılır, asla `innerHTML` ile yazılmaz.
- Sürüm kopyası klasörü (`dist/v2.3.0` gibi) açılmaz; geçmiş git'te tutulur.

## TikTok bağlantısı

Panelde kullanıcı adını yazıp Bağlan'a basılır. Şifre gerekmez. İmzalama servisi sınır koyarsa sunucu `EULER_API_KEY` ortam değişkeniyle başlatılabilir. Hediye kimlikleri `shared/gifts.ts` içindedir ve gerçek odada doğrulanmalıdır.
