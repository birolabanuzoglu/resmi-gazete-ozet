"""Mistral (La Plateforme, ucretsiz "Experiment" plani) ile arsiv ozeti uretir.

Ucretsiz plan: saniyede 1 istek, dakikada 500 bin token, ayda 1 milyar token (25 Kasim 2026).
Anahtar GitHub Actions secret'i MISTRAL_API_KEY; tanimli degilse tur sessizce (cikis 0) biter.
Akis Evren betigiyle aynidir: arsiv.py sonraki -> indir.py --arsiv -> model -> denetle.py --arsiv
(basarisizsa bir duzeltme turu) -> yayinla.py <tarih> main.
"""
import os
import re
import subprocess
import sys
import time
from pathlib import Path
import requests

KOK = Path(__file__).resolve().parent.parent
TALIMAT_YOLU = KOK / "gorev" / "TALIMAT.md"
OZETLER_DIZINI = KOK / "ozetler"
API_URL = "https://api.mistral.ai/v1/chat/completions"
# Sirayla denenir; ucretsiz planda acik olmayan ya da kaldirilan model atlanir.
MODELLER = ["mistral-large-latest", "mistral-medium-latest", "magistral-medium-latest"]
KULLANILAMAZ_MODELLER: set[str] = set()
GIRDI_SINIRI = 200_000          # karakter; baglam asilirsa 85.000 ile bir kez daha denenir
KUCUK_GIRDI_SINIRI = 85_000


class KotaDolduHatasi(Exception):
    pass


class GirdiCokBuyukHatasi(Exception):
    pass


class GeciciApiHatasi(Exception):
    pass


class ModelYokHatasi(Exception):
    pass


def calistir(komut: list[str]) -> tuple[int, str]:
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    sonuc = subprocess.run(komut, cwd=KOK, capture_output=True, text=True,
                           encoding="utf-8", errors="replace", env=env)
    return sonuc.returncode, (sonuc.stdout + "\n" + sonuc.stderr).strip()


def html_temizle(metin: str) -> str:
    metin = re.sub(r"<think>.*?</think>", "", metin, flags=re.DOTALL).strip()
    metin = re.sub(r"^```(?:html)?\s*", "", metin, flags=re.IGNORECASE)
    metin = re.sub(r"\s*```$", "", metin)
    return metin.strip() + "\n"


def ham_html_ayikla(metin: str) -> str:
    metin = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", metin, flags=re.DOTALL | re.IGNORECASE)
    metin = re.sub(r"<[^>]+>", " ", metin)
    metin = re.sub(r"[ \t]+", " ", metin)
    metin = re.sub(r"\n\s*\n+", "\n", metin)
    return metin.strip()


def metin_icerigi_hazirla(klasor: Path, tarih: str, talimat: str, maks_karakter: int) -> str:
    bolumler = [
        f"Aşağıdaki biçim ve üslup talimatlarına eksiksiz uyarak {tarih} tarihli T.C. Resmî Gazete "
        f"arşiv özetini HTML biçiminde üret.\n\n"
        f"ZORUNLU BİÇİM KURALI: Ana başlıktan (<h1>) hemen sonra mutlaka "
        f"'<p><b>Kapsam:</b> Arşiv özeti – ...</p>' satırını ekle (kısa çizgi '–' karakteri birebir kullanılmalıdır).\n"
        f"ÖNEMLİ UYARI: TALIMAT.md içindeki tarih, sayı ve madde örnekleri YALNIZCA HTML yapısını "
        f"göstermek içindir. O örnek metinleri ASLA kopyalama; içeriği yalnızca aşağıda verilen "
        f"{tarih} tarihli gerçek Resmî Gazete belgelerinden oluştur.\n\n"
        f"=== gorev/TALIMAT.md ===\n{talimat}\n=== TALİMAT SONU ===\n\n"
        f"=== {tarih} TARİHLİ GERÇEK RESMÎ GAZETE BELGELERİ ==="
    ]
    tum_dosyalar = sorted(p for p in klasor.rglob("*") if p.is_file())
    if not tum_dosyalar:
        raise RuntimeError(f"İndirilen klasör boş: {klasor}")
    duz_metinler = [p for p in tum_dosyalar if p.suffix.lower() in {".txt", ".md"}]
    secilen = duz_metinler if duz_metinler else [
        p for p in tum_dosyalar if p.suffix.lower() in {".html", ".htm", ".json", ".xml"}
    ]
    secilen.sort(key=lambda p: ("ilan" in p.name.lower(), str(p)))  # ilanlar en sona

    toplam = len(bolumler[0])
    for dosya in secilen:
        metin = dosya.read_text(encoding="utf-8", errors="replace")
        if dosya.suffix.lower() in {".html", ".htm"}:
            metin = ham_html_ayikla(metin)
        if not metin.strip():
            continue
        if toplam + len(metin) > maks_karakter:
            kalan = max(0, maks_karakter - toplam)
            if kalan <= 500:
                break
            metin = metin[:kalan] + "\n[Uzunluk sınırı nedeniyle kısaltıldı]"
        bolumler.append(f"\n--- DOSYA: {dosya.relative_to(klasor)} ---\n{metin}\n")
        toplam += len(metin)
    return "\n".join(bolumler)


