# Düğün Var!

Açmak için bu klasördeki `BASLAT.cmd`'ye çift tıkla (ya da kökteki `BASLAT.cmd` → dugun). Geliştirmede adres: `http://127.0.0.1:4300/?game=dugun`.

Mahallede açık hava düğünü. **Yorum yazan halaya girer.** Beğeniler davulu hızlandırır; çok hızlanırsa halay zinciri kopar, herkes yere yığılır. Gelinlik, damatlık ve mendil ucuz hediyelerle elden ele geçer, bu yüzden izleyiciler bunlar için birbiriyle kapışır. Düğün 10 dakika sürer. Son 30 saniyede kim gelin ve damatsa gelin arabasına o biner.

## Neden böyle kuruldu

- **Kapışma ucuz ve sık.** Gelin ve damat 20 jetonla değişir. En pahalı hediyeyi atan kazanmaz; yeri en son kapan kazanır. Tahttan inen oyundan çıkmaz, halaya döner ve tekrar kapabilir.
- **Kaosu karakterler çıkarır, izleyiciler birbirine saldırmaz.** Halayı kaynana bozar, zinciri tempo koparır.
- **Ücretsiz yol da çalışır.** Yorum halaya sokar, beğeniler zinciri koparmaya yeter.
- **Yayıncıya replik.** "Ayşe'den bir çeyrek!", "Yeni gelin Mehmet!", "Halay koptu!"

## İzleyicinin yapabildikleri

| Etkileşim | Sonuç |
|---|---|
| Yorum | Halaya girer; yorumu başının üstünde balon olur (aynı anda en fazla 3) |
| Beğeni | Davul hızlanır. Tempo kırmızıya girerse **halay kopar**, herkes yere düşer, 4,5 sn sonra kalkar |
| Takip / paylaşım | Halaydaysa "hooop!" diye zıplar |

## Hediye menüsü (üstte tek satır)

Eşleme yalnızca `config.ts` içinde.

| Hediye | Menüdeki adı | Ne olur |
|---|---|---|
| Gül (1) | ÇEYREK | Geline/damada çeyrek altın takılır, sunucu "X'ten bir çeyrek!" diye bağırır |
| Parmak Kalp (5) | MENDİL | Halaybaşı olur: zincirin başına geçer, kırmızı mendil sallar |
| Parfüm (20) | GELİN OL | Anında gelin olur; kaynana eski gelini kolundan tutup halaya geri sürükler |
| Donut (30) | DAMAT OL | Anında damat olur (geçici; ~20 jetonluk ikinci bir hediye seçilince değişecek) |
| Konfeti (100) | HAVAYA AT | Halaycılar damadı havaya fırlatır; bazen tutamazlar |

Menüde olmayan hediyeler: 1–99 jeton → çeyrek, 100+ → havaya at.

## Düğün döngüsü

1. Düğün başında gelin ve damat isimsiz misafirlerdir.
2. Hediye atan gelin/damat olur. Ekranda "👰 Ayşe 1:12" gibi tahtta kalma süresi akar.
3. Son 30 saniye: dev geri sayım. Son saniyelerde kapışma en yoğun hâlini alır.
4. Süre bitince gelin arabası gelir; o anki gelin ve damat arabaya biner, adları plakada yazar, konfeti patlar. Alt yazıda o düğünde en uzun gelin ve damat kalanlar anılır.
5. Yeni düğün başlar.

## Kaynana

Halkanın dışında dolaşan isimsiz karakter.

- 70–110 saniyede bir müziği keser: "Yeter bu kadar oynadınız!" Davul 4 sn susar, halay durur.
- Gelin değişince eski gelini halaya sürükler.

## Ekran yerleşimi (1080×1920)

- **y ≈ 196–420:** başlık, gelin/damat kartları, tek satır menü, tempo çubuğu.
- **y ≈ 430–1240:** sahne; halka ortada, gelin-damat halkanın içinde.
- **y ≈ 1025–1240:** sunucu satırı ("X'ten bir çeyrek!"), alt yazı, "Yorum yaz, halaya katıl" çağrısı.

## Dosyalar

```
client/src/games/dugun/
  README.md      Bu belge
  BASLAT.cmd     Yalnız bu oyunu açar
  DugunGame.ts   Olay → halaycı + an + kamera; tempo, düğün döngüsü, kaynana
  config.ts      Hediye menüsü, tempo, süreler, halka ölçüleri
  dancers.ts     Figür (halaycı, gelin, damat, kaynana, çalgıcılar) ve halka dizilimi
  world.ts       Meydan, masalar, süs bayrakları, evler, çalgıcı sahnesi, gelin arabası
  hud.ts         Üst şerit, tempo çubuğu, geri sayım, sunucu satırı
```

## Henüz yok (sıradaki adımlar)

- **Kalkan:** gelin tekrar Parfüm atarsa 5 sn kaynana önüne geçsin.
- **Ayakkabı altına isim:** yorum yazanın adı gelinin ayakkabısına yazılsın; düğün sonunda silinmeyen "sıradaki evlenecek" olsun.
- **Diğer büyük anlar:** pasta suratına, gelin buketi, kaynanaları kapıştır, oyun havası (mikrofon).
- **Davul-zurna sesi** (gerçek kayıt dosyası gerekir).
- **Seri hediyeler:** sunucu seriyi bitince tek olay gönderiyor; 10 gülün 10 ayrı çeyrek olması için `server/normalize.ts` değişmeli.
