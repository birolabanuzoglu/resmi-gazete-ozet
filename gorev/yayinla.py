#!/usr/bin/env python3
"""Yazilan ozeti depoya isler: index.json, aylik arama parcalarini (arama/YYYYMM.json) ve
arama.json'u yeniler, commit eder ve gonderir.

Kullanim: python3 gorev/yayinla.py yyyyMMdd [dal]

Hedef dal verilmezse: calisma dali "claude/" ile basliyorsa o dala, degilse main'e gonderilir.
Bulut oturumlari yalnizca "claude/..." dallarina gonderebilir; bu dallara gelen ozetleri
.github/workflows/yayinla.yml is akisi main dalina birlestirir.

Basarili olursa son satir: YAYINLANDI <tarih> <dal>
Gonderim reddedilirse son satir: GONDERILEMEDI <dal>
"""
import html
import json
import os
import re
import subprocess
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def git(*args, check=True, capture=False):
    return subprocess.run(["git", "-C", KOK] + list(args), check=check, capture_output=capture, text=True)


def gonder_dene(hedef, deneme=6):
    """HEAD'i hedef dala gonderir; baska bir is ayni anda gonderdiyse (reddedildi) rebase edip yeniden dener.

    Uretilen dizin dosyalari (index.json, arama*) ve durum.json cakisirsa uzaktaki surum alinir, dizin
    yeniden yazilip ayni commit'e eklenir; ozet dosyasi (yeni dosya) cakismaz. Basari: True.
    """
    import random
    import time
    for sira in range(1, deneme + 1):
        if git("push", "-q", "origin", "HEAD:refs/heads/" + hedef, check=False).returncode == 0:
            return True
        if sira == deneme:
            break
        time.sleep(random.uniform(2, 9))
        if git("fetch", "-q", "origin", hedef, check=False).returncode != 0:
            continue
        if git("rebase", "--autostash", "-X", "ours", "FETCH_HEAD", check=False).returncode != 0:
            git("rebase", "--abort", check=False)
            continue
        index_yaz()
        git("add", "index.json", "arama.json", "arama", check=False)
        if git("diff", "--cached", "--quiet", check=False).returncode != 0:
            git("-c", "user.name=Resmi Gazete Ozet", "-c", "user.email=resmi-gazete-ozet@users.noreply.github.com",
                "commit", "-q", "-m", "Dizin yenilendi", check=False)
    return False


def boyut(yol):
    """Dosyanin depodaki (satir sonlari LF olan) halinin bayt sayisi."""
    with open(yol, "rb") as f:
        return len(f.read().replace(b"\r\n", b"\n"))


def kucuk_harf(metin):
    """Turkce kurallarla kucuk harfe cevirir (I -> ı, İ -> i); uygulamanin aramasiyla ayni olmali."""
    return metin.replace("I", "ı").replace("İ", "i").lower()


def duz_metin(parca):
    """HTML parcasini aranabilir duz metne cevirir."""
    t = re.sub(r"(?i)</(p|li|h\d|td|tr)>|<br\s*/?>", " ", parca)
    t = re.sub(r"(?s)<[^>]+>", "", t)
    return re.sub(r"\s+", " ", html.unescape(t)).strip()


def bolum(ozet, baslik):
    """Ozetteki bir <h2> bolumunun icerigi (bir sonraki <h2>'ye kadar)."""
    m = re.search(r"(?is)<h2>\s*" + baslik + r".*?</h2>(.*?)(?=<h2>|\Z)", ozet)
    return m.group(1) if m else ""


KOK_UZUNLUGU = 7  # arama dizinindeki kelimeler bu kadar harfe kirpilir; uygulama sorguyu da boyle kirpar
KELIME = re.compile(r"[0-9a-zçğıöşüâîû]+")


