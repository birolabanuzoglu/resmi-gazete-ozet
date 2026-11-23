#!/usr/bin/env python3
"""Arsiv: gecmis gunlerin ozetleri icin siradaki gunu secer ve denemeleri kaydeder.

Kullanicinin 2026-11-18 istegi: 2020'den bu yana butun sayilarin ozeti, gunluk ozetle ayni
bicimde, yeniden eskiye dogru. Ilk asama 90 gunluk deneme (ARALIK_BAS - ARALIK_SON). Aralik
yalnizca bu dosyada degisir; arsiv rutini betiklere dokunamaz (is akisi reddeder).

Kullanim:
  python3 gorev/arsiv.py sonraki                    siradaki gunu verir ve denemesini kaydeder
  python3 gorev/arsiv.py hata <yyyyMMdd> "<neden>"  o gunu sorunlu olarak kaydeder (atlanir)
  python3 gorev/arsiv.py durum                      ilerleme: yazilan, kalan, sorunlu gunler

"sonraki" ciktisinin ilk satiri:
  GUNLUK_BEKLENIYOR <bugun>  bugunun gunluk ozeti henuz yayinda degil; arsiv beklesin, bitir
  ARSIV_BITTI                aralikta yazilacak gun kalmadi
  ARSIV_TARIHI <yyyyMMdd>    bu gunu ozetle: python3 gorev/indir.py <tarih> --arsiv
Ardindan bilgi satirlari: DENEME <n>/<sinir> ve KALAN <gun sayisi>.

Denemeler arsiv/durum.json dosyasinda tutulur ("gunler": tarih -> {"deneme", "son", "hata"}).
Ozeti yazilamadan DENEME_SINIRI kez secilen gun (kullanim siniri, cok buyuk sayi) ya da "hata"
ile kaydedilen gun (denetim gecmedi, sayi bulunamadi) atlanir; "durum" ciktisinda SORUNLU
olarak gorunur. Elle bakildiktan sonra durum.json'dan silinirse yeniden denenir.
"""
import datetime
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import yayinla  # noqa: E402  (git yardimcisi ve depo koku)

KOK = yayinla.KOK
ARALIK_BAS = "20200101"  # 90 gunluk deneme: 13 Agustos - 10 Kasim 2026
ARALIK_SON = "20260917"  # gunluk ozetler 11 Kasim 2026'da basladi; arsiv bunun oncesidir
# Kullanim sinirina takilan calisma da deneme sayilir (calisma yarida kesilir, kayit dusemez);
# 18 Kasim'daki ilk elle calistirma boyle kesildi. Bu yuzden sinir 3 degil 5.
DENEME_SINIRI = 5
DURUM = os.path.join(KOK, "arsiv", "durum.json")
TR = datetime.timezone(datetime.timedelta(hours=3))
# Ayni anda birden cok arsiv calismasi olabilir (18 Kasim'da kullanici 81 gunun hemen yazilmasini
# istedi). Her secimden once main'deki yayin ve deneme kayitlarina bakilir; baska bir calismanin
# son MESGUL_DAKIKA icinde sectigi (ve henuz yayimlamadigi) gun atlanir.
MESGUL_DAKIKA = 40


def bugun():
    return datetime.datetime.now(TR).strftime("%Y%m%d")


def ozet_var(tarih):
    return os.path.exists(os.path.join(KOK, "ozetler", tarih + ".html"))


def durum_oku():
    try:
        with open(DURUM, encoding="utf-8") as f:
            veri = json.load(f)
        if isinstance(veri, dict) and isinstance(veri.get("gunler"), dict):
            return veri
    except (OSError, ValueError):
        pass
    return {"gunler": {}}


