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
            "max_tokens": 10240,
            "temperature": 0.15,
            "stream": True,
        }

        try:
            yanit = requests.post(
                f"{KARINCA_API_BASE}/v1/messages",
                headers=basliklar,
                json=govde,
                timeout=(30, 180),
                stream=True,
            )
        except requests.exceptions.RequestException as exc:
            raise GeciciApiHatasi(f"{model} bağlantı gecikmesi ({exc.__class__.__name__})")

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


def main() -> int:
    karinca_key = os.environ.get("KARINCA_API_KEY", "").strip()
    if not karinca_key:
        print("HATA: KARINCA_API_KEY tanımlı değil.", file=sys.stderr)
        return 1

    hedef_adet = int(os.environ.get("GUN_SAYISI", "35"))
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
    while tamamlanan < hedef_adet:
        calistir(["git", "pull", "--rebase", "origin", "main"])
        _, cikti = calistir([sys.executable, "gorev/arsiv.py", "sonraki"])
        ilk_satir = cikti.splitlines()[0].strip() if cikti else ""
        print(f"\n[arsiv.py] {ilk_satir}")

        if ilk_satir in {"GUNLUK_BEKLENIYOR", "ARSIV_BITTI"}:
            print("İşlenecek gün kalmadı, tüm arşiv tamamlandı!")
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

                if "DENETIM_HATA" in denetim or "UYARI" in denetim:
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
                    print(f"[denetle.py 2. tur {tarih}]\n{denetim}")

                if "DENETIM_TAMAM" not in denetim:
                    if hedef_html.exists():
                        hedef_html.unlink()
                    hata_satiri = next((s for s in denetim.splitlines() if "HATA" in s), "denetim hatası")
                    calistir([sys.executable, "gorev/arsiv.py", "hata", tarih, hata_satiri[:120]])
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
                print(f"Bu turda tamamlanan: {tamamlanan}/{hedef_adet}")
                gun_basarili = True
                if tamamlanan < hedef_adet:
                    time.sleep(15)
                break

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
                calistir([sys.executable, "gorev/arsiv.py", "hata", tarih, str(exc)[:120]])
                gun_basarili = True
                break

        if not gun_basarili:
            print(f"[{tarih}] 3 denemede de hız sınırına takıldı, daha sonra tekrar denenecek.")
            time.sleep(30)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
