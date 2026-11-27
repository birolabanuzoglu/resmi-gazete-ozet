#!/usr/bin/env python3
"""Ust duzey atamalarda bos kalan "Eski" (onceki gorevli) hucrelerini Gemini + Google aramasiyla doldurur.

27.11.2026, patronun istegi: arsiv ozetlerini yazan Gemini/Evren/Karinca cagrilarinin internet erisimi yok;
ust duzey gorevlerde (rektor, genel mudur, il muduru, vali, kaymakam, buyukelci...) onceki gorevli
"Belirtilmemis" kaliyor. Bu betik yalniz bu hucreler icin kaynakli arama yapar:
  - Gemini'ye Google arama araci (google_search) ile tek soru sorulur; tahmin yasaktir;
  - sonuc ancak en az bir resmi alan adi (gov.tr, edu.tr, tbmm.gov.tr...) ya da en az iki ayri alan adi
    kaynak olarak donerse yazilir; model "BULUNAMADI" derse ya da kosul saglanmazsa hucre degismez;
  - kaynak sutununa alan adlari ve arama tarihi yazilir. Kisi adi hafizadan yazilmaz.
Kullanim: python3 gorev/onceki_ara.py [--adet N] [--kuru]
  --kuru: API'siz; yalniz aday satirlari listeler. Gerekli: GEMINI_API_KEY (GitHub secret).
"""
import datetime
import html
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import yayinla  # noqa: E402  (git yardimcisi, depo koku)

KOK = yayinla.KOK
# Sirayla denenir: model yoksa (404) ya da arama aracini desteklemiyorsa (400) siradaki (27.11.2026)
# 27.11.2026: gemini-2.5-flash kapatildi (404; Gemini yerine gemini-3.8-flash'i oneriyor). Ozet hatti
# flash-latest ve 4-hydrogen'i kullandigi icin arama once kotasi ayri olabilecek 3.8-flash'i dener.
MODELLER = [m for m in (os.environ.get("ONCEKI_MODEL"), "gemini-3.8-flash", "gemini-flash-latest",
                        "gemini-4-hydrogen") if m]
URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent"
# Tekil (bir anda tek kisinin bulundugu) ust duzey gorevler; yalniz gorev kismina (" · " sonrasi), tam kelime
UST = re.compile(r"\brektör(ü)?\b|\bgenel müdür(ü)?\b(?!\s*yardımcı)|\b[iİ]l\b.*\bmüdür(ü)?\b|\bvali(si)?\b(?!\s*yardımcı)|"
                 r"\bkaymakam(ı)?\b|\bbüyükelçi(si)?\b|\bbaşkan(ı)?\b(?!\s*yardımcı)|\bmüsteşar(ı)?\b|"
                 r"\bgenel sekreter(i)?\b(?!\s*yardımcı)|\bbaşhekim(i)?\b", re.I)
BOS = re.compile(r"^\s*(belirtilmem|—|-|bilinmiyor)", re.I)
RESMI = re.compile(r"(\.|^)(gov\.tr|edu\.tr|tbmm\.gov\.tr|resmigazete\.gov\.tr|bel\.tr|tsk\.tr|pol\.tr)$", re.I)
TD = re.compile(r"(?is)(<td[^>]*>)(.*?)(</td>)")


