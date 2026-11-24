import base64
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
API_BASE = "https://generativelanguage.googleapis.com/v1beta"
TERCIH_MODELLER = [
    "gemini-4-hydrogen",
    "gemini-2.5-pro",
]
# Pro modellerin ucretsiz kotasi turda birkac gunde doluyor (429). Flash modeller, ucretsiz
# katmanda cok daha genis gunluk kotayla, Pro'lardan SONRA yedek olarak denenir.
YEDEK_FLASH_MODELLER = [
    "gemini-flash-latest",
    "gemini-2.5-flash",
]
OZEL_MODEL_YASAK = ("lite", "embedding", "imagen", "veo", "tts", "audio", "image",
                    "banana", "transcribe", "robotics", "computer", "customtools", "live",
                    "native", "vision", "nano", "gemma", "learnlm", "exp", "preview-tts")


def surum_anahtari(ad: str) -> tuple:
    """gemini-3.1-flash -> (3, 1): yeni surum once denensin."""
    m = re.search(r"gemini-(\d+)(?:\.(\d+))?", ad)
    if not m:
        return (0, 0)
    return (int(m.group(1)), int(m.group(2) or 0))


class KotaDolduHatasi(Exception):
    pass


def calistir(komut: list[str]) -> tuple[int, str]:
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    sonuc = subprocess.run(
        komut,
        cwd=KOK,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )
    cikti = (sonuc.stdout + "\n" + sonuc.stderr).strip()
    return sonuc.returncode, cikti


def html_temizle(metin: str) -> str:
    metin = re.sub(r"^```(?:html)?\s*", "", metin.strip(), flags=re.IGNORECASE)
    metin = re.sub(r"\s*```$", "", metin)
    return metin.strip() + "\n"


def aktif_modelleri_bul(api_key: str) -> list[str]:
    bulunanlar = list(TERCIH_MODELLER)
    flashlar: list[str] = []
    try:
        r = requests.get(f"{API_BASE}/models", headers={"x-goog-api-key": api_key}, timeout=20)
        if r.ok:
            for m in r.json().get("models", []):
                ad = m.get("name", "").replace("models/", "")
                metotlar = m.get("supportedGenerationMethods", [])
                if "generateContent" not in metotlar or "gemini" not in ad:
                    continue
                # Yalnizca metin ozetleyebilen modeller: gorsel, ses, robotik, bilgisayar
                # kullanimi ve benzeri ozel modeller ozet icin uygun degil (kalitesiz cikti verir)
                if any(x in ad for x in OZEL_MODEL_YASAK):
                    continue
                if "flash" in ad:
                    if ad not in flashlar:
                        flashlar.append(ad)
                elif "pro" in ad and ad not in bulunanlar:
                    bulunanlar.append(ad)
    except Exception:
        pass
    flashlar.sort(key=surum_anahtari, reverse=True)
    for ad in flashlar + YEDEK_FLASH_MODELLER:
        if ad not in bulunanlar:
            bulunanlar.append(ad)
    return bulunanlar


def gunluk_kota_mi(yanit: requests.Response) -> bool:
    """429 gunluk kotadan mi (gun boyu dolu) yoksa dakikalik sinirdan mi (bekleyince gecer)?"""
    try:
        metin = yanit.text
    except Exception:
        return True
    if "PerDay" in metin or "per day" in metin.lower():
        return True
    if "PerMinute" in metin or "per minute" in metin.lower():
        return False
    return True


def icerik_parcalari_hazirla(klasor: Path, tarih: str, talimat: str) -> list[dict]:
    giris = (
        f"Aşağıdaki biçim ve üslup talimatlarına eksiksiz uyarak {tarih} tarihli T.C. Resmî Gazete "
        f"arşiv özetini HTML biçiminde üret.\n\n"
        f"ÖNEMLİ UYARI: TALIMAT.md içindeki tarih, sayı ve madde örnekleri YALNIZCA HTML yapısını "
        f"göstermek içindir. O örnek metinleri ASLA kopyalama; içeriği yalnızca aşağıda verilen "
        f"{tarih} tarihli gerçek Resmî Gazete belgelerinden oluştur.\n\n"
        f"=== gorev/TALIMAT.md ===\n{talimat}\n=== TALİMAT SONU ===\n\n"
        f"=== {tarih} TARİHLİ GERÇEK RESMÎ GAZETE DOSYALARI ==="
    )
    parcalar: list[dict] = [{"text": giris}]

    dosyalar = sorted(p for p in klasor.rglob("*") if p.is_file())
    if not dosyalar:
        raise RuntimeError(f"İndirilen klasör boş: {klasor}")

    toplam_karakter = len(giris)
    for dosya in dosyalar:
        goreli = dosya.relative_to(klasor)
        uzanti = dosya.suffix.lower()
        if uzanti in {".html", ".htm", ".txt", ".md", ".json", ".xml"}:
            metin = dosya.read_text(encoding="utf-8", errors="replace")
            if toplam_karakter + len(metin) > 450000:
                metin = metin[: max(0, 450000 - toplam_karakter)] + "\n[Metin uzunluk sınırı nedeniyle kısaltıldı]"
            parcalar.append({"text": f"\n--- DOSYA: {goreli} ---\n{metin}\n"})
            toplam_karakter += len(metin)
        elif uzanti == ".pdf":
            txt_karsiligi = dosya.parent / (dosya.name + ".txt")
            if txt_karsiligi.exists() and txt_karsiligi.stat().st_size > 200:
                continue
            if dosya.stat().st_size <= 8 * 1024 * 1024:
                veri_b64 = base64.b64encode(dosya.read_bytes()).decode("ascii")
                parcalar.append({"text": f"\n--- PDF EKİ: {goreli} ---"})
                parcalar.append({"inlineData": {"mimeType": "application/pdf", "data": veri_b64}})

    return parcalar


