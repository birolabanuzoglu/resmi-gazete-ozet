#!/usr/bin/env python3
"""Mevzuat rafları: özetlerdeki "Kurum:" satırlarından kurum başına düzenleme listeleri üretir.

Uygulamadaki (2.5) "Mevzuat" ekranı bu dosyaları okur. Yayinla.index_yaz() her yayında çağırır;
tek başına da çalışır: python3 gorev/mevzuat_dizin.py [--rapor]

Çıktı (depo kökünde mevzuat/):
  raflar.json      raf listesi: kimlik, ad, grup, düzenleme sayısı, son tarih, dosya boyutu (bayt)
  yeni.json        bütün kurumlardan en yeni YENI_SAYI düzenleme
  r/<kimlik>.json  bir rafın bütün düzenlemeleri (en yeni başta)

Bir düzenlemenin alanları (kısa anahtarlar, boş olanlar yazılmaz):
  t tarih (yyyyMMdd) · n sayı (Resmî Gazete numarası) · m mükerrer sayı numarası · k tür
  b başlık · y yürürlük · h bağlantı (günün adresinden sonraki bölüm; başka bir adres ise tamamı)
  s kısa açıklama · p 1: personel mevzuatı · a asıl kurum adı (rafın adından farklıysa) · r raf (yalnız yeni.json)

Tür anahtarları: kan Kanun · khk Kararname · yon Yönetmelik · teb Tebliğ · kar Karar · yar Yargı kararı ·
ata Atama · and Andlaşma · dig Diğer.

Kurum adları özetlerde farklı yazılabildiği için (Çevre Bakanlığı / Çevre ve Şehircilik / Çevre, Şehircilik ve
İklim Değişikliği; EPDK / Enerji Piyasası Düzenleme Kurulu) RAFLAR tablosundaki takma adlarla eşleştirilir.
Eşleşmeyen ya da çok az düzenlemesi olan kurumlar "Diğer kurumlar" rafına girir; bu dosyadaki tablo,
arşiv doldukça sık görülen yeni kurumlar için genişletilir (python3 gorev/mevzuat_dizin.py --rapor).
"""
import html
import json
import os
import re
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SURUM = 1
YENI_SAYI = 120
ACIKLAMA_UZUNLUGU = 150
YURURLUK_UZUNLUGU = 90
# Bu kadar düzenlemesi olmayan "kurum ve kuruluşlar" rafları "Diğer kurumlar" rafına katılır;
# arşiv doldukça kurum bu sayıyı geçince kendi rafını kazanır.
EN_AZ_KURUM_RAFI = 3

G_CB = "Cumhurbaşkanlığı ve TBMM"
G_BAK = "Bakanlıklar"
G_KUR = "Kurum ve kuruluşlar"
G_YAR = "Yargı"
G_UNI = "Üniversiteler"
G_DIG = "Diğer"
GRUPLAR = [G_CB, G_BAK, G_KUR, G_YAR, G_UNI, G_DIG]

