"""Web sitesi icin arama motorlarinin okuyabilecegi duz gun sayfalari ve site haritasi.

Sitenin asil gorunumu (docs/index.html + site.js) ozetleri tarayicida JavaScript ile ceker; Google
bu sayfalari gec ve eksik dizinler. Bu betik her ozet icin JavaScript'siz, icerigi hazir bir sayfa
yazar:

    docs/gun/YYYY-MM-DD.html   gunun ozeti (baslik, aciklama, kanonik adres, onceki/sonraki gun)
    docs/gun/index.html        butun gunlerin aylara gore listesi (tarayicilarin gunleri bulmasi icin)
    docs/sitemap.xml           ana sayfalar + gun listesi + her gun sayfasi (lastmod: gunun tarihi)

yayinla.index_yaz() her yayinda cagirir. Cikti deterministiktir (zaman damgasi yok) ve yalnizca
degisen dosyalar yazilir; boylece degismeyen gunler git'te degisiklik gostermez ve GitHub Pages
gereksiz yere yeniden derlenmez. Ozeti silinen gunun sayfasi da silinir.
"""

import html
import os
import re
import sys

SITE = "https://birolabanuzoglu.github.io/resmi-gazete-ozet/"
AD = "Günlük Resmî Gazete ve Mevzuat Özeti"
AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim",
         "Kasım", "Aralık"]
GUNLER = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]

# Sitemap'teki sabit sayfalar (uygulamanin ekranlarinin sitedeki karsiliklari)
SABIT = ["", "?mevzuat", "?gecmis", "?bulten=7", "?bulten=30", "?takvim", "?hakkinda"]

CSS = """
*{box-sizing:border-box}
body{margin:0;background:#F6F3EE;color:#1F2328;font:16px/1.65 Roboto,"Segoe UI",system-ui,sans-serif;
  -webkit-text-size-adjust:100%}
a{color:#1A56C4}
header.top{background:linear-gradient(180deg,#B71C1C,#971519);color:#fff;padding:14px 18px 54px}
header.top a{color:#fff;text-decoration:none}
header.top small{display:block;font-size:11px;font-weight:800;letter-spacing:.14em;opacity:.85}
header.top b{font-size:19px}
main{max-width:760px;margin:-40px auto 0;padding:0 14px 30px}
article,.box{background:#fff;border-radius:20px;box-shadow:0 1px 2px rgba(60,30,10,.06),0 6px 18px rgba(60,30,10,.07);
  padding:18px 18px 10px;margin-bottom:14px}
.kicker{font-size:11px;font-weight:800;letter-spacing:.13em;color:#B71C1C;margin:0}
h1{font-size:24px;line-height:1.25;margin:4px 0 8px}
h2{font-size:19px;line-height:1.3;margin:22px 0 8px;padding-top:12px;border-top:1px solid #EEE8E0}
h3{font-size:16.5px;margin:16px 0 6px}
p,li{color:#444A52}
mark{background:#FFEDA3;color:inherit;border-radius:3px;padding:0 2px}
table{border-collapse:collapse;width:100%;font-size:14px;display:block;overflow-x:auto}
th,td{border:1px solid #EEE8E0;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#FDECEC;color:#8E1318}
.acts{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 4px}
.acts a{display:inline-block;padding:8px 14px;border-radius:99px;background:#B71C1C;color:#fff;text-decoration:none;
  font-weight:700;font-size:14px}
.acts a.alt{background:#FDECEC;color:#8E1318}
nav.gezinti{display:flex;justify-content:space-between;gap:10px;margin:6px 0 14px;font-weight:700;font-size:14px}
nav.gezinti a{text-decoration:none}
.liste h2{border-top:0;padding-top:0}
.liste ul{list-style:none;padding:0;margin:0 0 10px}
.liste li{padding:7px 0;border-bottom:1px solid #F1ECE5}
.liste li a{font-weight:700;text-decoration:none}
.liste li span{display:block;font-size:13.5px;color:#7B8088}
footer{font-size:12.5px;color:#7B8088;text-align:center;padding:10px 18px 30px}
@media (prefers-color-scheme:dark){
  body{background:#121417;color:#E8EAED}
  article,.box{background:#1C1F24;box-shadow:none}
  p,li{color:#C4C8CE}
  a{color:#8AB4F8}
  h2{border-top-color:#30353C}
  th{background:#3B2224;color:#FFB4AB}
  th,td{border-color:#30353C}
  mark{background:#5A4A12;color:#FFF3C4}
  .acts a.alt{background:#3B2224;color:#FFB4AB}
  .liste li{border-bottom-color:#2A2E35}
}
"""


def tarih_yazi(t, gun_adi=False):
    """"20261125" -> "25 Kasım 2026" (gun_adi: "25 Kasım 2026 Çarşamba")."""
    import datetime
    d = datetime.date(int(t[:4]), int(t[4:6]), int(t[6:]))
    s = f"{d.day} {AYLAR[d.month - 1]} {d.year}"
    return s + " " + GUNLER[d.weekday()] if gun_adi else s


