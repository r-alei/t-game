# Düğün Dernek

## Dayı ekranı ve bahçe düğünü

**Düğün Dayısı**, oyundan bağımsız bir SVG bileşenidir. Kasketi, bıyığı, yeleği ve kırmızı mendiliyle belden yukarı görünür. Adres: `http://127.0.0.1:4300/dayi`. 1080×608 mantıksal sahne pencere değişince oranını koruyarak ortalanır ve kesilmeden sığar; fon tüm pencereyi doldurur. Oyun ekranında dayı katmanı ve mikrofon kullanımı yoktur.

Düğün başlatıcısı **Canlı Oyun · Dayı Ekranı** adlı çerçevesiz, boyutu değiştirilebilir 1280×720 pencereyi açar (küçük ekrana küçültülür). LIVE Studio'da **Pencere yakalama** ile **Canlı Oyun · Dayı Ekranı** penceresini ekle, oyun görüntüsünün üstüne bant olarak yerleştir. `?bg=green` ile krom anahtar (#00b140), `?bg=black` ile siyah fon, `?ad=Mehmet` ile isim seçilir. Örnek: `/dayi?bg=green&ad=Mehmet`. Varsayılan sıcak düğün fonu ve “Dayı” ismidir. Pencere opaktır, sürüklenebilir; Esc kapatır. Diğer oyunların başlatıcısı dayı penceresi açmaz.

Animasyon `requestAnimationFrame` içinde sabit 1/60 saniyelik adımlarla ilerler. SVG bir kez oluşturulur; karelerde yalnız öznitelikler güncellenir. Konuşma ağız, baş, bıyık ve mendilli kolu oynatır; sessizlikte nefes ve göz kırpma sürer. Halay kopunca shock, yeni gelin/damatta cheer, ortaya çıkınca clap jesti oynar. Hediye isteyen yazı veya ikon yoktur.

Mikrofon varsayılan **açık**, izin yalnız dayı ekranında alınır. Panelde **Dayı mikrofonu** ve **Konuşma eşiği** oyun kapalıyken de kullanılabilir. Ayarlar dayı sayfasında localStorage'a try/catch ile yazılır ve yeniden açılışta okunur. RMS, histerezis, 140 ms bekleme ve yumuşatma korunur. Düşük eşik daha hassastır. Ses kaydedilmez veya aktarılmaz. Mikrofon kapanınca ve dayı sayfasından çıkınca kaynaklar bırakılır; oyunu duraklatmak/sıfırlamak dayıyı etkilemez.

Mesaj akışı `/live`: panel → sunucu → dayı `dayi-command`; oyun → sunucu → dayı `dayi-cue`; dayı → sunucu → panel `dayi-state` (enabled, threshold, level, status; saniyede dört kez). Sunucu komut, jest ve durum değerlerini doğrular. Dayı kapanınca panel bağlantının kapandığını gösterir. İzin/cihaz hatasında giriş cihazını kontrol edip kapat/aç; tarayıcı ses bağlamı için dayı ekranına tıklamak gerekebilir. Electron yalnız yerel HTTP(S) kökeninden ses girişine izin verir.

Donut (`5879`) ×1 gönderen kişi **12 saniyeliğine ortaya çıkar**, tek elde mendil sallayarak döner; çiftin arasında ve arkasında, merkezde (0, 0, -0.9) oynar; yakın çekimin ardından yüksek açılı çekimle görünür kalır. Aynı anda bir solo vardır; yeni solo eskisini halaya döndürür. Özel rol taşıyan kişi soloya geçince eski rolü boşalır. Solo bitince, yeni düğünde veya törende halaya döner. Rol kilidi ve araba töreni ortaya çıkmayı da engeller. Eşleme panelden değiştirilebilir. Yayın ekranında hediye menüsü, hediye ikonu veya hediye çağrısı gösterilmez; duyuru yalnız sonucu anlatır.

Bahçe: çim zemin ve çim kümeleri, kenarlarda ağaç/çiçekli çalılar, taş patika, arkada yuvarlak yemek masaları, sandalyeler, tabak, ekmek, elma ve ayakta lambalar. Pist (10,5 yarıçap), dış halay sırası (en çok 8,5), araba şeridi, mevcut çalgıcı sahnesi, bayrak/ampuller ve kamera açıları korunur. GLTFLoader yüklemeleri oyunu bekletmez; her modelin örnekleri InstancedMesh paylaşır. Kaynaklar ve lisanslar: [KAYNAK.md](../../../public/models/dugun/KAYNAK.md). Dönüştürme: `blender -b --python scripts/convert-dugun-models.py`.