# (kimlik, ad, grup, takma adlar). Takma adlar normalleştirilmiş kurum adında (küçük harf, noktalamasız,
# "î â" düzeltilmiş) tam sözcük olarak aranır; sonu "*" olanın devamı serbesttir (üniv* → üniversitesi).
# Bir kurum satırı birden çok rafa uyabilir ("Millî Eğitim ve Hazine ve Maliye Bakanlıkları").
RAFLAR = [
    ("cb", "Cumhurbaşkanlığı", G_CB, ["cumhurbaşkanlığ*", "cumhurbaşkanı*"]),
    ("tbmm", "TBMM", G_CB, ["tbmm", "türkiye büyük millet meclisi"]),

    ("adalet", "Adalet Bakanlığı", G_BAK, ["adalet bakanlığı", "türkiye adalet akademisi"]),
    ("aile", "Aile ve Sosyal Hizmetler Bakanlığı", G_BAK,
     ["aile ve sosyal hizmetler", "aile çalışma ve sosyal hizmetler", "aile ve sosyal politikalar", "aile ve gençlik fonu"]),
    ("calisma", "Çalışma ve Sosyal Güvenlik Bakanlığı", G_BAK, ["çalışma ve sosyal güvenlik"]),
    ("cevre", "Çevre, Şehircilik ve İklim Değişikliği Bakanlığı", G_BAK,
     ["çevre şehircilik ve iklim", "çevre ve şehircilik", "çevre şehircilik", "çevre bakanlığ*", "çevre bakanlık*", "kentsel dönüşüm başkanlığı", "tabiat varlıklarını koruma", "çşid"]),
    ("disisleri", "Dışişleri Bakanlığı", G_BAK, ["dışişleri"]),
    ("enerji", "Enerji ve Tabii Kaynaklar Bakanlığı", G_BAK, ["enerji ve tabii kaynaklar", "eüaş", "tedaş"]),
    ("genclik", "Gençlik ve Spor Bakanlığı", G_BAK, ["gençlik ve spor"]),
    ("hazine", "Hazine ve Maliye Bakanlığı", G_BAK, ["hazine ve maliye", "maliye bakanlığı", "gelir idaresi", "gib"]),
    ("icisleri", "İçişleri Bakanlığı", G_BAK, ["içişleri", "afad"]),
    ("kultur", "Kültür ve Turizm Bakanlığı", G_BAK, ["kültür ve turizm", "türkiye yazma eserler kurumu"]),
    ("meb", "Millî Eğitim Bakanlığı", G_BAK, ["milli eğitim"]),
    ("msb", "Millî Savunma Bakanlığı", G_BAK, ["milli savunma"]),
    ("saglik", "Sağlık Bakanlığı", G_BAK, ["sağlık bakanlığı"]),
    ("sanayi", "Sanayi ve Teknoloji Bakanlığı", G_BAK, ["sanayi ve teknoloji"]),
    ("tarim", "Tarım ve Orman Bakanlığı", G_BAK, ["tarım ve orman", "orman genel müdürlüğü", "devlet su işleri", "dsi", "tarım kredi", "doğa koruma ve milli parklar"]),
    ("ticaret", "Ticaret Bakanlığı", G_BAK, ["ticaret bakanlığı", "gümrük ve ticaret"]),
    ("ulastirma", "Ulaştırma ve Altyapı Bakanlığı", G_BAK, ["ulaştırma ve altyapı", "karayolları genel müdürlüğü", "türasaş"]),

    ("epdk", "EPDK (Enerji Piyasası Düzenleme Kurumu)", G_KUR, ["epdk", "enerji piyasası düzenleme"]),
    ("bddk", "BDDK (Bankacılık Düzenleme ve Denetleme Kurumu)", G_KUR, ["bddk", "bankacılık düzenleme"]),
    ("tcmb", "TCMB (Merkez Bankası)", G_KUR, ["tcmb", "merkez bankası"]),
    ("spk", "SPK (Sermaye Piyasası Kurulu)", G_KUR, ["spk", "sermaye piyasası kurulu"]),
    ("kgk", "KGK (Kamu Gözetimi Kurumu)", G_KUR, ["kgk", "kamu gözetimi"]),
    ("seddk", "SEDDK (Sigortacılık ve Özel Emeklilik Kurumu)", G_KUR, ["seddk", "sigortacılık ve özel emeklilik"]),
    ("sgk", "SGK (Sosyal Güvenlik Kurumu)", G_KUR, ["sgk", "sosyal güvenlik kurumu"]),
    ("yok", "YÖK (Yükseköğretim Kurulu)", G_KUR, ["yök", "yükseköğretim kurulu"]),
    ("shgm", "Sivil Havacılık Genel Müdürlüğü", G_KUR, ["sivil havacılık", "shgm"]),
    ("ndk", "Nükleer Düzenleme Kurumu", G_KUR, ["nükleer düzenleme"]),
    ("btk", "BTK (Bilgi Teknolojileri ve İletişim Kurumu)", G_KUR, ["btk", "bilgi teknolojileri ve iletişim kurumu"]),
    ("rekabet", "Rekabet Kurumu", G_KUR, ["rekabet kurumu"]),
    ("kik", "Kamu İhale Kurumu", G_KUR, ["kamu ihale kurumu", "kik"]),
    ("kvkk", "Kişisel Verileri Koruma Kurulu", G_KUR, ["kvkk", "kişisel verileri koruma"]),
    ("tuik", "TÜİK (Türkiye İstatistik Kurumu)", G_KUR, ["tüik", "türkiye istatistik kurumu"]),
    ("patent", "Türk Patent ve Marka Kurumu", G_KUR, ["türk patent", "türkpatent"]),
    ("titck", "TİTCK (Türkiye İlaç ve Tıbbi Cihaz Kurumu)", G_KUR, ["titck", "türkiye ilaç ve tıbbi cihaz"]),
    ("tseb", "Türkiye Sağlık Enstitüleri Başkanlığı", G_KUR, ["türkiye sağlık enstitüleri", "tüseb"]),
    ("myk", "Meslekî Yeterlilik Kurumu", G_KUR, ["mesleki yeterlilik", "myk"]),
    ("bik", "Basın İlan Kurumu", G_KUR, ["basın ilan kurumu"]),
    ("kosgeb", "KOSGEB", G_KUR, ["kosgeb"]),
    ("tmsf", "TMSF (Tasarruf Mevduatı Sigorta Fonu)", G_KUR, ["tmsf", "tasarruf mevduatı sigorta fonu"]),
    ("ozellestirme", "Özelleştirme İdaresi Başkanlığı", G_KUR, ["özelleştirme idaresi"]),
    ("ab", "Avrupa Birliği Başkanlığı", G_KUR, ["avrupa birliği başkanlığı"]),
    ("teias", "TEİAŞ", G_KUR, ["teiaş"]),
    ("tcdd", "TCDD", G_KUR, ["tcdd", "devlet demiryolları"]),
    ("diyanet", "Diyanet İşleri Başkanlığı", G_KUR, ["diyanet işleri"]),
    ("sayistay", "Sayıştay", G_KUR, ["sayıştay"]),
    ("siber", "Siber Güvenlik Başkanlığı", G_KUR, ["siber güvenlik"]),
    ("meteoroloji", "Meteoroloji Genel Müdürlüğü", G_KUR, ["meteoroloji genel"]),
    ("ilbank", "İller Bankası", G_KUR, ["iller bankası", "ilbank"]),
    ("rtuk", "RTÜK (Radyo ve Televizyon Üst Kurulu)", G_KUR, ["rtük", "radyo ve televizyon üst kurulu"]),
    ("tenmak", "TENMAK (Türkiye Enerji, Nükleer ve Maden Araştırma Kurumu)", G_KUR, ["tenmak", "enerji nükleer ve maden araştırma"]),
    ("iskur", "İŞKUR (Türkiye İş Kurumu)", G_KUR, ["işkur", "türkiye iş kurumu"]),
    ("hak", "Helal Akreditasyon Kurumu", G_KUR, ["helal akreditasyon"]),
    ("iletisim", "İletişim Başkanlığı", G_KUR, ["iletişim başkanlığı"]),
    ("tuba", "Türkiye Bilimler Akademisi", G_KUR, ["türkiye bilimler akademisi", "tüba"]),
    ("kapadokya", "Kapadokya Alan Başkanlığı", G_KUR, ["kapadokya alan başkanlığı"]),
    ("shfk", "Sağlık Hizmetleri Fiyatlandırma Komisyonu", G_KUR, ["sağlık hizmetleri fiyatlandırma"]),
    ("trt", "TRT (Türkiye Radyo-Televizyon Kurumu)", G_KUR, ["trt", "türkiye radyo televizyon kurumu"]),
    ("seker", "Türkiye Şeker Fabrikaları", G_KUR, ["türkiye şeker fabrikaları", "türkşeker"]),

    ("aym", "Anayasa Mahkemesi", G_YAR, ["anayasa mahkemesi*"]),
    ("yargitay", "Yargıtay", G_YAR, ["yargıtay*"]),
    ("danistay", "Danıştay", G_YAR, ["danıştay*"]),
    ("hsk", "Hâkimler ve Savcılar Kurulu", G_YAR, ["hakimler ve savcılar", "hsk"]),
    ("uyusmazlik", "Uyuşmazlık Mahkemesi", G_YAR, ["uyuşmazlık mahkemesi*"]),
    ("ysk", "Yüksek Seçim Kurulu", G_YAR, ["ysk", "yüksek seçim kurulu*"]),

    ("uni", "Üniversiteler ve yüksekokullar", G_UNI,
     ["üniv*", "üni", "myo", "meslek yüksekokulu", "yüksekokul*", "yüksek teknoloji enstitüsü"]),

    ("belediye", "Belediyeler", G_DIG, ["belediye*"]),
    ("meslek", "Meslek kuruluşları ve federasyonlar", G_DIG,
     ["tmmob", "türmob", "odası", "odaları", "federasyonu", "barolar birliği", "noterler birliği", "gözlükçüler birliği", "mimar odaları",
      "tesk", "türkiye esnaf ve sanatkarları konfederasyonu", "tobb", "türkiye odalar ve borsalar birliği"]),
    ("andlasma", "Milletlerarası andlaşmalar", G_DIG, []),
    ("diger", "Diğer kurumlar", G_DIG, []),
]

