# Yeni TikTok LIVE Oyunu — Fikir Tartışması

**Tarih:** 13 Kasım 2026
**Rol:** Canlı yayın oyun tasarımcısı + davranış psikolojisi
**Girdiler:** `tikqo_tum_oyunlar_analiz_ve_konseptler.md` (37 oyun, Köprü Ekibi / Zincir Şehri / Canlı Hikâye Stüdyosu), `Kısmet Apartmanı/FIKIRLER.md` ve Kısmet + Kule (Taht Kuşatması) proje belgeleri.
**Kapsam:** Fikir ve tasarım. Kod yok. Puanlar editoryal tahmindir, saha verisi değildir.

---

## 0. Önce otopsi: Kısmet Apartmanı ve Kule neden "inanılmaz kullanışsız" oldu?

Yeni fikre geçmeden önce eski projeden ders çıkarmak gerekiyor. Belgelere (OKU.md, PROJE-PLANI.md, KULE-KURALLAR.md, KULE-INCELEME.md) bakınca sorunlar teknik değil, tasarımsal görünüyor.

| Belirti | Kanıt (belgelerden) | Kök neden |
|---|---|---|
| **Çok fazla kural** | Kral, muhafız, taht adayı, saldıran/onaran kampı, 5 saldırı + 5 tamir hediyesi, "en çok saldıran kral olur", "kral hariç en çok onaran muhafız" | İzleyiciye 3 saniyede tek fiil verilmedi. Oyunu anlamak için kural okumak gerekiyordu. |
| **Ekran pano gibiydi** | Üstte 5 hediye kartı, solda hediye vitrini, durum kartı, aday kartı, kat etiketleri, rol açıklaması. Çakışma ölçümleri ayrı bir iş kalemine dönüşmüş. | Oyun dünyası küçüldü, metin büyüdü. 2D HTML kartlar "yönetim paneli" hissi verdi, "oyun" hissi vermedi. |
| **Hediye sayıya dönüşüyordu** | "500 elmaslık Kupa 1.000 canlık kuleden 500 can götürür" | Bir sayının azalması bir **an** değildir. Hediye görsel bir olay (çarpma, sarsıntı, ağır çekim) yaratmalıydı. |
| **Geri bildirim gecikiyordu** | "Hediye serileri bitince toplam adet bir kez puanlanır" | Muhasebe için doğru ama his için yanlış. İzleyici her gülde **o saniye** bir şey görmeli. Seri bitene kadar beklemek nedensellik hissini öldürür. |
| **İzleyiciyi ikiye bölüyordu** | Saldır / tamir et | Yeni bir kanalda 4–10 izleyici olur. Bunları iki takıma bölünce iki taraf da boş kalır. Ayrıca izleyici izleyiciye karşı oynar; ortak düşman yoktur. |
| **Kısmet: okuma gerektiren hikâye** | NPC aşk hikâyesi, oylama, olay kartları | TikTok izleyicisi okumaz, kaydırır. Oylamanın sonucu tur sonunda gelir, katkı anında görünmez. Romantizm ayrıca güvenlik riski getirdi (hakemlerin kuralları). |
| **Altyapı oyundan önce geldi** | Transaction log, kurtarma günlüğü, 5.000 olay penceresi, pending hediye bağlamı, iki oyun arası teslim kaydı | Eğlencenin olup olmadığı tek bir gerçek yayında bile test edilmeden haftalar muhasebe sağlamlığına gitti. |
| **Kararsız hediye kuralı** | Önce "SALDIR yaz + hediye", sonra "hediye ID'si belirler", sonra vitrin | Kural defalarca değişti. Tasarımın merkezinde net bir "fiil" olmadığının işareti. |
| **Yayıncının rolü yoktu** | Belgelerde yayıncının ne söyleyeceği hiç tanımlanmamış | TikTok'ta oyunu yayıncının sesi satar. Oyun, yayıncıya söyleyecek bir şey vermeli. |

### Buradan çıkan 8 tasarım kuralı (bu belgedeki her fikir bunlara göre süzüldü)

1. **Tek fiil.** "Yorum yaz → X olur." İkinci fiil ancak beğeni olabilir. Hediye fiil değildir; aynı fiilin daha büyüğüdür.
2. **Ekranda en fazla 3 yazı:** hedef (ör. "REKOR 31 KAT"), sayaç ve o an olan olayın ismi. Gerisini 3D sahne anlatsın.
3. **Sayı değil olay.** Her katkı, fizikle ya da kamerayla görülebilen bir değişim yaratsın.
4. **Ortak düşman (PvE).** İzleyiciler birbirine değil, doğaya veya yerçekimine karşı oynasın. 3 kişiyle de 300 kişiyle de çalışsın.
5. **Hediye o saniye karşılık bulsun.** Gülün seri içindeki her adedi anında görünsün. Muhasebe arkada ayrı tutulsun.
6. **Büyük hediye = sahneyi durduran an.** Ağır çekim, kamera, isim ve fotoğraf. Aynı anda yalnızca bir büyük an olsun, diğerleri sıraya girsin.
7. **Yayıncıya replik.** Her olay yayıncının söyleyebileceği bir cümle üretsin ("Ayşe altın blok attı, kurtardı!").
8. **Önce oyun hissi, sonra altyapı.** İlk hafta yalnızca sahte olay düğmeleriyle eğlenceli mi diye bak. Kalıcılık ve kurtarma işleri sonra gelsin.

---

## A) Arka plan: Bu oyunlar neden tutuyor, izleyici neden hediye atıyor?

### A1. Psikolojik mekanizmalar (somut)

**1. Görünürlük ve tanınma: "Ben buradayım."**
Sıradan bir izleyici TikTok'ta görünmez biridir. Yorumu bir saniye akar ve kaybolur. Oyun onun **adını ve profil fotoğrafını** ortak ekrana büyük yazdığında, o kişi kalabalıktan ayrılır ve sahneye çıkar. Kanıt: PP Baskı, Düğün Konvoyu ve Oto Yıkama'nın tamamı "senin nesnen ekranda" fikrine dayanıyor. Uygulama kuralı: İsim **okunur** olmalı. 1080 genişlikte en az 48–64 px, büyük anlarda 90+ px kullanılmalı, fotoğraf en az 160 px olmalı. 40 isimlik bir kalabalık içinde 20 px'lik bir isim tanınma sağlamaz.

**2. Nedensellik ve kontrol: "Bunu benim hediyem yaptı."**
İnsan, bir eylemle sonuç arasındaki bağı 0,5–2 saniye içinde kurar. Gecikme uzadıkça "bunu ben mi yaptım?" belirsizliği doğar ve ödül hissi düşer. Kule'nin "seri bitince puanla" mantığı tam olarak bu bağı kopardı. Kural: Etki anında gelmeli ve **isim etiketi etkinin üstünde** durmalı. "Bir şey oldu" yetmez, "Ahmet'in bloğu oturdu" görünmeli.

**3. Parasosyal ilişki: "Yayıncı benim adımı söyledi."**
Birçok izleyici için oyunun asıl ödülü, yayıncının adını sesli söylemesi ve tepki vermesidir. Oyun bu yüzden yayıncıya **söylenecek bir şey** vermeli. Ekrandaki büyük isim yayıncının okuyacağı metindir. "Teşekkürler Ahmet" sıradandır. "Ahmet son saniyede kuleyi kurtardı!" bir hikâyedir. İkincisini oyun üretir.

**4. Grup aidiyeti: "Biz yaptık."**
Takım, memleket ve halay oyunları "biz" duygusuyla çalışır. Küçük kanallarda en güçlü "biz", **izleyicilerin hepsinin yayıncıyla birlikte ortak bir düşmana karşı** durmasıdır: yerçekimi, fırtına, saat. Rakip takım şart değildir. Ortak rekor ("dün 24 kattık, bugün 30!") yayınlar arası bir topluluk kimliği yaratır.

