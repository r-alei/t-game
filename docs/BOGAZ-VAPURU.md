# Boğaz Vapuru

İstanbul Boğazı'nda bitmeyen bir sabah seferi. Yorum yazan izleyici vapura biner. Her hediye, hediyeyi atan kişiye adıyla birlikte, kameranın gittiği bir an verir.

## Neden böyle kuruldu

- **Sahne hiç durmuyor.** Tur, kazanan ya da "oyun bitti" anı yok. Yamaçlar, camiler, köprüler ve martılar sürekli akıyor; yayına hangi saniyede girilirse girilsin ekran canlı.
- **Kamera yönetmen gibi davranıyor.** Boştayken 6 açıdan gezinti yapıyor; biri binince ya da hediye atınca o kişiye gidiyor.
- **Hediye kişinin kendisine bir an veriyor.** Kimseyi ezmiyor, sonucu satın aldırmıyor; atan kişiyi görünür kılıyor.
- **Ücretsiz yol gerçekten işliyor.** Yorum yazan biner, adı görünür ve kamera ona gider. Beğeniler martı sürüsünü büyütüyor.

## Geceden sabaha geçiş (13 Kasım 2026 analizi)

| Sorun | Neden | Çözüm |
|---|---|---|
| Ekran çok karanlıktı | Telefonda koyu sahne okunmuyor; isimler ve anlar parlak ışığa dayanıyordu, bu da her şeyi dağıtıyordu | Sabah ışığı, güneş kameranın yanında: yüzler ve isimler önden aydınlanıyor |
| Şehir suyun içinde görünüyordu | Kıyıda kara yoktu; binalar doğrudan suyun üstündeydi | Rıhtım ve tepelere tırmanan sabit bir kara şeridi; evler yamaca oturuyor |
| İstanbul olduğu anlaşılmıyordu | Silüetler genel ışıklı binalardı | Kiremit çatılı pastel evler, tepede kubbeli-kalem minareli camiler, Galata Kulesi, rıhtımda yalılar, asma köprü, Kız Kulesi, kıçta Türk bayrağı, süs bayrakları |
| Gece efektleri gündüz görünmez | Havai fişek, fener ve köprü ışıkları parlamaya dayanıyordu | Konfeti (opak kâğıt), hatıra fotoğrafı (flaş + polaroid), köprüye pankart, dikey dev isim |
| Menü ekranı kaplıyordu | Sağdaki 10 satırlık kolon sahnenin üstüne biniyordu | Menü üstte 2 satır × 5; alt yazı tam genişlikte |
| Güverte zemini beyazlaşıp titriyordu | Salon tavanı ile güverte zemini aynı yükseklikteydi (z-fighting) ve gölgede lekelenme vardı | Salon tavanı zeminin altına alındı, gölge payı (normalBias) eklendi |

## İzleyicinin yapabildikleri

| Etkileşim | Sonuç |
|---|---|
| Yorum | Vapura biner, kamera karşılar; yorumu başının üstünde balon olarak görünür (aynı anda en fazla 3 balon) |
| Beğeni | Vapurun çevresindeki martılar çoğalır; beğenen yolcu "hâlâ burada" sayılır, iskelede inmez |
| Takip / paylaşım | Vapurdaysa el sallar |

## İskele durakları ve inme kuralı

TikTok, izleyicinin yayından **çıktığını** bildirmiyor; yalnızca girişleri bildiriyor. Bu yüzden ayrılan izleyiciyi oyun kendi kuralıyla indiriyor:

- Vapur yaklaşık **3 dakikada bir** sağ yakadaki bir iskeleye yanaşır: Kadıköy, Beşiktaş, Üsküdar, Karaköy, Ortaköy, Kabataş, Beylerbeyi, Arnavutköy, Çengelköy, Bebek, Kandilli, Eminönü (sırayla).
- **Akış:** İskele ufukta belirir → vapur ~13 sn'de yavaşlar → yanaşınca düdük çalar → **9 sn** bekler → düdükle kalkar ve 5 sn'de hızlanır. Bir tam döngü yaklaşık 3,5 dakika sürer.
- **Kim iner:** Son **8 dakikadır** yorum, beğeni ya da hediye göndermemiş gerçek yolcular. Kaptan da bu kurala tabidir; inerse dümen boşalır ve bacadaki ad silinir. Sahnedeki ve pruvadakiler inmez (yakın zamanda hediye atmışlardır).
- İnenler vapurun iskele tarafına yürüyüp kaybolur. Alt yazıda "KADIKÖY iskelesi · İnenler: a, b, c +2" ya da "Kimse inmedi, herkes yolculukta!" görünür; kamera iskele çekimine geçer.
- Boşalan yerleri gerekirse isimsiz yolcular doldurur. İnen izleyici tekrar yorum yazarsa yeniden biner.
- Alttaki çağrı iki mesaj arasında döner: "Yorum yaz, vapura bin" ve "8 dk sessiz kalan iskelede iner".
- Süreler `config.ts` içindeki `TIMING.pierEvery`, `TIMING.dockSeconds` ve `TIMING.idleLeaveSeconds` değerleriyle değiştirilebilir.

## Hediye menüsü (üstte 2 satır)