RAF_BILGI = {kimlik: (ad, grup) for kimlik, ad, grup, _ in RAFLAR}
# Düzenlemenin kartında asıl kurum adı da gösterilen raflar (bir rafta birden çok kurum bulunur)
ALT_KURUMLU = {"uni", "diger", "meslek", "belediye", "andlasma", "cb", "tbmm"}
# Kurum satırı olmayan düzenlemelerin rafı, bölüm başlığından ya da başlıktan anlaşılırsa
BASLIK_KURALLARI = [
    (r"\bkarar sayısı\b", "cb"),
    (r"\b(vergi usul kanunu genel tebliği|katma değer vergisi genel|gelir vergisi genel|kurumlar vergisi genel|"
     r"özel tüketim vergisi|harçlar kanunu|damga vergisi genel)", "hazine"),
    (r"\bkamu ihale genel tebliği", "kik"),
    (r"\bsermaye piyasası kurul", "spk"),
    (r"\benerji piyasası düzenleme", "epdk"),
    (r"\b(elektronik para|ödeme hizmetleri|ödeme kuruluşu)", "tcmb"),
    (r"\b(bankalarca|bankaların|bankacılık)", "bddk"),
    (r"\b(ithalatta haksız rekabet|damping|ihracat|hariçte işleme|dahilde işleme|ithalat rejimi|yurt içi satış ve teslim)",
     "ticaret"),
    (r"\b(mahkemesi kurulmasına|yargı çevresi|hakim ve savcı)", "hsk"),
    (r"\basgari ücret", "calisma"),
]
# Başlığı bu kalıplarda olan satırlar düzenleme değildir (özetin "metni incelenemedi" gibi yer tutucuları);
# kalıplar normalleştirilmiş başlıkta aranır (noktalamasız, küçük harf)
ATLANACAK_BASLIK = re.compile(
    r"(incelenemedi|metni verilmedi|metni sağlanmadı|tam sayı|\bpdf\b|\bmevzuat$|^ek pdf|^\d+ madde$|"
    r"numaralı madde|sayılı resmi gazete nin \d+ maddesi)")