Düğün varsayılan çizim hedefi **60 FPS**; gerekirse `?game=dugun&fps=30` ile düşürülebilir. Gerçek FPS donanım ve katılımcı sayısına bağlıdır. Otomatik testler model sınırlarını ve boyut bütçesini denetler; gerçek mikrofon, görüntü ve FPS ayrıca yayın bilgisayarında kontrol edilmelidir.

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

- İzleyici kadrosu boş başlar. Dayı katmanı varsayılan görünürdür; yapay misafir, gelin, damat, kaynana veya çalgıcı üretilmez.
- Yorum yazan veya hediye gönderen gerçek izleyici sahneye katılır. Aynı kişi ikinci kez karakter oluşturmaz.
- Halayda katılımcı sınırı ve kapasite nedeniyle izleyici çıkarma yoktur. Halka kişi sayısıyla genişler; gerçek performans bilgisayarın gücüne bağlıdır.
- Yorumlar karakterin üzerinde balon olur; aynı anda en fazla üç balon gösterilir.
- Takip ve paylaşım, sahnedeki izleyiciyi zıplatır.

## Hediye menüsü

Görseller `client/public/gifts/` içindedir. Varsayılan görsel, adet, etiket ve rol eşlemesi `config.ts` içindeki `MENU` listesinden okunur; panelden değiştirilebilir. Aynı hediye/adet iki farklı etkiye atanamaz.

| Hediye | Adet | Etki |
|---|---:|---|
| Gül | 1 | Halaybaşı olur, kırmızı mendili alır |
| Buket (ad ile) | 1 | Gelin olur |
| Parfüm (`5658`) | 1 | Damat olur |
| GG | 5 | Davulcu olur |
| GG | 10 | Zurnacı olur |
| Parmak Kalp | 10 | Kaynana olur |
| Konfeti | 1 | Damat varsa havaya attırır |
| Donut | 1 | 12 saniyelik mendilli solo; önceki solo halaya döner |

Adetler izleyici ve eşleşen hediye başına toplanır. Son artıştan 1,2 saniye sonra veya seri bitişinde ulaşılan en yüksek yeni eşik uygulanır; 30 saniyelik sessizlikte sayaç silinir. GG 5–9 davulcu, 10+ zurnacı; Parmak Kalp 10+ kaynana yapar. Gül yalnız halaybaşı yapar; 10/20 gül gelin veya damat yapmaz. Farklı hediye kategorisi yeni rol verebilir. Aynı hediyenin düşük eşiği mevcut yüksek rolü düşürmez.

Buket'in gerçek TikTok kimliği bilinmiyor. Geçici kural `giftId: 'bouquet', giftName: 'bouquet'` kullanır: kimlik eşleşir veya küçük harfe çevrilen hediye adı **bouquet** / **buket** içerirse gelin olur. Adla gelen olaylar da aynı sayaçta toplanır. Panelde **Buket (ad ile)** görünür; **Gerçek hediye kimliği** alanına sayısal kimlik yazıp Uygula'ya basınca ad eşleşmesi kapanır ve yalnız kimlik kullanılır. Geçici ikon rose.webp'dir; bilinen hediye kataloğuna Buket eklenmez. Sunucu her normalize hediye artışı için tek satır yazar: örnek (temsili kimlik) `[hediye] 9999 Bouquet x1`. İlk gerçek Buket geldiğinde bu satırdaki kimlik panelde kullanılabilir.

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

`DugunGame.ts`: roller, solo, olaylar, jest bildirimleri ve düğün döngüsü. `config.ts`: eşlemeler ve süreler. `dancers.ts`: figürler ve halay halkası. `client/dayi.html` / `client/src/dayi.ts` / `client/src/dayi.css`: bağımsız yayıncı ekranı. `dayi.ts` / `microphone.ts`: ölçeklenebilir SVG bileşeni, saf poz hesabı ve yerel ses analizi (`SpeakerMicrophone`). `shared/dayi.ts` / `server/dayiControl.ts`: mesaj doğrulaması ve dağıtımı. `world.ts` / `garden.ts`: bahçe ve araba. `hud.ts`: başlık, süre ve sonuç duyuruları. `tests/dugunDayi.test.ts` çizim ve animasyonu; `tests/dayiControl.test.ts` mesajları, geçersiz değerlerin reddini ve kapanışı doğrular.

`npm test`, `npm run typecheck`, `npm run build` ile kontrol edilir. `tests/dugun.test.ts` boş başlangıcı, bin katılımcıyı, Parfüm/Buket eşlemelerini, gülün yalnız halaybaşı olmasını, solo hedefini ve kamerasını, kaynana devrini ve finalde rollerin korunmasını denetler. Hediye kimlikleri gerçek TikTok yayınında ayrıca doğrulanmalıdır.