def arama_kelimeleri(metin):
    """Arama dizini icin bir ozetin kelimeleri: benzersiz kokler (ilk 7 harf), alfabetik, bosluklu.

    Tek harfli kelimeler (rakam degilse) atilir. Baska bir kokun icinde gecen kok de atilir;
    uygulama dizinde alt dize aradigi icin onu yine bulur. Boylece gun basina dizin tam metindeki
    ~14 KB yerine ~4 KB tutar. Uygulama aranan her kelimeyi de 7 harfe kirpar ve hepsinin dizinde
    gecmesini ister ("gorevde yukselme" iki kelimenin ayni gunde gectigi gunleri bulur).
    """
    kokler = {k[:KOK_UZUNLUGU] for k in KELIME.findall(metin) if len(k) > 1 or k.isdigit()}
    tutulan, birlesik = [], " "
    for k in sorted(kokler, key=lambda s: (-len(s), s)):
        if k in birlesik:
            continue
        tutulan.append(k)
        birlesik += k + " "
    return " ".join(sorted(tutulan))


def arsiv_mi(ozet):
    """Arsiv ozeti mi: basliktan sonra "<p><b>Kapsam:</b> Arşiv özeti — …</p>" satiri.

    2020'den bu yana yeniden eskiye doldurulan gecmis gunlerin ozetleri gunluk ozetle ayni
    bicimdedir ama sonradan yazilir; uygulama bu gunleri ayrica isaretler ve duzenlemelerin
    sonradan degismis olabilecegini soyler. (2.2'deki "Personel arşivi" ibaresi de tanınır.)
    """
    return bool(re.search(r"(?is)<b>\s*Kapsam\s*:?\s*</b>\s*:?\s*(Arşiv özeti|Personel arşivi)", ozet))


def arama_kaydi(ozet):
    """Arama dizini icin bir gunun kaydi: sayi, duzenleme sayisi, personel, onizleme, kelime kokleri
    ve (arsiv ozetiyse) "arsiv_ozeti": true. (Anahtar 2.2'deki "arsiv" degildir: 2.2 bunu
    "Personel arşivi" diye gosterirdi; 2.3 yeni anahtari okur.)"""
    sayi = re.search(r"(\d{3,6})\s+Sayılı", ozet)
    maddeler = bolum(ozet, "Maddeler")
    duzenleme = len(re.findall(r'(?is)<p>\s*<a\s[^>]*href="[^"]+"[^>]*>[^<]+</a>\s*</p>', maddeler))
    one = bolum(ozet, "Öne çıkanlar")
    basliklar = [duz_metin(b).rstrip(".:").strip() for b in re.findall(r"(?is)<li>\s*<b>(.*?)</b>", one)]
    kayit = {
        "sayi": sayi.group(1) if sayi else "",
        "duzenleme": duzenleme,
        "personel": bool(re.search(r"(?i)<b>\s*Personel mevzuatı\s*</b>", ozet)),
        "onizleme": " · ".join(b for b in basliklar if b),
        "metin": arama_kelimeleri(kucuk_harf(duz_metin(ozet))),
    }
    if arsiv_mi(ozet):
        kayit["arsiv_ozeti"] = True
    return kayit


ARAMA_GUN = 120  # eski uygulamalar (2.1 ve oncesi) icin arama.json yalnizca son bu kadar gunu tutar


def json_yaz(yol, veri):
    with open(yol, "w", encoding="utf-8", newline="\n") as f:
        json.dump(veri, f, ensure_ascii=False, separators=(",", ":"))