def kucuk(metin):
    """Türkçe kurallarla küçük harf (I → ı, İ → i); yayinla.kucuk_harf ile aynı."""
    return metin.replace("İ", "i").replace("I", "ı").lower()


def norm(metin):
    """Kurum adı karşılaştırması için: küçük harf, şapkasız, noktalamasız, tek boşluklu."""
    m = kucuk(metin).translate(str.maketrans({"î": "i", "â": "a", "û": "u", "ê": "e"}))
    return re.sub(r"[^0-9a-zçğıöşü]+", " ", m).strip()


def _desen(takma_adlar):
    parcalar = []
    for ad in takma_adlar:
        serbest = ad.endswith("*")
        ham = re.escape(norm(ad.rstrip("*")))
        parcalar.append(ham + ("" if serbest else r"(?![0-9a-zçğıöşü])"))
    if not parcalar:
        return None
    return re.compile(r"(?<![0-9a-zçğıöşü])(?:" + "|".join(parcalar) + ")")


_DESENLER = [(kimlik, _desen(takma)) for kimlik, _ad, _grup, takma in RAFLAR]
_BASLIK_DESENLERI = [(re.compile(d), kimlik) for d, kimlik in BASLIK_KURALLARI]


def duz(parca):
    t = re.sub(r"(?s)<[^>]+>", "", parca)
    return re.sub(r"\s+", " ", html.unescape(t)).strip()


def bolum(ozet, baslik):
    """Özetteki bir <h2> bölümünün içeriği (bir sonraki <h2>'ye kadar)."""
    m = re.search(r"(?is)<h2>\s*" + baslik + r".*?</h2>(.*?)(?=<h2>|\Z)", ozet)
    return m.group(1) if m else ""