def yanit_metni(veri: dict) -> str:
    secenekler = veri.get("choices") or []
    if not secenekler:
        return ""
    icerik = (secenekler[0].get("message") or {}).get("content")
    if isinstance(icerik, list):  # magistral: [{"type":"thinking",...},{"type":"text","text":...}]
        icerik = "".join(p.get("text", "") for p in icerik if isinstance(p, dict) and p.get("type") == "text")
    return icerik or ""


def mistral_cagir(anahtar: str, mesajlar: list[dict]) -> str:
    basliklar = {"Authorization": f"Bearer {anahtar}", "Content-Type": "application/json"}
    son_hata = ""
    for model in MODELLER:
        if model in KULLANILAMAZ_MODELLER:
            continue
        govde = {"model": model, "messages": mesajlar, "temperature": 0.15, "max_tokens": 32000}
        for _ in range(4):
            try:
                yanit = requests.post(API_URL, headers=basliklar, json=govde, timeout=(25, 600))
            except requests.exceptions.RequestException as exc:
                son_hata = f"{model} bağlantı ({exc.__class__.__name__})"
                time.sleep(10)
                continue
            if yanit.status_code == 401:
                raise RuntimeError("Mistral anahtarı geçersiz (401); MISTRAL_API_KEY'i yenileyin.")
            if yanit.status_code in (403, 404):
                print(f"  -> {model} bu hesapta kullanılamıyor ({yanit.status_code}), sıradakine geçiliyor...")
                KULLANILAMAZ_MODELLER.add(model)
                son_hata = f"{model} HTTP {yanit.status_code}"
                break
            if yanit.status_code == 400:
                govde_metni = yanit.text.lower()
                if any(x in govde_metni for x in ("too large", "too long", "context", "exceed", "maximum")):
                    raise GirdiCokBuyukHatasi(f"{model}: {yanit.text[:200]}")
                son_hata = f"{model} HTTP 400: {yanit.text[:250]}"
                break
            if yanit.status_code == 429:
                metin = yanit.text.lower()
                if "month" in metin or "quota" in metin or "budget" in metin:
                    raise KotaDolduHatasi(f"Mistral kotası doldu: {yanit.text[:200]}")
                bekle = min(max(int(yanit.headers.get("Retry-After", "20") or 20), 5), 65)
                print(f"  -> {model} hız sınırı (429), {bekle} sn bekleniyor...")
                time.sleep(bekle)
                continue
            if yanit.status_code >= 500:
                son_hata = f"{model} sunucu hatası ({yanit.status_code})"
                time.sleep(15)
                continue
            if not yanit.ok:
                son_hata = f"{model} HTTP {yanit.status_code}: {yanit.text[:250]}"
                break

            yanit.encoding = "utf-8"
            veri = yanit.json()
            metin = html_temizle(yanit_metni(veri))
            bitis = (veri.get("choices") or [{}])[0].get("finish_reason")
            if bitis == "length":
                son_hata = f"{model} çıktı sınırında kesildi"
                print(f"  -> {model} çıktısı yarım kaldı (finish_reason=length), sıradakine geçiliyor...")
                break
            if metin.strip():
                kullanim = veri.get("usage") or {}
                print(f"  -> Kullanılan model: Mistral / {model} | girdi {kullanim.get('prompt_tokens', '?')}"
                      f" + çıktı {kullanim.get('completion_tokens', '?')} token")
                return metin
            son_hata = f"{model} boş yanıt"
            break
    if all(m in KULLANILAMAZ_MODELLER for m in MODELLER):
        raise ModelYokHatasi(f"Hiçbir Mistral modeli bu hesapta kullanılamıyor ({son_hata}).")
    raise GeciciApiHatasi(f"Mistral yanıt üretemedi: {son_hata}")