**5. Kayıptan kaçınma ve "az kaldı" (goal gradient).**
İnsanlar hedefe yaklaştıkça daha çok çaba harcar (kahve kartında son damgalar daha hızlı dolar). Ayrıca kaybetmek, aynı büyüklükteki kazanmadan yaklaşık iki kat daha çok acıtır. "REKORA 2 KAT" yazısı ve sallanan bir kule, izleyiciyi hem hedefe çeker hem de kaybetme korkusuyla harekete geçirir. **Etik sınır** için bkz. A3. Bu gerilim ücretsiz eylemle de çözülebilmeli.

**6. Değişken ödül: "Bu sefer ne olacak?"**
Sonucun tam tahmin edilemediği durumlar (fizik, rüzgâr, devrilme) dikkati sürekli tutar. Burada önemli bir ayrım var. Rastgelelik **dünyada** olmalı (rüzgâr, sallanma), **ödemede** olmamalı. Hediyenin ne yapacağı her zaman net ve aynı olmalı. "Hediye at, belki büyük ödül çıkar" yapısı kumar/ganimet kutusu mantığına kayar.

**7. Sosyal kanıt ve bulaşma: "O attı, ben de atayım."**
Bir hediyenin ekranda büyük bir an yaratması diğer izleyicilere iki mesaj verir: "burada hediye atılıyor" ve "atınca böyle görünüyor". İlk hediye en zor olanıdır, sonrakiler zincirleme gelir. Bu yüzden **ilk hediye** sahnede ayrıca kutlanmalı ("GECENİN İLK ALTIN BLOĞU"). Hediye sırasının ve son atanların kısa süre görünmesi de bulaşmayı artırır.

**8. Son vuruş ve kahraman anı.**
Bir hikâyenin dönüm noktasında olmak (rekoru kıran blok, son saniyede kurtaran can simidi) en güçlü tanınma biçimidir. Yumurta Kırma ve Karpuz Patlat bu anı tek bir kişiye verir. Daha iyi tasarım kahramanı **eylemle** belirler, sadece sırayla değil: "kurtaran", "rekoru kıran", "temeli atan" gibi birden fazla kahraman rolü olmalı.

**9. Kalıcılık ve sahiplik: "Benim bloğum hâlâ orada."**
Mahalle'deki ev ya da kuledeki isimli blok tur boyunca orada durur. Kişi yaptığı şeyi izlemeye devam eder ve yayından ayrılması zorlaşır. Hafif bir yayınlar arası kalıcılık (rekor tablosunda yalnızca isim) tekrar gelme nedeni olur. Profil fotoğrafı ise kalıcı saklanmamalı.

**10. Komedi ve schadenfreude (zararsız düzeyde).**
Devrilen kule, suya düşen avatar ve ağır çekimde savrulan bloklar paylaşılabilir anlardır. Komedi, kaybetmeyi cezadan eğlenceye çevirir. Bu sayede başarısızlık izleyiciyi kaçırmaz, tutar. Sınır: Gerçek bir kişiyi aşağılamak yok. Şaka nesneyle ve olayla yapılır.

### A2. Hediye ekonomisi: Neden en çok 1 jetonluk gül atılır, büyük hediye nasıl bir "an" olmalı?

**Gül (1 jeton) neden kraldır?**
- **Sürtünme sıfıra yakın:** Karar vermek gerekmez, pişmanlık olmaz. "Alkış" kadar ucuzdur.
- **Sıklık:** Tek kişi 10–50 kez basabilir. TikTok'un kombo sayacı (x10, x25) kendi başına bir mini oyundur.
- **Kimliği hemen kazandırır:** 1 jeton bile ismi ekrana taşır. "Ekranda görünmenin" en ucuz bileti güldür.
- **İlk hediyenin basamağıdır:** Gül atan, ileride daha büyük hediye atan kişiye dönüşebilir. Hediyeyle kurulan ilk ilişki ucuz olmalıdır.

**Tasarım sonucu:**
1. Her gül **anında** ve **garanti** bir görsel etki yapmalı (seri bitmesini beklemeden).
2. Etki küçük ama **net** olmalı (ör. bloğun altın rengine dönüp tam ortaya oturması). Küçük ödül, hiç olmayan ödülden çok daha güçlüdür.
3. Kombo birikimi bir sonraki kademeye köprü kurabilir. Örneğin 10'lu gül serisi bir orta hediye etkisini açar. Bu sayede gül atan kişi "büyüdüğünü" hisseder ve büyük hediyeye zorlanmaz.

**Büyük hediye (yüzlerce jeton ve üstü) nasıl bir "an" olmalı?**
Büyük hediye bir sahne kesmesidir. Sıradan akışı **durdurmalıdır**:
- **0,0 sn:** Kısa bir ses vurgusu ve ekranın hafif kararması (diğer her şey geri planda kalır).
- **0,3 sn:** Üst-orta güvenli bölgede, tam genişlikte isim bandı ve büyük profil fotoğrafı (90+ px yazı, 220 px fotoğraf).
- **0,5–3 sn:** 3D etki: kamera döner, ağır çekim, büyük fiziksel olay (vinç dev bir blok indirir, balina salı iter).
- **3–5 sn:** Sonuç kalıcı olarak dünyada kalır (isimli dev blok kulenin parçası olur).
- **Kuyruk:** Aynı anda iki büyük an olmaz. İkincisi bekler ve "SIRADA: @x" diye kısa süre görünür. Bekleyen hediye kaybolmaz, değer kaybetmez.

Büyük hediyenin değeri **parayla orantılı bir sayı** değil, **başka hiçbir şeyin yaratamadığı bir görüntüdür.** Kule'de 500 elmas "500 can" demekti. Burada 500 elmas, "herkesin hatırlayacağı 4 saniye" demek olmalı.

**Kademe bantları (öneri):** Hediye ID'si yerine olaydan gelen jeton değerine göre bant kullanılmalı. Bu sayede yeni ya da tanınmayan hediyeler de otomatik çalışır.

| Bant | Jeton | Örnek | Rol |
|---|---|---|---|
| Küçük | 1–9 | Gül, TikTok | Anında, kişisel, net küçük etki |
| Orta | 10–199 | Parfüm, Donut, GG | Herkesin fark ettiği yardım + isim bandı |
| Büyük | 200–999 | Taç, Kupa vb. | Sahneyi durduran an (kuyruklu) |
| Efsane | 1000+ | — | Büyük anın genişletilmiş hâli + "gecenin kahramanı" plaketi (sonuca değil, şana etki eder) |

### A3. Etik sınırlar ve dürüst denge

**Dürüst gerçek:** Hediyenin oyunda hiçbir etkisi olmazsa, "destek" dışında kimse hediye atmaz. Kule'nin hakem kuralı ("hediye oy sayısını artırmasın") oylama oyunu için doğruydu, ama her oyunda hediyeyi etkisiz bırakmak oyunu ekonomik olarak ölü doğurur. Çözüm hediyeyi etkisiz kılmak değil, **etkinin kime yöneldiğini** doğru seçmektir.