_JETON = re.compile(r"<h3>(.*?)</h3>|<p>(.*?)</p>", re.S | re.I)
_BAGLANTI = re.compile(r'\s*<a\s[^>]*href="([^"]+)"[^>]*>(.*?)</a>\s*$', re.S | re.I)
_DOSYA_ADI = re.compile(r"^\d{8}[A-Za-z0-9-]*\.(htm|html|pdf)$", re.I)
_RESMI_ADRES = re.compile(r"^https?://www\.resmigazete\.gov\.tr/eskiler/(\d{4})/(\d{2})/(\d{8})(.*)$")


def tur_bul(bolum_basligi, baslik):
    """Düzenlemenin türü: önce üst başlığa, sonra düzenlemenin kendi başlığına bakılır."""
    h = norm(bolum_basligi)
    t = norm(baslik)
    if "atama" in h:
        return "ata"
    if "andlaşma" in h or "andlasma" in h or "anlaşma" in h:
        return "and"
    if any(k in h for k in ("anayasa mahkemesi", "yargı", "yargıtay", "danıştay", "hakimler")):
        return "yar"
    if "kararname" in h:
        return "khk"
    if "yönetmelik" in h:
        return "yon"
    if "tebliğ" in h:
        return "teb"
    if "kanun" in h or "yasama" in h:
        return "kan"
    if "karar" in h:
        return "kar"
    # Bölüm başlığından anlaşılmadı: düzenlemenin kendi başlığı
    if t.endswith("yönetmelik") or t.endswith("yönetmeliği") or " yönetmeliği " in t:
        return "yon"
    if "tebliğ" in t:
        return "teb"
    if t.endswith("kanun") or t.endswith("kanunu") or "kanun" in t.split()[-1:]:
        return "kan"
    if "kararname" in t:
        return "khk"
    if "karar" in t:
        return "kar"
    return "dig"


def raflari_bul(kurum, tur, bolum_basligi, baslik):
    """Düzenlemenin rafları (en az bir): kurum adındaki takma adlara göre; kurum yoksa türe ve başlığa göre."""
    bulunan = []
    if kurum:
        ad = norm(kurum)
        for kimlik, desen in _DESENLER:
            if desen is not None and desen.search(ad):
                bulunan.append(kimlik)
    if bulunan:
        return bulunan
    h = norm(bolum_basligi)
    t = norm(baslik)
    # Kurum satırı yok ya da tanınmadı: başlık kurum adıyla başlıyorsa (üniversite adı ilk sözcüklerde de olabilir)
    for kimlik, desen in _DESENLER:
        if desen is None or kimlik in ("andlasma", "diger"):
            continue
        if (desen.search(t[:80]) if kimlik == "uni" else desen.match(t)):
            return [kimlik]
    if tur == "and":
        return ["andlasma"]
    if tur in ("ata", "khk") or ("cumhurbaşkanı" in h and tur == "kar"):
        return ["cb"]
    if "anayasa mahkemesi" in h or "anayasa mahkemesi" in t:
        return ["aym"]
    if "yargıtay" in t:
        return ["yargitay"]
    if "danıştay" in t:
        return ["danistay"]
    if "hakimler ve savcılar" in t:
        return ["hsk"]
    if tur == "kan" and not kurum:
        return ["tbmm"]
    for desen, kimlik in _BASLIK_DESENLERI:
        if desen.search(t):
            return [kimlik]
    return ["diger"]