def ozet_uret(anahtar: str, sistem: str, klasor: Path, tarih: str, talimat: str) -> tuple[list[dict], str]:
    for sinir in (GIRDI_SINIRI, KUCUK_GIRDI_SINIRI):
        mesajlar = [
            {"role": "system", "content": sistem},
            {"role": "user", "content": metin_icerigi_hazirla(klasor, tarih, talimat, sinir)},
        ]
        try:
            return mesajlar, mistral_cagir(anahtar, mesajlar)
        except GirdiCokBuyukHatasi as exc:
            if sinir == KUCUK_GIRDI_SINIRI:
                raise GeciciApiHatasi(f"girdi bağlama sığmadı: {exc}")
            print(f"  -> Girdi bağlama sığmadı, {KUCUK_GIRDI_SINIRI} karakterle yeniden deneniyor...")
    raise AssertionError("ulaşılmaz")


def main() -> int:
    anahtar = os.environ.get("MISTRAL_API_KEY", "").strip()
    if not anahtar:
        print("Bilgi: MISTRAL_API_KEY tanımlı değil; Mistral turu atlandı.")
        return 0

    hedef_adet = int(os.environ.get("GUN_SAYISI", "25"))
    talimat = TALIMAT_YOLU.read_text(encoding="utf-8")
    OZETLER_DIZINI.mkdir(parents=True, exist_ok=True)
    sistem = (
        "Sen T.C. Resmî Gazete arşiv özetleyicisisin. "
        "Yalnızca verilen o günün belgelerindeki gerçek maddeleri özetle. "
        "Ana başlıktan hemen sonra mutlaka '<p><b>Kapsam:</b> Arşiv özeti – ...</p>' satırını yaz. "
        "TALIMAT.md içindeki şablon örneklerini asla kopyalama. "
        "Sonraki yıllardaki değişiklikleri veya iptalleri hafızandan ekleme. "
        "Yanıt olarak yalnızca saf HTML döndür; açıklama veya ```html etiketi yazma."
    )

    tamamlanan = 0
    baslangic = time.monotonic()
    while tamamlanan < hedef_adet:
        if time.monotonic() - baslangic > 38 * 60:
            print("Tur zaman butcesi (38 dk) doldu; sonraki tur devam edecek.")
            break
        calistir(["git", "pull", "--rebase", "origin", "main"])
        _, cikti = calistir([sys.executable, "gorev/arsiv.py", "sonraki"])
        ilk_satir = cikti.splitlines()[0].strip() if cikti else ""
        print(f"\n[arsiv.py] {ilk_satir}")
        if ilk_satir in {"GUNLUK_BEKLENIYOR", "ARSIV_BITTI"}:
            print("İşlenecek gün kalmadı.")
            break
        if not ilk_satir.startswith("ARSIV_TARIHI "):
            print(f"Beklenmeyen çıktı:\n{cikti}", file=sys.stderr)
            return 1

        tarih = ilk_satir.split()[1]
        hedef_html = OZETLER_DIZINI / f"{tarih}.html"
        if hedef_html.exists():
            print(f"[{tarih}] Zaten oluşturulmuş, atlanıyor.")
            continue

        _, indir_cikti = calistir([sys.executable, "gorev/indir.py", tarih, "--arsiv"])
        indir_ilk = indir_cikti.splitlines()[0].strip() if indir_cikti else ""
        print(f"[indir.py {tarih}] {indir_ilk}")
        if indir_ilk == "ZATEN_VAR":
            continue
        if indir_ilk == "YAYINLANMADI":
            calistir([sys.executable, "gorev/arsiv.py", "hata", tarih, "sayı bulunamadı"])
            continue
        if not indir_ilk.startswith("HAZIR "):
            # Ag hatasi (resmigazete.gov.tr Actions IP'lerinden bazen zaman asimi verir): gun
            # isaretlenmez, turu kirmizi bitirmek yerine sonraki gune gecilir.
            print(f"[{tarih}] indirme sorunu, gun atlandi: {indir_cikti[:200]}")
            time.sleep(20)
            continue

        klasor = Path(indir_ilk.split(" ", 1)[1].strip())
        if not klasor.is_absolute():
            klasor = KOK / klasor

        try:
            mesajlar, html_icerik = ozet_uret(anahtar, sistem, klasor, tarih, talimat)
            if tarih != "20180715" and "30479 sayılı" in html_icerik:
                raise RuntimeError("Model şablon örneğini kopyaladı, iptal edildi.")

            hedef_html.write_text(html_icerik, encoding="utf-8")
            _, denetim = calistir([sys.executable, "gorev/denetle.py", tarih, "--arsiv"])
            print(f"[denetle.py {tarih}]\n{denetim}")

            if "DENETIM_HATA" in denetim or "UYARI" in denetim:
                mesajlar.append({"role": "assistant", "content": html_icerik})
                mesajlar.append({"role": "user", "content": (
                    f"Ürettiğin HTML şu denetim uyarılarını verdi:\n{denetim}\n\n"
                    "Yalnızca verilen kaynak belgelere sadık kalarak hataları düzelt "
                    "ve tam HTML çıktısını yeniden ver.")})
                html_icerik = mistral_cagir(anahtar, mesajlar)
                hedef_html.write_text(html_icerik, encoding="utf-8")
                _, denetim = calistir([sys.executable, "gorev/denetle.py", tarih, "--arsiv"])
                print(f"[denetle.py 2. tur {tarih}]\n{denetim}")

            if "DENETIM_TAMAM" not in denetim:
                hedef_html.unlink(missing_ok=True)
                hata_satiri = next((s for s in denetim.splitlines() if "HATA" in s), "denetim hatası")
                print(f"[{tarih}] denetim gecmedi ({hata_satiri[:80]}): gun isaretlenmedi, sonraki turda yeniden denenecek")
                continue

            yayin_kod, yayin_cikti = calistir([sys.executable, "gorev/yayinla.py", tarih, "main"])
            print(f"[yayinla.py {tarih}] kod={yayin_kod}\n{yayin_cikti}")
            if yayin_kod != 0:
                return 1
            tamamlanan += 1
            print(f"Bu turda tamamlanan: {tamamlanan}/{hedef_adet}")
            time.sleep(2)

        except KotaDolduHatasi as exc:
            hedef_html.unlink(missing_ok=True)
            print(f"\nBilgi: {exc} Kota yenilenince devam edilecek.")
            return 0
        except GeciciApiHatasi as exc:
            hedef_html.unlink(missing_ok=True)
            print(f"[{tarih}] Geçici sorun, sonra tekrar denenecek: {exc}")
            time.sleep(15)
        except ModelYokHatasi as exc:
            # Gunlerin 5 deneme hakki bosa gitmesin: tur durur, kirmizi biter (kullanici gorsun).
            hedef_html.unlink(missing_ok=True)
            print(f"HATA: {exc} MODELLER listesini güncelleyin.", file=sys.stderr)
            return 1
        except Exception as exc:
            hedef_html.unlink(missing_ok=True)
            print(f"[{tarih}] Hata: {exc}", file=sys.stderr)
            if "401" in str(exc):
                return 1
            print(f"[{tarih}] gecici hata: gun isaretlenmedi, sonraki turda yeniden denenecek (en cok 5 deneme)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