**Denge ilkeleri:**
1. **Hediye grubu kurtarır, rakibi ezmez.** PvE oyunda hediye herkesin ortak hedefine yardım eder. Bu durumda "sonuç satın alındı" itirazı zayıflar, çünkü kazanan herkestir. Hediye başka bir izleyicinin emeğini yok etmez.
2. **Ücretsiz yol her zaman var ve gerçek.** Tur yalnızca yorum ve beğeniyle de kazanılabilmeli (biraz daha zor ama mümkün). Ücretsiz katılımcının bloğu da ismiyle ve fotoğrafıyla görünür. Fark "görünmek ile görünmemek" değil, "küçük an ile büyük an" olmalı.
3. **Hediye sonucu doğrudan satın almaz.** Hediye riski azaltır, hızlandırır ve görselleştirir. "Tek hediyeyle tur biter" olmamalı. Kule'de 1.000+ elmas hediyelerin kuleyi tek vuruşta yıkacağı için dışarıda bırakılması bu sorunun belirtisiydi.
4. **Ödemede rastgelelik yok.** Hediyenin etkisi deterministik ve önceden bellidir. Rastgele ödüllü, ganimet kutusu ya da çark mekanikleri kullanılmaz.
5. **Sahte kıtlık ve baskı yok.** Yayıncı "hediye atmazsanız kaybederiz" demez. Bunun yerine "beğeni yağdırın, rüzgârı durduralım" der. Gerilim ücretsiz eyleme yönlendirilir. Ekranda geri sayımlı "son şans hediye" teklifi olmaz.
6. **18+ farkındalığı.** Jeton ve hediye TikTok'ta 18+ yaş sınırlıdır, ama izleyicilerin bir kısmı 13–17 yaşında olabilir. Oyunun temel eğlencesi (blok koymak, salda olmak) tamamen ücretsizdir. Hediye kademeleri ekranda "satın al" dili yerine ikon ve etki olarak anlatılır.
7. **Hedefleme yok.** Hediyeyle belirli bir izleyiciyi cezalandırma, hedef alma veya romantik eşleştirme yapılmaz (Kısmet hakem kuralları).
8. **İsim filtresi ve unutma hakkı.** Ekrana yazılan isimler küfür/uygunsuz filtreden geçer. Profil fotoğrafı yalnızca yayın süresince bellekte tutulur. Rekor tablosunda yalnızca isim ve sayı saklanır, "sil" isteği uygulanır.

---

## B) Ham fikirler (8 adet)

Kısıtlar: tek kişi + Claude, three.js, 1–2 haftalık MVP, 9:16 (1080×1920), alt ~%35 ve sağ kenar kapalı, 3 saniyede anlaşılma, yorum ve beğeniyle oynanabilirlik, isimli büyük hediye etkisi, Türk izleyici, telifli marka yok. Her fikir için tek cümlelik "3 saniye testi" yazıldı.

### 1. KAT KAT — Birlikte en yüksek kuleyi dik
**3 sn:** *"Yorum yaz → senin isminle bir blok kuleye düşer. Yıkılmasın."*
Bir şantiyede vinç sallanır. Her yorum, yorumcunun adı ve fotoğrafı yazılı bir bloğu bırakır. Bloklar biraz kaymış oturur. Kayma birikir, rüzgâr yükseldikçe artar ve kule bir noktada devrilir (ağır çekim + komedi). Hedef "REKOR ÇİZGİSİ"ni geçmektir. Beğeniler rüzgârı sakinleştirir. Hediyeler "altın blok" (tam oturur), "çelik kiriş" (kuleyi düzeltir) ve "dev prefabrik kat" (kamera anı) olur.
*TikQo'dan farkı:* Kuleyi doldurma değil, **devrilebilen fiziksel bir istif**. Kimse kimseyi yıkmaz, ortak düşman yerçekimidir. TikQo kataloğunda istif/denge oyunu yok.

### 2. SAL — Sal batmasın, karaya çıkalım
**3 sn:** *"Yorum yaz → avatarın sala atlar. Sal devrilirse suya düşersin."*
Denizde bir sal ve uzakta bir ada vardır. Her yorumcunun düşük poligonlu karakteri (yüzü profil fotoğrafı) sala atlar. Sal ağırlığa göre yatar. "sol" / "sağ" yazan kendi avatarını o tarafa yürütür. Fazla yatarsa kenardakiler suya kayar (komik ama ceza değil, tekrar atlayabilirler). Beğeniler kürek çeker, sal adaya yaklaşır. Hediyeler can simidi, ek kalas ve dev yunus/balina itişi olur. Final fırtına dalgasıdır: adaya varanların fotoğrafları "KARAYA ÇIKANLAR" listesine düşer.
*Farkı:* Hill Climb'ın tek eksenli çekişmesi yerine **herkesin aynı taraf olduğu bir denge**. Kişisel bir kader (benim avatarım hayatta mı?) ile ortak hedef birleşir.

### 3. NE BU? — Sisteki nesneyi ilk bilen kazanır
**3 sn:** *"Siste dönen şey ne? İlk doğru yazan kürsüye çıkar."*
Sis içinde, çok yakın plandan, yavaş dönen bir 3D nesne gösterilir (çaydanlık, simit, nazar boncuğu, cezve, tavla, dolmuş, kedi...). Beğeniler sisi açar. İlk doğru yorumu yazanın fotoğrafı spot ışıklı kürsüye fırlar. Hediyeler herkese açık ipucunu (bir harf, kamera açısı) satın alır ve yeni turun "sponsoru" olarak isim yazdırır.
*Farkı:* Yarışma ve bulmaca ailesi TikQo'da yok. 3D burada "yavaş açılan gizem" olarak kullanılır.

### 4. DALGA GELİYOR — Kumdan kaleyi dalgadan koru
**3 sn:** *"Yorum yaz → kaleye kum ekle. 60 saniye sonra dalga geliyor."*
Kumsalda bir kale vardır. Yorumlar kule, duvar ve hendek parçaları ekler (önceden tanımlı yuvalara). Her 60–90 saniyede bir dalga gelir ve dayanıksız parçaları eritir. Kalan parçalar bir sonraki tura temel olur. Hediyeler taş duvar, deniz kenarı mendirek ve "dalga kıran" olur.
*Farkı:* Köprü Ekibi'nin kurma mantığı, ama tasarım kararı istemez. Final anı (dalga) doğaldır.

### 5. ÇIĞ — Yuvarlanan kartopu isimleri toplar
**3 sn:** *"Yorum yaz → kartopuna yapış. Top büyüdükçe kasabaya yetişir."*
Dağdan inen bir kartopu yorumcuların isimli kardan adamlarını toplayarak büyür. Yoldaki engelleri (çit, ağaç, kulübe) ancak yeterince büyükse kırar. Beğeniler hız kazandırır. Hediyeler rampa, buzlu yol ve dev kardan adam olur. Final: Top vadideki dev hedefe (kardan kale) çarpar.
*Risk notu:* Mekanik olarak tanınmış bir konsol oyununu (topla-büyü) çağrıştırıyor. Görsel dil özgün tutulmalı.

### 6. PARAŞÜT — Hedefin ortasına kim konacak?
**3 sn:** *"Yorum yaz → uçaktan atlarsın. Hedefe en yakın konan kazanır."*
Her yorum bir paraşütçü bırakır. Rüzgâr onları savurur ve yere konanların hedefe uzaklığı ölçülür. Turun en yakını kürsüye çıkar. Beğeniler rüzgârı değiştirir. Hediyeler renkli duman izi, dev paraşüt ve sahne efekti olur.
*Etik sorun:* Hediye isabeti artırırsa izleyici izleyiciye karşı **satın alınmış avantaj** doğar. Artırmazsa hediye yalnızca süs olur. İkisi de zayıftır (bkz. şeytanın avukatı).

### 7. MAHALLE KAZANI — Dev aşure / çorba kazanı
**3 sn:** *"Yorum yaz: malzeme ismi → kazana düşer. Kazan ne pişirecek?"*
Meydanda dev bir kazan vardır. Yorumlar malzeme ekler (nohut, fasulye, kuru üzüm... ve şakadan çorap). Kazanın "yüzü" tepki verir. Beğeniler ateşi harlatır. Tur sonunda tadına bakan aşçı teyze komik bir hüküm verir ("Bu aşure değil, kapuska olmuş!"). Hediyeler özel malzeme ve kazan taşma anı olur.
*Farkı:* Kültürel sıcaklık, komedi ve ortak üretim. Slime Ustası'na yakın.

