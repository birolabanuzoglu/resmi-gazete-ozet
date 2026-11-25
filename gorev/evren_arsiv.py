from datetime import date
import json
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
EVREN_API_BASE = "https://evren-llmapi.ssyz.org.tr/v1"
EVREN_MODELLER = ["deepseek-v4.1-flash", "qwen3.8-flash-next", "gemma-4-31b"]
YOGUN_MODELLER: set[str] = set()
SARTLAR_ONAYLANDI = False


class GunlukKotaDolduHatasi(Exception):
    pass


class GeciciApiHatasi(Exception):
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


def evren_sartlari_onayla(evren_key: str) -> None:
    global SARTLAR_ONAYLANDI
    if SARTLAR_ONAYLANDI:
        return
    basliklar = {"X-API-Key": evren_key, "Content-Type": "application/json"}
    try:
        r = requests.get(f"{EVREN_API_BASE}/terms/status", headers=basliklar, timeout=20)
        if r.ok:
            veri = r.json()
            if not veri.get("accepted", True):
                surum = veri.get("current_version", 1)
                requests.post(
                    f"{EVREN_API_BASE}/terms/accept",
                    headers=basliklar,
                    json={"version": surum},
                    timeout=20,
                )
                print(f"[Evren] Kullanım şartları onaylandı (sürüm {surum}).")
        SARTLAR_ONAYLANDI = True
    except Exception as exc:
        print(f"[Evren] Şart kontrol uyarısı: {exc}")


def metin_icerigi_hazirla(klasor: Path, tarih: str, talimat: str, maks_karakter: int = 85000) -> str:
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
    secilen_dosyalar = duz_metinler if duz_metinler else [
        p for p in tum_dosyalar if p.suffix.lower() in {".html", ".htm", ".json", ".xml"}
    ]
    secilen_dosyalar.sort(key=lambda p: ("ilan" in p.name.lower(), str(p)))

    toplam_karakter = len(bolumler[0])
    for dosya in secilen_dosyalar:
        goreli = dosya.relative_to(klasor)
        metin = dosya.read_text(encoding="utf-8", errors="replace")
        if dosya.suffix.lower() in {".html", ".htm"}:
            metin = ham_html_ayikla(metin)
        if not metin.strip():
            continue
        if toplam_karakter + len(metin) > maks_karakter:
            kalan = max(0, maks_karakter - toplam_karakter)
            if kalan > 500:
                metin = metin[:kalan] + "\n[Uzunluk sınırı nedeniyle kısaltıldı]"
            else:
                break
        bolumler.append(f"\n--- DOSYA: {goreli} ---\n{metin}\n")
        toplam_karakter += len(metin)

    return "\n".join(bolumler)


