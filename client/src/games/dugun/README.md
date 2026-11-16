# Düğün Dernek

Bu klasördeki `BASLAT.cmd` ile açılır. Geliştirme adresi: `http://127.0.0.1:4300/?game=dugun`.

## Yönetim paneli

Adres: `http://127.0.0.1:4300/panel?game=dugun`. Başlatıcı bu paneli otomatik açar. Oyun ekranı açıkken panel katılımcıları, rolleri, kalan süreyi, tempoyu ve duraklatma durumunu gösterir. Ekran kapandığında kontroller kapanır; yönetim komutları kapalı bağlantıda sonradan uygulanmak üzere birikmez.

1. Oyun ekranını aç; istersen **Duraklat** ile hazırlık yap.
2. **Canlı sohbet** listesindeki mesajın **Seç** düğmesine bas, rolü seç ve **Kişiyi ekle / rolü ata** düğmesine bas. Gelin, damat, kaynana, halaybaşı, davulcu, zurnacı ve halaycı atanabilir. Kişi sahnede olmasa veya izleyici etkileşimleri kapalı olsa da gerçek hesap kimliğiyle eklenir. Aynı görünen ada sahip hesaplar birbirinden ayrıdır.
3. Sohbeti isim/mesajla arayabilir, **Listeyi dondur** ile seçim sırasında akışı sabitleyebilirsin. Panel yenilenince sunucunun tuttuğu son 200 mesaj geri gelir. Alternatif olarak sahnedeki kişi listesinden seçim veya isteğe bağlı elle isim ekleme kullanılabilir. Elle yazılan ad TikTok hesap kimliği değildir; gerçek izleyiciyle otomatik birleştirilmez.
4. **Başlangıç kadrosunu kaydet**, özel rol sahiplerini ve elle eklenenleri bu tarayıcıda saklar. Gerçek izleyiciler kimlikle, elle eklenenler adla kaydedilir. **Kayıtlı kadroyu uygula** gerçek izleyiciyi mevcut sahne veya aynı sunucu oturumundaki sohbet kaydından bulur; elle yazılan kişi zaten varsa yeniden kullanılır. Sunucu yeniden başladıysa gerçek izleyicinin yeniden yorum yazması gerekir. Süre ve hediye ayarları kadro kaydına dahil değildir.
5. Hazır olunca **Devam et**. Hazırladığın rollerin hediyeyle değişmemesi için **Hediyelerle rol değişimini kilitle** seçeneğini açabilirsin. Yönetici kilitliyken de rol atayabilir.

Panel ayrıca hediye/adet eşlemelerini, düğün ve kalan süreyi, tempoyu, izleyici etkileşimlerini, beğenilerin etkisini, otomatik kaynanayı, isim/yazı görünürlüğünü, efekt sesini ve kamerayı yönetir. Halayı koparma, damadı fırlatma, konfeti ve elle kaynana müdahalesi düğmeleri vardır. Katılımcı satırındaki **Göster** kamerayı kişiye sabitler. **Çıkar** kişiyi sahneden siler; yeni yorumla tekrar katılabilir.

**Duraklat** animasyon ve saati dondurur; yorum/hediye alımını ayrıca etkileşim anahtarı kontrol eder. Tören sırasında kişi/rol düzenlemek töreni sonlandırıp çifti görünür olarak halaya döndürür. **Yeni düğün** katılımcıları ve ayarları korur, gelin/damat rollerini boşaltır. **Sahneyi boşalt** kişileri siler, varsayılan süre/menü/ayarları geri getirir. Panel yenilendiğinde oyun durumu tekrar alınır; oyun ekranının kendisi yenilenirse sahne yeniden başlar. Birden fazla oyun ekranı varsa ilk kayıtlı Düğün ekranı yönetilir.

## Başlangıç ve katılım

- Sahne boş başlar. Yapay misafir, gelin, damat, kaynana veya çalgıcı üretilmez.
- Yorum yazan veya hediye gönderen gerçek izleyici sahneye katılır. Aynı kişi ikinci kez karakter oluşturmaz.
- Halayda katılımcı sınırı ve kapasite nedeniyle izleyici çıkarma yoktur. Halka kişi sayısıyla genişler; gerçek performans bilgisayarın gücüne bağlıdır.
- Yorumlar karakterin üzerinde balon olur; aynı anda en fazla üç balon gösterilir.
- Takip ve paylaşım, sahnedeki izleyiciyi zıplatır.

## Hediye menüsü