### 8. GÖKYÜZÜNE YAZ — İsimli havai fişek gösterisi
**3 sn:** *"Yorum yaz → senin adınla bir roket patlar. 100 roket = büyük final."*
Gece manzarasında her yorum küçük bir roket, her beğeni kıvılcım üretir. Hediyeler gökyüzüne kişinin adını ışıktan yazan büyük fişekler olur. Ortak sayaç dolunca büyük final gösterisi başlar.
*Not:* Çok güçlü bir görsel, ama oyun değil, "hediye alarmı + doldur-patlat" yapısının kostüm değişikliği.

---

## Şeytanın avukatı: Her fikre saldırı → savunma/düzeltme

**1. KAT KAT**
- *Saldırı:* "Beceri yok, şans var. Yorumun ne zaman geleceğini kimse kontrol edemiyor (yayın gecikmesi 2–5 sn). Blok rastgele kayıyorsa izleyici neden umursasın?" / "Fizik motorunda 30 kutuluk istif titrer ve kendiliğinden çöker." / "100 jeton atan kişinin bloğu yüzünden kule yıkılırsa öfkelenir." / "200 izleyicide yorum seli olur, kuyruk 3 dakika bekler."
- *Savunma/düzeltme:* Beceri yerine **ortak risk yönetimi** var. Beğeni rüzgârı azaltır, hediye bloğu tam oturtur, yani izleyici riski etkiler. Yayıncı gerilimi sesli kurar. Fizik sorunu şöyle çözülür: Bloklar **kinematik** oturur (kayma değeri hesaplanır, motor çalışmaz). Devrilme kütle merkezi ile destek kenarı karşılaştırılarak belirlenir. Fizik motoru **yalnızca çöküş anında** açılır. Hediye blokları asla devirmez, kuleyi her zaman düzeltir. Bu yüzden "param yıktı" anı yaşanmaz. Yorum seli için saniyede en fazla 2 blok düşer. Fazla yorumların isimleri o anki bloğun yüzeyine "imza" olarak eklenir, yani kimse boşa gitmez.

**2. SAL**
- *Saldırı:* "'sol/sağ' yazmak bir troll'ün herkesi suya dökmesine izin verir." / "Karakter animasyonları, su, yatma ve kayma: MVP için çok iş." / "40 avatarlık bir salda isim okunmaz."
- *Savunma/düzeltme:* Troll'ün salı yatırması oyunun dramıdır, ama tek kişinin etkisi ağırlığıyla sınırlıdır. Kalabalık dengeler, düşen avatar da tekrar atlayabilir (ceza yok). Animasyon basit tutulur: avatar = kapsül + fotoğraf disk, iskelet animasyonu olmaz, su shader'ı hazır örnekten alınır. Kalabalıkta isimler yalnızca **son 5 katılımcı ve hediye atanlar** için büyük gösterilir. Diğerlerinde yalnızca fotoğraf diski görünür. Avatar sayısı sahnede 30'la sınırlanır, fazlası "yüzücü" olarak salın etrafında bekler.

**3. NE BU?**
- *Saldırı:* "Hediye motivasyonu zayıf. Kazanmak bedavaysa neden para atayım?" / "Yayın gecikmesi yüzünden 'ilk bilen' adaletsiz olabilir." / "Nesne kütüphanesi bitince oyun tekrarlar, 3D model hazırlamak pahalıdır."
- *Savunma/düzeltme:* Bu fikir bir gelir oyunu değil, **büyütme oyunu**dur. Yorum sayısını patlatır ve TikTok algoritması yorum yoğunluğunu ödüllendirir. Hediye motivasyonu "sponsorluk" ve "herkese ipucu" ile kurulur (cömertlik görünürlüğü). Gecikme sorunu: TikTok olaylarının zaman damgası değil, sunucuya varış sırası esas alınır. Herkes aynı gecikmeye sahip olduğu için adalet kabul edilebilir düzeydedir. Nesneler düşük poligonlu ve basit geometridir, ayrıca CC0 model kütüphaneleri kullanılabilir.

**4. DALGA GELİYOR**
- *Saldırı:* "Hangi parçanın neden eridiği belirsiz kalırsa nedensellik kaybolur." / "Kum ve su görseli iyi olmazsa ucuz durur."
- *Savunma:* Parçalar yuvalara oturur. Dayanıklılık rengiyle gösterilir (ıslak kum koyu, taş gri). Gerçek bir zayıflık: Kurma oyunları "biriktir, bekle" hissine kayar. KAT KAT'ın her blokta yaşattığı anlık "oturdu mu?" gerilimini veremez.

**5. ÇIĞ**
- *Saldırı:* "Bilinen bir oyunun mekaniğine fazla benziyor." / "Kamera hareketli olduğu için isimler okunmaz."
- *Savunma:* Zayıf. Kamera sabitlense bile isim okunurluğu düşük kalır. Elendi.

**6. PARAŞÜT**
- *Saldırı:* Yukarıdaki etik ikilem.
- *Savunma:* "Hediye isabeti değil, deneme hakkını artırır" denebilir, ama bu da şans satın almaktır ve kumar benzeri bir mekaniğe yaklaşır. **Elendi**, yalnızca KAT KAT içinde bir "olay" (rüzgâr gösterisi) olarak düşünülebilir.

**7. MAHALLE KAZANI**
- *Saldırı:* "Final hükmü rastgele ya da elle yazılmış metin. Tekrar edince komedi biter." / "Serbest metin malzeme = moderasyon riski (küfür, uygunsuz kelime)."
- *Savunma:* Malzemeler kapalı listeden seçilir. Komik hükümler kombinasyonlardan üretilebilir. Yine de Madam Fatoş ve Troll Meclisi'nin "tekrar eden yanıt" sorununu taşır. Bir sonraki oyunun **mini modu** olarak daha uygun.

**8. GÖKYÜZÜNE YAZ**
- *Saldırı:* "Bu bir oyun değil. TikTok LIVE Studio'nun kendi hediye alarmlarının pahalı bir versiyonu. Doldur-patlat yapısı Balonu Patlat'ın kostümü."
- *Savunma:* Doğru. Ama içindeki en güçlü fikir (**ismin gökyüzüne ışıkla yazılması**) çok değerli. Bu yüzden tek başına bir oyun olarak değil, KAT KAT ve SAL'ın **efsane kademe hediyesi ve tur zaferi kutlaması** olarak kullanılmalı.

**Önceki adaylar (Köprü Ekibi, Zincir Şehri) neden burada ilk sırada değil?**
İkisi de izleyiciden **tasarım kararı** istiyor ("halatı nereye bağlayalım?"). Bu, yorumların 2–5 saniye gecikmeyle geldiği ve izleyicinin çoğunun ilk 3 saniyede kaydırdığı bir ortamda yavaş kalır. Kolektif tasarım ağır bir bilişsel yüktür. KAT KAT aynı "birlikte bir yapı kurduk" duygusunu **tek fiil** ile veriyor. Zincir Şehri'nin fizik zinciri fikri ise KAT KAT'ın ileriki bir sürümüne "çöküş zincirleme olayı" olarak taşınabilir.

---

## C) Puan tablosu (1–10, editoryal tahmin)

Ölçütler: **Anla** = 3 sn'de anlaşılma · **Hediye** = hediye motivasyonu · **Ücretsiz** = yorum/beğeniyle katılımın değeri · **Final** = tekrar oynanabilirlik ve final anı · **3D** = görsel çekicilik (3D'nin 2D'ye göre farkı) · **MVP** = tek kişiyle 1–2 haftada yapılabilirlik

| # | Fikir | Anla | Hediye | Ücretsiz | Final | 3D | MVP | **Toplam /60** |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | **KAT KAT** | 9 | 8 | 8 | 9 | 8 | 8 | **50** |
| 2 | **SAL** | 8 | 8 | 9 | 8 | 9 | 6 | **48** |
| 3 | GÖKYÜZÜNE YAZ | 10 | 9 | 5 | 4 | 8 | 9 | **45** |
| 4 | **NE BU?** | 8 | 5 | 10 | 7 | 6 | 8 | **44** |
| 5 | DALGA GELİYOR | 7 | 7 | 7 | 8 | 8 | 6 | **43** |
| 6 | PARAŞÜT | 8 | 5 | 8 | 6 | 7 | 7 | **41** |
| 7 | ÇIĞ | 7 | 7 | 7 | 7 | 8 | 5 | **41** |
| 8 | MAHALLE KAZANI | 7 | 6 | 7 | 5 | 6 | 7 | **38** |