KOTA_DOLU_MODELLER: set[str] = set()


def gemini_cagir(api_key: str, modeller: list[str], icerikler: list[dict]) -> str:
    sistem = (
        "Sen T.C. Resmî Gazete arşiv özetleyicisisin. "
        "Yalnızca verilen o günün belgelerindeki gerçek maddeleri özetle. "
        "TALIMAT.md içindeki şablon örneklerini asla kopyalama. "
        "Sonraki yıllardaki değişiklikleri veya iptalleri hafızandan ekleme. "
        "Yanıt olarak yalnızca saf HTML döndür; açıklama veya ```html etiketi yazma."
    )

    son_hata = ""
    kota_hatasi_var = False
    for model in modeller:
        if model in KOTA_DOLU_MODELLER:
            kota_hatasi_var = True
            continue

        url = f"{API_BASE}/models/{model}:generateContent"
        if "2.5" in model:
            thinking_cfg = {"thinkingBudget": 16384}
        else:
            thinking_cfg = {"thinkingLevel": "HIGH"}

        govde = {
            "systemInstruction": {"parts": [{"text": sistem}]},
            "contents": icerikler,
            "generationConfig": {
                "temperature": 0.15,
                "maxOutputTokens": 32768,
                "thinkingConfig": thinking_cfg,
            },
        }

        dakika_beklemesi = 0
        for deneme in range(4):
            yanit = requests.post(url, headers={"x-goog-api-key": api_key}, json=govde, timeout=420)
            if yanit.status_code == 400 and "thinkingConfig" in govde["generationConfig"]:
                govde["generationConfig"].pop("thinkingConfig", None)
                continue
            if yanit.status_code == 404:
                son_hata = f"{model} bulunamadı (404)"
                break
            if yanit.status_code == 429:
                # Dakikalik sinir (Flash'ta buyuk girdiyle sik olur): bekleyip ayni modelle dene.
                if not gunluk_kota_mi(yanit) and dakika_beklemesi < 2:
                    dakika_beklemesi += 1
                    print(f"  -> {model} dakikalık sınır, 65 sn bekleniyor...")
                    time.sleep(65)
                    continue
                print(f"  -> {model} kota sınırına ulaştı, yedek modele geçiliyor...")
                KOTA_DOLU_MODELLER.add(model)
                kota_hatasi_var = True
                son_hata = f"{model} kota sınırı (429)"
                break
            if yanit.status_code >= 500:
                time.sleep(10)
                continue
            if not yanit.ok:
                son_hata = f"{model} HTTP {yanit.status_code}: {yanit.text[:300]}"
                break

            veri = yanit.json()
            adaylar = veri.get("candidates", [])
            if not adaylar:
                son_hata = f"{model} boş aday döndürdü"
                break
            parcalar = adaylar[0].get("content", {}).get("parts", [])
            metin = "".join(
                p.get("text", "") for p in parcalar if not p.get("thought")
            ).strip()
            if metin:
                dusunme = "YÜKSEK" if "thinkingConfig" in govde["generationConfig"] else "varsayılan"
                print(f"  -> Kullanılan model: {model} (Düşünme: {dusunme})")
                return html_temizle(metin)

    if kota_hatasi_var:
        raise KotaDolduHatasi(f"Tüm modellerin (Pro ve Flash) kota sınırına ulaşıldı ({son_hata}).")
    raise RuntimeError(f"Gemini yanıt üretemedi: {son_hata}")


def isaret_satiri(cikti: str) -> str:
    """arsiv.py sonraki ciktisinda ARSIV_TARIHI / ARSIV_BITTI satirini bulur.

    Paralel turlarda deneme kaydinin gonderimi yeniden denenince git'in mesajlari ("Current branch main
    is up to date." gibi) bu satirin onune karisabilir; yalnizca ilk satira bakmak turu oldururdu.
    """
    satirlar = (cikti or "").splitlines()
    for s in satirlar:
        s = s.strip()
        if s.startswith("ARSIV_TARIHI ") or s.startswith("GUNLUK_BEKLENIYOR") or s == "ARSIV_BITTI":
            return s
    return satirlar[0].strip() if satirlar else ""


