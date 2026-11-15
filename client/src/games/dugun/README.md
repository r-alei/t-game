# Düğün Var!

Bu klasördeki `BASLAT.cmd` ile açılır. Geliştirme adresi: `http://127.0.0.1:4300/?game=dugun`.

## Başlangıç ve katılım

- Sahne boş başlar. Yapay misafir, gelin, damat, kaynana veya çalgıcı üretilmez.
- Yorum yazan veya hediye gönderen gerçek izleyici sahneye katılır. Aynı kişi ikinci kez karakter oluşturmaz.
- Halayda katılımcı sınırı ve kapasite nedeniyle izleyici çıkarma yoktur. Halka kişi sayısıyla genişler; gerçek performans bilgisayarın gücüne bağlıdır.
- Yorumlar karakterin üzerinde balon olur; aynı anda en fazla üç balon gösterilir.
- Takip ve paylaşım, sahnedeki izleyiciyi zıplatır.

## Hediye menüsü

Görseller `client/public/gifts/` içindedir. Görsel, adet, etiket ve rol eşlemesi `config.ts` içindeki `MENU` listesinden okunur.

| Hediye | Adet | Etki |
|---|---:|---|
| Gül | 1 | Halaybaşı olur, kırmızı mendili alır |
| Gül | 10 | Gelin olur |
| Gül | 20 | Damat olur |
| Parmak Kalp | 1 | Kaynana olur |
| Konfeti | 1 | Damat varsa havaya attırır |

Gül adetleri **aynı hediye serisinin toplamıdır**. Örneğin seri 1 → 10 → 20 ilerlerse aynı izleyici halaybaşı → gelin → damat olur. 11. veya 21. gül rolü tekrar değiştirmez. Bir güncellemeyle birden fazla eşik aşılırsa en yüksek eşik uygulanır. Yeni seri 1 gülden başlar; farklı seriler birikmez. Panelde Gül ×10 ve Gül ×20 düğmeleri eşikleri doğrudan denetir.

Bir izleyici aynı anda tek özel rol taşır. Yeni kişi rolü aldığında önceki sahibi halaya döner. Rol değiştirilince eski rol boş kalır; yerine yapay karakter konmaz. Menü dışındaki hediyeler göndereni sahneye katar, özel rol veya rastgele etki vermez.

## Kaynana

Kaynana yalnız Parmak Kalp gönderen gerçek izleyiciyle oluşur. Halkanın dışında dolaşır; 70–110 saniyede bir sahneye yürür ve halayı dört saniye durdurur. Ekranda replik gösterilir. Başka biri Parmak Kalp gönderirse kaynana rolünü devralır; eski kaynana halaya döner. Kaynana başka rol alınca bu davranış durur. Çalgıcı karakter veya davul-zurna ses kaydı yoktur.

## Tempo ve düğün döngüsü

- Beğeniler tempoyu artırır. Tempo eşiği geçince halay kopar; 4,5 saniyede herkes yeniden kalkar.
- Düğün 10 dakika sürer. Son 30 saniyede geri sayım gösterilir.
- Süre bitince gelin ve damat birlikte varsa araba gelir. Finalde roller kilitlenir, 12 saniyelik törenin ardından çift halaya döner ve gelin/damat rolleri boşalır.
- Çift tamamlanmadıysa araba töreni yapılmadan yeni düğüne geçilir.
- Halaydaki izleyiciler ve varsa kaynana yeni düğünde kalır. Panelde Sıfırla tüm sahneyi yeniden boş başlatır.
- Final sırasında gönderilen rol hediyeleri sonraki düğüne birikmez; ekranda rol kapışmasının kapalı olduğu belirtilir.

## Dosyalar ve doğrulama

`DugunGame.ts`: roller, olaylar ve düğün döngüsü. `config.ts`: menü ve süreler. `dancers.ts`: figürler ve halay halkası. `world.ts`: meydan ve araba. `hud.ts`: menü, rol kartları ve duyurular.

`npm test`, `npm run typecheck`, `npm run build` ile kontrol edilir. `tests/dugun.test.ts` boş başlangıcı, bin katılımcıyı, gül serisi eşiklerini, kaynana devrini ve finalde rollerin korunmasını denetler. Hediye kimlikleri gerçek TikTok yayınında ayrıca doğrulanmalıdır.