def index_yaz():
    """index.json, aylik arama parcalarini (arama/YYYYMM.json) ve arama.json'u yeniden yazar.

    index.json: uygulamanin okudugu tarih listesi (en yeni basta), her ozetin boyutu, arama
    parcalarinin boyutlari ("arama_parcalari": {"202611": bayt}), arsiv ozeti olan gunler
    ("arsiv_gunleri") ve arama.json'un boyutu. Uygulama, telefondaki ozetin boyutu buradakinden farkliysa o
    gunu yeniden indirir; boylece sonradan duzeltilen ozetler telefonda da guncellenir.

    arama/YYYYMM.json (2.2): o ayin gunlerinin aranabilir bilgileri. Uygulamanin gecmis paneli,
    telefona inmemis gunlerde de bunlar sayesinde indirmeden arama yapar; yeni bir gun yalnizca kendi
    ayinin parcasini degistirdigi icin uygulama yalnizca o parcayi yeniden indirir (2020'den bu yana
    doldurulacak arsivde tek dosya hem buyuk hem her gun bastan inerdi). Surum 2'de "metin" alani
    ozetin tam metni degil, kelime kokleridir ("kok": kac harfe kirpildigi; bkz. arama_kelimeleri).

    arama.json: 2.1 ve onceki uygulamalar icin ayni bicimde, yalnizca son ARAMA_GUN gun.
    """
    klasor = os.path.join(KOK, "ozetler")
    tarihler = sorted(
        (ad[:-5] for ad in os.listdir(klasor) if re.fullmatch(r"\d{8}\.html", ad)),
        reverse=True,
    )
    gunler = {}
    for t in tarihler:
        with open(os.path.join(klasor, t + ".html"), encoding="utf-8") as f:
            gunler[t] = arama_kaydi(f.read())

    # Aylik parcalar (en yeni ay basta); gunu kalmayan ayin parcasi silinir
    parca_klasor = os.path.join(KOK, "arama")
    os.makedirs(parca_klasor, exist_ok=True)
    aylar = {}
    for t in tarihler:
        aylar.setdefault(t[:6], {})[t] = gunler[t]
    parcalar = {}
    for ay, ayin_gunleri in aylar.items():
        yol = os.path.join(parca_klasor, ay + ".json")
        json_yaz(yol, {"surum": 2, "kok": KOK_UZUNLUGU, "ay": ay, "gunler": ayin_gunleri})
        parcalar[ay] = boyut(yol)
    for ad in os.listdir(parca_klasor):
        if re.fullmatch(r"\d{6}\.json", ad) and ad[:6] not in aylar:
            os.remove(os.path.join(parca_klasor, ad))

    arama = os.path.join(KOK, "arama.json")
    json_yaz(arama, {"surum": 2, "kok": KOK_UZUNLUGU, "gunler": {t: gunler[t] for t in tarihler[:ARAMA_GUN]}})
    boyutlar = {t: boyut(os.path.join(klasor, t + ".html")) for t in tarihler}
    with open(os.path.join(KOK, "index.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(
            {
                "guncel": tarihler[0], "tarihler": tarihler, "boyutlar": boyutlar, "arama_boyut": boyut(arama),
                "arama_parcalari": parcalar,
                "arsiv_gunleri": [t for t in tarihler if gunler[t].get("arsiv_ozeti")],
            },
            f, separators=(",", ":"),
        )


def main():
    if len(sys.argv) not in (2, 3) or not re.fullmatch(r"\d{8}", sys.argv[1]):
        sys.exit("Kullanim: yayinla.py yyyyMMdd [dal]")
    tarih = sys.argv[1]

    ozet = os.path.join(KOK, "ozetler", tarih + ".html")
    if not os.path.exists(ozet):
        sys.exit("Ozet dosyasi yok: " + ozet)
    if os.path.getsize(ozet) < 200:
        sys.exit("Ozet dosyasi cok kisa; yayinlanmadi")

    index_yaz()

    # "arama" klasoru: yeni ve degisen aylik parcalar ile (varsa) silinen parca birlikte eklenir
    git("add", "index.json", "arama.json", "arama", "ozetler/" + tarih + ".html")
    # Yeniden denemede (onceki calistirma commit etmis olabilir) ikinci kez commit etme
    if git("diff", "--cached", "--quiet", check=False).returncode != 0:
        kimlik = []
        if not git("config", "user.name", check=False, capture=True).stdout.strip():
            kimlik = ["-c", "user.name=Resmi Gazete Ozet", "-c", "user.email=resmi-gazete-ozet@users.noreply.github.com"]
        git(*kimlik, "commit", "-m", "Ozet " + tarih)

    if len(sys.argv) == 3:
        hedef = sys.argv[2]
    else:
        dal = git("rev-parse", "--abbrev-ref", "HEAD", capture=True).stdout.strip()
        hedef = dal if dal.startswith("claude/") else "main"
    if not re.fullmatch(r"[A-Za-z0-9._/-]+", hedef) or hedef.startswith("-"):
        sys.exit("Gecersiz dal adi: " + hedef)

    if not gonder_dene(hedef):
        print("GONDERILEMEDI", hedef)
        sys.exit(1)
    print("YAYINLANDI", tarih, hedef)


if __name__ == "__main__":
    main()
