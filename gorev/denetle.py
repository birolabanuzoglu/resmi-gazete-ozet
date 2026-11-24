#!/usr/bin/env python3
"""Yazilan ozeti yayindan once denetler (2026-11-18, arsiv denemesiyle birlikte).

Kullanim: python3 gorev/denetle.py <yyyyMMdd> [--arsiv]
Ciktinin ilk satiri: DENETIM_TAMAM <tarih> | DENETIM_HATA <tarih>
Ardindan "HATA ..." satirlari (yayini engeller; duzeltilmeli) ve "UYARI ..." satirlari (bilgi).

Denetlenenler:
- dosya var, bos degil; yalnizca talimattaki etiketler (betik, stil, resim, cerceve kesin hata);
- tek <h1> ve icinde gunun tarihi ("10 Kasım 2026") ile "Sayılı";
- "Günün özeti", "Öne çıkanlar", "Maddeler" bolumleri ("Yorum" yoksa uyari);
- fihristteki (ve mukerrer fihristlerdeki) her maddenin ozette baglantisi var
  (eskiler/YYYY/MM/<dosya>); ilan bolumu sayilmaz;
- her mukerrer sayi icin "<n>. Mükerrer" ibaresi;
- "Atamalar" bolumu varsa tablonun baslik satiri talimattaki gibi;
- baglantilar http(s); arsivde (--arsiv) yalnizca resmigazete.gov.tr ve basliktan sonra
  "Kapsam: Arşiv özeti" satiri; arsivde "bugün", "yarın" gibi goreli ifadeler uyari verir.

Fihrist calisma/<tarih>/ klasorunde (indir.py'nin ciktisi) yoksa siteden indirilir.
"""
import html
import os
import re
import sys
import urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import indir as ortak  # noqa: E402  (indirme ve metne cevirme)

KOK = ortak.KOK
AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül",
         "Ekim", "Kasım", "Aralık"]
IZINLI = {"h1", "h2", "h3", "p", "ul", "li", "b", "i", "mark", "a", "table", "tr", "th", "td"}
YASAK = {"script", "style", "img", "iframe", "object", "embed", "form", "input", "link", "meta",
         "svg", "video", "audio", "base"}
MADDE_YOLU = re.compile(r"eskiler/\d{4}/\d{2}/(\d{8}(?:M\d+)?-\d+(?:-\d+)?\.(?:htm|html|pdf))", re.I)
# Kapsam denetiminde yalnizca fihristin kendi maddeleri aranir; "-N-M" bicimli ekler istege baglidir
FIHRIST_MADDESI = re.compile(r"eskiler/\d{4}/\d{2}/(\d{8}(?:M\d+)?-\d+\.(?:htm|html|pdf))", re.I)
ATAMA_BASLIGI = ["Kurum ve görev", "Eski", "Yeni", "Eski görevlinin kaynağı"]
KAPSAM = re.compile(r"(?is)<b>\s*Kapsam\s*:?\s*</b>\s*:?\s*Arşiv özeti")
GORELI = re.compile(r"(?i)(?<![0-9a-zçğıöşü])(bugün|yarın|dün|bu hafta|geçen hafta|bu ay)(?![a-zçğıöşü])")


def duz(parca):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"(?s)<[^>]+>", " ", parca))).strip()


def fihristler(tarih):
    """Asil sayinin ve mukerrerlerin fihrist metinleri: [(ad, metin)] ("" asil, "M1", "M2"...)."""
    klasor = os.path.join(KOK, "calisma", tarih)
    sonuc = []
    if os.path.exists(os.path.join(klasor, "fihrist.txt")):
        for ad in sorted(os.listdir(klasor)):
            m = re.fullmatch(r"fihrist(?:-(M\d+))?\.txt", ad)
            if m:
                with open(os.path.join(klasor, ad), encoding="utf-8", errors="replace") as f:
                    sonuc.append((m.group(1) or "", f.read()))
        return sonuc
    # Sitedeki fihristte baglantilar goreli; indir.py'deki gibi tam adrese cevrilir
    taban = ortak.taban_adresi(tarih)
    sonuc.append(("", ortak.metne_cevir(ortak.coz(ortak.indir(taban + tarih + ".htm")), taban)))
    for n in range(1, ortak.MUKERRER_SINIRI + 1):
        try:
            sayfa = ortak.coz(ortak.indir("%s%sM%d.htm" % (taban, tarih, n), deneme=1))
        except (urllib.error.URLError, OSError):
            break
        sonuc.append(("M%d" % n, ortak.metne_cevir(sayfa, taban)))
    return sonuc


