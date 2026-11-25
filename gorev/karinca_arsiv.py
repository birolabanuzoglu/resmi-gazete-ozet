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
KARINCA_API_BASE = "https://api.karincalabs.com"
KARINCA_MODELLER = [
    "claude-sonnet-4-6",
    "claude-opus-5-5",
    "claude-sonnet-5",
    "claude-opus-4-7",
]
DEVRE_DISI_MODELLER: set[str] = set()


class BakiyeVeyaLisansHatasi(Exception):
    pass


class GunlukLimitDolduHatasi(Exception):
    pass


class GeciciApiHatasi(Exception):
    pass


class AnahtarGecersizHatasi(Exception):
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
                metin = metin[:kalan] + "\n[Dakikalık token sınırı nedeniyle kısaltıldı]"
            else:
                break
        bolumler.append(f"\n--- DOSYA: {goreli} ---\n{metin}\n")
        toplam_karakter += len(metin)

    return "\n".join(bolumler)


def karinca_cagir(karinca_key: str, sistem: str, mesajlar: list[dict]) -> str:
    basliklar = {
        "x-api-key": karinca_key,
        "Authorization": f"Bearer {karinca_key}",
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }

    son_hata = ""
    for model in KARINCA_MODELLER:
        if model in DEVRE_DISI_MODELLER:
            continue

        govde = {
            "model": model,
            "system": sistem,
            "messages": mesajlar,
            "max_tokens": 32000,
            "temperature": 0.15,
            "stream": True,
        }

        try:
            yanit = requests.post(
                f"{KARINCA_API_BASE}/v1/messages",
                headers=basliklar,
                json=govde,
                timeout=(30, 420),  # 24 Kasim: 180 sn'de cok sayida ReadTimeout (ilk bayt gec geliyor)
                stream=True,
            )
        except requests.exceptions.RequestException as exc:
            raise GeciciApiHatasi(f"{model} bağlantı gecikmesi ({exc.__class__.__name__})")

        if yanit.status_code == 401:
            govde_401 = " ".join(yanit.text.split())[:200]
            yanit.close()
            raise AnahtarGecersizHatasi(f"Karınca Labs API anahtarı geçersiz ya da eksik (401): {govde_401}")

        if yanit.status_code == 402:
            yanit.close()
            raise BakiyeVeyaLisansHatasi("Karınca Labs paket bakiyesi tükendi (402).")

        if yanit.status_code == 403:
            hata_metni = yanit.text
            yanit.close()
            if any(k in hata_metni for k in ("LICENSE_", "UNAUTHORIZED")):
                raise BakiyeVeyaLisansHatasi(f"Karınca Labs lisans/yetki durdu: {hata_metni[:180]}")
            print(f"  -> {model} bu pakette açık değil, yedek modele geçiliyor...")
            DEVRE_DISI_MODELLER.add(model)
            son_hata = f"{model} kapalı (403)"
            continue

        if yanit.status_code == 400:
            hata_metni = yanit.text
            yanit.close()
            if "MODEL_NOT_AVAILABLE" in hata_metni or "model" in hata_metni.lower():
                print(f"  -> {model} bulunamadı, yedek modele geçiliyor...")
                DEVRE_DISI_MODELLER.add(model)
                son_hata = f"{model} bulunamadı (400)"
                continue
            son_hata = f"{model} HTTP 400: {hata_metni[:250]}"
            break

        if yanit.status_code == 429:
            detay = " ".join(yanit.text.split())[:260]
            retry_after = yanit.headers.get("Retry-After", "")
            yanit.close()
            if "Daily message limit" in detay or "midnight" in detay.lower():
                raise GunlukLimitDolduHatasi(
                    f"Karınca Labs günlük 1250 mesaj limiti doldu (gece 00:00'da sıfırlanır): {detay}"
                )
            ek = f" (Retry-After={retry_after})" if retry_after else ""
            raise GeciciApiHatasi(f"{model} hız sınırı (429){ek}: {detay}")

        if yanit.status_code >= 500:
            kod = yanit.status_code
            yanit.close()
            raise GeciciApiHatasi(f"{model} sunucu yoğunluğu ({kod})")

        if not yanit.ok:
            son_hata = f"{model} HTTP {yanit.status_code}: {yanit.text[:300]}"
            yanit.close()
            break

        parcalar: list[str] = []
        try:
            # Akis 'text/event-stream' olarak karakter kumesiz gelirse requests ISO-8859-1 sayar ve Turkce
            # harfler bozulur (24 Kasim: Karinca'nin butun ciktilari denetimden gecemedi); UTF-8 zorlanir.
            yanit.encoding = "utf-8"
            for satir in yanit.iter_lines(decode_unicode=True):
                if not satir or not satir.startswith("data:"):
                    continue
                veri_str = satir[5:].strip()
                if veri_str == "[DONE]":
                    break
                try:
                    olay = json.loads(veri_str)
                except json.JSONDecodeError:
                    continue

                olay_tipi = olay.get("type", "")
                if olay_tipi == "content_block_delta":
                    delta = olay.get("delta") or {}
                    if delta.get("type") == "text_delta" and delta.get("text"):
                        parcalar.append(delta["text"])
                elif olay_tipi == "message_stop":
                    break
                elif "choices" in olay:
                    secenekler = olay.get("choices") or []
                    if secenekler:
                        parca = (secenekler[0].get("delta") or {}).get("content")
                        if parca:
                            parcalar.append(parca)
        except requests.exceptions.RequestException as exc:
            raise GeciciApiHatasi(f"{model} akış kesintisi ({exc.__class__.__name__})")
        finally:
            yanit.close()

        temiz = html_temizle("".join(parcalar))
        if temiz.strip():
            print(f"  -> Kullanılan model: Karınca Labs / {model}")
            return temiz

        son_hata = f"{model} boş yanıt döndürdü"

    raise RuntimeError(f"Karınca Labs yanıt üretemedi: {son_hata}")