def maddeler(ozet, tarih):
    """Bir özetteki düzenlemeler (sayfadaki sırayla): her biri bir sözlük (bkz. modül açıklaması)."""
    sayi = re.search(r"(\d{3,6})\s+Sayılı", ozet)
    sayi = sayi.group(1) if sayi else ""
    govde = bolum(ozet, "Maddeler")
    sonuc = []
    baslik = ""
    mukerrer = ""
    imlec = None
    for m in _JETON.finditer(govde):
        if m.group(1) is not None:
            baslik = duz(m.group(1))
            mk = re.match(r"(\d+)\.\s*Mükerrer", baslik, re.I)
            mukerrer = mk.group(1) if mk else ""
            imlec = None
            continue
        p = m.group(2)
        b = _BAGLANTI.match(p)
        if b:
            adres, ad = b.group(1), duz(b.group(2))
            imlec = None
            if not ad or _DOSYA_ADI.match(ad) or "tam metin" in kucuk(ad) or ATLANACAK_BASLIK.search(norm(ad)):
                continue
            imlec = {"adres": adres, "ad": ad, "baslik": baslik, "mukerrer": mukerrer, "kurum": "", "yurur": "",
                     "aciklama": "", "personel": False}
            sonuc.append(imlec)
            continue
        if imlec is None:
            continue
        metin = duz(p)
        if re.match(r"(?i)\s*<b>\s*Kurum", p):
            kurum = re.search(r"Kurum\s*:\s*(.*?)\s*(?:·\s*Yürürlük\s*:\s*(.*))?$", metin)
            if kurum:
                imlec["kurum"] = kurum.group(1).strip()
                imlec["yurur"] = (kurum.group(2) or "").strip()
        elif metin.rstrip(".:").lower() == "personel mevzuatı":
            imlec["personel"] = True
        elif not imlec["aciklama"] and metin and not re.match(r"(?i)\s*<b>", p):
            imlec["aciklama"] = metin
    kayitlar = []
    for sira, d in enumerate(sonuc):
        tur = tur_bul(d["baslik"], d["ad"])
        adres = d["adres"]
        r = _RESMI_ADRES.match(adres)
        if r and r.group(3) == tarih:
            adres = r.group(4)
        aciklama = d["aciklama"]
        if len(aciklama) > ACIKLAMA_UZUNLUGU:
            kes = aciklama[:ACIKLAMA_UZUNLUGU].rsplit(" ", 1)[0].rstrip(",;:- ")
            aciklama = kes + "…"
        yurur = d["yurur"]
        if len(yurur) > YURURLUK_UZUNLUGU:
            yurur = yurur[:YURURLUK_UZUNLUGU].rsplit(" ", 1)[0].rstrip(",;:- ") + "…"
        kayit = {"t": tarih, "n": sayi, "m": d["mukerrer"], "k": tur, "b": d["ad"], "y": yurur, "h": adres,
                 "s": aciklama, "p": 1 if d["personel"] else 0}
        kayitlar.append((sira, kayit, d["kurum"], d["baslik"]))
    return kayitlar


def _temiz(kayit):
    return {k: v for k, v in kayit.items() if v not in ("", 0, None)}


def uret(klasor=None):
    """Bütün özetlerden raf içeriklerini üretir: ({kimlik: [düzenleme, ...]}, yeni, rapor)."""
    klasor = klasor or os.path.join(KOK, "ozetler")
    tarihler = sorted((ad[:-5] for ad in os.listdir(klasor) if re.fullmatch(r"\d{8}\.html", ad)), reverse=True)
    raflar = {}
    hepsi = []
    tanimsiz = {}
    for tarih in tarihler:
        with open(os.path.join(klasor, tarih + ".html"), encoding="utf-8") as f:
            ozet = f.read()
        try:
            kayitlar = maddeler(ozet, tarih)
        except Exception:
            continue
        for sira, kayit, kurum, bolum_adi in kayitlar:
            bulunan = raflari_bul(kurum, kayit["k"], bolum_adi, kayit["b"])
            if bulunan == ["diger"] and kurum:
                tanimsiz[kurum] = tanimsiz.get(kurum, 0) + 1
            hepsi.append((tarih, sira, kayit, kurum, bulunan))
            for kimlik in bulunan:
                raflar.setdefault(kimlik, []).append((tarih, sira, kayit, kurum, len(bulunan)))
    # Az düzenlemesi olan "kurum ve kuruluşlar" rafları "Diğer kurumlar"a katılır
    for kimlik in list(raflar):
        if RAF_BILGI[kimlik][1] == G_KUR and len(raflar[kimlik]) < EN_AZ_KURUM_RAFI:
            raflar.setdefault("diger", []).extend(raflar.pop(kimlik))
    cikti = {}
    for kimlik, liste in raflar.items():
        ad = RAF_BILGI[kimlik][0]
        satirlar = []
        for tarih, sira, kayit, kurum, kac in sorted(liste, key=lambda x: (x[0], -x[1]), reverse=True):
            k = dict(kayit)
            if kurum and (kimlik in ALT_KURUMLU or kac > 1 or "(" in kurum or kimlik == "diger") and norm(kurum) != norm(ad):
                k["a"] = kurum
            satirlar.append(_temiz(k))
        cikti[kimlik] = satirlar
    yeni = []
    gorulen = set()
    for tarih, sira, kayit, kurum, bulunan in sorted(hepsi, key=lambda x: (x[0], -x[1]), reverse=True):
        anahtar = (tarih, kayit["h"])
        if anahtar in gorulen:
            continue
        gorulen.add(anahtar)
        k = dict(kayit)
        k["a"] = kurum or RAF_BILGI[bulunan[0]][0]
        # Kısa açıklama yeni listede gösterilmez (liste hafif kalsın)
        k["s"] = ""
        r = bulunan[0] if bulunan[0] in cikti else "diger"
        k["r"] = r
        yeni.append(_temiz(k))
        if len(yeni) >= YENI_SAYI:
            break
    return cikti, yeni, tanimsiz