def denetle(tarih, arsiv):
    hatalar, uyarilar = [], []
    yol = os.path.join(KOK, "ozetler", tarih + ".html")
    if not os.path.exists(yol):
        return ["ozet dosyasi yok: ozetler/%s.html" % tarih], uyarilar
    with open(yol, encoding="utf-8", errors="replace") as f:
        ozet = f.read()
    if len(ozet.encode("utf-8")) < 500:
        hatalar.append("ozet cok kisa (%d bayt)" % len(ozet.encode("utf-8")))
    if len(ozet.encode("utf-8")) > 800 * 1024:
        uyarilar.append("ozet cok uzun (%d KB)" % (len(ozet.encode("utf-8")) // 1024))

    # Etiketler
    etiketler = {e.lower() for e in re.findall(r"<\s*/?\s*([a-zA-Z][a-zA-Z0-9]*)", ozet)}
    if etiketler & YASAK:
        hatalar.append("izin verilmeyen etiket: " + ", ".join(sorted(etiketler & YASAK)))
    diger = etiketler - IZINLI - YASAK
    if diger:
        uyarilar.append("talimatta olmayan etiket: " + ", ".join(sorted(diger)))
    if "```" in ozet or re.search(r"\*\*[^*\n]+\*\*", ozet):
        uyarilar.append("Markdown isareti var (``` ya da **)")

    # Baslik
    h1ler = re.findall(r"(?is)<h1[^>]*>(.*?)</h1>", ozet)
    gun = "%d %s %s" % (int(tarih[6:]), AYLAR[int(tarih[4:6]) - 1], tarih[:4])
    if len(h1ler) != 1:
        hatalar.append("tek bir <h1> olmali (%d var)" % len(h1ler))
    elif gun not in duz(h1ler[0]) or "Sayılı" not in duz(h1ler[0]):
        hatalar.append("<h1> gunun tarihini (%s) ve \"Sayılı\" ibaresini icermiyor: %s" % (gun, duz(h1ler[0])[:80]))

    # Bolumler
    basliklar = [duz(b) for b in re.findall(r"(?is)<h2[^>]*>(.*?)</h2>", ozet)]
    for gerekli in ("Günün özeti", "Öne çıkanlar", "Maddeler"):
        if not any(b.lower().startswith(gerekli.lower()) for b in basliklar):
            hatalar.append("\"%s\" bolumu yok" % gerekli)
    if not any(b.lower().startswith("yorum") for b in basliklar):
        uyarilar.append("\"Yorum\" bolumu yok")

    # Fihristteki maddeler ozette bagliyla yer almali (ilanlar haric)
    try:
        sayilar = fihristler(tarih)
    except (urllib.error.URLError, OSError) as e:
        sayilar = []
        uyarilar.append("fihrist alinamadi, madde kapsami denetlenemedi (%s)" % e)
    ozetteki = {d.lower() for d in MADDE_YOLU.findall(ozet)}
    eksik = []
    for ad, metin in sayilar:
        for dosya in dict.fromkeys(FIHRIST_MADDESI.findall(metin)):
            if dosya.lower() not in ozetteki:
                eksik.append(dosya)
        if ad and not re.search(r"(?i)%s\.\s*Mükerrer" % ad[1:], ozet):
            hatalar.append("%s. Mükerrer sayi ozette yok (fihrist-%s)" % (ad[1:], ad))
    if eksik:
        hatalar.append("fihristteki %d madde ozette baglantisiyla yok: %s" % (len(eksik), ", ".join(eksik[:12])))

    # Atamalar tablosu
    if any(b.lower().startswith("atamalar") for b in basliklar):
        bolum = re.search(r"(?is)<h2[^>]*>\s*Atamalar.*?</h2>(.*?)(?=<h2|\Z)", ozet)
        ilk_satir = re.search(r"(?is)<tr[^>]*>(.*?)</tr>", bolum.group(1)) if bolum else None
        hucreler = [duz(h) for h in re.findall(r"(?is)<th[^>]*>(.*?)</th>", ilk_satir.group(1))] if ilk_satir else []
        if hucreler != ATAMA_BASLIGI:
            hatalar.append("Atamalar tablosunun baslik satiri talimattaki gibi degil: %s" % hucreler)

    # Baglantilar
    for adres in re.findall(r'(?i)href\s*=\s*"([^"]*)"', ozet):
        a = html.unescape(adres).strip()
        if not re.match(r"(?i)https?://", a):
            hatalar.append("gecersiz baglanti: " + a[:80])
        elif arsiv and not re.match(r"(?i)https?://www\.resmigazete\.gov\.tr/", a):
            hatalar.append("arsivde yalnizca resmigazete.gov.tr baglantisi olur: " + a[:80])

    if arsiv:
        ilk_h2 = re.search(r"(?i)<h2", ozet)
        if not KAPSAM.search(ozet[: ilk_h2.start() if ilk_h2 else len(ozet)]):
            hatalar.append("basliktan sonra \"<p><b>Kapsam:</b> Arşiv özeti — …</p>\" satiri yok")
        goreli = sorted({m.group(1).lower() for m in GORELI.finditer(duz(ozet))})
        if goreli:
            uyarilar.append("goreli zaman ifadesi var (kesin tarih yazilmali): " + ", ".join(goreli))
    h2, u2 = kaynak_dogrula(ozet, tarih)
    hatalar += h2
    uyarilar += u2
    return hatalar, uyarilar


def _kok(s):
    """Turkce harfleri sadelestirir (ç->c...) ve kucuk harfe cevirir; kaynak karsilastirmasi icin."""
    s = s.replace("İ", "i").replace("I", "ı").lower()
    return s.translate(str.maketrans("çğıöşüâîû", "cgiosuaiu"))


def kaynak_metni(tarih):
    """calisma/<tarih>/ icindeki indirilen belgelerin (txt, htm, html) sadelestirilmis metni ve eksiksiz mi (tam)."""
    klasor = os.path.join(KOK, "calisma", tarih)
    parcalar = []
    tam = True  # her PDF'nin metin karsiligi var mi (yoksa kaynak eksik okunur)
    if os.path.isdir(klasor):
        for ad in os.listdir(klasor):
            if ad.lower().endswith(".pdf"):
                t = os.path.join(klasor, ad + ".txt")
                if not (os.path.exists(t) and os.path.getsize(t) > 200):
                    tam = False
        for ad in sorted(os.listdir(klasor)):
            if ad.lower().endswith((".txt", ".htm", ".html")):
                with open(os.path.join(klasor, ad), encoding="utf-8", errors="replace") as f:
                    parcalar.append(f.read())
    return _kok(duz(" ".join(parcalar))), tam


def kaynak_dogrula(ozet, tarih):
    """Modelin uydurma yapip yapmadigini kaynakla karsilastirir (model bagimsiz).

    - Atamalar tablosundaki "Yeni" gorevli adlari: her sozcuk indirilen belgelerde gecmeli (HATA).
    - "Karar Sayisi: N" ve "No: N" gibi numaralar belgelerde gecmeli (UYARI).
    Kaynakta yeterli metin yoksa (taranmis PDF) denetlenmez.
    """
    hatalar, uyarilar = [], []
    kaynak, tam = kaynak_metni(tarih)
    if len(kaynak) < 1500 or not tam:
        return hatalar, uyarilar  # taranmis PDF ya da eksik okuma: kaynakla karsilastirilamaz
    bolum = re.search(r"(?is)<h2[^>]*>\s*Atamalar.*?</h2>(.*?)(?=<h2|\Z)", ozet)
    eksik = []
    if bolum:
        for satir in re.findall(r"(?is)<tr[^>]*>(.*?)</tr>", bolum.group(1))[1:]:
            hucre = re.findall(r"(?is)<td[^>]*>(.*?)</td>", satir)
            if len(hucre) < 3:
                continue
            ad = duz(hucre[2]).split("(")[0].strip()
            if not ad or ad.lower().startswith(("belirtilmem", "—", "-")):
                continue
            kelimeler = [k for k in re.findall(r"[^\W\d_]{3,}", _kok(ad))]
            if kelimeler and not all(k in kaynak for k in kelimeler):
                eksik.append(ad)
    if eksik:
        hatalar.append("atama adi indirilen belgelerde bulunamadi (uydurma olabilir): " + "; ".join(sorted(set(eksik))[:8]))
    sayilar = set(re.findall(r"(?i)(?:Karar Say[ıi]s[ıi]|Say[ıi]s[ıi]|No)\s*:\s*(\d{3,6})", duz(ozet)))
    yok = sorted(n for n in sayilar if n not in kaynak)
    if yok:
        uyarilar.append("ozetteki sayi(lar) belgelerde gecmiyor: " + ", ".join(yok[:10]))
    return hatalar, uyarilar


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    argumanlar = [a for a in sys.argv[1:] if a != "--arsiv"]
    if len(argumanlar) != 1 or not re.fullmatch(r"\d{8}", argumanlar[0]):
        sys.exit("Kullanim: denetle.py yyyyMMdd [--arsiv]")
    tarih = argumanlar[0]
    hatalar, uyarilar = denetle(tarih, "--arsiv" in sys.argv[1:])
    print(("DENETIM_HATA " if hatalar else "DENETIM_TAMAM ") + tarih)
    for h in hatalar:
        print("HATA", h)
    for u in uyarilar:
        print("UYARI", u)
    sys.exit(1 if hatalar else 0)


if __name__ == "__main__":
    main()