def anahtar_dene(karinca_key: str) -> None:
    """Bir tokenlik istekle anahtarin gecerli oldugunu dogrular; gecersizse tur hic gun secmeden biter.

    24 Kasim gecesi gecersiz bir anahtarla baslayan 5 paralel tur, her gunu (indirmeden sonra HTTP 401 alip)
    sonraki gune gecerek 34 gunun deneme hakkini yakmisti.
    """
    basliklar = {
        "x-api-key": karinca_key,
        "Authorization": f"Bearer {karinca_key}",
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    govde = {"model": KARINCA_MODELLER[0], "max_tokens": 1, "messages": [{"role": "user", "content": "ok"}]}
    try:
        r = requests.post(f"{KARINCA_API_BASE}/v1/messages", headers=basliklar, json=govde, timeout=(20, 45))
    except requests.exceptions.RequestException:
        return  # ag sorunu: dogrulanamadi, tur normal akisla devam eder
    metin = " ".join(r.text.split())[:200]
    if r.status_code == 401 or (r.status_code == 403 and "UNAUTHORIZED" in r.text):
        raise AnahtarGecersizHatasi(f"Karınca Labs API anahtarı geçersiz ya da eksik ({r.status_code}): {metin}")
    if r.status_code == 402:
        raise BakiyeVeyaLisansHatasi("Karınca Labs paket bakiyesi tükendi (402).")
    if r.status_code == 429 and ("Daily message limit" in r.text or "midnight" in r.text.lower()):
        raise GunlukLimitDolduHatasi(f"Karınca Labs günlük mesaj limiti doldu: {metin}")


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
    karinca_key = os.environ.get("KARINCA_API_KEY", "").strip()
    if not karinca_key:
        print("HATA: KARINCA_API_KEY tanımlı değil.", file=sys.stderr)
        return 1

    hedef_adet = int(os.environ.get("GUN_SAYISI", "35"))
    talimat = TALIMAT_YOLU.read_text(encoding="utf-8")
    OZETLER_DIZINI.mkdir(parents=True, exist_ok=True)

    try:
        anahtar_dene(karinca_key)
    except AnahtarGecersizHatasi as exc:
        print(f"HATA: {exc}\nGitHub > Settings > Secrets and variables > Actions > KARINCA_API_KEY değerini kontrol edin.",
              file=sys.stderr)
        return 1
    except (BakiyeVeyaLisansHatasi, GunlukLimitDolduHatasi) as exc:
        print(f"\nBilgi: {exc}")
        return 0

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
    ust_uste_hata = 0
    baslangic = time.monotonic()
    while tamamlanan < hedef_adet:
        if ust_uste_hata >= 4:
            print("Art arda 4 başarısız deneme: tur durduruluyor (nedeni yukarıda); sonraki tur yeniden dener.", file=sys.stderr)
            return 1
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

        gun_basarili = False
        for boyut in (85000, 55000, 35000):
            try:
                kullanici_metni = metin_icerigi_hazirla(klasor, tarih, talimat, maks_karakter=boyut)
                mesajlar = [{"role": "user", "content": kullanici_metni}]
                html_icerik = karinca_cagir(karinca_key, sistem, mesajlar)

                if tarih != "20180715" and "30479 sayılı" in html_icerik:
                    raise RuntimeError("Model şablon örneğini kopyaladı, iptal edildi.")

                hedef_html.write_text(html_icerik, encoding="utf-8")
                _, denetim = calistir([sys.executable, "gorev/denetle.py", tarih, "--arsiv"])
                print(f"[denetle.py {tarih}]\n{denetim}")

                duzeltme = 0
                # Ilk duzeltme HATA ya da UYARI icin; sonraki duzeltmeler (toplam en cok 3 tur) yalnizca HATA icin.
                while duzeltme < 3 and ("DENETIM_HATA" in denetim or (duzeltme == 0 and "UYARI" in denetim)):
                    time.sleep(15)
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
                    html_icerik = karinca_cagir(karinca_key, sistem, mesajlar)
                    hedef_html.write_text(html_icerik, encoding="utf-8")
                    _, denetim = calistir([sys.executable, "gorev/denetle.py", tarih, "--arsiv"])
                    duzeltme += 1
                    print(f"[denetle.py {duzeltme + 1}. tur {tarih}]\n{denetim}")

                if "DENETIM_TAMAM" not in denetim:
                    if hedef_html.exists():
                        hedef_html.unlink()
                    hata_satiri = next((s for s in denetim.splitlines() if "HATA" in s), "denetim hatası")
                    print(f"[{tarih}] denetim gecmedi ({hata_satiri[:80]}): gun isaretlenmedi, sonraki turda yeniden denenecek")
                    ust_uste_hata += 1
                    gun_basarili = True
                    break

                calistir(["git", "pull", "--rebase", "origin", "main"])
                yayin_kod, yayin_cikti = calistir([sys.executable, "gorev/yayinla.py", tarih, "main"])
                if yayin_kod != 0:
                    calistir(["git", "pull", "--rebase", "origin", "main"])
                    yayin_kod, yayin_cikti = calistir([sys.executable, "gorev/yayinla.py", tarih, "main"])
                print(f"[yayinla.py {tarih}] kod={yayin_kod}\n{yayin_cikti}")
                if yayin_kod != 0:
                    return 1

                tamamlanan += 1
                ust_uste_hata = 0
                print(f"Bu turda tamamlanan: {tamamlanan}/{hedef_adet}")
                gun_basarili = True
                if tamamlanan < hedef_adet:
                    time.sleep(15)
                break

            except AnahtarGecersizHatasi as exc:
                if hedef_html.exists():
                    hedef_html.unlink()
                print(f"[{tarih}] HATA: {exc}", file=sys.stderr)
                return 1
            except (BakiyeVeyaLisansHatasi, GunlukLimitDolduHatasi) as exc:
                if hedef_html.exists():
                    hedef_html.unlink()
                print(f"\nBilgi: {exc}")
                return 0
            except GeciciApiHatasi as exc:
                if hedef_html.exists():
                    hedef_html.unlink()
                print(f"[{tarih}] Geçici sınır (boyut={boyut}), 65 sn beklenip aynı gün tekrar denenecek:\n  {exc}")
                time.sleep(65)
            except Exception as exc:
                if hedef_html.exists():
                    hedef_html.unlink()
                print(f"[{tarih}] Hata: {exc}", file=sys.stderr)
                print(f"[{tarih}] gecici hata: gun isaretlenmedi, sonraki turda yeniden denenecek (en cok 5 deneme)")
                ust_uste_hata += 1
                gun_basarili = True
                break

        if not gun_basarili:
            print(f"[{tarih}] 3 denemede de hız sınırına takıldı, daha sonra tekrar denenecek.")
            time.sleep(30)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