def _ikili(veri):
    return (json.dumps(veri, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")


def _yaz(yol, icerik):
    """Dosya aynıysa dokunmaz; yazılan dosyanın bayt sayısını döndürür."""
    try:
        with open(yol, "rb") as f:
            if f.read() == icerik:
                return len(icerik)
    except OSError:
        pass
    os.makedirs(os.path.dirname(yol), exist_ok=True)
    with open(yol, "wb") as f:
        f.write(icerik)
    return len(icerik)


def yaz(kok=None):
    """mevzuat/ klasörünü yeniden yazar; raf sayısını döndürür."""
    kok = kok or KOK
    hedef = os.path.join(kok, "mevzuat")
    cikti, yeni, _tanimsiz = uret(os.path.join(kok, "ozetler"))
    raf_listesi = []
    for kimlik, liste in cikti.items():
        ad, grup = RAF_BILGI[kimlik]
        ikili = _ikili({"surum": SURUM, "id": kimlik, "ad": ad, "say": len(liste), "m": liste})
        boyut = _yaz(os.path.join(hedef, "r", kimlik + ".json"), ikili)
        raf_listesi.append({"id": kimlik, "ad": ad, "grup": grup, "say": len(liste), "son": liste[0]["t"], "boyut": boyut})
    sira = {g: i for i, g in enumerate(GRUPLAR)}
    # Grup sırasıyla; grup içinde çok düzenlemesi olan önce ("Diğer kurumlar" grubunun sonunda)
    raf_listesi.sort(key=lambda r: (sira[r["grup"]], r["id"] == "diger", -r["say"], r["ad"]))
    yeni_ikili = _ikili({"surum": SURUM, "m": yeni})
    yeni_boyut = _yaz(os.path.join(hedef, "yeni.json"), yeni_ikili)
    son = max((r["son"] for r in raf_listesi), default="")
    _yaz(os.path.join(hedef, "raflar.json"), _ikili({
        "surum": SURUM, "guncel": son,
        "yeni": {"say": len(yeni), "boyut": yeni_boyut},
        "raflar": raf_listesi,
    }))
    # Artık üretilmeyen raf dosyalarını sil (ör. bir raf "Diğer kurumlar"a katıldıysa)
    klasor = os.path.join(hedef, "r")
    if os.path.isdir(klasor):
        for ad in os.listdir(klasor):
            if ad.endswith(".json") and ad[:-5] not in cikti:
                os.remove(os.path.join(klasor, ad))
    return len(raf_listesi)


def rapor():
    cikti, yeni, tanimsiz = uret()
    toplam = sum(len(v) for v in cikti.values())
    print("raf:", len(cikti), "· düzenleme kaydı (çok rafa girenler birden çok sayılır):", toplam)
    for kimlik, liste in sorted(cikti.items(), key=lambda x: -len(x[1])):
        ad, grup = RAF_BILGI[kimlik]
        boyut = len(_ikili({"m": liste}))
        print("%5d  %-14s %-52s %6.1f KB" % (len(liste), grup[:14], ad[:52], boyut / 1024))
    print("\n\"Diğer kurumlar\"a düşen en sık kurum adları (tabloya eklenecek adaylar):")
    for ad, n in sorted(tanimsiz.items(), key=lambda x: -x[1])[:25]:
        print("%5d  %s" % (n, ad))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if "--rapor" in sys.argv:
        rapor()
    else:
        print("raf:", yaz())