def duz(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def adaylar():
    """(dosya, satir_html, gorev, yeni, eski_sira, kaynak_sira, tarih) - en yeni gun basta."""
    sonuc = []
    klasor = os.path.join(KOK, "ozetler")
    for ad in sorted(os.listdir(klasor), reverse=True):
        if not (ad.endswith(".html") and ad[:8].isdigit()):
            continue
        s = open(os.path.join(klasor, ad), encoding="utf-8").read()
        b = re.search(r"(?is)<h2[^>]*>\s*Atamalar.*?</h2>(.*?)(?=<h2|\Z)", s)
        if not b:
            continue
        satirlar = re.findall(r"(?is)<tr[^>]*>.*?</tr>", b.group(1))
        if len(satirlar) < 2:
            continue
        bas = [duz(h).lower() for h in re.findall(r"(?is)<t[hd][^>]*>(.*?)</t[hd]>", satirlar[0])]
        try:
            ig = next(i for i, h in enumerate(bas) if "görev" in h)
            io = next(i for i, h in enumerate(bas) if h.startswith("eski") and "kaynağ" not in h)
            iy = next(i for i, h in enumerate(bas) if "yeni" in h)
            ik = next(i for i, h in enumerate(bas) if "kaynağ" in h)
        except StopIteration:
            continue
        for satir in satirlar[1:]:
            h = [duz(m.group(2)) for m in TD.finditer(satir)]
            if len(h) <= max(ig, io, iy, ik):
                continue
            if UST.search(h[ig].split("·")[-1]) and BOS.match(h[io] or "-") and h[iy] and not BOS.match(h[iy]):
                sonuc.append((ad, satir, h[ig], h[iy], io, ik, ad[:8]))
    return sonuc


def ara(anahtar, gorev, yeni, tarih):
    import requests
    gun = "%s.%s.%s" % (tarih[6:], tarih[4:6], tarih[:4])
    istem = (f"Türkiye'de {gun} tarihli Resmî Gazete'de yayımlanan kararla \"{gorev}\" görevine {yeni} atandı. "
             "Bu atamadan hemen önce bu görevde bulunan kişi kimdi? Yalnızca arama sonuçlarındaki kaynaklara dayan; "
             "tahmin etme, emin değilsen BULUNAMADI de. Yanıtı yalnız tek satır JSON olarak ver: "
             "{\"ad\": \"Ad SOYAD\"} ya da {\"ad\": \"BULUNAMADI\"}.")
    govde = {"contents": [{"role": "user", "parts": [{"text": istem}]}], "tools": [{"google_search": {}}],
             "generationConfig": {"temperature": 0}}
    r = None
    kota = 0
    for model in MODELLER:
        r = requests.post(URL % model, headers={"x-goog-api-key": anahtar, "Content-Type": "application/json"},
                          data=json.dumps(govde), timeout=120)
        if r.status_code == 429:
            # Ucretsiz katmanda her modelin ayri kotasi var: dolu ise siradaki model; hepsi doluysa dur
            print("  API %s 429: kota dolu" % model)
            kota += 1
            if kota == len(MODELLER):
                raise RuntimeError("KOTA")
            continue
        if r.status_code == 200:
            break
        # Hata kodu ve Gemini'nin gerekcesi gunluge (anahtar yazilmaz); 404/400'de siradaki model
        print("  API %s %d: %s" % (model, r.status_code, " ".join(r.text.split())[:220]))
        if r.status_code not in (400, 404):
            break
    if r is None or r.status_code != 200:
        raise ValueError("API %s" % (r.status_code if r is not None else "-"))
    aday = (r.json().get("candidates") or [{}])[0]
    metin = "".join(p.get("text", "") for p in aday.get("content", {}).get("parts", []))
    alanlar = []
    for c in aday.get("groundingMetadata", {}).get("groundingChunks", []):
        baslik = (c.get("web", {}).get("title") or "").strip().lower()
        if baslik and baslik not in alanlar:
            alanlar.append(baslik)
    m = re.search(r'"ad"\s*:\s*"([^"]+)"', metin)
    return (m.group(1).strip() if m else "BULUNAMADI"), alanlar


def gecerli(ad, yeni, alanlar):
    if not ad or "BULUNAMADI" in ad.upper() or duz(ad).lower() == duz(yeni).lower():
        return False
    if not re.fullmatch(r"[A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû.' -]{5,60}", ad) or not 2 <= len(ad.split()) <= 5:
        return False
    return any(RESMI.search(a) for a in alanlar) or len(set(alanlar)) >= 2


def hucre_yaz(satir, sira, icerik):
    parcalar = list(TD.finditer(satir))
    m = parcalar[sira]
    return satir[:m.start(2)] + icerik + satir[m.end(2):]


def main():
    adet = int(sys.argv[sys.argv.index("--adet") + 1]) if "--adet" in sys.argv else 10
    liste = adaylar()
    print("ADAY", len(liste))
    if "--kuru" in sys.argv:
        for a in liste[:8]:
            print("  ", a[6], a[2][:70], "| yeni:", a[3][:30])
        return
    anahtar = os.environ.get("GEMINI_API_KEY", "")
    if not anahtar:
        sys.exit("GEMINI_API_KEY yok")
    bugun = datetime.date.today().strftime("%d.%m.%Y")
    degisen = {}
    for dosya, satir, gorev, yeni, io, ik, tarih in liste[:adet]:
        try:
            ad, alanlar = ara(anahtar, gorev, yeni, tarih)
        except RuntimeError:
            print("KOTA doldu; duruldu")
            break
        except Exception as e:  # ag ya da yanit bicimi
            print("HATA", tarih, gorev[:50], type(e).__name__, str(e)[:80])
            continue
        if not gecerli(ad, yeni, alanlar):
            print("YAZILMADI", tarih, gorev[:50], "|", ad[:30], "|", ", ".join(alanlar[:3]))
            continue
        kaynak = "Google aramasıyla bulundu (%s): %s" % (bugun, html.escape(", ".join(alanlar[:3])))
        yeni_satir = hucre_yaz(hucre_yaz(satir, io, html.escape(ad)), ik, kaynak)
        yol = os.path.join(KOK, "ozetler", dosya)
        s = degisen.get(yol) or open(yol, encoding="utf-8").read()
        degisen[yol] = s.replace(satir, yeni_satir, 1)
        print("YAZILDI", tarih, gorev[:50], "->", ad, "|", ", ".join(alanlar[:3]))
    for yol, s in degisen.items():
        with open(yol, "w", encoding="utf-8", newline="\n") as f:
            f.write(s)
    if not degisen:
        return
    yayinla.git("add", *degisen.keys())
    yayinla.git("commit", "-q", "-m", "Onceki gorevli: %d ozette kaynakli arama" % len(degisen))
    if not yayinla.gonder_dene("main", deneme=3):
        sys.exit("gonderilemedi")


if __name__ == "__main__":
    main()