def evren_cagir(evren_key: str, mesajlar: list[dict]) -> str:
    evren_sartlari_onayla(evren_key)

    basliklar = {
        "Authorization": f"Bearer {evren_key}",
        "X-API-Key": evren_key,
        "Content-Type": "application/json",
    }

    son_hata = ""
    for model in EVREN_MODELLER:
        if model in YOGUN_MODELLER and len(EVREN_MODELLER) > len(YOGUN_MODELLER):
            continue

        govde = {
            "model": model,
            "messages": mesajlar,
            "temperature": 0.15,
            "max_tokens": 10240,
            "reasoning_effort": "low",
            "stream": True,
        }

        for deneme in range(2):
            try:
                yanit = requests.post(
                    f"{EVREN_API_BASE}/chat/completions",
                    headers=basliklar,
                    json=govde,
                    timeout=(25, 95),
                    stream=True,
                )
            except requests.exceptions.RequestException as exc:
                son_hata = f"{model} gecikme ({exc.__class__.__name__})"
                print(f"  -> {model} yanıtı gecikti, sıradaki hızlı modele geçiliyor...")
                YOGUN_MODELLER.add(model)
                break

            if yanit.status_code == 400 and "reasoning_effort" in govde:
                yanit.close()
                govde.pop("reasoning_effort", None)
                continue

            if yanit.status_code == 403 and "terms_not_accepted" in yanit.text:
                yanit.close()
                global SARTLAR_ONAYLANDI
                SARTLAR_ONAYLANDI = False
                evren_sartlari_onayla(evren_key)
                continue

            if yanit.status_code == 429:
                hata_metni = yanit.text
                yanit.close()
                if "daily_token_limit_exceeded" in hata_metni:
                    raise GunlukKotaDolduHatasi("Evren günlük 15M token kotası doldu.")
                bekle = int(yanit.headers.get("Retry-After", "30"))
                bekle = min(max(bekle, 15), 45)
                print(f"  -> {model} hız sınırı (429), {bekle} sn bekleniyor...")
                time.sleep(bekle)
                continue

            if yanit.status_code >= 500:
                kod = yanit.status_code
                yanit.close()
                son_hata = f"{model} yoğun ({kod})"
                print(f"  -> {model} yoğun ({kod}), sıradaki modele geçiliyor...")
                YOGUN_MODELLER.add(model)
                break

            if not yanit.ok:
                son_hata = f"{model} HTTP {yanit.status_code}: {yanit.text[:250]}"
                yanit.close()
                break

            parcalar: list[str] = []
            bitis = ""
            kalan_kota = yanit.headers.get("x-evren-daily-remaining-tokens", "")
            try:
                # Akis 'text/event-stream' olarak karakter kumesiz gelirse requests ISO-8859-1 sayar ve Turkce
                # harfler bozulur (24 Kasim: Karinca'nin butun ciktilari denetimden gecemedi); UTF-8 zorlanir.
                akis_basi = time.monotonic()
                yanit.encoding = "utf-8"
                for satir in yanit.iter_lines(decode_unicode=True):
                    if time.monotonic() - akis_basi > 720:  # takili akis turu 55 dk zaman asimina kadar tutmasin
                        raise GeciciApiHatasi(f"{model} akis 12 dakikayi asti")
                    if not satir or not satir.startswith("data:"):
                        continue
                    veri_str = satir[5:].strip()
                    if veri_str == "[DONE]":
                        break
                    try:
                        olay = json.loads(veri_str)
                    except json.JSONDecodeError:
                        continue
                    secenekler = olay.get("choices", [])
                    if not secenekler:
                        continue
                    secim = secenekler[0]
                    if secim.get("finish_reason"):
                        bitis = secim["finish_reason"]
                    delta = secim.get("delta") or {}
                    parca = delta.get("content")
                    if parca:
                        parcalar.append(parca)
            except requests.exceptions.RequestException as exc:
                son_hata = f"{model} akış kesintisi ({exc.__class__.__name__})"
                YOGUN_MODELLER.add(model)
                break
            finally:
                yanit.close()

            temiz = html_temizle("".join(parcalar))
            if temiz.strip():
                ek_bilgi = f" | Kalan günlük token: {kalan_kota}" if kalan_kota else ""
                print(f"  -> Kullanılan model: Evren / {model}{ek_bilgi}")
                return temiz

            son_hata = f"{model} boş akış (finish_reason={bitis})"

    raise GeciciApiHatasi(f"Evren yanıt üretemedi: {son_hata}")


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
    if date.today() >= date(2026, 12, 1):
        print("Bilgi: 1 Aralık 2026 ücretsiz kampanya dönemi sona erdi. Kredi koruması nedeniyle durduruldu.")
        return 0

    evren_key = os.environ.get("EVREN_API_KEY", "").strip()
    if not evren_key:
        print("HATA: EVREN_API_KEY tanımlı değil.", file=sys.stderr)
        return 1

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
            print("İşlenecek gün kalmadı, tüm arşiv tamamlandı!")
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
        if indir_ilk.startswith("AG_HATASI") or not indir_ilk.startswith("HAZIR "):
            print(f"İndirme sorunu:\n{indir_cikti}", file=sys.stderr)
            return 1

        klasor = Path(indir_ilk.split(" ", 1)[1].strip())
        if not klasor.is_absolute():
            klasor = KOK / klasor

        try:
            kullanici_metni = metin_icerigi_hazirla(klasor, tarih, talimat, maks_karakter=85000)
            mesajlar = [
                {"role": "system", "content": sistem},
                {"role": "user", "content": kullanici_metni},
            ]
            html_icerik = evren_cagir(evren_key, mesajlar)

            if tarih != "20180715" and "30479 sayılı" in html_icerik:
                raise RuntimeError("Model şablon örneğini kopyaladı, iptal edildi.")

            hedef_html.write_text(html_icerik, encoding="utf-8")
            _, denetim = calistir([sys.executable, "gorev/denetle.py", tarih, "--arsiv"])
            print(f"[denetle.py {tarih}]\n{denetim}")

            duzeltme = 0
            # Ilk duzeltme HATA ya da UYARI icin; sonraki duzeltmeler (toplam en cok 3 tur) yalnizca HATA icin.
            while duzeltme < 3 and ("DENETIM_HATA" in denetim or (duzeltme == 0 and "UYARI" in denetim)):
                mesajlar.append({"role": "assistant", "content": html_icerik})
                mesajlar.append(
                    {
                        "role": "user",
                        "content": (
                            f"Ürettiğin HTML şu denetim uyarılarını verdi:\n{denetim}\n\n"
                            "Yalnızca verilen kaynak belgelere sadık kalarak hataları düzelt "
                            "ve tam HTML çıktısını yeniden ver."
                        ),
                    }
                )
                html_icerik = evren_cagir(evren_key, mesajlar)
                hedef_html.write_text(html_icerik, encoding="utf-8")
                _, denetim = calistir([sys.executable, "gorev/denetle.py", tarih, "--arsiv"])
                duzeltme += 1
                print(f"[denetle.py {duzeltme + 1}. tur {tarih}]\n{denetim}")

            if "DENETIM_TAMAM" not in denetim:
                if hedef_html.exists():
                    hedef_html.unlink()
                hata_satiri = next((s for s in denetim.splitlines() if "HATA" in s), "denetim hatası")
                print(f"[{tarih}] denetim gecmedi ({hata_satiri[:80]}): gun isaretlenmedi, sonraki turda yeniden denenecek")
                continue

            calistir(["git", "pull", "--rebase", "origin", "main"])
            yayin_kod, yayin_cikti = calistir([sys.executable, "gorev/yayinla.py", tarih, "main"])
            if yayin_kod != 0:
                calistir(["git", "pull", "--rebase", "origin", "main"])
                yayin_kod, yayin_cikti = calistir([sys.executable, "gorev/yayinla.py", tarih, "main"])
            print(f"[yayinla.py {tarih}] kod={yayin_kod}\n{yayin_cikti}")
            if yayin_kod != 0:
                return 1

            tamamlanan += 1
            print(f"Bu turda tamamlanan: {tamamlanan}/{hedef_adet}")
            if tamamlanan < hedef_adet:
                time.sleep(3)

        except GunlukKotaDolduHatasi as exc:
            if hedef_html.exists():
                hedef_html.unlink()
            print(f"\nBilgi: {exc} Yarın kota yenilendiğinde devam edilecek.")
            return 0
        except GeciciApiHatasi as exc:
            if hedef_html.exists():
                hedef_html.unlink()
            print(f"[{tarih}] Geçici yoğunluk, sonra tekrar denenecek: {exc}")
            YOGUN_MODELLER.clear()
            time.sleep(15)
        except Exception as exc:
            if hedef_html.exists():
                hedef_html.unlink()
            print(f"[{tarih}] Hata: {exc}", file=sys.stderr)
            print(f"[{tarih}] gecici hata: gun isaretlenmedi, sonraki turda yeniden denenecek (en cok 5 deneme)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