Eşleme yalnızca `client/src/games/vapur/config.ts` içinde tutuluyor.

| Hediye | Menüdeki adı | Ne olur | Kamera |
|---|---|---|---|
| Gül (1) | SİMİT | Eline simit gelir, martılar başına toplanır | Yakın çekim |
| GG (1) | DÜDÜK | Düdük çalar, bacadan buhar çıkar, herkes el sallar | Baca |
| Parmak Kalp (5) | ÇAY | 30 sn elinde çay bardağı | Yakın çekim |
| Parfüm (20) | PRUVA | 90 sn boyunca pruvada durur (4 kişilik yer) | Pruva |
| Donut (30) | FOTO | Flaş patlar, adının yazılı polaroid hatıra fotoğrafı belirir | Yakın çekim |
| Konfeti (100) | KONFETİ | Güvertenin üstünde konfeti patlar, adı göğe yazılır | Güverte + gök |
| Mikrofon (100) | ŞARKI | 20 sn kıçtaki sahnede şarkı söyler, başından notalar yükselir, güverte kollarını sallar | Sahne |
| Küçük Taç (99) | KAPTAN | Dümene geçer, adı bacaya yazılır; yeni kaptan gelene kadar kalır | Kaptan köşkü |
| Corgi (299) | KÖPRÜ | Sıradaki köprüye adının yazılı dev pankart asılır | Köprü |
| Kupa (500) | KIZ KULESİ | Kulenin üstünde dev isim, konfeti, uzun düdük | Kule (sarsıntılı) |

Menüde olmayan hediyeler değerine göre düşer:
- 1–9 jeton → simit
- 10–99 jeton → çay
- 100 jeton ve üstü → konfeti

## Ekran yerleşimi (1080×1920)

- **y ≈ 196–440:** başlık ve yolcu sayısı/kaptan (tek satır), hediye menüsü (2 satır), ilk 3 destekçi (tek satır). TikTok'un üst çubuğu ve sıralama rozetleri ~265 px'e kadar iniyor; başlık bundan daha yukarı alınamaz.
- **y ≈ 450–1240:** sahne. Kamera çekimleri vapuru ve kişiyi bu aralığa yerleştirir.
- **y ≈ 1025–1240:** hediye alt yazısı ve "Yorum yaz, vapura bin" çağrısı.
- **y > 1260:** TikTok'un yorum akışı kapatıyor.

Bölgeleri görmek için adrese `?guides=1` ekle.

## Kalabalık kuralları

- Vapurda 40 koltuk var. Gerçek yolcu 12'den azsa boşluğu isimsiz yolcular dolduruyor; gerçek izleyici gelince yerini ona bırakıyorlar.
- Koltuklar iskeleyi beklemeden dolarsa en uzun süredir sessiz olan sıradan yolcu hemen iniyor; özel roldekiler inmiyor.
- İsim etiketi yalnızca yeni binen, aktif ya da özel roldeki kişide görünüyor. Yakın çekimde yalnızca odaktaki kişinin etiketi kalıyor.
- Gökyüzünde aynı anda tek isim görünüyor.
- Kamera kuyruğu dolunca düşük öncelikli çekimler atlanıyor; efekt yine oynuyor.

## Dosyalar

```
client/src/games/vapur/
  VapurGame.ts       Olay → yolcu + an + kamera çekimi
  config.ts          Hediye menüsü, vapur ölçüleri, süreler
  passengers.ts      Yolcu figürü, koltuk dağıtımı, roller
  effects.ts         Martılar, konfeti, notalar, buhar, el nesneleri
  hud.ts             Üst şerit (başlık, menü, ilk 3), çağrı, hatıra fotoğrafı
  world/
    environment.ts   Sabah göğü, güneş, bulutlar, pus, deniz
    ferry.ts         Vapur modeli, süs bayrakları, Türk bayrağı, bacadaki kaptan adı
    scenery.ts       Kara şeridi, yamaç evleri, cami, Galata, köprü, Kız Kulesi, iskele
    flag.ts          Dalgalanan Türk bayrağı
    textures.ts      Kodla üretilen dokular
client/src/engine/director.ts   Yönetmen kamera
```

## Bilinen eksikler / sonraki adımlar

- **Gerçek yayında denenmedi.** TikTok arayüzünün kapattığı alanlar tahmine dayanıyor; telefonda `?guides=1` ile kontrol edilmeli.
- **Performans LIVE Studio'da ölçülmedi.** Sabah sahnesinde gölge ve çok sayıda ev var; gerekirse gölge çözünürlüğü düşürülebilir.
- **Kalıcılık yok:** Sayfa yenilenince yolcular ve destek sıralaması sıfırlanıyor.
- **Ses varsayılan olarak kapalı.** Kodla üretilmiş sesler yayında rahatsız ediciydi. Panelde **Ses aç / Ses kapat** düğmeleri var; açıkken düdük yumuşak ve en fazla 20 sn'de bir, konfeti sesi boğuk ve kısık çalıyor. Daha iyi ses için gerçek kayıt dosyaları (martı, uzak vapur düdüğü, dalga) eklenebilir.
- **Yolcu figürleri basit** (kodla yapılmış oyuncak figürler).