**Tablonun yorumu:** GÖKYÜZÜNE YAZ ham puanla üçüncü sırada, ama bir oyun değil, bir **katman**. Ücretsiz katılımı ve tekrar değeri zayıf, ayrıca TikQo'daki "doldur-patlat" kalıbının kostümü. Bu yüzden derinleştirmeye alınmadı. Fikir, KAT KAT ve SAL'ın efsane hediye ve zafer kutlaması olarak içeri katıldı. Üçüncü derinleştirilen fikir **NE BU?** oldu, çünkü en yüksek ücretsiz katılım puanına sahip ve diğer ikisinden tamamen farklı bir aileden (bilgi yarışması) geliyor.

---

## D) En iyi 3 fikrin derinleştirilmesi

> **Güvenli alan varsayımı (1080×1920):**
> - Üst ~0–170 px: TikTok yayıncı adı/izleyici sayısı rozeti (kısmen kapalı, kritik bir şey konmaz).
> - Sağ ~0–150 px şerit (x ≥ 930): Paylaş/hediye/beğeni düğmeleri.
> - Alt ~%35 (y ≥ ~1250): Yorum akışı + hediye/yorum giriş çubuğu.
> - **Ana sahne güvenli bölge: x 40–930, y 180–1250.** Tüm kritik metin ve "an"lar burada olur. Alt bölge yalnızca dekor/atmosfer (zemin, su) taşır.
> - Gerçek TikTok arayüzü üzerinde ilk gün ölçülmeli (ekran görüntüsü + ızgara).

---

### D1. KAT KAT — Birlikte en yüksek kuleyi dik

**Tek cümle:** Herkesin isimli bloğu aynı kuleye düşer. Rüzgâr kuleyi devirmeye çalışır. Rekoru birlikte kırarız.

#### Tur döngüsü (~90 sn + 8 sn sonuç)
| Zaman | Ne olur |
|---|---|
| 0–3 sn | Kamera boş zemine iner. Ekranda "REKOR: 27 KAT" ve "YORUM YAZ = BLOK" yazar. Vinç sallanmaya başlar. |
| 3–60 sn | Her yorum bir blok düşürür. Rüzgâr göstergesi kat sayısıyla yükselir. Kayma birikir, kule görünür şekilde salınır. Kamera kuleyle birlikte yükselir (kule hep güvenli bölgede kalır). |
| 60–80 sn | **"FIRTINA"** fazı: Rüzgâr ikiye katlanır, kule daha çok sallanır. Rekor çizgisine yakınsa çizgi yanıp söner ("REKORA 2 KAT"). Goal gradient doruğu. |
| 80–90 sn | Son 10 sn sayacı. Kule ayakta kalırsa **"KULE AYAKTA!"** zaferi + havai fişek. Rekor kırılırsa rekor anı. |
| Herhangi bir an | Kayma eşiği aşılırsa **ÇÖKÜŞ**: Ağır çekim, fizik motoru açılır, bloklar isimleriyle savrulur, kamera geri çekilir. |
| +8 sn | Sonuç kartı (üst-orta): "**31 KAT** · Temeli atan: @a · Rekoru kıran: @b · Kurtaran: @c". Sonra yeni tur. |

Yayın sonunda "Gecenin rekoru" gösterilir. Yayınlar arası tek kalıcı veri **tüm zamanlar rekoru (kat sayısı + rekoru kıranın adı)** olur. Kilometre taşı tabelaları Türk izleyicinin bildiği yüksekliklerle eşlenebilir ("10 kat: apartman", "Galata Kulesi'ni geçtik!"). Bu, ucuz ama güçlü bir ilerleme hissi verir.

#### Yorum komutları
- **Herhangi bir yorum = blok.** Komut ezberi yok. Bu oyunun 3 saniye kozu.
- (İsteğe bağlı, v2) **"dur"**: Vinci 1 sn dondurur, ama blok yerine sayılır. MVP'de yok.

#### Beğeni etkisi
- Beğeniler **rüzgârı sakinleştirir**. Ekranda bir rüzgâr gülü/bayrak vardır, beğeni yağdıkça bayrak iner ve kayma payı küçülür.
- 10 sn içinde belirli bir beğeni eşiği aşılırsa "**SAKİN HAVA**" 5 sn sürer (bloklar neredeyse tam oturur). Ücretsiz kolektif güç budur, yayıncının en çok kullanacağı çağrı da budur: "Beğeni yağdırın, rüzgârı kesin!"

#### Hediye kademeleri
| Kademe | Ne olur | Ekranda |
|---|---|---|
| **Küçük (1–9 jeton, gül)** | **Altın blok:** Gönderenin adıyla altın bir blok **tam ortaya** oturur ve son 1 bloğun kaymasını sıfırlar. Kombo serisinde **her adet ayrı bir altın blok** olur (anında, seri sonunu beklemeden). Saniyede en fazla 2 blok düşer, fazlası ışıklı sırada bekler. | Blok yüzünde isim + fotoğraf, "MÜKEMMEL!" parıltısı |
| **Orta (10–199)** | **Çelik kiriş:** Geniş bir plaka iner ve tüm kuleyi **dikleştirir** (birikmiş kaymanın yarısını siler). Kule rüzgârda 10 sn daha az sallanır. | Üst-orta isim bandı (2,5 sn), kirişte büyük isim |
| **Büyük (200–999)** | **Dev prefabrik kat:** Ağır çekim. Helikopter/vinç, gönderenin dev fotoğrafı asılı **3 katlık** bir prefabrik bloğu indirir, kule birden yükselir ve kayma sıfırlanır. Kamera kuleyi 360° döner. | Tam ekran genişliğinde isim + 220 px fotoğraf, 4 sn |
| **Efsane (1000+)** | Büyük kademe + **gökyüzüne ismini havai fişekle yazar** (GÖKYÜZÜNE YAZ katmanı) + kulenin tepesine isimli bayrak dikilir (tur boyunca kalır). | Gecenin kahramanı plakası |

**Kritik kural:** Hiçbir hediye kuleyi devirmez. Hediye her zaman **kurtarır**. Böylece "para attım, yıkıldı" öfkesi yaşanmaz ve hediye prososyal kalır. Kuleyi yalnızca ücretsiz blokların kayması ve rüzgâr devirebilir.

**Tek hediye turu bitirmez:** Büyük hediye bile 3 kat ekler. Hedefe ulaşmak için ücretsiz bloklara yine ihtiyaç vardır.