Görseller `client/public/gifts/` içindedir. Varsayılan görsel, adet, etiket ve rol eşlemesi `config.ts` içindeki `MENU` listesinden okunur; panelden değiştirilebilir. Aynı hediye/adet iki farklı etkiye atanamaz.

| Hediye | Adet | Etki |
|---|---:|---|
| Gül | 1 | Halaybaşı olur, kırmızı mendili alır |
| Gül | 10 | Gelin olur |
| Gül | 20 | Damat olur |
| GG | 5 | Davulcu olur |
| GG | 10 | Zurnacı olur |
| Parmak Kalp | 10 | Kaynana olur |
| Konfeti | 1 | Damat varsa havaya attırır |

Adetler **aynı hediye serisinin toplamıdır**. Seri bitene kadar rol değiştirilmez; sonunda ulaşılan en yüksek eşik bir kez uygulanır. 20 güllük seride kişi ara adımlarda halaybaşı veya gelin yapılmadan doğrudan damat olur. GG 5–9 davulcu, 10+ zurnacı; Parmak Kalp 1–9 rol vermez, 10+ kaynana yapar. Aynı hediyenin düşük eşikleri mevcut yüksek rolü düşürmez: gelin veya damat tek gül gönderince halaybaşına dönmez. Farklı hediye kategorisiyle açıkça yeni rol alınabilir. Yeni seriler ayrı değerlendirilir; farklı seriler birikmez. Paneldeki test hediyeleri tamamlanmış paket gibi anında uygulanır.

Bir izleyici aynı anda tek özel rol taşır. Yeni kişi rolü aldığında önceki sahibi halaya döner. Rol değiştirilince eski rol boş kalır; yerine yapay karakter konmaz. Menü dışındaki hediyeler göndereni sahneye katar, özel rol veya rastgele etki vermez.

## Kaynana

Kaynana, eşlenmiş hediyeyi gönderen izleyiciyle veya panelden atamayla oluşur. Varsayılan eşik 10 Parmak Kalp'tir. Halkanın dışında dolaşır; 70–110 saniyede bir sahneye yürür ve halayı dört saniye durdurur. Ekranda replik gösterilir. Başka biri rolü devralırsa eski kaynana halaya döner. Kaynana başka rol alınca davranış durur. Otomatik müdahale kapalıyken panelden elle müdahale yapılabilir.

## Davulcu ve zurnacı

İkisi de yalnız gerçek izleyici veya yayıncının açık atamasıyla oluşur; sahne başında yapay çalgıcı yoktur. Eşiği karşılayan kişi enstrümanlı kıyafetiyle çalgıcı sahnesine geçer, tempoya bağlı çalma animasyonu oynar. Rol devralınırsa eski sahibi halaya döner. Yeni düğünde kaynana ve çalgıcılar kalır; **Sahneyi boşalt** onları da kaldırır. Gerçek davul-zurna ses kaydı henüz eklenmemiştir.

## Tempo ve düğün döngüsü

- Beğeniler tempoyu artırır. Tempo eşiği geçince halay kopar; 4,5 saniyede herkes yeniden kalkar.
- Düğün varsayılan 10 dakika sürer; panelden değiştirilebilir. Son 30 saniyede geri sayım gösterilir.
- Süre bitince gelin ve damat birlikte varsa araba gelir. Finalde roller kilitlenir, 12 saniyelik törenin ardından çift halaya döner ve gelin/damat rolleri boşalır.
- Çift tamamlanmadıysa araba töreni yapılmadan yeni düğüne geçilir.
- Halaydaki izleyiciler ve varsa kaynana yeni düğünde kalır. Panelde Sıfırla tüm sahneyi yeniden boş başlatır.
- Final sırasında gönderilen rol hediyeleri sonraki düğüne birikmez; ekranda rol kapışmasının kapalı olduğu belirtilir.

## Dosyalar ve doğrulama

`DugunGame.ts`: roller, olaylar ve düğün döngüsü. `config.ts`: menü ve süreler. `dancers.ts`: figürler ve halay halkası. `world.ts`: meydan ve araba. `hud.ts`: başlık, menü, süre ve duyurular. Gelin/damat bilgi kutuları gösterilmez; roller sahnedeki karakterler ve değişim duyurularıyla anlaşılır.

`npm test`, `npm run typecheck`, `npm run build` ile kontrol edilir. `tests/dugun.test.ts` boş başlangıcı, bin katılımcıyı, gül serisi eşiklerini, kaynana devrini ve finalde rollerin korunmasını denetler. Hediye kimlikleri gerçek TikTok yayınında ayrıca doğrulanmalıdır.