def iso(t):
    return f"{t[:4]}-{t[4:6]}-{t[6:]}"


def kacis(s):
    return html.escape(s, quote=True)


def duz(parca):
    t = re.sub(r"(?s)<[^>]+>", " ", parca)
    return re.sub(r"\s+", " ", html.unescape(t)).strip()


def aciklama(ozet, kayit):
    """Arama sonucundaki aciklama: once "Gunun ozeti" paragrafi, yoksa one cikanlar; en cok ~155 harf."""
    m = re.search(r"(?is)<h2>\s*Günün özeti\s*</h2>\s*<p>(.*?)</p>", ozet)
    metin = duz(m.group(1)) if m else (kayit.get("onizleme") or "")
    if len(metin) > 155:
        metin = metin[:152].rsplit(" ", 1)[0].rstrip(",;:") + "…"
    return metin


def yaz_degisirse(yol, icerik):
    """Dosyayi yalnizca icerigi degistiyse yazar; yazildiysa True."""
    if os.path.exists(yol):
        with open(yol, encoding="utf-8", newline="") as f:
            if f.read() == icerik:
                return False
    with open(yol, "w", encoding="utf-8", newline="\n") as f:
        f.write(icerik)
    return True


def bas(baslik, aciklama_, kanonik, ek_head=""):
    return (
        "<!doctype html>\n<html lang=\"tr\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n"
        f"<title>{kacis(baslik)}</title>\n"
        f"<meta name=\"description\" content=\"{kacis(aciklama_)}\">\n"
        f"<link rel=\"canonical\" href=\"{kacis(kanonik)}\">\n"
        "<link rel=\"icon\" type=\"image/png\" href=\"../icon.png\">\n"
        "<meta name=\"theme-color\" content=\"#B71C1C\">\n"
        f"<meta property=\"og:type\" content=\"article\">\n<meta property=\"og:site_name\" content=\"{AD}\">\n"
        f"<meta property=\"og:title\" content=\"{kacis(baslik)}\">\n"
        f"<meta property=\"og:description\" content=\"{kacis(aciklama_)}\">\n"
        f"<meta property=\"og:url\" content=\"{kacis(kanonik)}\">\n"
        f"<meta property=\"og:image\" content=\"{SITE}og.png\">\n<meta property=\"og:locale\" content=\"tr_TR\">\n"
        + ek_head +
        f"<style>{CSS}</style>\n</head>\n<body>\n"
        f"<header class=\"top\"><a href=\"../\"><small>RESMÎ GAZETE</small><b>{AD}</b></a></header>\n<main>\n"
    )


SON = (
    "<footer>Bu site herhangi bir devlet kurumunu temsil etmez. Özetler yapay zekâ ile hazırlanır ve hata "
    "içerebilir; bağlayıcı olan Resmî Gazete'de yayımlanan metindir.<br>"
    "<a href=\"../\">Ana sayfa</a> · <a href=\"./\">Bütün günler</a> · <a href=\"../?mevzuat\">Mevzuat</a> · "
    "<a href=\"../?hakkinda\">Hakkında</a></footer>\n</main>\n</body>\n</html>\n"
)


def gun_sayfasi(t, ozet, kayit, onceki, sonraki):
    sayi = kayit.get("sayi") or ""
    baslik = f"{tarih_yazi(t)} Resmî Gazete Özeti" + (f" (Sayı {sayi})" if sayi else "")
    acik = aciklama(ozet, kayit)
    kanonik = f"{SITE}gun/{iso(t)}.html"
    ld = (
        "<script type=\"application/ld+json\">"
        + '{"@context":"https://schema.org","@type":"Article",'
        + f'"headline":{json_str(baslik)},"description":{json_str(acik)},'
        + f'"datePublished":"{iso(t)}","dateModified":"{iso(t)}","inLanguage":"tr",'
        + f'"mainEntityOfPage":"{kanonik}","url":"{kanonik}",'
        + f'"isBasedOn":"https://www.resmigazete.gov.tr/eskiler/{t[:4]}/{t[4:6]}/{t}.htm",'
        + f'"author":{{"@type":"Organization","name":{json_str(AD)}}},'
        + f'"publisher":{{"@type":"Organization","name":{json_str(AD)},"logo":{{"@type":"ImageObject","url":"{SITE}icon.png"}}}}'
        + "}</script>\n"
    )
    # Ozetin kendi <h1>'i sayfa basligi olur; ustune kucuk bir ust yazi eklenir
    govde = ozet.strip()
    nav = "<nav class=\"gezinti\">"
    nav += f"<a href=\"{iso(onceki)}.html\">← {kacis(tarih_yazi(onceki))}</a>" if onceki else "<span></span>"
    nav += f"<a href=\"{iso(sonraki)}.html\">{kacis(tarih_yazi(sonraki))} →</a>" if sonraki else "<span></span>"
    nav += "</nav>\n"
    return (
        bas(baslik, acik, kanonik, ld)
        + nav
        + "<article>\n"
        + f"<p class=\"kicker\">RESMÎ GAZETE ÖZETİ · {kacis(tarih_yazi(t, gun_adi=True).upper())}</p>\n"
        + govde + "\n"
        + "<div class=\"acts\">"
        + f"<a href=\"../?gun={iso(t)}\">Süzgeçli ve kartlı görünümde aç</a>"
        + f"<a class=\"alt\" href=\"https://www.resmigazete.gov.tr/eskiler/{t[:4]}/{t[4:6]}/{t}.htm\">Resmî Gazete'nin aslı</a>"
        + "</div>\n</article>\n"
        + nav
        + SON
    )