def durum_yaz(veri):
    os.makedirs(os.path.dirname(DURUM), exist_ok=True)
    veri["gunler"] = dict(sorted(veri["gunler"].items(), reverse=True))
    with open(DURUM, "w", encoding="utf-8", newline="\n") as f:
        json.dump(veri, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")


def gunler():
    """Araliktaki gunler, en yeni basta."""
    bas = datetime.datetime.strptime(ARALIK_BAS, "%Y%m%d")
    gun = datetime.datetime.strptime(ARALIK_SON, "%Y%m%d")
    while gun >= bas:
        yield gun.strftime("%Y%m%d")
        gun -= datetime.timedelta(days=1)


def gonder(mesaj):
    """durum.json'u commit eder ve yayinla.py gibi oturumun dalina (claude/...) gonderir.

    Gonderilemezse yalnizca uyarir: deneme kaydi bir sonraki yayinla birlikte gider.
    ARSIV_GONDERME=0 ortam degiskeni gonderimi atlar (yerel deneme).
    """
    yayinla.git("add", "arsiv/durum.json")
    if yayinla.git("diff", "--cached", "--quiet", check=False).returncode != 0:
        kimlik = []
        if not yayinla.git("config", "user.name", check=False, capture=True).stdout.strip():
            kimlik = ["-c", "user.name=Resmi Gazete Ozet", "-c", "user.email=resmi-gazete-ozet@users.noreply.github.com"]
        yayinla.git(*kimlik, "commit", "-q", "-m", mesaj)
    if os.environ.get("ARSIV_GONDERME") == "0":
        return
    dal = yayinla.git("rev-parse", "--abbrev-ref", "HEAD", capture=True).stdout.strip()
    hedef = dal if dal.startswith("claude/") else "main"
    if yayinla.git("push", "-q", "origin", "HEAD:refs/heads/" + hedef, check=False).returncode != 0:
        print("UYARI deneme kaydi gonderilemedi (" + hedef + "); yayinla.py ile birlikte gidecek")


def ana_dal():
    """origin/main'deki yayimlanmis gunler ve deneme kayitlari (es zamanli calismalar icin).

    Yalnizca okunur (fetch); oturumun dali main'le birlestirilmez. Ag yoksa ya da yerel denemede
    (ARSIV_GONDERME=0) bos doner.
    """
    if os.environ.get("ARSIV_GONDERME") == "0":
        return set(), {}
    if yayinla.git("fetch", "-q", "origin", "main", check=False).returncode != 0:
        return set(), {}
    liste = yayinla.git("ls-tree", "--name-only", "origin/main", "ozetler/", check=False, capture=True).stdout
    yayinda = set(re.findall(r"ozetler/(\d{8})\.html", liste))
    r = yayinla.git("show", "origin/main:arsiv/durum.json", check=False, capture=True)
    try:
        uzak = json.loads(r.stdout).get("gunler", {}) if r.returncode == 0 else {}
    except ValueError:
        uzak = {}
    return yayinda, uzak


def birlestir(gunler_, uzak):
    """Iki deneme kaydini birlestirir: her gun icin daha yeni (son, deneme) olan kalir."""
    for t, k in uzak.items():
        y = gunler_.get(t)
        if y is None or (k.get("son", ""), k.get("deneme", 0)) > (y.get("son", ""), y.get("deneme", 0)):
            gunler_[t] = k


def mesgul(kayit, simdi):
    """Gunu son MESGUL_DAKIKA icinde baska bir calisma secmis ve hata kaydetmemisse True."""
    if kayit.get("hata") or not kayit.get("son"):
        return False
    try:
        son = datetime.datetime.strptime(kayit["son"], "%Y-%m-%d %H:%M").replace(tzinfo=TR)
    except ValueError:
        return False
    return simdi - son < datetime.timedelta(minutes=MESGUL_DAKIKA)


def sonraki():
    if False:
        print("GUNLUK_BEKLENIYOR", bugun())
        return
    yayinda, uzak = ana_dal()
    veri = durum_oku()
    birlestir(veri["gunler"], uzak)
    simdi = datetime.datetime.now(TR)
    kalan = [t for t in gunler() if not ozet_var(t) and t not in yayinda]
    for t in kalan:
        kayit = veri["gunler"].get(t, {})
        if kayit.get("deneme", 0) >= DENEME_SINIRI or mesgul(kayit, simdi):
            continue
        kayit["deneme"] = kayit.get("deneme", 0) + 1
        kayit["son"] = datetime.datetime.now(TR).strftime("%Y-%m-%d %H:%M")
        veri["gunler"][t] = kayit
        durum_yaz(veri)
        gonder("Arsiv denemesi " + t)
        print("ARSIV_TARIHI", t)
        print("DENEME %d/%d" % (kayit["deneme"], DENEME_SINIRI))
        print("KALAN", len(kalan))
        return
    print("ARSIV_BITTI")


def hata(tarih, neden):
    veri = durum_oku()
    kayit = veri["gunler"].get(tarih, {})
    kayit["deneme"] = DENEME_SINIRI  # yeniden secilmesin; elle bakilacak
    kayit["hata"] = " ".join(neden.split())[:200] or "belirtilmedi"
    kayit["son"] = datetime.datetime.now(TR).strftime("%Y-%m-%d %H:%M")
    veri["gunler"][tarih] = kayit
    durum_yaz(veri)
    gonder("Arsiv hatasi " + tarih)
    print("KAYDEDILDI", tarih)


def rapor():
    yayinda, uzak = ana_dal()
    veri = durum_oku()
    birlestir(veri["gunler"], uzak)
    tum = list(gunler())
    yazilan = [t for t in tum if ozet_var(t) or t in yayinda]
    print("ARALIK", ARALIK_BAS, ARALIK_SON, len(tum), "gun")
    print("YAZILAN", len(yazilan))
    print("KALAN", len(tum) - len(yazilan))
    for t in tum:
        kayit = veri["gunler"].get(t, {})
        if t not in yazilan and kayit.get("deneme", 0) >= DENEME_SINIRI:
            print("SORUNLU", t, kayit.get("hata", "deneme siniri (%d)" % DENEME_SINIRI))


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    komut = sys.argv[1] if len(sys.argv) > 1 else ""
    if komut == "sonraki" and len(sys.argv) == 2:
        sonraki()
    elif komut == "hata" and len(sys.argv) >= 3 and len(sys.argv[2]) == 8 and sys.argv[2].isdigit():
        hata(sys.argv[2], " ".join(sys.argv[3:]))
    elif komut == "durum" and len(sys.argv) == 2:
        rapor()
    else:
        sys.exit("Kullanim: arsiv.py sonraki | hata <yyyyMMdd> <neden> | durum")


if __name__ == "__main__":
    main()