def main() -> int:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("HATA: GEMINI_API_KEY tanımlı değil.", file=sys.stderr)
        return 1

    hedef_adet = int(os.environ.get("GUN_SAYISI", "5"))
    talimat = TALIMAT_YOLU.read_text(encoding="utf-8")
    OZETLER_DIZINI.mkdir(parents=True, exist_ok=True)
    modeller = aktif_modelleri_bul(api_key)
    tamamlanan = 0
    beklenmeyen = 0

    baslangic = time.monotonic()
    while tamamlanan < hedef_adet:
        if time.monotonic() - baslangic > 38 * 60:
            print("Tur zaman butcesi (38 dk) doldu; sonraki saatlik tur devam edecek.")
            break
        calistir(["git", "pull", "--rebase", "origin", "main"])
        _, cikti = calistir([sys.executable, "gorev/arsiv.py", "sonraki"])
        ilk_satir = isaret_satiri(cikti)
        print(f"\n[arsiv.py] {ilk_satir}")

        if ilk_satir in {"GUNLUK_BEKLENIYOR", "ARSIV_BITTI"}:
            print("İşlenecek gün kalmadı.")
            break

        if not ilk_satir.startswith("ARSIV_TARIHI "):
            print(f"Beklenmeyen çıktı:\n{cikti}", file=sys.stderr)
            beklenmeyen += 1
            if beklenmeyen >= 5:
                return 1
            time.sleep(10)
            continue
        beklenmeyen = 0

        tarih = ilk_satir.split()[1]
        _, indir_cikti = calistir([sys.executable, "gorev/indir.py", tarih, "--arsiv"])
        indir_ilk = indir_cikti.splitlines()[0].strip() if indir_cikti else ""
        print(f"[indir.py {tarih}] {indir_ilk}")

        if indir_ilk == "ZATEN_VAR":
            continue
        if indir_ilk == "YAYINLANMADI":
            calistir([sys.executable, "gorev/arsiv.py", "hata", tarih, "sayı bulunamadı"])
            continue
        if indir_ilk.startswith("AG_HATASI") or not indir_ilk.startswith("HAZIR "):
            print(f"İndirme sorunu:\n{indir_cikti}", file=sys.stderr)
            return 1

        klasor = Path(indir_ilk.split(" ", 1)[1].strip())
        if not klasor.is_absolute():
            klasor = KOK / klasor

        hedef_html = OZETLER_DIZINI / f"{tarih}.html"

        try:
            ilk_parcalar = icerik_parcalari_hazirla(klasor, tarih, talimat)
            icerikler = [{"role": "user", "parts": ilk_parcalar}]
            html_icerik = gemini_cagir(api_key, modeller, icerikler)

            if tarih != "20180715" and "30479 sayılı" in html_icerik:
                raise RuntimeError("Model şablon örneğini kopyaladı, iptal edildi.")

            hedef_html.write_text(html_icerik, encoding="utf-8")
            _, denetim = calistir([sys.executable, "gorev/denetle.py", tarih, "--arsiv"])
            print(f"[denetle.py {tarih}]\n{denetim}")

            if "DENETIM_HATA" in denetim or "UYARI" in denetim:
                icerikler.append({"role": "model", "parts": [{"text": html_icerik}]})
                icerikler.append(
                    {
                        "role": "user",
                        "parts": [
                            {
                                "text": (
                                    f"Ürettiğin HTML şu denetim uyarılarını verdi:\n{denetim}\n\n"
                                    "Yalnızca verilen kaynak belgelere sadık kalarak hataları düzelt "
                                    "ve tam HTML çıktısını yeniden ver."
                                )
                            }
                        ],
                    }
                )
                html_icerik = gemini_cagir(api_key, modeller, icerikler)
                hedef_html.write_text(html_icerik, encoding="utf-8")
                _, denetim = calistir([sys.executable, "gorev/denetle.py", tarih, "--arsiv"])
                print(f"[denetle.py 2. tur {tarih}]\n{denetim}")

            if "DENETIM_TAMAM" not in denetim:
                if hedef_html.exists():
                    hedef_html.unlink()
                hata_satiri = next((s for s in denetim.splitlines() if "HATA" in s), "denetim hatası")
                print(f"[{tarih}] denetim gecmedi ({hata_satiri[:80]}): gun isaretlenmedi, sonraki turda yeniden denenecek")
                continue

            yayin_kod, yayin_cikti = calistir([sys.executable, "gorev/yayinla.py", tarih, "main"])
            print(f"[yayinla.py {tarih}] kod={yayin_kod}\n{yayin_cikti}")
            if yayin_kod != 0:
                return 1

            tamamlanan += 1
            print(f"Bu turda tamamlanan: {tamamlanan}/{hedef_adet}")
            if tamamlanan < hedef_adet:
                time.sleep(35)

        except KotaDolduHatasi as exc:
            if hedef_html.exists():
                hedef_html.unlink()
            print(f"\nBilgi: {exc} Sonraki saatlik turda devam edilecek.")
            return 0
        except Exception as exc:
            if hedef_html.exists():
                hedef_html.unlink()
            print(f"[{tarih}] Hata: {exc}", file=sys.stderr)
            print(f"[{tarih}] gecici hata: gun isaretlenmedi, sonraki turda yeniden denenecek (en cok 5 deneme)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