def json_str(s):
    import json
    return json.dumps(s, ensure_ascii=False)


def liste_sayfasi(tarihler, kayitlar):
    baslik = "Resmî Gazete özetleri: bütün günler"
    acik = (f"{len(tarihler)} günün Resmî Gazete özeti, aylara göre: sade Türkçe özet, öne çıkanlar, "
            "yönetmelik, karar ve atamalar.")
    govde = "<article class=\"liste\">\n<p class=\"kicker\">ARŞİV</p>\n<h1>Bütün günlerin özetleri</h1>\n"
    ay = None
    for t in tarihler:
        if t[:6] != ay:
            if ay is not None:
                govde += "</ul>\n"
            ay = t[:6]
            govde += f"<h2>{AYLAR[int(t[4:6]) - 1]} {t[:4]}</h2>\n<ul>\n"
        k = kayitlar[t]
        alt = k.get("onizleme") or ""
        sayi = f" · Sayı {k['sayi']}" if k.get("sayi") else ""
        govde += (f"<li><a href=\"{iso(t)}.html\">{kacis(tarih_yazi(t, gun_adi=True))}{kacis(sayi)}</a>"
                  + (f"<span>{kacis(alt[:160])}</span>" if alt else "") + "</li>\n")
    if ay is not None:
        govde += "</ul>\n"
    govde += "</article>\n"
    return bas(baslik, acik, SITE + "gun/") + govde + SON


def site_haritasi(tarihler):
    satirlar = ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
                "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"]
    for yol in SABIT:
        satirlar.append(f"  <url><loc>{kacis(SITE + yol)}</loc></url>")
    if tarihler:
        satirlar.append(f"  <url><loc>{SITE}gun/</loc><lastmod>{iso(tarihler[0])}</lastmod></url>")
    for t in tarihler:
        satirlar.append(f"  <url><loc>{SITE}gun/{iso(t)}.html</loc><lastmod>{iso(t)}</lastmod></url>")
    satirlar.append("</urlset>")
    return "\n".join(satirlar) + "\n"


def yaz(kok, kayitlar=None):
    """Butun gun sayfalarini, gun listesini ve site haritasini yazar. kayitlar: {tarih: arama_kaydi}
    (yayinla.index_yaz zaten hesapliyor; verilmezse burada hesaplanir). Yazilan dosya sayisini dondurur."""
    klasor = os.path.join(kok, "ozetler")
    tarihler = sorted((ad[:-5] for ad in os.listdir(klasor) if re.fullmatch(r"\d{8}\.html", ad)), reverse=True)
    if kayitlar is None:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import yayinla
        kayitlar = {}
        for t in tarihler:
            with open(os.path.join(klasor, t + ".html"), encoding="utf-8") as f:
                kayitlar[t] = yayinla.arama_kaydi(f.read())
    hedef = os.path.join(kok, "docs", "gun")
    os.makedirs(hedef, exist_ok=True)
    yazilan = 0
    for i, t in enumerate(tarihler):
        with open(os.path.join(klasor, t + ".html"), encoding="utf-8") as f:
            ozet = f.read()
        sonraki = tarihler[i - 1] if i > 0 else None      # daha yeni gun
        onceki = tarihler[i + 1] if i + 1 < len(tarihler) else None
        if yaz_degisirse(os.path.join(hedef, iso(t) + ".html"), gun_sayfasi(t, ozet, kayitlar[t], onceki, sonraki)):
            yazilan += 1
    gecerli = {iso(t) + ".html" for t in tarihler} | {"index.html"}
    for ad in os.listdir(hedef):
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}\.html", ad) and ad not in gecerli:
            os.remove(os.path.join(hedef, ad))
            yazilan += 1
    yazilan += yaz_degisirse(os.path.join(hedef, "index.html"), liste_sayfasi(tarihler, kayitlar))
    yazilan += yaz_degisirse(os.path.join(kok, "docs", "sitemap.xml"), site_haritasi(tarihler))
    return yazilan


if __name__ == "__main__":
    kok = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print("yazilan dosya:", yaz(kok))