#### İsim ve profil fotoğrafı
- **Her blokta** bir ön yüz bulunur: sol tarafta yuvarlak fotoğraf (blok yüzünün ~%40'ı), sağda isim (CanvasTexture). Kamera bloklara yakın olduğundan, yeni düşen blok ilk 1,5 sn'de **büyük ve okunur** görünür.
- Bloklar yığıldıkça kamera geri çekilir ve eski isimler küçülür. Bu kabul edilebilir, çünkü tanınma anı **iniş anıdır**.
- Sol üstte **"SON DÜŞENLER"** şeridi (en fazla 3 fotoğraf + isim) bulunur. Kamera geri çekildiğinde de kişi kendini bulabilir.

#### Final anları
- **Çöküş (en paylaşılabilir an):** 1,5 sn ağır çekim, bloklar isimleriyle savrulur, toz bulutu, "KULE YIKILDI · 23 KAT" yazısı. Suçlama yoktur: "son blok" yerine "rüzgâr kazandı" denir. İsteğe bağlı olarak son bloğu koyan ismin yanında komik bir "ups" etiketi gösterilebilir (yayıncı ayarı, varsayılan kapalı).
- **Zafer:** Tur sonunda kule ayaktaysa zafer, rekor kırıldıysa rekor kıranın büyük kartı ve havai fişek.
- **Kahraman rolleri:** Temeli atan (ilk blok), rekoru kıran (rekor çizgisini geçen blok), kurtaran (sallanma kritikteyken hediye/sakin hava tetikleyen kişi). Böylece tek bir "son vuruşçu" yerine üç kişi tanınır.

#### Yayıncının sesli rolü (örnek replikler)
- Tur başı: "Yeni kule! Yorum yazan herkesin bloğu düşüyor, rekor 27 kat, hadi geçelim!"
- Ücretsiz çağrı: "Rüzgâr arttı, beğeni yağdırın, rüzgârı keselim!"
- Hediye: "Ayşe altın blok attı, tam ortaya! Teşekkürler Ayşe!" / "Mehmet'in kirişi geldi, kule dümdüz oldu!"
- Gerilim: "Sallanıyor... sallanıyor... iki kat kaldı rekora!"
- Çöküş: "Gittiii! 23 katta rüzgâr kazandı! Bir sonraki tur intikam!"
- Zafer: "REKOR! 31 KAT! Rekoru kıran @b, temeli atan @a!"

Oyun yayıncıya **küçük bir yardım şeridi** de verebilir (yalnızca yayıncı panelinde, yayın ekranında değil): "Rekora 2 kat · Rüzgâr yüksek · Son hediye: Ayşe".

#### Ekran yerleşimi (1080×1920, ölçeksiz ASCII)

```
x: 0                                          930    1080
   +--------------------------------------------+------+  y=0
   | [TikTok: yayıncı adı / izleyici] (KAPALI)  |      |
   |............................................|      |  y~170
   |  REKOR 27 KAT          [RÜZGAR ~~~>  ##--]  |  S   |
   |  KAT: 19   0:42                            |  A   |
   |  SON DÜŞENLER:                             |  Ğ   |
   |  (o)@ayse (o)@mert (o)@zey                 |      |
   |                  _[VİNÇ]______             |  K   |
   |                       |                    |  E   |
   |                    [BLOK@x]  <- düşen      |  N   |
   | - - - - - - - - REKOR ÇİZGİSİ - - - - - -  |  A   |
   |                 [=@ali====]                |  R   |
   |                [===@su===]                 |      |  <- büyük "an"
   |               [==ALTIN@ayse=]              |  (K  |     isim bandı
   |                 [==@can==]                 |  A   |     y 300-520
   |                [==@efe===]                 |  P   |
   |               ^ kule hep bu bantta ^       |  A   |
   |                                            |  L   |
   |............................................|  I)  |  y~1250
   | ////// YORUM AKIŞI + HEDİYE BUTONLARI ///// |      |
   | ////// (KAPALI — yalnız zemin/dekor)  ///// |      |
   | ////// şantiye zemini, toz, ışık      ///// |      |
   +--------------------------------------------+------+  y=1920
```
- Kule ekseni x ≈ 470'te (güvenli alanın ortası, sağ şeritten uzak).
- Kamera, **kulenin tepesi y ≈ 450–650 arasında** kalacak şekilde yükselir. Düşen blok her zaman üst-orta bölgededir.
- Büyük hediye bandı y ≈ 300–520 arasında, tam genişlikte (x 40–930) gösterilir.

#### Riskler ve önlemler
| Risk | Önlem |
|---|---|
| Fizik titremesi / kendiliğinden çöküş | Kinematik istif + matematiksel devrilme kontrolü. Fizik (cannon-es / Rapier) yalnızca çöküşte açılır. |
| Şans ağırlıklı, "beceri yok" | Beğeni ve hediyeyle **risk yönetimi**. Yayıncı anlatımı gerilimi taşır. Tur kısa tutulur. |
| Az izleyici (3–5 kişi) | Kat sayısı yine artar. "Sakin hava" eşiği izleyici sayısına göre ölçeklenir. Yayıncı da test panelinden blok atabilir. |
| Çok izleyici (yorum seli) | Saniyede 2 blok sınırı, fazla isimler bloğa "imza" olarak eklenir, kuyruk sınırı vardır. |
| Profil fotoğrafı CORS / yüklenememe | Sunucu üzerinden proxy + varsayılan baş harfli renkli disk. |
| İsimde uygunsuz ifade | Filtre + kısaltma (en fazla 14 karakter). |
| Tekrar yorgunluğu (1 saat aynı kule) | Turlar arası kilometre taşları, gece rekoru ve 3 farklı zemin teması (şantiye, çatı, sahil). Tema MVP sonrasında gelir. |
| LIVE Studio'da performans | Düşük poligon, gölge yalnızca kuleye, blok sayısı 60'ı aşınca alttaki bloklar tek bir mesh'e birleştirilir. |

---

### D2. SAL — Sal batmasın, karaya çıkalım

**Tek cümle:** Herkes aynı salda. Sal yatarsa suya düşersin. Beğeniyle kürek çekip adaya varırız.

#### Tur döngüsü (~100 sn)
| Zaman | Ne olur |
|---|---|
| 0–5 sn | Sal iskeleden ayrılır, uzakta ada görünür. "YORUM YAZ = SALA ATLA". |
| 5–70 sn | Yorumcuların avatarları sala atlar (paraşüt gibi değil, iskeleden ya da tekneden komik bir zıplama). Sal ağırlığa göre yatar. Beğeniler kürek çeker ve mesafe çubuğu dolar. Dalgalar periyodik olarak salı yatırır. |
| 70–90 sn | **FIRTINA:** Büyük dalgalar gelir. Yatma eşiğini aşan taraftaki avatarlar kayar ve suya düşer (komik sıçrama). Düşen tekrar yorum yazarak geri atlayabilir. |
| 90–100 sn | Mesafe dolduysa sal adaya varır, avatarlar kumsala atlayıp dans eder. **"KARAYA ÇIKANLAR"** duvarı: fotoğraflar sırayla düşer. Dolmadıysa sal dev bir dalgayla devrilir, herkes suda ve "bir dahaki sefere" denir. |

#### Yorum komutları (2 adet + serbest)
- **Herhangi bir yorum:** İlk kez yazıyorsan sala atlarsın. Zaten saldaysan avatarın el sallar (görünürlük).
- **"sol" / "sağ":** Kendi avatarın o tarafa yürür. Salı dengelemek için kişisel bir kontrol sağlar. Bu oyunun "benim kararım" katmanıdır.

#### Beğeni etkisi
- Her beğeni paketi **kürek çekişi** olur: Sal ileri gider ve mesafe çubuğu dolar. Ortak ilerlemenin ana motoru beğenidir. Yayıncı çağrısı: "Kürek kürek kürek! Beğeni yağdırın!"

#### Hediye kademeleri
| Kademe | Ne olur |
|---|---|
| **Küçük (gül)** | **Can simidi:** Gönderenin avatarına simit takılır, bu tur suya düşmez. Suda biri varsa simit ona fırlatılır ve onu kurtarır ("@ayse, @mert'i kurtardı!"). Prososyal kahraman anı. Kombodaki her adet ayrı bir simittir. |
| **Orta** | **Kalas:** Salın kenarına gönderenin adı yazılı bir kalas eklenir. Sal genişler ve daha zor yatar (kalıcı yardım, tur sonuna kadar). |
| **Büyük** | **Yunus/balina itişi:** Dev bir deniz canlısı gönderenin adı ve fotoğrafıyla sudan çıkar, salı ileri iter (+%25 mesafe, ağır çekim su sıçraması) ve suda olanları sırtına alıp sala geri fırlatır. |
| **Efsane** | Büyük kademe + ada varışında gökyüzüne isim yazan havai fişek + "Kaptan @x" şapkası (tur boyunca). |

Hediye kimseyi suya düşürmez. Salı yatırma gücü yalnızca ücretsiz "sol/sağ" ve ağırlıkta vardır.

#### İsim ve fotoğraf
- Avatar: kapsül gövde + kafa yerinde yuvarlak **profil fotoğrafı diski** (kamera her zaman ona dönük, billboard). İsim etiketi başın üstündedir.
- Sahnede aynı anda en fazla ~30 avatar olur. İsim etiketi yalnızca **son 5 katılımcıda, hediye atanlarda ve komut yazan kişide** (3 sn) büyük gösterilir. Diğerlerinde yalnızca fotoğraf diski görünür.
- Suya düşüş anında düşenin ismi kısa süre büyür ("ŞAPUR! @can").

#### Final anı
- **Varış:** Avatarlar sırayla kumsala atlar, kamera adaya döner ve fotoğraf duvarı oluşur ("KARAYA ÇIKANLAR: 17 kişi"). En çok "kurtaran" kişi ayrıca gösterilir.
- **Batış:** Dev dalga, ağır çekim, herkes suda yüzer. Komik ama cezasız: Bir sonraki turda herkes yine iskelede.

#### Yayıncının rolü
- "Sala atlayan atlasın! Sol tarafta herkes birikti, sağa geçin sağa!"
- "Kürek kürek! Beğeniler kürek!"
- "Can düştü! Biri simit atsın... AYŞE ATTI! Kurtardı!"
- "Ada göründü! Son dalga geliyor, dengeleyin!"

#### Ekran yerleşimi

```
x: 0                                          930    1080
   +--------------------------------------------+------+  y=0
   | [TikTok üst bant] (KAPALI)                 |      |
   |............................................|      |  y~170
   |  ADA: [#########-----] 64%      0:58       |  S   |
   |  YORUM = ATLA  ·  sol / sağ                |  A   |
   |                         ___ADA___          |  Ğ   |
   |                     ~~~~/  palmiye \~~~~    |      |
   |   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~   |  K   |
   |        (o)  (o)(o)   (o)  (o)              |  A   |
   |       @ayse  @can   @mert                  |  P   |
   |    \==========SAL (yatma açısı)=========/  |  A   |
   |   ~~~~~~~~ (o) <- suya düşen ~~~~~~~~~~~   |  L   |
   |   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~   |  I   |
   |   [ büyük an: yunus + isim bandı y 300-500]|      |
   |............................................|      |  y~1250
   | ////// YORUM/HEDİYE ARAYÜZÜ (KAPALI) ///// |      |
   | ////// yalnız deniz, köpük, dalga    ///// |      |
   +--------------------------------------------+------+  y=1920
```
- Sal y ≈ 750–950 arasında, kamera üç çeyrek yukarıdan bakar. Sağ kenara yakın avatarlar sağ şeride girmesin diye sal genişliği x 120–860 ile sınırlanır.

#### Riskler
| Risk | Önlem |
|---|---|
| MVP iş yükü (su, karakter, yatma, kayma) | Fizik motoru yok. Yatma açısı = ağırlıkların tork toplamı, kayma = açı eşiğinde basit bir tween. Su = hazır shader. |
| Troll'ün herkesi düşürmesi | Bir kişinin ağırlığı sınırlıdır, "sol/sağ" 3 sn bekleme süresiyle çalışır, düşenler tekrar katılır. |
| Kalabalıkta isim okunmazlığı | Seçici isim gösterimi + büyük an bandı. |
| "Sol/sağ" Türkçe yazım çeşitleri | "sol", "sağ", "sag", "<", ">" gibi kısa eşleşmeler. |
| Oyunun 1 saat sonra tekrar etmesi | Gece/gündüz, farklı adalar ve fırtına türleri (v2). |

---

### D3. NE BU? — Sisteki nesneyi ilk bilen kazanır

**Tek cümle:** Siste dönen 3D nesneyi ilk doğru yazan kürsüye çıkar.

#### Tur döngüsü (~45–60 sn, kısa ve sık)
| Zaman | Ne olur |
|---|---|
| 0–3 sn | "NE BU?" yazısı. Nesne yoğun sis içinde, aşırı yakın plan ve garip bir açıdan döner. Kategori ipucu görünür ("MUTFAK"). |
| 3–40 sn | Sis yavaşça açılır, kamera uzaklaşır. Beğeniler sisi hızlandırır. Yanlış tahminler küçük balonlarla nesnenin etrafında uçuşur (en fazla 4, komik akış). |
| İlk doğru yorum | Sis bir anda açılır, nesne tam görünür, ışık patlaması olur. Bilen kişinin fotoğrafı **kürsüye fırlar** (büyük isim + "BİLDİ! 4,2 sn"). |
| +5 sn | Gecenin "Bilgi Krallığı" ilk 3'ü kısa süre gösterilir, ardından yeni nesne gelir. |

#### Yorum komutları
- **Tahminini yaz.** Komut yok. Eşleştirme toleranslıdır (küçük-büyük harf, Türkçe karakterler, "caydanlik" = "çaydanlık", eş anlamlılar listesi).

#### Beğeni etkisi
- Beğeniler **sisi açar** (kolektif ipucu). Az izleyicide de turun ilerlemesini sağlar.

#### Hediye kademeleri (herkese yarar, gönderene görünürlük)
| Kademe | Ne olur |
|---|---|
| **Küçük** | **İpucu harfi:** Cevabın bir harfi **herkese** açılır ("Ç _ _ _ _ _ _ _ _"). Ekranda "İpucu: @ayse'den". |
| **Orta** | **Kamera döndür:** Nesne en tanıdık açısına döner + sis yarıya iner. İsim bandı gösterilir. |
| **Büyük** | **Sponsor turu:** Bir sonraki turu gönderen "sunar". Ekranda "@mert SUNAR" yazar, kazanan için kürsü altın olur ve kazananla sponsorun fotoğrafı yan yana çıkar (cömertlik görünürlüğü). Sonuca etkisi yoktur. |

Hediye, gönderene **özel** bir avantaj sağlamaz. İpucu herkese açılır. Bu sayede izleyiciler arasında satın alınmış üstünlük oluşmaz (Kısmet hakemlerinin kuralıyla uyumlu).

#### İsim ve fotoğraf
- Kürsüde 260 px fotoğraf ve 90 px isim, y ≈ 350–600 arasında.
- Yanlış tahmin balonlarında küçük fotoğraf ve kelime gösterilir (eğlence + görünürlük). Uygunsuz kelime filtresi zorunludur.

#### Final anı
- Her tur bir mini finaldir ("BİLDİ!"). Yayın sonunda gecenin en çok bileni 3D kupa ile gösterilir.

#### Yayıncının rolü
- "Bu ne ya? Mutfakta var, her evde var..." (yayıncı kendisi de tahmin eder, izleyiciyle yarışır).
- "Beğeni atın, sis açılsın!"
- "Ayşe harf açtı herkese, ÇAY ile başlıyor!"
- "MERT BİLDİ! 4 saniye! İnanılmaz!"

#### Ekran yerleşimi

```
x: 0                                          930    1080
   +--------------------------------------------+------+  y=0
   | [TikTok üst bant] (KAPALI)                 |      |
   |............................................|      |  y~170
   |         NE BU?   (kategori: MUTFAK)        |  S   |
   |         Ç _ _ _ _ _ _ _ _     0:21         |  A   |
   |      .  .  sis  .  .  .  .  .  .  .        |  Ğ   |
   |   .   ( "tencere?" ) .    .                |      |
   |     .     ___________     .  ("kettle")    |  K   |
   |    .     /  DÖNEN     \  .                 |  A   |
   |      .   \   NESNE    /    .               |  P   |
   |    .      \__________/  .  .               |  A   |
   |       .  .  .  .  .  .  .  .               |  L   |
   |     [ KÜRSÜ: (FOTO) @mert BİLDİ! ]         |  I   |
   |............................................|      |  y~1250
   | ////// YORUM/HEDİYE ARAYÜZÜ (KAPALI) ///// |      |
   +--------------------------------------------+------+  y=1920
```

#### Riskler
| Risk | Önlem |
|---|---|
| Hediye geliri zayıf | Bilinçli bir seçim: Bu bir **kanal büyütme** oyunudur. KAT KAT'tan sonra, yorum yoğunluğu gereken yayınlarda kullanılır. |
| Nesne kütüphanesi biter | 60–80 nesne (CC0 / basit geometri) + kategori döngüsü. Aynı yayında tekrar etmez. |
| Yayın gecikmesi adaleti | Varış sırası esas alınır, iki tahmin aynı saniyedeyse ikisi de kürsüye çıkar. |
| Cevabın yorumlarda yayılması | Doğal ve kabul edilebilir: İlk bilen kazanır, sonrakiler "ben de bildim" konfetisi alır. |
| Yanlış tahminlerde uygunsuz kelime | Filtre, filtreye takılan balon gösterilmez. |

---

## E) Öneri: İlk olarak **KAT KAT** yapılmalı

### Neden KAT KAT?
1. **3 saniye testi en temiz olan:** "Yorum yaz → blok düşer → kule yıkılmasın." Kural yok, komut yok, kart yok. Kule ekranda yükseldikçe hedef kendi kendini anlatıyor.
2. **Kısmet/Kule'nin bütün hatalarını tersine çeviriyor:** Tek fiil, ortak düşman, sayı yerine fiziksel olay, anında geri bildirim, az yazı. "Kule" fikrindeki iyi çekirdeği (yükselen yapı, isimli katlar) koruyor, saldır/tamir bölünmesini atıyor.
3. **Hediye etkisi doğal ve etik:** Altın blok, çelik kiriş ve dev kat, hediyenin fiziksel karşılığı. Hepsi **kurtarır**, hiçbiri başkasının emeğini yıkmaz. Ücretsiz yol (yorum + beğeni) tek başına rekor kırabilir.
4. **Final anı bedava geliyor:** Çöküş ve rekor, tasarım gerektirmeyen ve paylaşılabilir anlar. Yayıncıya her 90 saniyede bir doğal bir doruk veriyor.
5. **3D gerçekten fark yaratıyor:** Sallanan kule, ağır çekim çöküş ve dönen kamera 2D HTML kartlarla yapılamaz. TikQo kataloğunda istif/denge oyunu yok.
6. **MVP gerçekçi:** Kinematik istif ve tek bir fizik anı, tek kişi + Claude için 1–2 haftada yapılabilir. Mevcut `tiktok-live-connector` bağlantı tecrübesi (Kısmet'teki gerçek yorum, profil fotoğrafı ve beğeni akışı doğrulandı) yeniden kullanılabilir.
7. **3 kişiyle de çalışıyor:** Takım bölünmesi yok. Yeni kanalda da kule yükselir.

**Sıralama:** 1) KAT KAT (gelir + eğlence), 2) NE BU? (kanal büyütme, KAT KAT'ın motorunu ve isim/fotoğraf altyapısını yeniden kullanır, kısa sürede çıkar), 3) SAL (en zengin ama en pahalı, KAT KAT gerçek yayında kendini kanıtlarsa).

### İlk sürüm (MVP) kapsamı — KAT KAT

**MVP'de OLACAKLAR**
- three.js tek sahne: düşük poligonlu şantiye zemini, gün batımı ışığı, sallanan vinç, 1080×1920 sabit tuval.
- Blok: isim + yuvarlak profil fotoğrafı yazılı ön yüz (CanvasTexture). Fotoğraf yüklenemezse baş harfli renkli disk.
- Kinematik istif: kayma hesabı, rüzgâr = kat sayısıyla artan rastgele sapma, devrilme kontrolü (kütle merkezi > destek kenarı).
- Çöküş anı: yalnızca o an fizik motoru (cannon-es veya Rapier) + 1,5 sn ağır çekim + kamera geri çekilme.
- Akıllı kamera: Kulenin tepesi hep güvenli bölgede (y 450–650) kalır.
- **Yorum → blok** (saniyede en fazla 2, fazlası bloğa imza).
- **Beğeni → rüzgâr sakinleşir** (bayrak göstergesi + "SAKİN HAVA" eşiği).
- **3 hediye kademesi**, hediye ID'si yerine jeton değeri bandına göre: altın blok / çelik kiriş / dev prefabrik kat. Kombodaki **her adet anında** görünür. Büyük anlar sıraya girer, aynı anda bir tane oynar.
- Ekranda yalnızca: REKOR, KAT + süre, rüzgâr göstergesi, SON DÜŞENLER (3) ve büyük an bandı.
- Tur döngüsü: 90 sn + fırtına fazı + 8 sn sonuç kartı (temeli atan / rekoru kıran / kurtaran).
- Gecenin rekoru + tüm zamanlar rekoru (yerel JSON, yalnızca kat sayısı ve isim).
- 5–6 ses efekti: blok oturma, altın parıltı, rüzgâr, çöküş, zafer, büyük an vurgusu.
- **Test paneli** (yayın ekranında değil): sahte yorum / beğeni yağmuru / küçük-orta-büyük hediye düğmeleri + klavye kısayolları + "50 izleyici simülasyonu".
- TikTok bağlantısı: Kısmet'teki `tiktok-live-connector` yaklaşımı (yorum, beğeni, hediye, profil fotoğrafı proxy'si).
- İsim filtresi (temel kara liste + 14 karakter sınırı).
- **Güvenli alan katmanı** (geliştirme modunda TikTok'un kapattığı bölgeleri gösteren yarı saydam maske).

**MVP'de OLMAYACAKLAR**
- Takımlar, roller, kral/muhafız benzeri unvan sistemleri.
- Kalıcı kullanıcı profilleri, puan defteri, liderlik tablosu, kalıcı fotoğraf saklama.
- Transaction log, kurtarma günlüğü, oyunlar arası hediye teslim kaydı (yalnızca basit bir olay günlüğü dosyası tutulur).
- Birden fazla tema/harita, kilometre taşı tabelaları (v2), "dur" komutu, efsane kademe havai fişeği (v2'de GÖKYÜZÜNE YAZ katmanı olarak).
- Yayın ekranında hediye vitrini veya hediye fiyat kartları (hediyenin ne yaptığını yayıncı söyler ve ilk hediye anı gösterir).
- Ayarlar menüsü, çoklu dil, mobil tarayıcı desteği.
- Kısmet Apartmanı ile ortak sunucu ya da oyun değiştirme altyapısı.

### Başarı ölçütü (ilk hafta)
1. **Sahte olaylarla oyun hissi testi (gün 3–5):** 3 kişiye 10 saniyelik ekran kaydı izletilir, "ne yapman gerekiyor?" diye sorulur. Hedef 3/3 doğru cevap.
2. **Gerçek ekran üstünde güvenli alan ölçümü:** TikTok LIVE Studio'da test yayını + telefondan ekran görüntüsü. Kule ve isimler hiçbir arayüz öğesinin altında kalmamalı.
3. **İlk gerçek yayın (30–45 dk):** Yorum sayısı/dakika, ilk hediyenin geldiği an, kaç turun rekor/çöküşle bittiği ve yayıncının söylediği replikler not edilir. "Kendi bloğumu gördüm" yorumu ve geri dönen izleyici en önemli niteliksel sinyallerdir.
4. Yayın sonrası karar: Eğlenceliyse KAT KAT'ın v2'si (tema, kilometre taşları, efsane katmanı) ve ardından NE BU? yapılır. Değilse, sorunun anlaşılma mı, hediye mi yoksa tempo mu olduğu ayrıştırılır. Altyapıya yatırım yapılmaz.
