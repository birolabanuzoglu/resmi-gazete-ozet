/*
 * Özet RG web sitesi. Özetler, uygulamanın da okuduğu GitHub deposundan (raw.githubusercontent.com)
 * canlı okunur; site yalnızca bu dosyalardan oluşur, sunucu ya da veritabanı yoktur. Görünüm
 * uygulamanın stil dosyasıyla (app.css = uygulamadaki page.css) aynıdır; sitenin kendi parçaları site.css'te.
 */
"use strict";

const RAW = "https://raw.githubusercontent.com/birolabanuzoglu/resmi-gazete-ozet/main/";
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
// Arşivin hedef aralığı (uygulamadaki ARCHIVE_FIRST / ARCHIVE_LAST ile aynı)
const ARSIV_BAS = Date.UTC(2000, 0, 1), ARSIV_SON = Date.UTC(2026, 10, 10);
const ATAMA_ACIK = 12;

// Material Icons (Apache 2.0) yolları
const P = {
  doc: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  list: "M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z",
  bulb: "M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z",
  pie: "M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z",
  spark: "M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z",
  bank: "M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z",
  arrow: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z",
  expand: "M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z",
  chev: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
  book: "M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z",
  rule: "M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
  gavel: "M1 21h12v2H1zM5.245 8.07l2.83-2.827 14.14 14.142-2.828 2.828zM12.317 1l5.657 5.656-2.83 2.83-5.654-5.66zM3.825 9.485l5.657 5.657-2.828 2.828-5.657-5.657z",
  megaphone: "M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z",
  label: "M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z",
  person: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  group: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  cal: "M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z",
  history: "M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z",
  search: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  vol: "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
  stop: "M6 6h12v12H6z",
  moon: "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z",
  sun: "M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z",
  auto: "M20 15.31L23.31 12 20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69zM12 18V6c3.31 0 6 2.69 6 6s-2.69 6-6 6z",
  share: "M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z",
  attach: "M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z",
  warn: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  archive: "M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4l16-.02V7z",
  close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  radar: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z",
  filter: "M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z",
  contrast: "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm1-17.93c3.94.49 7 3.85 7 7.93s-3.06 7.44-7 7.93V4.07z",
  "star-o": "M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z",
  bell: "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 1.99 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
  info: "M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
};
const ic = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n]}"/></svg>`;

const KIND_COLOR = {
  kanun: ["#B71C1C", "#FF8A80"], yon: ["#1A56C4", "#8AB4F8"], teb: ["#0F766E", "#5FD3C3"], karar: ["#6D28D9", "#C4A7FF"],
  ata: ["#C2410C", "#FFB27A"], gen: ["#3949AB", "#9FA8F0"], yargi: ["#795548", "#D7B9A8"], ilan: ["#546E7A", "#AEBCC4"],
  diger: ["#455A64", "#AEBCC4"],
};
const KIND_ICON = { kanun: "book", yon: "rule", teb: "megaphone", karar: "label", ata: "person", gen: "doc", yargi: "gavel", ilan: "list", diger: "doc" };

// ------------------------------------------------------------------ yardımcılar

const $app = document.getElementById("app");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const low = s => String(s).toLocaleLowerCase("tr");
const up = s => String(s).toLocaleUpperCase("tr");
const tag = el => el.tagName.toLowerCase();
const isDark = () => document.documentElement.classList.contains("dark");
const sayi = n => n.toLocaleString("tr-TR");

/** "20261118" → UTC zaman damgası */
const tsOf = k => Date.UTC(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8));
const keyOf = ts => new Date(ts).toISOString().slice(0, 10).replace(/-/g, "");
const isoOf = k => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
const dayOf = k => +k.slice(6, 8);
const monOf = k => AYLAR[+k.slice(4, 6) - 1];
const wdOf = k => GUNLER[new Date(tsOf(k)).getUTCDay()];
const longOf = k => `${dayOf(k)} ${monOf(k)} ${k.slice(0, 4)}`;
const shortOf = k => `${dayOf(k)} ${monOf(k).slice(0, 3)}`;
const mon3 = k => up(monOf(k).slice(0, 3));
/** Adres parametresindeki tarih: "2026-11-18" ya da "20261118" */
const normKey = s => { const d = String(s || "").replace(/\D/g, ""); return d.length === 8 ? d : ""; };
const dayUrl = (k, q) => `?gun=${isoOf(k)}` + (q ? `&ara=${encodeURIComponent(q)}` : "");

/** Özetteki satır içi biçimi güvenli biçimde yeniden yazar: yalnızca bilinen etiketler, bağlantılar http(s). */
function inl(el) {
  let s = "";
  for (const n of el.childNodes) {
    if (n.nodeType === 3) { s += esc(n.nodeValue); continue; }
    if (n.nodeType !== 1) continue;
    const t = tag(n);
    if (t === "a") {
      const h = n.getAttribute("href") || "";
      s += /^https?:\/\//i.test(h) ? `<a href="${esc(h)}" target="_blank" rel="noopener">${inl(n)}</a>` : inl(n);
    } else if (t === "br") s += "<br>";
    else if (["b", "strong", "i", "em", "mark", "sub", "sup", "code", "u"].includes(t)) s += `<${t}>${inl(n)}</${t}>`;
    else s += inl(n);
  }
  return s;
}
/** Bir bloğu güvenli HTML olarak yazar (p, ul/ol, tablo); başlıklar ve bilinmeyenler paragraf olur. */
function block(el) {
  const t = tag(el);
  if (t === "ul" || t === "ol") return `<${t}>` + [...el.children].filter(c => tag(c) === "li").map(li => `<li>${inl(li)}</li>`).join("") + `</${t}>`;
  if (t === "table") return table(el);
  return `<p>${inl(el)}</p>`;
}
/** Paragraf kalın bir başlıkla mı başlıyor ("<b>Kurum:</b> …"): başlığın metni */
function boldLead(el) {
  const f = el.firstChild;
  const node = f && f.nodeType === 3 && !f.nodeValue.trim() ? f.nextSibling : f;
  return node && node.nodeType === 1 && ["b", "strong"].includes(tag(node)) ? node.textContent.trim() : "";
}
/** Kalın başlıktan sonraki kısmın güvenli HTML'i */
function afterLead(el) {
  const c = el.cloneNode(true);
  const b = c.querySelector("b,strong");
  if (b) b.remove();
  return inl(c).trim();
}

async function getText(path, fresh) {
  const r = await fetch(RAW + path, fresh ? { cache: "no-cache" } : {});
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.text();
}

// ------------------------------------------------------------------ veriler

let INDEX = null;
let PARTS = null;     // gün → {sayi, duzenleme, personel, onizleme, metin}
let partsLoading = null;
let KOK = 7;
const pages = new Map();

async function loadIndex() {
  if (!INDEX) INDEX = JSON.parse(await getText("index.json", true));
  return INDEX;
}
/** Aylık arama parçaları (her günün sayısı, önizlemesi ve arama kökleri) */
function loadParts() {
  if (PARTS) return Promise.resolve(PARTS);
  if (!partsLoading) {
    const months = Object.keys(INDEX.arama_parcalari || {});
    partsLoading = Promise.all(months.map(m => getText(`arama/${m}.json`).then(JSON.parse).catch(() => null))).then(list => {
      const all = {};
      for (const p of list) {
        if (!p) continue;
        if (p.kok) KOK = p.kok;
        Object.assign(all, p.gunler || {});
      }
      PARTS = all;
      return all;
    });
  }
  return partsLoading;
}
async function loadDay(k) {
  if (!pages.has(k)) pages.set(k, await getText(`ozetler/${k}.html`));
  return pages.get(k);
}
const isArchive = k => (INDEX.arsiv_gunleri || []).includes(k);

// ------------------------------------------------------------------ özetin çözümlenmesi

function kindOf(label) {
  const s = low(label);
  if (s.includes("kanun")) return "kanun";
  if (s.includes("yönetmelik")) return "yon";
  if (s.includes("tebliğ")) return "teb";
  if (s.includes("atama")) return "ata";
  if (s.includes("genelge")) return "gen";
  if (s.includes("ilan") || s.includes("ilân")) return "ilan";
  if (["yargı", "mahkeme", "danıştay", "sayıştay"].some(w => s.includes(w))) return "yargi";
  if (s.includes("karar")) return "karar";
  return "diger";
}
function secKind(title) {
  const s = low(title);
  if (s.includes("öne çıkan")) return "one";
  if (s.includes("atama")) return "ata";
  if (s.includes("madde")) return "mad";
  if (s.includes("yorum") || s.includes("değerlendirme")) return "yor";
  if (s.includes("özet")) return "ozet";
  return "dig";
}

function parse(html) {
  const body = new DOMParser().parseFromString(html, "text/html").body;
  const out = { title: "", issue: "", official: "", archive: "", sections: [] };
  let sec = null;
  for (const el of body.children) {
    const t = tag(el);
    if (t === "h1") {
      out.title = el.textContent.trim();
      const m = out.title.match(/(\d{3,6})\s+Sayılı/);
      if (m) out.issue = m[1];
      continue;
    }
    if (t === "h2") {
      sec = { title: el.textContent.trim(), kind: secKind(el.textContent), nodes: [] };
      out.sections.push(sec);
      continue;
    }
    if (!sec) {
      const txt = el.textContent.trim();
      const a = el.querySelector && el.querySelector("a[href]");
      if (/^Kapsam\s*:?\s*(Arşiv özeti|Personel arşivi)/i.test(txt)) out.archive = txt.replace(/^Kapsam\s*:?\s*/i, "");
      else if (a && txt === a.textContent.trim() && /^https?:\/\//.test(a.getAttribute("href"))) out.official = a.getAttribute("href");
      continue;
    }
    sec.nodes.push(el);
  }
  return out;
}

function isItemStart(el) {
  if (tag(el) !== "p" || el.children.length !== 1) return false;
  const a = el.firstElementChild;
  return tag(a) === "a" && el.textContent.trim() === a.textContent.trim() && a.textContent.trim().length > 0;
}
function groupsOf(nodes) {
  const groups = [];
  let g = null, item = null;
  const open = label => { g = { label, kind: kindOf(label), items: [], extra: [] }; groups.push(g); item = null; };
  for (const el of nodes) {
    if (tag(el) === "h3") { open(el.textContent.trim()); continue; }
    if (!g) open("Diğer");
    if (isItemStart(el)) {
      const a = el.firstElementChild;
      item = { title: a.textContent.trim(), href: a.getAttribute("href") || "", nodes: [] };
      g.items.push(item);
      continue;
    }
    (item ? item.nodes : g.extra).push(el);
  }
  return groups;
}
const groupCount = g => g.items.length || g.extra.reduce((n, el) => n + (["ul", "ol"].includes(tag(el)) ? el.children.length : 0), 0);

// ------------------------------------------------------------------ tablolar

/** Kelime düzeyinde fark: eski metinde çıkanlar kırmızı ve çizili, yenide eklenenler yeşil */
function wdiff(a, b) {
  const A = a.split(/\s+/).filter(Boolean), B = b.split(/\s+/).filter(Boolean);
  const n = A.length, m = B.length;
  const plain = [esc(a), esc(b)];
  if (!n || !m || n * m > 60000) return plain;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  // Metinler büsbütün farklıysa işaretleme gürültü olur
  if (dp[0][0] < Math.min(n, m) * 0.25) return plain;
  const oa = [], ob = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { oa.push(esc(A[i++])); ob.push(esc(B[j++])); }
    else if (dp[i + 1][j] >= dp[i][j + 1]) oa.push(`<del class="dw">${esc(A[i++])}</del>`);
    else ob.push(`<ins class="iw">${esc(B[j++])}</ins>`);
  }
  while (i < n) oa.push(`<del class="dw">${esc(A[i++])}</del>`);
  while (j < m) ob.push(`<ins class="iw">${esc(B[j++])}</ins>`);
  const join = (arr, t) => arr.join(" ").replace(new RegExp(`</${t}> <${t} class="${t === "del" ? "dw" : "iw"}">`, "g"), " ");
  return [join(oa, "del"), join(ob, "ins")];
}
function rowsOf(el) {
  return [...el.querySelectorAll("tr")].map(tr => [...tr.children]);
}
/** "Hüküm | Eski | Yeni" tablosu alt alta iki kutu; diğer tablolar yatay kaydırılır */
function table(el) {
  const rows = rowsOf(el);
  if (!rows.length) return "";
  const head = rows[0].map(c => low(c.textContent.trim()));
  const oldAt = head.findIndex(h => h.startsWith("eski") || h.startsWith("önceki"));
  const newAt = head.findIndex(h => h.startsWith("yeni"));
  if (oldAt >= 0 && newAt >= 0 && rows.length > 1) {
    const hAt = head.findIndex((h, i) => i !== oldAt && i !== newAt);
    let s = `<div class="cmp"><div class="cmp-title">Eski – yeni karşılaştırması<span class="cmp-leg"><del>çıkan</del><ins>eklenen</ins></span></div>`;
    for (const r of rows.slice(1)) {
      const o = (r[oldAt] || {}).textContent || "", nw = (r[newAt] || {}).textContent || "";
      const lo = low(o.trim());
      const noOld = !lo || lo === "—" || lo === "-" || lo.startsWith("önceki metne") || lo === "yok" || lo.startsWith("yok ");
      const [d1, d2] = noOld ? [esc(o.trim() || "—"), esc(nw.trim())] : wdiff(o.trim(), nw.trim());
      s += `<div class="cmp-row">` + (hAt >= 0 && r[hAt] ? `<div class="cmp-h">${inl(r[hAt])}</div>` : "") +
        `<div class="cmp-old"><span>Eski</span><div>${d1}</div></div><div class="cmp-new"><span>Yeni</span><div>${d2}</div></div></div>`;
    }
    return s + `</div>`;
  }
  let s = `<div class="tbl"><table>`;
  rows.forEach((r, i) => {
    s += "<tr>" + r.map(c => tag(c) === "th" ? `<th>${inl(c)}</th>` : `<td>${inl(c)}</td>`).join("") + "</tr>";
  });
  return s + `</table></div>`;
}

// ------------------------------------------------------------------ atamalar

const PROVINCIAL_DIRECTOR = /(^|\s)il\s+(\S+\s+)*müdür/;
/** Üst düzey görev mi (uygulamadaki isSeniorPosition ile aynı kural) */
function isSenior(position) {
  const s = low(position);
  const role = (s.includes(" · ") ? s.slice(s.lastIndexOf(" · ") + 3) : s).trim();
  if (["daire başkan", "şube müdür", "bölge müdür", "aday"].some(w => role.includes(w))) return false;
  if (role.includes("ilçe") && role.includes("müdür")) return false;
  if (role.includes("müdür yardımcı") && !role.includes("genel müdür")) return false;
  return ["bakan yardımcı", "genel müdür", "genel sekreter", "rektör", "büyükelçi", "daimi temsilci", "müsteşar",
    "hukuk müşaviri", "başkan yardımcı", "vali yardımcı", "kaymakam"].some(w => role.includes(w)) ||
    PROVINCIAL_DIRECTOR.test(role) || role === "başkan" || role.endsWith(" başkanı") || role === "vali" ||
    role.endsWith(" valisi") || role.endsWith("kurulu üyesi") || role.endsWith("kurul üyesi") || (role === "üye" && s.includes("kurul"));
}
function appointmentRows(nodes) {
  const out = [];
  for (const t of nodes.filter(el => tag(el) === "table")) {
    const rows = rowsOf(t);
    if (rows.length < 2) continue;
    const head = rows[0].map(c => low(c.textContent.trim()));
    const srcAt = head.findIndex(h => h.includes("kaynağ") || h.includes("kaynak"));
    const oldAt = head.findIndex((h, i) => i !== srcAt && (h.startsWith("eski") || h.startsWith("önceki") || h.startsWith("görevden")));
    const newAt = head.findIndex(h => h.startsWith("yeni") || h.startsWith("atanan"));
    if (oldAt < 0 || newAt < 0) continue;
    const posAt = head.findIndex((h, i) => i !== oldAt && i !== newAt && i !== srcAt);
    for (const r of rows.slice(1)) {
      const txt = i => (r[i] ? r[i].textContent.trim() : "");
      if (!txt(posAt) && !txt(oldAt) && !txt(newAt)) continue;
      out.push({ position: txt(posAt), old: txt(oldAt), nw: txt(newAt), src: srcAt >= 0 ? r[srcAt] : null });
    }
  }
  return out;
}
function sourceChip(cell) {
  if (!cell) return "";
  const text = cell.textContent.trim();
  if (!text || ["—", "-", "–"].includes(text)) return "";
  const a = cell.querySelector("a[href]");
  const href = a && /^https?:\/\//.test(a.getAttribute("href")) ? a.getAttribute("href") : "";
  const l = low(text);
  const [cls, icon] = href && href.includes("resmigazete.gov.tr") ? ["src-rg", "📜"] : href ? ["src-web", "🌐"]
    : l.startsWith("araştırıldı") ? ["src-none", "🔍"] : l.startsWith("araştırılmadı") || l.startsWith("araştırılamadı") ? ["src-none", "⏳"]
      : ["src-doc", "📄"];
  return href ? `<a class="ata-src ${cls}" href="${esc(href)}" target="_blank" rel="noopener">${icon} ${esc(text)}</a>`
    : `<span class="ata-src ${cls}">${icon} ${esc(text)}</span>`;
}
function appointee(label, text, cls, src) {
  const name = text.split("(")[0].trim();
  const note = text.includes("(") ? text.slice(text.indexOf("(") + 1, text.lastIndexOf(")") > 0 ? text.lastIndexOf(")") : undefined).trim() : "";
  const dash = !name || ["—", "-", "–"].includes(name);
  const unknown = low(name).startsWith("belirtilmem");
  return `<div class="${cls}${dash || unknown ? " none" : ""}"><span class="t">${label}</span><b>${esc(dash ? "—" : name)}</b>` +
    (note ? `<small>${esc(note)}</small>` : "") + sourceChip(src) + `</div>`;
}
function appointmentRow(r) {
  const parts = r.position.split(" · ").map(x => x.trim()).filter(Boolean);
  const role = parts.length ? parts[parts.length - 1] : r.position;
  const org = parts.length > 1 ? parts.slice(0, -1).join(" · ") : "";
  const top = isSenior(r.position);
  return `<div class="ata-row${top ? " top" : ""}"><div class="ata-pos">${ic("bank")}<span><b>${esc(role || "Görev belirtilmemiş")}</b>` +
    (top ? `<i class="ata-top">⭐ Üst düzey</i>` : "") + (org ? `<small>${esc(org)}</small>` : "") + `</span></div>` +
    `<div class="ata-swap">${appointee("Eski", r.old, "ata-old", r.src)}<span class="ata-ar">${ic("arrow")}</span>${appointee("Yeni", r.nw, "ata-new", null)}</div></div>`;
}
const GOVERNOR = /(^|\s)vali(si)?(\s|$)|vali yardımcı/;
const ATA_TITLES = [["vali", "Vali"], ["valiyrd", "Vali Yardımcısı"], ["kaymakam", "Kaymakam"], ["bakanyrd", "Bakan Yardımcısı"], ["gm", "Genel Müdür"],
  ["gmyrd", "Genel Müdür Yardımcısı"], ["baskan", "Başkan"], ["baskanyrd", "Başkan Yardımcısı"], ["daire", "Daire Başkanı"], ["ilmd", "İl ve Bölge Müdürü"],
  ["uye", "Kurul Üyesi"], ["rektor", "Rektör ve Dekan"], ["elci", "Büyükelçi ve Konsolos"], ["musavir", "Müşavir ve Danışman"], ["denetim", "Müfettiş ve Denetçi"],
  ["yargi", "Hâkim ve Savcı"], ["diger", "Diğer"]];
/** Atamanın ünvanı (uygulamadaki appointmentTitle ile aynı sıra) */
function ataTitleOf(position) {
  const s2 = low(position), role = (s2.includes(" · ") ? s2.slice(s2.lastIndexOf(" · ") + 3) : s2).trim();
  const has = (...w) => w.some(x => role.includes(x));
  if (has("vali yardımcı")) return "valiyrd";
  if (GOVERNOR.test(role)) return "vali";
  if (has("kaymakam")) return "kaymakam";
  if (has("bakan yardımcı")) return "bakanyrd";
  if (has("genel müdür yardımcı")) return "gmyrd";
  if (has("genel müdür")) return "gm";
  if (has("daire başkan")) return "daire";
  if (has("başkan yardımcı")) return "baskanyrd";
  if (has("rektör", "dekan")) return "rektor";
  if (has("büyükelçi", "başkonsolos", "konsolos", "daimi temsilci")) return "elci";
  if (has("müfettiş", "denetçi", "denetmen", "kontrolör")) return "denetim";
  if (has("hâkim", "hakim", "savcı")) return "yargi";
  if (role === "başkan" || role.endsWith(" başkanı") || role.endsWith(" başkan")) return "baskan";
  if (has("bölge müdür") || PROVINCIAL_DIRECTOR.test(role)) return "ilmd";
  if (role === "üye" || has("üyesi", "üyeliğ")) return "uye";
  if (has("müşavir", "danışman", "müsteşar")) return "musavir";
  return "diger";
}
const ATA = { sec: null, top: false, titles: new Set() };
const ataSave = () => { setPref("ata_top", ATA.top ? "1" : "0"); setPref("ata_unvan", [...ATA.titles].join(",")); };
const ataVisible = rows => rows.filter(r => (!ATA.top || isSenior(r.position)) && (!ATA.titles.size || ATA.titles.has(ataTitleOf(r.position))));

function appointments(sec) {
  ATA.sec = sec;
  const all = appointmentRows(sec.nodes);
  const rows = ataVisible(all);
  const senior = all.filter(r => isSenior(r.position)).length;
  const topBtn = senior > 0 && senior < all.length;
  const unv = ATA.titles.size ? ATA_TITLES.filter(([k]) => ATA.titles.has(k)).map(([, l]) => l) : [];
  let s = `<section id="sec-ata" class="card sec sec-ata"><h2><span class="ic">${ic("group")}</span>${esc(sec.title)}` +
    (topBtn ? `<button type="button" class="ata-f site-ata-f${ATA.top ? " on" : ""}" data-ata-top>⭐ Sadece Üst Düzey</button>` : "") +
    (all.length >= 2 ? `<button type="button" class="ata-u${unv.length ? " on" : ""}" data-ata-unvan>🗂️ ${unv.length ? esc(unv.slice(0, 2).join(", ")) + (unv.length > 2 ? " +" + (unv.length - 2) : "") : "Ünvan: Tümü"} ▾</button>` : "") +
    (all.length ? `<span class="cnt">${rows.length}${rows.length !== all.length ? " / " + all.length : ""}</span>` : "") + `</h2>`;
  for (const el of sec.nodes) if (tag(el) !== "table") s += block(el);
  if (!ATA.top && senior && senior < all.length && !ATA.titles.size) s += `<p class="ata-sum">⭐ ${senior} üst düzey atama</p>`;
  if (ATA.titles.size || ATA.top) s += `<div class="ata-unote"><span>${rows.length} / ${all.length} görev gösteriliyor</span><button type="button" data-ata-reset>Tümünü göster</button></div>`;
  if (rows.length) {
    s += `<div class="ata-list">${rows.slice(0, ATAMA_ACIK).map(appointmentRow).join("")}</div>`;
    if (rows.length > ATAMA_ACIK) {
      s += `<details class="ata-more"><summary>Diğer ${rows.length - ATAMA_ACIK} atamayı göster</summary>` +
        `<div class="ata-list">${rows.slice(ATAMA_ACIK).map(appointmentRow).join("")}</div></details>`;
    }
  } else if (all.length) s += `<p class="hint">Seçili süzgeçlere uyan atama yok.</p>`;
  s += `<p class="ata-note">Adlar Resmî Gazete'de yayımlanan atama kararlarından aktarılmıştır; bağlayıcı olan kararın kendisidir.</p>`;
  if (rows.length) s += `<div class="ata-acts"><button type="button" class="ata-share" data-ata-paylas>📋 Metin olarak paylaş<small>Kopyala ya da paylaş · seçili süzgeçle</small></button><button type="button" class="ata-share" data-ata-pdf>📄 A4 PDF<small>Tablo olarak yazdır / PDF · seçili süzgeçle</small></button></div>`;
  return s + `</section>`;
}
function ataRerender() {
  const el = document.getElementById("sec-ata");
  if (el && ATA.sec) el.outerHTML = appointments(ATA.sec);
}
function ataText() {
  const P = CURP, rows = ataVisible(appointmentRows(ATA.sec.nodes));
  const lines = [`👔 ATAMA KARARLARI\n📅 ${longOf(P.k)}${P.d.issue ? " · Sayı " + P.d.issue : ""}`];
  rows.forEach((r, i) => {
    const parts = r.position.split(" · ").map(x => x.trim()).filter(Boolean);
    lines.push(`\n${i + 1}. ${isSenior(r.position) ? "⭐ " : ""}${parts[parts.length - 1] || r.position}${parts.length > 1 ? "\n   🏛️ " + parts.slice(0, -1).join(" · ") : ""}\n   ➖ Eski: ${r.old || "—"}\n   ➕ Yeni: ${r.nw || "—"}`);
  });
  lines.push("\nAdlar Resmî Gazete'deki atama kararlarından aktarılmıştır; bağlayıcı olan kararın kendisidir.\n" + new URL(dayUrl(P.k), location.href).href);
  return lines.join("\n");
}
function ataPdf() {
  const P = CURP, rows = ataVisible(appointmentRows(ATA.sec.nodes));
  const nm = t => (t.split("(")[0].trim() || "—");
  const scope = [ATA.top ? "Yalnızca üst düzey" : "", ATA.titles.size ? "Ünvan: " + ATA_TITLES.filter(([k]) => ATA.titles.has(k)).map(([, l]) => l).join(", ") : ""].filter(Boolean).join(" · ");
  const m = openModal(`<div class="note-doc"><div class="note-top"><b>ATAMA LİSTESİ</b><span>${longOf(P.k)}${P.d.issue ? ` · Sayı ${esc(P.d.issue)}` : ""}</span></div>` +
    `<h2>${rows.length} atama${scope ? ` <small>(${esc(scope)})</small>` : ""}</h2><table class="ata-tbl"><tr><th>#</th><th>Görev</th><th>Kurum</th><th>Eski</th><th>Yeni</th></tr>` +
    rows.map((r, i) => { const parts = r.position.split(" · ").map(x => x.trim()).filter(Boolean); return `<tr><td>${i + 1}</td><td>${isSenior(r.position) ? "⭐ " : ""}${esc(parts[parts.length - 1] || r.position)}</td><td>${esc(parts.slice(0, -1).join(" · "))}</td><td>${esc(nm(r.old))}</td><td><b>${esc(nm(r.nw))}</b></td></tr>`; }).join("") +
    `</table><p class="note-foot">Adlar Resmî Gazete'de yayımlanan atama kararlarından aktarılmıştır; bağlayıcı olan kararın kendisidir. Yapay zekâ ile hazırlanan özetten derlenmiştir. ${esc(new URL(dayUrl(P.k), location.href).href)}</p></div>` +
    `<div class="sheet-btns no-print"><button type="button" class="sbtn" data-act="print">🖨️ Yazdır / PDF</button></div><button type="button" class="sbtn ghost no-print" data-close>Kapat</button>`, "notemodal");
  m.querySelector('[data-act="print"]').addEventListener("click", () => { document.body.classList.add("printing-note"); window.print(); setTimeout(() => document.body.classList.remove("printing-note"), 500); });
}

function ataUnvanModal() {
  const all = appointmentRows(ATA.sec.nodes);
  const cnt = k => all.filter(r => ataTitleOf(r.position) === k).length;
  const sel = new Set(ATA.titles);
  const m = openModal(`<div class="sheet-grip"></div><h3>🗂️ Ünvana göre süz</h3><p class="sheet-sub">Bir ya da birkaç ünvan seçin</p><div class="site-chips">` +
    ATA_TITLES.filter(([k]) => cnt(k) > 0).map(([k, l]) => `<button type="button" class="fchip${sel.has(k) ? " on" : ""}" data-t="${k}">${l}<b class="n">${cnt(k)}</b></button>`).join("") +
    `</div><div class="sheet-btns"><button type="button" class="sbtn alt" data-clear>Tümü</button><button type="button" class="sbtn" data-apply>Uygula</button></div><button type="button" class="sbtn ghost" data-close>Kapat</button>`, "unvan");
  m.querySelectorAll("[data-t]").forEach(b => b.addEventListener("click", () => { const k = b.dataset.t; sel.has(k) ? sel.delete(k) : sel.add(k); b.classList.toggle("on", sel.has(k)); }));
  m.querySelector("[data-clear]").addEventListener("click", () => { ATA.titles = new Set(); ataSave(); closeModal(); ataRerender(); });
  m.querySelector("[data-apply]").addEventListener("click", () => { ATA.titles = sel; ataSave(); closeModal(); ataRerender(); });
}

// ------------------------------------------------------------------ maddeler

const PERSONNEL_WORDS = ["personel", "görevde yükselme", "unvan değişikliği", "ünvan değişikliği", "memur", "sözleşmeli", "özlük", "kadro"];
const PERSONNEL_REG_WORDS = ["atama", "yer değiştirme", "uzman yardımcı", "müfettiş", "denetçi", "hizmet içi eğitim"];
function isPersonnelTitle(title) {
  const t = low(title);
  return PERSONNEL_WORDS.some(w => t.includes(w)) || (t.includes("yönetmeli") && PERSONNEL_REG_WORDS.some(w => t.includes(w)));
}
const isPersonnelMarker = el => tag(el) === "p" && /^personel mevzuatı[.:]?$/.test(low(el.textContent.trim())) && el.children.length === 1;

function itemParts(item) {
  const r = { kurum: "", yur: "", aud: [], ekler: [], trans: [], lead: [], details: [], pers: isPersonnelTitle(item.title) };
  for (const el of item.nodes) {
    const t = tag(el);
    const lead = t === "p" ? low(boldLead(el).replace(/:\s*$/, "")) : "";
    if (lead === "kurum" || lead === "yürürlük") {
      for (const part of el.textContent.split(" · ")) {
        const m = part.trim().match(/^(Kurum|Yürürlük)\s*:\s*(.+)$/i);
        if (m) r[low(m[1]) === "kurum" ? "kurum" : "yur"] = m[2].trim();
      }
      continue;
    }
    if (isPersonnelMarker(el)) { r.pers = true; continue; }
    if (lead === "ekler") {
      r.ekler = [...el.querySelectorAll("a[href]")].filter(a => /^https?:\/\//.test(a.getAttribute("href")))
        .map(a => ({ t: a.textContent.trim(), h: a.getAttribute("href") }));
      continue;
    }
    if (lead.startsWith("kimleri ilgilendiriyor")) {
      r.aud = el.textContent.replace(/^[^:]*:\s*/, "").split(/\s*,\s*/).map(x => x.trim()).filter(Boolean);
      continue;
    }
    if (lead.startsWith("geçiş hükmü")) { r.trans.push(afterLead(el)); continue; }
    if (t === "p" && !r.details.length) r.lead.push(el);
    else r.details.push(el);
  }
  return r;
}
/** Ayrıntı listesi: "Soru – …?" satırları soru-cevap kutusu olur */
function detailsHtml(nodes) {
  let s = "", faq = false, cmp = false;
  for (const el of nodes) {
    const t = tag(el);
    if (t === "ul" || t === "ol") {
      let lis = "", seen = false;
      for (const li of [...el.children].filter(c => tag(c) === "li")) {
        const b = boldLead(li);
        if (/^Soru\s*[–-]/.test(b)) {
          if (!seen) { lis += `<li class="faq-h">Sıkça sorulanlar</li>`; seen = true; }
          const c = li.cloneNode(true);
          const bb = c.querySelector("b,strong");
          bb.textContent = bb.textContent.replace(/^Soru\s*[–-]\s*/, "");
          lis += `<li class="faq">${inl(c)}</li>`;
          faq = true;
        } else lis += `<li>${inl(li)}</li>`;
      }
      s += `<${t}>${lis}</${t}>`;
    } else if (t === "table") {
      const h = table(el);
      if (h.startsWith(`<div class="cmp">`)) cmp = true;
      s += h;
    } else s += block(el);
  }
  const hint = [cmp ? "Karşılaştırma" : "", faq ? "Sıkça sorulanlar" : ""].filter(Boolean).join(", ");
  return { html: s, hint };
}
/** Mevzuat sitesinde düzenlemenin güncel hâlini arar (arşiv günlerinde) */
function currentQuery(title) {
  return title.replace(/\s*\([^)]*\)\s*$/, "").replace(/(?:nde|nda|de|da) Değişiklik Yapılmasına Dair.*$/i, "").trim();
}
/** Güncel hâli yalnızca kalıcı düzenlemeler için anlamlı (atama, ilan, tek seferlik kararlar değil) */
const hasCurrent = (g, title) => ["kanun", "yon", "teb", "gen"].includes(g.kind) ||
  (g.kind === "karar" && /yönetmelik|esas|usul|tarife|karar(?:name)?$/i.test(currentQuery(title)) && !/atama/i.test(title));
const noteBox = note => note
  ? `<button class="unote" type="button" data-note><span class="unote-h">📝 Notunuz</span><span class="unote-e">Düzenle</span><span class="unote-t">${esc(note)}</span></button>`
  : `<button class="unote add" type="button" data-note>📝 Not ekle</button>`;

function itemHtml(item, g, n, archive) {
  const p = itemParts(item);
  const pers = p.pers || p.aud.length > 0;
  let chips = "";
  if (pers) chips += `<span class="tagp">${ic("person")}Personel</span>`;
  if (p.kurum) chips += `<span class="mchip m-kurum">${ic("bank")}${esc(p.kurum)}</span>`;
  if (p.yur) chips += /yayımı tarihinde/i.test(p.yur) ? `<span class="m-now">Yayımı tarihinde yürürlükte</span>`
    : `<span class="mchip m-yur">${ic("cal")}Yürürlük: ${esc(p.yur)}</span>`;
  for (const a of p.aud) chips += `<span class="mchip m-aud">${esc(a)}</span>`;
  const key = itemKey(CUR_DAY, item.href, item.title), rec = saved()[key];
  let s = `<article class="card item${pers ? " pers" : ""}${rec ? " saved" : ""}" id="m-${n}" data-key="${esc(key)}" data-day="${CUR_DAY}" data-title="${esc(item.title)}" data-href="${esc(item.href)}">` +
    `<button class="star${rec ? " on" : ""}" type="button" data-save>${ic("star")}<span>${rec ? "Kayıtlı" : "Kaydet"}</span></button>` + (chips ? `<div class="meta-chips">${chips}</div>` : "") +
    `<h4>${esc(item.title)}</h4>`;
  for (const t of p.trans) s += `<div class="trans-box">${ic("warn")}<div><b class="h">Geçiş hükmü</b>${t}</div></div>`;
  if (p.lead.length) s += `<div class="body">${p.lead.map(block).join("")}</div>`;
  const ek = p.ekler.map(e => `<a class="ek" href="${esc(e.h)}" target="_blank" rel="noopener">${ic("attach")}${esc(e.t)}</a>`).join("");
  if (p.details.length) {
    const d = detailsHtml(p.details);
    s += `<details><summary><span class="sp"><span class="t"${d.hint ? ` data-ipucu="${esc(d.hint)}"` : ""}></span>${ic("expand")}</span>${ek}</summary>` +
      `<div class="body">${d.html}</div></details>`;
  } else if (ek) s += `<div class="ek-row">${ek}</div>`;
  if (rec) s += noteBox(rec.note);
  const kind = /\.pdf(\?|$)/i.test(item.href) ? "PDF" : "HTM";
  s += `<div class="item-actions">` +
    (/^https?:\/\//.test(item.href) ? `<a class="src" href="${esc(item.href)}" target="_blank" rel="noopener"><span class="tag">${kind}</span>Tam metin</a>` : "<span></span>") +
    `<span class="acts"><a class="act ask" href="#" data-ask>${ic("spark")}<span>AI'ya Sor</span></a><a class="act" href="#" data-bilgi>${ic("doc")}Bilgi Notu</a>` +
    (archive && hasCurrent(g, item.title) ? `<a class="act cur" href="https://www.mevzuat.gov.tr/aramasonuc?AranacakMetin=${encodeURIComponent(currentQuery(item.title))}" target="_blank" rel="noopener">${ic("search")}Güncel hâli</a>` : "") +
    `</span></div></article>`;
  return s;
}
function maddeler(sec, groups, archive) {
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  let s = `<section id="sec-mad" class="sec sec-mad"><h2 class="free"><span class="ic">${ic("list")}</span>${esc(sec.title)}` +
    (total ? `<span class="cnt">${total}</span>` : "") + `</h2>`;
  if (groups.length > 1) {
    s += `<nav class="grp-strip">` + groups.map((g, i) =>
      `<a class="gs k-${g.kind}" href="#g-${i}">${ic(KIND_ICON[g.kind])}${esc(g.label.replace(/^\d+\. Mükerrer Sayı — /, "M · "))}<b>${groupCount(g)}</b></a>`).join("") + `</nav>`;
  }
  let n = 0;
  groups.forEach((g, i) => {
    s += `<div class="grp k-${g.kind}" id="g-${i}" data-fk="${filterKeyOf(g.label, g.kind)}"><h3><span class="chip">${ic(KIND_ICON[g.kind])}${esc(g.label)}</span><span class="n">${groupCount(g)}</span></h3>`;
    for (const it of g.items) s += itemHtml(it, g, ++n, archive);
    if (g.extra.length) {
      const lists = g.extra.filter(el => ["ul", "ol"].includes(tag(el)));
      const others = g.extra.filter(el => !["ul", "ol"].includes(tag(el)));
      if (others.length) s += `<div class="card pad">${others.map(block).join("")}</div>`;
      for (const ul of lists) {
        s += `<div class="card"><ul class="plain">` + [...ul.children].map(li => {
          const a = li.querySelector("a[href]");
          return a && /^https?:\/\//.test(a.getAttribute("href"))
            ? `<li><a href="${esc(a.getAttribute("href"))}" target="_blank" rel="noopener">${esc(li.textContent.trim())}</a></li>`
            : `<li>${inl(li)}</li>`;
        }).join("") + `</ul></div>`;
      }
    }
    s += `</div>`;
  });
  return s + `</section>`;
}

// ------------------------------------------------------------------ gün sayfası

function donut(groups) {
  const parts = groups.map((g, i) => ({ g, i, n: groupCount(g) })).filter(x => x.n > 0);
  const total = parts.reduce((a, x) => a + x.n, 0);
  if (!total) return "";
  const dark = isDark() ? 1 : 0;
  let pos = 0, stops = [];
  for (const x of parts) {
    const c = KIND_COLOR[x.g.kind][dark];
    const a = (pos / total) * 100, b = ((pos + x.n) / total) * 100;
    stops.push(`${c} ${a.toFixed(2)}% ${(b - (parts.length > 1 ? 0.6 : 0)).toFixed(2)}%`);
    if (parts.length > 1) stops.push(`transparent ${(b - 0.6).toFixed(2)}% ${b.toFixed(2)}%`);
    pos += x.n;
  }
  return `<section id="sec-dag" class="card sec sec-dag"><h2><span class="ic">${ic("pie")}</span>Bu sayıda neler var?</h2>` +
    `<div class="dag"><div class="donut" style="background:conic-gradient(${stops.join(",")})"><div><b>${total}</b><span>başlık</span></div></div>` +
    `<ul class="leg">` + parts.map(x => `<li><a href="#g-${x.i}"><i style="background:${KIND_COLOR[x.g.kind][dark]}"></i><span>${esc(x.g.label)}</span><b>${x.n}</b></a></li>`).join("") +
    `</ul></div></section>`;
}

function stats(list) {
  const tiles = list.filter(x => x.n > 0).map(x => `<a class="stat ${x.c}" href="${x.h}"><b>${x.n}</b><span>${x.t}</span></a>`);
  if (!tiles.length) return "";
  let s = `<div class="stats">`;
  for (let i = 0; i < tiles.length; i += 2) s += `<div class="pair${tiles.length - i === 1 ? " one" : ""}">${tiles.slice(i, i + 2).join("")}</div>`;
  return s + `</div>`;
}

function neighbours(k) {
  const all = INDEX.tarihler; // yeniden eskiye
  let older = "", newer = "";
  for (const d of all) {
    if (d < k && (!older || d > older)) older = d;
    if (d > k && (!newer || d < newer)) newer = d;
  }
  return { older, newer };
}
function daynav(k) {
  const { older, newer } = neighbours(k);
  const side = (d, cls, label) => d
    ? `<a class="${cls}" href="${dayUrl(d)}" data-nav>${ic("arrow")}<span><b>${label}</b><small>${shortOf(d)}</small></span></a>` : `<span></span>`;
  return `<nav class="daynav">${side(older, "dn-prev", "Önceki gün")}` +
    `<a class="dn-hist" href="?gecmis" data-nav>${ic("history")}<span><b>Geçmiş</b><small>Tüm günler</small></span></a>` +
    `${side(newer, "dn-next", "Sonraki gün")}</nav>`;
}
function calBadge(k) {
  return `<a class="cal" href="?gecmis#tarih" data-nav title="Tarih seç"><span class="cal-m">${up(monOf(k))}</span>` +
    `<span class="cal-d">${dayOf(k)}</span><span class="cal-w">${up(wdOf(k).slice(0, 3))}</span><span class="cal-pick">${ic("cal")}</span></a>`;
}

function setMeta(title, desc, url) {
  document.title = title;
  const d = document.querySelector('meta[name="description"]');
  if (d && desc) d.setAttribute("content", desc);
  const c = document.querySelector('link[rel="canonical"]');
  if (c) c.setAttribute("href", new URL(url, location.href).href);
}

async function showDay(k, q, madde) {
  if (!k) k = INDEX.guncel;
  if (!INDEX.tarihler.includes(k)) return showMissing(k);
  loading("Özet yükleniyor…");
  CUR_DAY = k;
  let html;
  try { html = await loadDay(k); } catch (e) { return showError(e, () => showDay(k, q)); }
  const d = parse(html);
  const archive = isArchive(k) || !!d.archive;
  const groups = [];
  const secs = d.sections.map(s => {
    if (s.kind === "mad") { s.groups = groupsOf(s.nodes); groups.push(...s.groups); }
    return s;
  });
  const items = groups.reduce((n, g) => n + g.items.length, 0);
  CURP = { k, d, groups, archive };
  ATA.top = pref("ata_top") === "1"; ATA.titles = new Set(pref("ata_unvan").split(",").filter(Boolean));
  const one = secs.find(s => s.kind === "one");
  const hl = one ? one.nodes.filter(el => ["ul", "ol"].includes(tag(el))).reduce((n, el) => n + el.children.length, 0) : 0;
  const ata = secs.find(s => s.kind === "ata");
  const ataN = ata ? appointmentRows(ata.nodes).length : 0;
  const ozet = secs.find(s => s.kind === "ozet");

  let s = "";
  if (q) s += hitBar(k, q);
  s += `<section class="card hero"><div class="hero-top">${calBadge(k)}<div class="hero-txt">` +
    `<div class="kicker">RESMÎ GAZETE ÖZETİ</div><h1>${longOf(k)}</h1>` +
    `<div class="sub">${wdOf(k)}${d.issue ? `<span class="pill">Sayı ${esc(d.issue)}</span>` : ""}</div></div>` +
    `<button class="share" type="button" aria-label="Paylaş" title="Paylaş">${ic("share")}</button></div>` +
    daynav(k) +
    stats([
      { n: items, t: "düzenleme", c: "s1", h: "#sec-mad" }, { n: hl, t: "öne çıkan", c: "s2", h: "#sec-one" },
      { n: groups.length, t: "bölüm", c: "s3", h: "#sec-dag" }, { n: ataN, t: "atama", c: "s4", h: "#sec-ata" },
    ]);
  if (archive) {
    // "Arşiv özeti — bu özet …" → başlık ayrı yazıldığı için yalnızca açıklama
    let note = (d.archive || "").replace(/^(Arşiv özeti|Personel arşivi)\s*[—–-]?\s*/i, "").trim() ||
      "bu özet sayının yayımından sonra yazılmıştır; düzenlemeler bu tarihten sonra değiştirilmiş ya da yürürlükten kaldırılmış olabilir.";
    note = up(note.charAt(0)) + note.slice(1);
    s += `<div class="hero-arsiv">${ic("archive")}<div><b>Arşiv özeti</b>${esc(note)}</div></div>`;
  }
  if (ataN) s += `<a class="hero-ata" href="#sec-ata">${ic("group")}<span>${ataN} atama kararı · Atamalar'a git</span><span class="go">›</span></a>`;
  const official = d.official || `https://www.resmigazete.gov.tr/eskiler/${k.slice(0, 4)}/${k.slice(4, 6)}/${k}.htm`;
  s += `<a class="cta" href="${esc(official)}" target="_blank" rel="noopener"><span class="cta-ic">${ic("bank")}</span>` +
    `<span class="cta-tx"><b>Resmî Gazete'de aç</b><small>Sayının aslı · resmigazete.gov.tr</small></span><span class="cta-go">${ic("arrow")}</span></a></section>`;

  for (const sec of secs) {
    if (sec.kind === "ozet") {
      s += `<section id="sec-ozet" class="card sec sec-ozet"><h2><span class="ic">${ic("doc")}</span>${esc(sec.title)}` +
        ("speechSynthesis" in window ? `<button class="tts-btn" type="button">${ic("vol")}<span>Dinle</span></button>` : "") +
        `</h2>${sec.nodes.map(block).join("")}</section>`;
      s += donut(groups);
    } else if (sec.kind === "one") {
      s += `<section id="sec-one" class="sec sec-one"><h2 class="free"><span class="ic">${ic("star")}</span>${esc(sec.title)}` +
        (hl ? `<span class="cnt">${hl}</span>` : "") + `</h2>` +
        sec.nodes.map(el => ["ul", "ol"].includes(tag(el))
          ? `<ol class="hl">${[...el.children].map(li => `<li>${inl(li)}</li>`).join("")}</ol>` : `<div class="card pad">${block(el)}</div>`).join("") +
        `</section>`;
    } else if (sec.kind === "ata") {
      s += appointments(sec);
    } else if (sec.kind === "mad") {
      s += maddeler(sec, sec.groups, archive);
    } else if (sec.kind === "yor") {
      const body = sec.nodes.filter(el => !(tag(el) === "p" && el.children.length === 1 && tag(el.firstElementChild) === "i" &&
        el.textContent.trim() === el.firstElementChild.textContent.trim()));
      s += `<section id="sec-yor" class="card sec sec-yor"><h2><span class="ic">${ic("spark")}</span>${esc(sec.title)}` +
        `<span class="ai">${ic("spark")}Yapay zekâ yorumu</span></h2>${body.map(block).join("")}` +
        `<p class="note">Bu bölüm yapay zekâ yorumudur, hukuki danışmanlık değildir.</p></section>`;
    } else {
      s += `<section class="card sec sec-dig"><h2><span class="ic">${ic("doc")}</span>${esc(sec.title)}</h2>${sec.nodes.map(block).join("")}</section>`;
    }
  }
  s += `<button class="ask-day" type="button" data-ask-day>${ic("spark")}<span><b>Bu sayıyı yapay zekâya sor</b><small>Üst yazı taslağı, süre planı, sade özet ve daha fazlası</small></span>${ic("arrow")}</button>`;
  s += `<p class="note src-note">Özetler yapay zekâ ile hazırlanır ve hata içerebilir; bağlayıcı olan Resmî Gazete'de yayımlanan metindir.</p>`;
  $app.innerHTML = s;

  const lead = ozet ? ozet.nodes.map(el => el.textContent.trim()).join(" ") : "";
  setMeta(`${longOf(k)} Resmî Gazete özeti${d.issue ? ` · Sayı ${d.issue}` : ""} | Resmî Gazete Özeti`,
    lead ? lead.slice(0, 158) + (lead.length > 158 ? "…" : "") : `${longOf(k)} tarihli Resmî Gazete'nin özeti.`,
    // Arama motorları için kanonik adres günün düz sayfasıdır (docs/gun/, gorev/site_sayfalari.py);
    // ana sayfada en yeni gün gösterilse de kanonik ana sayfa kalır
    /[?&]gun=/.test(location.search) ? `gun/${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6)}.html` : "./");

  wireDay(k, d, ozet);
  setupFilters();
  const ww = trackedTerms();
  if (ww.length) {
    let hits = 0;
    $app.querySelectorAll(".item").forEach(it => {
      const m = radarHits(it.textContent, ww);
      if (!m.length) return;
      hits++;
      const chips = it.querySelector(".meta-chips") || it.insertAdjacentElement("afterbegin", Object.assign(document.createElement("div"), { className: "meta-chips" }));
      chips.insertAdjacentHTML("beforeend", `<span class="mchip m-radar">🎯 <b>${esc(m.join(", "))}</b></span>`);
    });
    if (hits) $app.querySelector(".hero").insertAdjacentHTML("beforeend", `<a class="hero-cal" href="#" data-radar>🎯 <span>Takip ettiklerin ${hits} maddede geçiyor</span></a>`);
    const jump = $app.querySelector("[data-radar]");
    if (jump) jump.addEventListener("click", e => { e.preventDefault(); const f = $app.querySelector(".item .m-radar"); if (f) f.closest(".item").scrollIntoView({ block: "center" }); });
  }
  if (q) highlight(q);
  if (madde) {
    // Mevzuat'tan gelindi: madde süzgeçle gizlenmişse süzgeçler kaldırılır, kart bulunup bir an vurgulanır
    const it = [...$app.querySelectorAll(".item")].find(el => el.dataset.title === madde);
    if (it) {
      if (it.style.display === "none") { const all = $app.querySelector('.site-flt button[data-f="all"]'); if (all) all.click(); }
      it.classList.add("flash");
      setTimeout(() => it.scrollIntoView({ block: "center" }), 80);
      setTimeout(() => it.classList.remove("flash"), 2800);
    }
  }
}

/** Gün sayfasındaki 🔎 SÜZGEÇ ve 🏛️ KURUM satırları (uygulamadakinin web hâli): tür, personel ve kuruma göre madde süzme. */
function setupFilters() {
  const sec = $app.querySelector("#sec-mad");
  const items = [...$app.querySelectorAll("#sec-mad .item")];
  if (!sec || items.length < 3) return;
  const info = items.map(el => ({
    el, grp: el.closest(".grp"), pers: el.classList.contains("pers"),
    fk: (el.closest(".grp") || { dataset: {} }).dataset.fk || "",
    kurum: (el.querySelector(".m-kurum") || {}).textContent || "",
    aud: [...el.querySelectorAll(".m-aud")].map(x => x.textContent.trim()),
  }));
  const fks = FILTERS.filter(f => f.key !== "pers" && info.some(x => x.fk === f.key));
  const kur = {};
  info.forEach(x => { if (x.kurum) kur[x.kurum] = (kur[x.kurum] || 0) + 1; });
  const kurList = Object.entries(kur).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const hasPers = info.some(x => x.pers);
  const audList = [...new Set(info.flatMap(x => x.aud))].map(a => [a, info.filter(x => x.aud.includes(a)).length]).sort((x, y) => y[1] - x[1]);
  const st = { aud: "", pers: prefKeys().includes("pers") && hasPers, kinds: new Set(prefKeys().filter(k => fks.some(f => f.key === k))), kurum: "" };
  const row = $app.querySelector("#sec-mad .grp-strip");
  const html = `<div class="tur-row site-flt"><span class="tur-k">🔎 SÜZGEÇ</span><button type="button" class="tur-c tur-all" data-f="all">Tümü</button>` +
    (hasPers ? `<button type="button" class="tur-c" data-f="pers">👤 Personel<b>${info.filter(x => x.pers).length}</b></button>` : "") +
    fks.map(f => `<button type="button" class="tur-c" data-f="k:${f.key}">${f.emoji} ${esc(f.chip)}<b>${info.filter(x => x.fk === f.key).length}</b></button>`).join("") + `</div>` +
    (kurList.length ? `<div class="kur-row site-flt"><span class="kur-k">🏛️ KURUM</span>` + kurList.map(([k, n]) => `<button type="button" class="kur-c" data-f="u:${esc(k)}">${esc(k)}<b>${n}</b></button>`).join("") + `</div>` : "") +
    (audList.length ? `<div class="aud-row site-flt site-aud"><span class="aud-k">KİMLERİ İLGİLENDİRİYOR?</span>` + audList.map(([a, n]) => `<button type="button" class="aud-c" data-f="a:${esc(a)}">${esc(a)}<b>${n}</b></button>`).join("") + `</div>` : "") +
    `<div class="flt-end site-fend"><span></span><button type="button" data-f="all">Süzgeçleri kaldır</button></div>`;
  (row || sec.querySelector("h2")).insertAdjacentHTML("afterend", html);
  const apply = () => {
    let shown = 0;
    info.forEach(x => {
      const ok = (!st.pers || x.pers) && (!st.kinds.size || st.kinds.has(x.fk)) && (!st.kurum || x.kurum === st.kurum) && (!st.aud || x.aud.includes(st.aud));
      x.el.style.display = ok ? "" : "none";
      if (ok) shown++;
    });
    $app.querySelectorAll("#sec-mad .grp").forEach(g => {
      const its = [...g.querySelectorAll(".item")];
      g.style.display = its.length && its.every(i => i.style.display === "none") ? "none" : "";
    });
    $app.querySelectorAll("#sec-mad .grp-strip .gs").forEach(a => {
      const g = $app.querySelector(a.getAttribute("href"));
      a.style.display = g && g.style.display === "none" ? "none" : "";
    });
    const any = st.pers || st.kinds.size || st.kurum || st.aud;
    const ar = sec.querySelector(".site-aud"); if (ar) ar.style.display = st.pers ? "flex" : "none";
    sec.querySelectorAll(".site-flt button").forEach(b => {
      const f = b.dataset.f;
      const on = f === "pers" ? st.pers : f.startsWith("k:") ? st.kinds.has(f.slice(2)) : f.startsWith("u:") ? st.kurum === f.slice(2) : f.startsWith("a:") ? st.aud === f.slice(2) : false;
      b.classList.toggle("on", on);
      if (f === "all") b.classList.toggle("off", !!any);
    });
    const end = sec.querySelector(".site-fend");
    end.style.display = any ? "flex" : "none";
    end.querySelector("span").textContent = `${shown} / ${items.length} düzenleme gösteriliyor`;
  };
  sec.addEventListener("click", e => {
    const b = e.target.closest(".site-flt button, .site-fend button");
    if (!b) return;
    const f = b.dataset.f;
    if (f === "all") { st.pers = false; st.kinds.clear(); st.kurum = ""; st.aud = ""; }
    else if (f === "pers") st.pers = !st.pers;
    else if (f.startsWith("k:")) { const k = f.slice(2); st.kinds.has(k) ? st.kinds.delete(k) : st.kinds.add(k); }
    else if (f.startsWith("u:")) st.kurum = st.kurum === f.slice(2) ? "" : f.slice(2);
    else if (f.startsWith("a:")) st.aud = st.aud === f.slice(2) ? "" : f.slice(2);
    apply();
  });
  apply();
}

function wireDay(k, d, ozet) {
  if (!window.__dayClick) { window.__dayClick = true; $app.addEventListener("click", dayClick); }
  function dayClick(e) {
    if (e.target.closest("[data-ask-official]") && MISS) { e.preventDefault(); openAsk(MISS, null); return; }
    const at = e.target.closest("[data-ata-top],[data-ata-unvan],[data-ata-reset],[data-ata-paylas],[data-ata-pdf]");
    if (at) {
      e.preventDefault();
      if (at.hasAttribute("data-ata-top")) { ATA.top = !ATA.top; ataSave(); ataRerender(); }
      else if (at.hasAttribute("data-ata-unvan")) ataUnvanModal();
      else if (at.hasAttribute("data-ata-reset")) { ATA.top = false; ATA.titles = new Set(); ataSave(); ataRerender(); }
      else if (at.hasAttribute("data-ata-pdf")) ataPdf();
      else {
        const text = ataText();
        (async () => {
          try { await navigator.clipboard.writeText(text); toast("Atama listesi kopyalandı"); } catch (x) { prompt("Atama listesi:", text); }
          if (navigator.share) { try { await navigator.share({ title: "Atama listesi", text }); } catch (x) { /* vazgeçildi */ } }
        })();
      }
      return;
    }
    const ask = e.target.closest("[data-ask],[data-bilgi],[data-ask-day]");
    if (ask && CURP) {
      e.preventDefault();
      if (ask.hasAttribute("data-ask-day")) { openAsk(CURP, null); return; }
      const art2 = ask.closest(".item");
      const it = CURP.groups.flatMap(g => g.items).find(i => i.href === art2.dataset.href && i.title === art2.dataset.title);
      if (it) { if (ask.hasAttribute("data-ask")) openAsk(CURP, it); else openNote(CURP, it); }
      return;
    }
    const star = e.target.closest("[data-save]"), nb = e.target.closest("[data-note]");
    const art = (star || nb) && (star || nb).closest(".item");
    if (!art) return;
    const all = saved(), key = art.dataset.key;
    if (star) {
      if (all[key]) {
        if (all[key].note && !confirm("Bu maddeye yazdığınız not da silinecek. Kayıttan çıkarılsın mı?")) return;
        delete all[key];
      } else all[key] = { day: art.dataset.day, title: art.dataset.title, href: art.dataset.href, note: "", ts: Date.now() };
      setSaved(all);
    } else {
      const cur = all[key] || { day: art.dataset.day, title: art.dataset.title, href: art.dataset.href, note: "", ts: Date.now() };
      const v = prompt("Notunuz (en çok 280 karakter; bu tarayıcıda saklanır):", cur.note || "");
      if (v === null) return;
      cur.note = v.trim().slice(0, 280);
      all[key] = cur;
      setSaved(all);
    }
    const rec = all[key];
    art.classList.toggle("saved", !!rec);
    const st = art.querySelector("[data-save]");
    st.classList.toggle("on", !!rec);
    st.querySelector("span").textContent = rec ? "Kayıtlı" : "Kaydet";
    const old = art.querySelector("[data-note]");
    if (old) old.remove();
    if (rec) art.querySelector(".item-actions").insertAdjacentHTML("beforebegin", noteBox(rec.note));
  }
  const tts = $app.querySelector(".tts-btn");
  if (tts && ozet) {
    const set = on => { tts.innerHTML = ic(on ? "stop" : "vol") + `<span>${on ? "Durdur" : "Dinle"}</span>`; };
    tts.addEventListener("click", () => {
      if (speechSynthesis.speaking) { speechSynthesis.cancel(); set(false); return; }
      const u = new SpeechSynthesisUtterance(ozet.nodes.map(el => el.textContent.trim()).join(" "));
      u.lang = "tr-TR";
      const v = speechSynthesis.getVoices().find(x => low(x.lang || "").startsWith("tr"));
      if (v) u.voice = v;
      u.onend = u.onerror = () => set(false);
      speechSynthesis.speak(u);
      set(true);
    });
  }
  const share = $app.querySelector(".share");
  if (share) {
    share.addEventListener("click", async () => {
      const url = new URL(dayUrl(k), location.href).href;
      const title = `${longOf(k)} Resmî Gazete özeti`;
      if (navigator.share) { try { await navigator.share({ title, url }); } catch (e) { /* vazgeçildi */ } return; }
      try { await navigator.clipboard.writeText(url); toast("Bağlantı kopyalandı"); } catch (e) { prompt("Bağlantı:", url); }
    });
  }
}

/** Aranan kelimeler sayfada işaretlenir; kapalı ayrıntılardaki eşleşmeler açılır */
/** Türkçe harfleri sadeleştirir (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u): telefonda "doga" yazan da "doğa"yı bulsun */
const FOLD = { "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i", "û": "u" };
const fold = t => low(t).replace(/[çğıöşüâîû]/g, c => FOLD[c]).replace(/̇/g, "");
const FOLD_CLASS = { c: "cçCÇ", g: "gğGĞ", i: "iıİI", o: "oöOÖ", s: "sşSŞ", u: "uüUÜ", a: "aâAÂ" };
function trPattern(tok) {
  return [...fold(tok)].map(ch => {
    if (FOLD_CLASS[ch]) return `[${FOLD_CLASS[ch]}]`;
    if (/[\p{L}]/u.test(ch)) return `[${ch}${up(ch)}]`;
    return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }).join("");
}
function queryTokens(q) {
  return [...new Set((low(q).match(/[\p{L}\p{N}]+/gu) || []).map(w => w.slice(0, KOK)))];
}
function highlight(q) {
  const words = [...new Set(low(q).match(/[\p{L}\p{N}]+/gu) || [])];
  if (!words.length) return;
  const B = "(?<![\\p{L}\\p{N}])", E = "(?![\\p{L}\\p{N}])", W = "[\\p{L}\\p{N}]*";
  // Birden çok kelime varsa önce ifadenin kendisi aranır ("tek ders"); yoksa kelimeler tek tek. Kısa
  // kelimeler (3 harf ve altı) yalnızca kendisi olarak işaretlenir, "tek" "Teknik"i işaretlemesin.
  const phrase = words.length > 1 ? new RegExp(B + words.map(trPattern).join("[^\\p{L}\\p{N}]+") + W, "gu") : null;
  const each = new RegExp(B + "(?:" + words.map(w => w.length >= 4 ? trPattern(w.slice(0, KOK)) + W : trPattern(w) + E).join("|") + ")", "gu");
  const re = phrase && phrase.test($app.textContent) ? phrase : each;
  re.lastIndex = 0;
  const walker = document.createTreeWalker($app, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.parentElement.closest(".hero,.hitbar,svg,script,style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  let count = 0;
  for (const node of nodes) {
    const text = node.nodeValue;
    re.lastIndex = 0;
    if (!re.test(text)) continue;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0, m;
    while ((m = re.exec(text))) {
      frag.append(text.slice(last, m.index));
      const mk = document.createElement("mark");
      mk.className = "hit";
      mk.textContent = m[0];
      frag.append(mk);
      last = m.index + m[0].length;
      count++;
    }
    frag.append(text.slice(last));
    node.replaceWith(frag);
  }
  $app.querySelectorAll("mark.hit").forEach(m => { const det = m.closest("details"); if (det) det.open = true; });
  const n = $app.querySelector(".hitbar .hn");
  if (n) n.textContent = count ? `${count} eşleşme` : "bu sayfada geçmiyor";
  const first = $app.querySelector("mark.hit");
  if (first) setTimeout(() => first.scrollIntoView({ block: "center" }), 60);
}
function hitBar(k, q) {
  return `<div class="hitbar card">${ic("search")}<span><b>“${esc(q)}”</b><small class="hn"></small></span>` +
    `<a href="?ara=${encodeURIComponent(q)}" data-nav>Sonuçlar</a><a class="x" href="${dayUrl(k)}" data-nav aria-label="Aramayı kapat">${ic("close")}</a></div>`;
}

function showMissing(k) {
  const ok = k && k >= "20000101";
  if (!window.__missClick) { window.__missClick = true; $app.addEventListener("click", e => { if (e.target.closest("[data-ask-official]") && MISS) { e.preventDefault(); openAsk(MISS, null); } }); }
  MISS = ok ? { k, d: { issue: "", official: `https://www.resmigazete.gov.tr/eskiler/${k.slice(0, 4)}/${k.slice(4, 6)}/${k}.htm`, sections: [] }, groups: [], archive: false, official: true } : null;
  $app.innerHTML = `<section class="card hero">` + (ok ? `<div class="hero-top">${calBadge(k)}<div class="hero-txt"><div class="kicker">RESMÎ GAZETE ÖZETİ</div>` +
    `<h1>${longOf(k)}</h1><div class="sub">${wdOf(k)}</div></div></div>` + daynav(k) : "") +
    `<div class="empty"><b>Bu günün özeti henüz yok</b><p>${k > (INDEX.guncel || "") ? "Bu sayı henüz yayımlanmadı ya da özeti hazırlanıyor." :
      "Arşiv 2020'ye doğru geriye dönük dolduruluyor; bu gün henüz yazılmadı. Sayının aslına Resmî Gazete'den bakabilirsiniz."}</p></div>` +
    (ok ? `<a class="cta" href="https://www.resmigazete.gov.tr/eskiler/${k.slice(0, 4)}/${k.slice(4, 6)}/${k}.htm" target="_blank" rel="noopener">` +
      `<span class="cta-ic">${ic("bank")}</span><span class="cta-tx"><b>Resmî Gazete'de aç</b><small>O günün fihristi · resmigazete.gov.tr</small></span>` +
      `<span class="cta-go">${ic("arrow")}</span></a>` + `<p class="hint">Bu günün özeti henüz yazılmadı. Resmî fihristi tarayıcıdan okuyamadığımız için yapay zekâ bağlantıdaki sayfayı kendisi okur.</p>` + `<button class="ask-day" type="button" data-ask-official>${ic("spark")}<span><b>Bu sayıyı yapay zekâya sor</b><small>Resmî fihristi okuyup özetletin, üst yazı ya da süre planı isteyin</small></span>${ic("arrow")}</button>` : "") + `</section>`;
  setMeta("Özet bulunamadı | Resmî Gazete Özeti", "", ok ? dayUrl(k) : "./");
}

// ------------------------------------------------------------------ geçmiş ve arama

async function showList(q, tur) {
  loading("Günler yükleniyor…");
  try { await loadParts(); } catch (e) { return showError(e, () => showList(q, tur)); }
  const all = INDEX.tarihler.slice().sort().reverse();
  const arch = new Set(INDEX.arsiv_gunleri || []);
  const total = Math.round((ARSIV_SON - ARSIV_BAS) / 864e5) + 1;
  const done = arch.size;
  const years = [...new Set(all.map(k => k.slice(0, 4)))];
  const today = keyOf(Date.now() + 3 * 3600e3);

  $app.innerHTML = `<section class="card lst"><h1>Geçmiş özetler</h1><p class="lst-sub">${sayi(all.length)} günün özeti · en yenisi ${longOf(INDEX.guncel)}</p>` +
    `<form class="srch" role="search">${ic("search")}<input type="search" name="ara" placeholder="Tüm özetlerde ara… (ör. ikamet izni, rektör)" value="${esc(q)}" autocomplete="off" enterkeyhint="search">` +
    `<button type="submit">Ara</button></form>` +
    `<div class="lst-chips">` +
    [["", "Tümü"], ["gunluk", "📰 Günlük"], ["arsiv", "🗄️ Arşiv"]].map(([v, t]) =>
      `<a class="fchip${tur === v ? " on" : ""}" href="?gecmis${v ? `&tur=${v}` : ""}${q ? `&ara=${encodeURIComponent(q)}` : ""}" data-nav data-keep>${t}</a>`).join("") +
    `<label class="fchip date" id="tarih">${ic("cal")}Tarih seç<input type="date" min="2000-01-01" max="${isoOf(today)}"></label>` +
    `<button type="button" class="fchip" data-ssave>${ic("radar")}Aramayı kaydet</button></div>` +
    `<div class="arsiv-bar"><div><span>🗄️ <b>Arşiv</b> · 2000'den bu yana</span><span>${sayi(done)} / ${sayi(total)} gün</span></div>` +
    `<i><s style="width:${Math.max(1, (done / total) * 100).toFixed(2)}%"></s></i></div>` +
    (years.length > 1 ? `<div class="years">${years.map(y => `<a class="yr" href="#y-${y}">${y}</a>`).join("")}</div>` : "") +
    `</section><div id="days"></div>`;

  const form = $app.querySelector(".srch"), input = form.querySelector("input");
  let timer = 0;
  const apply = (push) => {
    const v = input.value.trim();
    const url = `?${v ? `ara=${encodeURIComponent(v)}` : "gecmis"}${tur ? `&tur=${tur}` : ""}`;
    history[push ? "pushState" : "replaceState"](null, "", url);
    lastSearch = location.search;
    renderDays(v, tur);
    $app.querySelectorAll(".fchip[data-keep]").forEach(a => {
      const u = new URL(a.getAttribute("href"), location.href);
      if (v) u.searchParams.set("ara", v); else u.searchParams.delete("ara");
      a.setAttribute("href", u.search);
    });
  };
  form.addEventListener("submit", e => { e.preventDefault(); clearTimeout(timer); apply(true); input.blur(); });
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => apply(false), 250); });
  const date = $app.querySelector('input[type="date"]');
  date.addEventListener("change", e => { if (e.target.value) go(dayUrl(normKey(e.target.value))); });
  const yrs = $app.querySelector(".years");
  if (yrs) yrs.addEventListener("click", e => {
    const a = e.target.closest(".yr");
    if (!a) return;
    e.preventDefault();
    const id = a.getAttribute("href").slice(1);
    if (jumpTo(id)) history.replaceState(null, "", location.search + "#" + id);
    else toast("Bu yılda gösterilecek gün yok");
  });
  // Bildirim Radarı'na kayıtlı arama (uygulamadaki "Aramayı kaydet")
  $app.querySelector("[data-ssave]").addEventListener("click", () => {
    const v = input.value.trim();
    if (v.length < 2) { toast("Önce aramak istediğiniz kelimeyi yazın"); input.focus(); return; }
    const cur = savedSearches();
    if (cur.some(x => fold(x) === fold(v))) { toast("Bu arama zaten kayıtlı"); return; }
    if (cur.length >= SEARCH_MAX) { toast(`En çok ${SEARCH_MAX} arama kaydedilebilir`); return; }
    setSearches([...cur, v]);
    toast("Arama kaydedildi: Bildirim Radarı'nda");
  });
  // Masaüstü tarayıcılarda takvimi açmak için (dokunulan yer görünmez tarih kutusu)
  date.addEventListener("click", () => { try { date.showPicker(); } catch (e) { /* desteklenmiyor */ } });
  renderDays(q, tur);
  setMeta(q ? `“${q}” araması | Resmî Gazete Özeti` : "Geçmiş özetler | Resmî Gazete Özeti", "Resmî Gazete özetlerinin tamamı: günlere göre liste ve arama.", "?gecmis");
  if (new URLSearchParams(location.search).has("ara") && !q) input.focus();
  if (location.hash === "#tarih") $app.querySelector("#tarih").scrollIntoView({ block: "center" });
}

const FOLD_CACHE = {};
const foldedMetin = k => FOLD_CACHE[k] || (FOLD_CACHE[k] = fold((PARTS[k] || {}).metin || ""));
function renderDays(q, tur) {
  const box = document.getElementById("days");
  const arch = new Set(INDEX.arsiv_gunleri || []);
  let days = INDEX.tarihler.slice().sort().reverse();
  if (tur === "arsiv") days = days.filter(k => arch.has(k));
  else if (tur === "gunluk") days = days.filter(k => !arch.has(k));
  if (pref("personel") === "1") days = days.filter(k => PARTS[k] && PARTS[k].personel);
  const toks = q ? queryTokens(q).map(fold) : [];
  if (toks.length) days = days.filter(k => PARTS[k] && toks.every(t => foldedMetin(k).includes(t)));
  const perMonth = {};
  for (const k of days) perMonth[k.slice(0, 6)] = (perMonth[k.slice(0, 6)] || 0) + 1;
  let s = pref("personel") === "1" ? `<a class="card web fltnote" href="#" data-panel="suzgec">${ic("person")}<span><b>Sadece Personel açık</b><small>Yalnızca kamu personeline ilişkin düzenleme olan günler · Menüden değiştir</small></span>${ic("chev")}</a>` : "";
  if (q) {
    s += `<p class="res">${days.length ? `<b>“${esc(q)}”</b> ${sayi(days.length)} günün özetinde geçiyor` : `<b>“${esc(q)}”</b> için özet bulunamadı`}</p>`;
    if (!days.length) {
      s += `<a class="card web" href="https://www.google.com/search?q=${encodeURIComponent(`"${q}" site:resmigazete.gov.tr`)}" target="_blank" rel="noopener">` +
        `${ic("search")}<span><b>Bütün Resmî Gazete arşivinde ara</b><small>resmigazete.gov.tr içinde web araması</small></span>${ic("chev")}</a>`;
    }
  } else if (!days.length) s += `<p class="res">Bu süzgece uyan gün yok.</p>`;
  let month = "", year = "";
  for (const k of days) {
    const m = k.slice(0, 6);
    if (m !== month) {
      if (month) s += `</div>`;
      month = m;
      const y = k.slice(0, 4);
      s += `<div class="mblk"><h3 class="mon"${y !== year ? ` id="y-${y}"` : ""}>${ic("cal")}${monOf(k)} ${y}<span>${perMonth[m]} gün</span></h3>`;
      year = y;
    }
    const p = PARTS[k] || {};
    const a = arch.has(k);
    const bits = [wdOf(k)];
    if (p.sayi) bits.push(`Sayı ${esc(p.sayi)}`);
    bits.push(a ? "🗄️ Arşiv özeti" : p.duzenleme ? `${p.duzenleme} düzenleme` : "");
    if (p.personel) bits.push("👤 Personel");
    if (trackedTerms().some(w => queryTokens(w).map(fold).every(t => foldedMetin(k).includes(t)))) bits.push("🎯 Takibinizde");
    s += `<a class="day card${a ? " arc" : ""}" href="${dayUrl(k, q)}" data-nav><span class="dcal"><i>${mon3(k)}</i><b>${dayOf(k)}</b></span>` +
      `<span class="dtx"><b>${longOf(k)}</b><small>${bits.filter(Boolean).join(" · ")}</small>` +
      (p.onizleme ? `<span class="pv">${esc(p.onizleme)}</span>` : "") + `</span>${ic("chev")}</a>`;
  }
  if (month) s += `</div>`;
  box.innerHTML = s;
}

// ------------------------------------------------------------------ tercihler ve sol menü (uygulamadaki sol panelin web uyarlaması)

const pref = (k, d = "") => { try { const v = localStorage.getItem("ayar_" + k); return v === null ? d : v; } catch (e) { return d; } };
const setPref = (k, v) => { try { localStorage.setItem("ayar_" + k, v); } catch (e) { /* gizli sekme */ } };
const FONTS = [["0.92", "Küçük"], ["1", "Normal"], ["1.12", "Büyük"], ["1.26", "Çok büyük"]];
// Kayıtlar (Kaydet ve Not): yalnızca bu tarayıcıda, localStorage'da
let CUR_DAY = "";
let CURP = null;
let MISS = null;
const saved = () => { try { return JSON.parse(pref("kayit", "{}")) || {}; } catch (e) { return {}; } };
const setSaved = o => setPref("kayit", JSON.stringify(o));
const itemKey = (day, href, title) => `${day}|${href || title}`;

const watchWords = () => pref("takip", "").split("|").map(x => x.trim()).filter(Boolean);
const setWatch = list => setPref("takip", [...new Set(list.map(x => x.trim()).filter(Boolean))].join("|"));
function applyFont() { $app.style.zoom = pref("yazi", "1"); }

// Sol menü (uygulamadaki sol panelin web uyarlaması). Eski "Araçlar ve Ayarlar" sayfasının bölümleri menünün içinde açılır.

/** Görünüm bölümü: tema ve yazı boyutu */
function themeBlock() {
  const t = theme(), f = pref("yazi", "1");
  return `<div class="seg">` +
    [["sistem", "🌓 Sistem"], ["acik", "☀️ Açık"], ["koyu", "🌙 Koyu"]].map(([k, l]) => `<a href="#" data-tema="${k}"${t === k ? ` class="on"` : ""}>${l}</a>`).join("") +
    `</div><p class="hint">Sistem: cihazınızın ayarını izler.</p><div class="dr-lbl in">Yazı boyutu</div><div class="seg site-fs">` +
    FONTS.map(([k, l]) => `<a href="#" data-yazi="${k}"${f === k ? ` class="on"` : ""} style="font-size:${13 * +k}px">${l}</a>`).join("") +
    `</div><p class="hint">Özet sayfaları bu boyutla gösterilir.</p>`;
}
/** Süzgeçler bölümü: her sayfa açılışında hangi süzgeçler açık olsun (çok seçimli; "Tümü" hepsini kaldırır) */
function filterBlock() {
  const keys = prefKeys();
  const cell = (key, emoji, label, color, on) =>
    `<a href="#" data-flt="${key}" class="${on ? "on" : ""}" style="--fc:${color}"><span class="e">${emoji}</span><span class="l">${esc(label)}</span>${on ? `<span class="ok">✓</span>` : ""}</a>`;
  return `<div class="flt-grid">` + cell("", "🗂️", "Tümü", "#4A4440", !keys.length) +
    FILTERS.map(f => cell(f.key, f.emoji, f.chip, f.color, keys.includes(f.key))).join("") + `</div>` +
    `<p class="hint">Her sayfa açılışında hangi süzgeçler açık olsun; birden çok seçebilirsiniz, seçimler bu tarayıcıda saklanır. Gün sayfasındaki SÜZGEÇ satırından istediğiniz an değiştirebilirsiniz. Personel açıkken Geçmiş, arama ve Yürürlük Takvimi yalnızca kamu personeline ilişkin düzenlemeleri gösterir.</p>`;
}
/** Kayıtlarım bölümü: kaydedilen maddeler ve notlar, yedek indirme ve yükleme */
function savedBlock() {
  const all = Object.values(saved()).sort((a, b) => b.ts - a.ts);
  return (all.map(r => `<div class="site-rec"><a href="${dayUrl(r.day)}" data-nav><b>${esc(r.title)}</b><small>${longOf(r.day)}</small></a>${r.note ? `<p class="unote-t">📝 ${esc(r.note)}</p>` : ""}<a href="#" class="site-rec-del" data-rdel="${esc(itemKey(r.day, r.href, r.title))}">Kaldır</a></div>`).join("") ||
    `<p class="hint">Henüz kayıt yok. Bir özet sayfasında maddenin ⭐ Kaydet düğmesine dokunun.</p>`) +
    `<div class="site-rec-acts"><button type="button" class="tur-c" data-backup>⬇️ Yedek indir</button><label class="tur-c">⬆️ Yedek yükle<input type="file" accept="application/json" hidden data-restore></label></div>`;
}
const DR = { open: false, sec: "", opener: null };
const drRow = (href, icon, title, detail, on, attrs = "") =>
  `<a class="dr-row${on ? " on" : ""}" href="${href}"${attrs}><span class="dr-ic">${ic(icon)}</span><span class="dr-tx"><b>${title}</b>${detail ? `<small>${detail}</small>` : ""}</span></a>`;
const drSec = (key, icon, title, detail, body, n) =>
  `<button type="button" class="dr-row dr-toggle${DR.sec === key ? " open" : ""}" data-dsec="${key}" aria-expanded="${DR.sec === key}"><span class="dr-ic">${ic(icon)}</span>` +
  `<span class="dr-tx"><b>${title}</b><small>${detail}</small></span>${n ? `<span class="dr-n">${n}</span>` : ""}<span class="dr-ch">${ic("chev")}</span></button>` +
  (DR.sec === key ? `<div class="dr-sec">${body}</div>` : "");

function drawerBody() {
  const q = new URLSearchParams(location.search);
  const page = ["mevzuat", "gecmis", "ara", "takvim", "bulten", "hakkinda", "radar"].find(k => q.has(k)) || "";
  const nSaved = Object.keys(saved()).length, keys = prefKeys();
  const radar = [...watchWords(), ...followed().map(x => agencyLabel(x[0], x[1])), ...savedSearches()];
  const filt = keys.length ? FILTERS.filter(f => keys.includes(f.key)).map(f => f.chip).join(", ") : "Özetler bütün maddelerle açılır";
  const tName = { sistem: "Sistem", acik: "Açık", koyu: "Koyu" }[theme()] || "Sistem";
  const fName = (FONTS.find(x => x[0] === pref("yazi", "1")) || FONTS[1])[1].toLowerCase();
  return drRow("./", "doc", "Bugünün özeti", "En güncel günün özeti", !page, " data-nav") +
    drRow("?mevzuat", "book", "Mevzuat", "Kurumlara göre düzenlemeler", page === "mevzuat", " data-nav") +
    drRow("?gecmis", "history", "Geçmiş", "Arşivde ara, eski günleri aç", page === "gecmis" || page === "ara", " data-nav") +
    drRow("?takvim", "cal", "Yürürlük takvimi", "Yaklaşan yürürlük tarihleri", page === "takvim", " data-nav") +
    drRow("?bulten=7", "pie", "Haftalık &amp; Aylık Bülten", "Personel mevzuatı, öne çıkanlar, atamalar", page === "bulten", " data-nav") +
    drSec("kayit", "star", "Kaydedilenler", nSaved ? `${nSaved} madde` : "Kaydettiğiniz maddeler, notlar ve yedek", savedBlock(), nSaved) +
    `<div class="dr-lbl">ARAÇLAR</div>` +
    `<a class="dr-row${page === "radar" ? " on" : ""}" href="?radar" data-nav><span class="dr-ic">${ic("radar")}</span><span class="dr-tx"><b>Bildirim Radarı</b>` +
    `<small>${radar.length ? esc(radar.slice(0, 3).join(", ")) + (radar.length > 3 ? "…" : "") : "Kelime, kurum ya da arama takip et"}</small></span>` +
    (radar.length ? `<span class="dr-n">${radar.length}</span>` : "") + `</a>` +
    drSec("gorunum", "contrast", "Görünüm", `${tName} tema · yazı boyutu: ${fName}`, themeBlock()) +
    drSec("suzgec", "filter", "Süzgeçler", esc(filt), filterBlock()) +
    `<div class="dr-line"></div>` +
    drRow("#", "share", "Siteyi paylaş", "Arkadaşlarınla paylaş", false, " data-dshare") +
    `<p class="dr-foot">Web sitesi · © 2026</p>`;
}

function renderDrawer() {
  const el = document.getElementById("site-drawer");
  if (!el) return;
  const panel = el.querySelector(".dr-panel");
  const old = panel.querySelector(".dr-body");
  const y = old ? old.scrollTop : 0;
  const focus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.dsec : "";
  panel.innerHTML = `<div class="dr-head"><img src="icon.png" alt="" width="46" height="46"><div><small>RESMÎ GAZETE</small><b>Günlük Resmî Gazete ve Mevzuat Özeti</b></div>` +
    `<button type="button" class="dr-x" data-dclose aria-label="Menüyü kapat">${ic("close")}</button>` +
    `<p>${INDEX ? `${sayi(INDEX.tarihler.length)} günün özeti · son: ${longOf(INDEX.guncel)}` : "Resmî Gazete'nin günlük özeti"}</p></div>` +
    `<div class="dr-body">${drawerBody()}</div>`;
  panel.querySelector(".dr-body").scrollTop = y;
  if (focus) { const b = panel.querySelector(`[data-dsec="${focus}"]`); if (b) b.focus(); }
}

const drBackground = () => [...document.body.children].filter(n => n.id !== "site-drawer" && !["SCRIPT", "NOSCRIPT"].includes(n.tagName));

function drawerEl() {
  let el = document.getElementById("site-drawer");
  if (el) return el;
  el = document.createElement("div");
  el.id = "site-drawer";
  el.className = "site-drawer";
  el.hidden = true;
  el.innerHTML = `<div class="dr-scrim" data-dclose></div><aside class="dr-panel" role="dialog" aria-modal="true" aria-label="Menü"></aside>`;
  document.body.append(el);
  el.addEventListener("click", onDrawerClick);
  el.addEventListener("change", async e => {
    if (!e.target.matches("[data-restore]")) return;
    try {
      const j = JSON.parse(await e.target.files[0].text());
      if (j.kayit && typeof j.kayit === "object") setSaved({ ...saved(), ...j.kayit });
      if (Array.isArray(j.takip)) setWatch(parseWords([...watchWords(), ...j.takip]));
      if (Array.isArray(j.aramalar)) setSearches([...savedSearches(), ...j.aramalar]);
      if (Array.isArray(j.kurumlar)) setFollowed([...followed(), ...j.kurumlar.filter(x => Array.isArray(x) && mevOk(x[0]))]);
      toast("Yedek yüklendi"); renderDrawer();
    } catch (x) { toast("Yedek dosyası okunamadı"); }
  });
  return el;
}

function onDrawerClick(e) {
  const t = e.target;
  if (t.closest("[data-dclose]")) { e.preventDefault(); closeDrawer(); return; }
  const sec = t.closest("[data-dsec]");
  if (sec) { DR.sec = DR.sec === sec.dataset.dsec ? "" : sec.dataset.dsec; renderDrawer(); return; }
  // Sayfa bağlantıları: menü kapanır, yönlendirmeyi genel "data-nav" işleyicisi yapar
  if (t.closest("a[data-nav]")) { closeDrawer(); return; }
  const tema = t.closest("[data-tema]");
  if (tema) { e.preventDefault(); setTheme(tema.dataset.tema); renderDrawer(); return; }
  const yazi = t.closest("[data-yazi]");
  if (yazi) { e.preventDefault(); setPref("yazi", yazi.dataset.yazi); applyFont(); renderDrawer(); return; }
  const flt = t.closest("[data-flt]");
  if (flt) {
    e.preventDefault();
    const key = flt.dataset.flt, cur = prefKeys();
    const next = !key ? [] : cur.includes(key) ? cur.filter(x => x !== key) : [...cur, key];
    setPref("suzgec", next.join(","));
    setPref("personel", next.includes("pers") ? "1" : "0");
    renderDrawer();
    return;
  }
  const rdel = t.closest("[data-rdel]");
  if (rdel) { e.preventDefault(); const all = saved(); delete all[rdel.dataset.rdel]; setSaved(all); renderDrawer(); return; }
  if (t.closest("[data-backup]")) {
    const blob = new Blob([JSON.stringify({ surum: 2, kayit: saved(), takip: watchWords(), aramalar: savedSearches(), kurumlar: followed(), meslek: pref("meslek", "") }, null, 1)], { type: "application/json" });
    const url = URL.createObjectURL(blob), dl = document.createElement("a");
    dl.href = url; dl.download = "resmi-gazete-web-yedek.json"; document.body.append(dl); dl.click(); dl.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }
  if (t.closest("[data-dshare]")) { e.preventDefault(); shareSite(); }
}

function openDrawer(sec) {
  if (sec !== undefined) DR.sec = sec;
  const el = drawerEl();
  DR.open = true;
  DR.opener = document.activeElement;
  renderDrawer();
  el.hidden = false;
  drBackground().forEach(n => { n.inert = true; });
  document.body.classList.add("dr-open");
  const btn = document.getElementById("menu-btn");
  if (btn) btn.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("on")));
  const x = el.querySelector(".dr-x");
  if (x) x.focus();
}
function closeDrawer() {
  const el = document.getElementById("site-drawer");
  if (!el || !DR.open) return;
  DR.open = false;
  el.classList.remove("on");
  drBackground().forEach(n => { n.inert = false; });
  document.body.classList.remove("dr-open");
  const btn = document.getElementById("menu-btn");
  if (btn) btn.setAttribute("aria-expanded", "false");
  setTimeout(() => { if (!DR.open) el.hidden = true; }, 240);
  if (DR.opener && DR.opener.isConnected && DR.opener.focus) DR.opener.focus();
}
document.getElementById("menu-btn").addEventListener("click", () => (DR.open ? closeDrawer() : openDrawer()));
document.addEventListener("keydown", e => { if (DR.open && e.key === "Escape") closeDrawer(); });
// Sayfadaki "Süzgeçler'i değiştir" gibi bağlantılar menüyü ilgili bölümüyle açar
document.addEventListener("click", e => {
  const b = e.target.closest("[data-panel]");
  if (!b) return;
  e.preventDefault();
  openDrawer(b.dataset.panel);
});

async function shareSite() {
  const url = new URL("./", location.href).href;
  if (navigator.share) { try { await navigator.share({ title: "Günlük Resmî Gazete ve Mevzuat Özeti", url }); } catch (x) { /* vazgeçildi */ } return; }
  try { await navigator.clipboard.writeText(url); toast("Bağlantı kopyalandı"); } catch (x) { prompt("Bağlantı:", url); }
}


// ------------------------------------------------------------------ Yürürlük Takvimi

const TR_AY = Object.fromEntries(AYLAR.map((a, i) => [low(a), i + 1]));
/** "1 Ocak 2027" (ya da metin içinde geçen ilk tarih) → "20270101" */
function parseTrDate(txt) {
  const t = low(txt);
  const n = t.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (n) return `${n[3]}${n[2].padStart(2, "0")}${n[1].padStart(2, "0")}`;
  const m = t.match(/(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)\s+(\d{4})/);
  return m ? `${m[3]}${String(TR_AY[m[2]]).padStart(2, "0")}${m[1].padStart(2, "0")}` : "";
}
const todayKey = () => keyOf(Date.now() + 3 * 3600e3);
const daysBetween = (a, b) => Math.round((tsOf(b) - tsOf(a)) / 864e5);

function icsOf(title, k) {
  const d = n => keyOf(tsOf(k) + n * 864e5);
  const esc2 = t => t.replace(/[\;,]/g, m => "\\" + m);
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Resmi Gazete Ozeti//TR", "BEGIN:VEVENT",
    `UID:${k}-${Math.abs([...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))}@ozetrg`,
    `DTSTAMP:${todayKey()}T000000Z`, `DTSTART;VALUE=DATE:${k}`, `DTEND;VALUE=DATE:${d(1)}`,
    `SUMMARY:${esc2("Yürürlük: " + title)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

async function showCalendar() {
  loading("Yürürlük tarihleri taranıyor…");
  try { await loadIndex(); } catch (e) { return showError(e, showCalendar); }
  const today = todayKey();
  const days = INDEX.tarihler.slice().sort().reverse().slice(0, 60);
  const found = [];
  await Promise.all(days.map(async k => {
    let html;
    try { html = await loadDay(k); } catch (e) { return; }
    const d = parse(html);
    for (const sec of d.sections) if (sec.kind === "mad") for (const g of groupsOf(sec.nodes)) for (const it of g.items) {
      const p = itemParts(it);
      const at = parseTrDate(p.yur);
      if (at && at >= today) found.push({ at, day: k, title: it.title, kind: g.kind, kurum: p.kurum, pers: p.pers || p.aud.length > 0, href: it.href });
    }
  }));
  found.sort((a, b) => a.at.localeCompare(b.at) || a.title.localeCompare(b.title, "tr"));
  const only = pref("personel") === "1";
  const list = only ? found.filter(x => x.pers) : found;
  let s = `<a class="back" href="./" data-nav>${ic("arrow")}Özete dön</a><section class="card hero cal-hero"><div class="kicker">YÜRÜRLÜK TAKVİMİ</div>` +
    `<h1>Yürürlüğe girecek düzenlemeler</h1><div class="sub">Son ${days.length} günün özetlerinde yürürlük tarihi ileride olanlar${only ? " · 👤 yalnızca personel" : ""}</div></section>`;
  if (!list.length) s += `<section class="card cal-empty"><div class="big">📅</div><p><b>Yaklaşan yürürlük tarihi yok</b></p><p>Son günlerin özetlerinde ileri tarihli yürürlük bulunmuyor${only ? " (Sadece Personel açık; sol menüdeki Süzgeçler'den kapatabilirsiniz)" : ""}.</p></section>`;
  let month = "";
  for (const x of list) {
    const m = x.at.slice(0, 6);
    if (m !== month) { month = m; s += `<div class="cal-month">${monOf(x.at)} ${x.at.slice(0, 4)}</div>`; }
    const left = daysBetween(today, x.at);
    const due = left === 0 ? `<span class="due now">Bugün</span>` : left === 1 ? `<span class="due now">Yarın</span>` : `<span class="due${left <= 7 ? " soon" : ""}">${left} gün kaldı</span>`;
    s += `<article class="card up k-${x.kind}${x.pers ? " pers" : ""}"><div class="up-date"><span>${mon3(x.at)}</span><b>${dayOf(x.at)}</b><small>${wdOf(x.at).slice(0, 3)}</small></div>` +
      `<div class="up-body"><div class="up-chips">${due}${x.pers ? `<span class="tagp">${ic("person")}Personel</span>` : ""}</div><h4>${esc(x.title)}</h4>` +
      `<div class="up-src">${x.kurum ? esc(x.kurum) + " · " : ""}${longOf(x.day)} sayısı</div><div class="up-acts">` +
      `<a href="${dayUrl(x.day)}" data-nav>${ic("arrow")}Özete git</a><a class="rem" href="#" data-ics="${esc(x.at + "|" + x.title)}">${ic("cal")}Takvime ekle</a></div></div></article>`;
  }
  $app.innerHTML = s;
  $app.querySelectorAll("[data-ics]").forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    const [at, ...rest] = a.dataset.ics.split("|");
    const url = URL.createObjectURL(new Blob([icsOf(rest.join("|"), at)], { type: "text/calendar" }));
    const dl = document.createElement("a");
    dl.href = url; dl.download = `yururluk-${at}.ics`; document.body.append(dl); dl.click(); dl.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast("Takvim dosyası indirildi");
  }));
  setMeta("Yürürlük Takvimi | Resmî Gazete Özeti", "Yürürlüğe girecek düzenlemelerin takvimi.", "?takvim");
}

// ------------------------------------------------------------------ Haftalık ve Aylık Bülten

const KIND_LABEL = { kanun: "Kanunlar", yon: "Yönetmelikler", teb: "Tebliğler", karar: "Kararlar", ata: "Atamalar", gen: "Genelgeler", yargi: "Yargı", ilan: "İlanlar", diger: "Diğer" };

async function showBulletin(period) {
  const n = period === 30 ? 30 : 7;
  loading("Bülten hazırlanıyor…");
  try { await loadIndex(); } catch (e) { return showError(e, () => showBulletin(n)); }
  const today = todayKey();
  const from = keyOf(tsOf(today) - (n - 1) * 864e5);
  const days = INDEX.tarihler.filter(k => k >= from && k <= today).sort().reverse();
  const kinds = {}, agencies = {}, pers = [], top = [], highlights = [];
  let regs = 0, ataN = 0;
  await Promise.all(days.map(async k => {
    let html; try { html = await loadDay(k); } catch (e) { return; }
    const d = parse(html);
    for (const sec of d.sections) {
      if (sec.kind === "mad") for (const g of groupsOf(sec.nodes)) for (const it of g.items) {
        regs++; kinds[g.kind] = (kinds[g.kind] || 0) + 1;
        const p = itemParts(it);
        if (p.kurum) agencies[p.kurum] = (agencies[p.kurum] || 0) + 1;
        if (p.pers || p.aud.length) pers.push({ day: k, title: it.title, kurum: p.kurum, aud: p.aud });
      } else if (sec.kind === "one") {
        for (const ul of sec.nodes.filter(el => ["ul", "ol"].includes(tag(el)))) for (const li of ul.children) highlights.push({ day: k, html: inl(li) });
      } else if (sec.kind === "ata") {
        for (const r of appointmentRows(sec.nodes)) { ataN++; if (isSenior(r.position)) top.push({ day: k, position: r.position, nw: r.nw.split("(")[0].trim() }); }
      }
    }
  }));
  const sortByDay = (a, b) => b.day.localeCompare(a.day);
  pers.sort(sortByDay); top.sort(sortByDay); highlights.sort(sortByDay);
  const kList = Object.entries(kinds).sort((a, b) => b[1] - a[1]);
  const aList = Object.entries(agencies).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const dark = isDark() ? 1 : 0;
  const bar = (label, v, max, color) => `<div class="site-bar"><span>${esc(label)}</span><i><s style="width:${Math.max(4, v / max * 100).toFixed(1)}%;background:${color}"></s></i><b>${v}</b></div>`;
  let s = `<a class="back" href="./" data-nav>${ic("arrow")}Özete dön</a><section class="card hero"><div class="kicker">${n === 7 ? "HAFTALIK" : "AYLIK"} BÜLTEN</div>` +
    `<h1>Son ${n} gün</h1><div class="sub">${longOf(from)} – ${longOf(today)}</div>` +
    `<div class="lst-chips">${[7, 30].map(x => `<a class="fchip${x === n ? " on" : ""}" href="?bulten=${x}" data-nav>${x === 7 ? "📅 Haftalık" : "🗓️ Aylık"}</a>`).join("")}</div>` +
    stats([{ n: regs, t: "düzenleme", c: "s1", h: "#b-kur" }, { n: pers.length, t: "personel", c: "s4", h: "#b-per" }, { n: highlights.length, t: "öne çıkan", c: "s2", h: "#b-one" }, { n: top.length, t: "üst düzey atama", c: "s3", h: "#b-ata" }]) + `</section>`;
  if (!days.length) s += `<section class="card cal-empty"><div class="big">📰</div><p>Bu dönemde özet bulunamadı.</p></section>`;
  if (kList.length) s += `<section class="card sec"><h2><span class="ic">${ic("pie")}</span>Türlere göre</h2>${kList.map(([k, v]) => bar(KIND_LABEL[k] || k, v, kList[0][1], KIND_COLOR[k][dark])).join("")}</section>`;
  if (aList.length) s += `<section id="b-kur" class="card sec"><h2><span class="ic">${ic("bank")}</span>En çok düzenleme yayımlayan kurumlar</h2>${aList.map(([k, v]) => bar(k, v, aList[0][1], "#1A56C4")).join("")}</section>`;
  if (pers.length) s += `<section id="b-per" class="card sec"><h2><span class="ic">${ic("person")}</span>Kamu personeline ilişkin<span class="cnt">${pers.length}</span></h2><ul class="plain">` +
    pers.slice(0, 15).map(p => `<li><a href="${dayUrl(p.day)}" data-nav><span><b>${esc(p.title)}</b><br><small>${shortOf(p.day)} · ${esc(p.kurum || "")}${p.aud.length ? " · " + esc(p.aud.join(", ")) : ""}</small></span></a></li>`).join("") + `</ul></section>`;
  if (highlights.length) s += `<section id="b-one" class="sec sec-one"><h2 class="free"><span class="ic">${ic("star")}</span>Öne çıkanlar</h2><ol class="hl">` +
    highlights.slice(0, 10).map(h => `<li>${h.html}<a class="hl-go" href="${dayUrl(h.day)}" data-nav>${shortOf(h.day)} · özete git</a></li>`).join("") + `</ol></section>`;
  if (top.length) s += `<section id="b-ata" class="card sec sec-ata"><h2><span class="ic">${ic("group")}</span>Üst düzey atamalar<span class="cnt">${top.length}</span></h2><div class="ata-list">` +
    top.slice(0, 20).map(t => { const parts = t.position.split(" · "); return `<div class="ata-row top"><div class="ata-pos">${ic("bank")}<span><b>${esc(parts[parts.length - 1])}</b><i class="ata-top">⭐ Üst düzey</i><small>${esc(parts.slice(0, -1).join(" · "))} · ${shortOf(t.day)}</small></span></div><div class="ata-swap"><div class="ata-new"><span class="t">Yeni</span><b>${esc(t.nw || "—")}</b></div></div></div>`; }).join("") + `</div></section>`;
  s += `<button class="site-share" type="button">${ic("share")}Bülteni paylaş</button><button class="site-share alt" type="button" data-bpdf>${ic("doc")}A4 PDF olarak kaydet</button><p class="note src-note">${ataN} atama kararı satırı, ${days.length} günlük özetten derlendi.</p>`;
  $app.innerHTML = s;
  $app.querySelector("[data-bpdf]").addEventListener("click", () => {
    document.body.classList.add("printing-page");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-page"), 500);
  });
  $app.querySelector(".site-share").addEventListener("click", async () => {
    const text = `📊 Resmî Gazete ${n === 7 ? "Haftalık" : "Aylık"} Bülten (${longOf(from)} – ${longOf(today)})\n${regs} düzenleme · ${pers.length} personel · ${top.length} üst düzey atama\n` +
      aList.slice(0, 5).map(([k, v]) => `• ${k}: ${v}`).join("\n") + `\n${new URL("?bulten=" + n, location.href).href}`;
    if (navigator.share) { try { await navigator.share({ title: "Resmî Gazete Bülteni", text }); } catch (e) { /* vazgeçildi */ } return; }
    try { await navigator.clipboard.writeText(text); toast("Bülten kopyalandı"); } catch (e) { prompt("Bülten:", text); }
  });
  setMeta(`${n === 7 ? "Haftalık" : "Aylık"} Bülten | Resmî Gazete Özeti`, "Son günlerin düzenleme, personel ve atama özeti.", `?bulten=${n}`);
}

// ------------------------------------------------------------------ Mevzuat (uygulamadaki Mevzuat ekranının web hâli)
// Raflar, depodaki mevzuat/ klasöründen okunur (gorev/mevzuat_dizin.py her yayında üretir): raflar.json, yeni.json, r/<kimlik>.json.

const MEV_PAGE = 40;
const MEV = { shelves: null, entries: {} };
let mevClick = null;
const MEV_TYPES = [["yon", "Yönetmelik", "yon"], ["teb", "Tebliğ", "teb"], ["kar", "Karar", "karar"], ["kan", "Kanun", "kanun"], ["khk", "Kararname", "karar"],
  ["yar", "Yargı kararı", "yargi"], ["ata", "Atama", "ata"], ["and", "Andlaşma", "gen"], ["dig", "Diğer", "diger"]];
const MEV_EMOJI = { cb: "🏛️", tbmm: "🗳️", adalet: "⚖️", aile: "👪", calisma: "👷", cevre: "🏗️", disisleri: "🌍", enerji: "⚡", genclik: "🏅", hazine: "💶",
  icisleri: "🚔", kultur: "🎭", meb: "🎓", msb: "🛡️", saglik: "🏥", sanayi: "🏭", tarim: "🌾", ticaret: "🛒", ulastirma: "🚆", epdk: "💡", bddk: "🏦",
  tcmb: "🏦", spk: "📈", sgk: "🤝", yok: "🎓", belediye: "🏙️", meslek: "🧰", andlasma: "🤝", diger: "📁", aym: "⚖️", uni: "🎓" };
const mevEmoji = (id, grup) => MEV_EMOJI[id] || ({ "Yargı": "⚖️", "Üniversiteler": "🎓", "Bakanlıklar": "🏢", "Kurum ve kuruluşlar": "🏢" }[grup] || "📁");
const mevOk = id => /^[a-z0-9_-]{1,40}$/.test(id || "");
/** Düzenlemenin Resmî Gazete'deki adresi (dosyada günün adresinden sonraki bölüm ya da tam adres durur) */
const mevHref = e => /^https?:/.test(e.h || "") ? e.h : `https://www.resmigazete.gov.tr/eskiler/${e.t.slice(0, 4)}/${e.t.slice(4, 6)}/${e.t}${e.h || ""}`;
const mevUrl = (id, tur, q, yil) => `?mevzuat${id ? `=${id}` : ""}${tur ? `&tur=${tur}` : ""}${yil ? `&yil=${yil}` : ""}${q ? `&ara=${encodeURIComponent(q)}` : ""}`;
const mevType = k => MEV_TYPES.find(t => t[0] === k) || MEV_TYPES[MEV_TYPES.length - 1];
/** Kartında "Güncel hâli" (mevzuat.gov.tr araması) çıkan türler */
const MEV_CURRENT = ["yon", "teb", "kan", "khk"];
const shortDay = k => `${dayOf(k)} ${monOf(k).slice(0, 3)} ${k.slice(0, 4)}`;

async function mevEntries(id) {
  if (!MEV.entries[id]) MEV.entries[id] = JSON.parse(await getText(id === "yeni" ? "mevzuat/yeni.json" : `mevzuat/r/${id}.json`, true)).m || [];
  return MEV.entries[id];
}

// ------------------------------------------------------------------ takip: kelimeler, kurumlar, kayıtlı aramalar (Bildirim Radarı)

const RADAR_DAYS = 30;
const RADAR_MAX = 20, AGENCY_MAX = 15, SEARCH_MAX = 10;
const RADAR_SUG = ["Memur maaşı", "Ek ders", "Asgari ücret", "KPSS", "Görevde yükselme", "Sözleşmeli personel", "Emeklilik", "Tayin", "Sınav",
  "Disiplin", "Öğretmen", "Tarımsal destek", "Harç", "Vergi", "Kira", "Burs"];
const PROFESSIONS = [
  ["memur", "🏢", "Kamu personeli", ["Memur maaşı", "Görevde yükselme", "Unvan değişikliği", "Yan ödeme", "Disiplin", "Tayin", "İzin", "Emeklilik"], ["calisma", "hazine", "sgk"]],
  ["ogretmen", "🍎", "Öğretmen", ["Öğretmen", "Ek ders", "Norm kadro", "Sözleşmeli öğretmen", "Rotasyon", "Okul", "Millî Eğitim"], ["meb"]],
  ["ziraat", "🌾", "Ziraat mühendisi", ["Tarım", "Ziraat", "Tarımsal destek", "Hayvancılık", "Gıda", "Orman", "Kırsal kalkınma", "DSİ"], ["tarim"]],
  ["saglik", "🩺", "Sağlık çalışanı", ["Sağlık personeli", "Hemşire", "Hekim", "Nöbet", "Döner sermaye", "Hastane", "Eczacı", "İlaç"], ["saglik", "titck"]],
  ["guvenlik", "👮", "Polis / güvenlik", ["Polis", "Emniyet", "Jandarma", "Bekçi", "Güvenlik", "Silah"], ["icisleri"]],
  ["akademik", "🎓", "Akademisyen", ["Öğretim üyesi", "Doçentlik", "Araştırma görevlisi", "Lisansüstü", "Üniversite"], ["yok", "uni"]],
  ["hukuk", "⚖️", "Hukukçu", ["Avukat", "Hâkim", "Savcı", "Noter", "Arabulucu", "Bilirkişi", "İcra"], ["adalet", "hsk"]],
  ["isveren", "🏪", "İşveren / esnaf", ["Asgari ücret", "Vergi", "KDV", "Prim", "Teşvik", "Esnaf", "Harç"], ["hazine", "ticaret", "sgk"]],
  ["muhendis", "🏗️", "Mühendis / teknik", ["Mühendis", "İmar", "Yapı denetimi", "İhale", "Enerji", "Elektrik"], ["cevre", "enerji", "kik"]],
  ["emekli", "🧓", "Emekli", ["Emekli aylığı", "Bayram ikramiyesi", "Emeklilik", "Engelli", "Sosyal yardım"], ["sgk", "aile"]],
];
const FOLLOW_SHORT = { sgk: "SGK", hazine: "Hazine ve Maliye", meb: "Millî Eğitim", calisma: "Çalışma Bakanlığı", saglik: "Sağlık Bakanlığı",
  tarim: "Tarım ve Orman", icisleri: "İçişleri", ticaret: "Ticaret", yok: "YÖK", adalet: "Adalet", cevre: "Çevre ve Şehircilik", aile: "Aile Bakanlığı",
  titck: "TİTCK", hsk: "HSK", uni: "Üniversiteler", enerji: "Enerji", kik: "Kamu İhale", cb: "Cumhurbaşkanlığı", msb: "Millî Savunma" };
const agencyLabel = (id, name) => FOLLOW_SHORT[id] || String(name || id).replace(/\s*\(.*$/, "");

/** Kelimeleri ayırır (virgül, noktalı virgül, satır sonu); en az 2 harf, Türkçe harf farkı gözetmeden tekrarsız, en çok RADAR_MAX */
function parseWords(list) {
  const seen = new Set(), out = [];
  for (const raw of list) {
    for (const part of String(raw).split(/[,;\n|]/)) {
      const w = part.trim().replace(/\s+/g, " ").slice(0, 40);
      if (w.length < 2 || seen.has(fold(w))) continue;
      seen.add(fold(w)); out.push(w);
    }
  }
  return out.slice(0, RADAR_MAX);
}
const savedSearches = () => pref("aramalar", "").split("|").map(x => x.trim()).filter(Boolean);
function setSearches(list) {
  const seen = new Set(), out = [];
  for (const raw of list) {
    const q = String(raw).trim().replace(/\s+/g, " ").slice(0, 60);
    if (q.length < 2 || seen.has(fold(q))) continue;
    seen.add(fold(q)); out.push(q);
  }
  setPref("aramalar", out.slice(0, SEARCH_MAX).join("|"));
}
const followed = () => { try { return (JSON.parse(pref("kurumlar", "[]")) || []).filter(x => Array.isArray(x) && mevOk(x[0])); } catch (e) { return []; } };
const setFollowed = list => { const seen = new Set(); setPref("kurumlar", JSON.stringify(list.filter(x => !seen.has(x[0]) && seen.add(x[0])).slice(0, AGENCY_MAX))); };
/** Kart rozetinde ve Geçmiş'te aranan her şey: takip kelimeleri ve kayıtlı aramalar */
function trackedTerms() {
  const w = watchWords(), seen = new Set(w.map(fold));
  return w.concat(savedSearches().filter(q => !seen.has(fold(q)) && seen.add(fold(q))));
}
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Uygulamadaki kuralla: kelime bir sözcüğün başında geçmeli ("tarım" "tarımsal"ı bulur, "kendisi"nin içindeki "dis"i bulmaz) */
function radarHits(text, words) {
  const t = fold(text);
  return words.filter(w => {
    const n = fold(String(w).trim());
    if (!n) return false;
    try { return new RegExp("(?<![\\p{L}\\p{N}])" + reEsc(n), "u").test(t); } catch (e) { return t.includes(n); }
  });
}
function toggleFollow(id) {
  const cur = followed();
  if (cur.some(x => x[0] === id)) { setFollowed(cur.filter(x => x[0] !== id)); toast("Kurum takibi bırakıldı"); return false; }
  if (cur.length >= AGENCY_MAX) { toast(`En çok ${AGENCY_MAX} kurum takip edilebilir`); return false; }
  const r = MEV.shelves && MEV.shelves.raflar.find(x => x.id === id);
  setFollowed([...cur, [id, r ? r.ad : (FOLLOW_SHORT[id] || id)]]);
  toast("Kurum takipte: " + agencyLabel(id, r && r.ad));
  return true;
}
async function shareText(title, text) {
  if (navigator.share) { try { await navigator.share({ title, text }); } catch (x) { /* vazgeçildi */ } return; }
  try { await navigator.clipboard.writeText(text); toast("Panoya kopyalandı"); } catch (x) { prompt("Metin:", text); }
}
function mevShareText(e, shelfName) {
  const type = mevType(e.k)[1], org = e.a || shelfName || "";
  return `📜 ${e.b}\n🏛️ ${org ? `${org} · ${type}` : type}\n📰 ${longOf(e.t)} tarihli${e.n ? ` ve ${e.n} sayılı` : ""} Resmî Gazete\n` +
    (e.y ? `⏳ Yürürlük: ${e.y}\n` : "") + (e.s ? `\n${e.s}\n` : "") + `\n🔗 ${mevHref(e)}`;
}

// ------------------------------------------------------------------ Mevzuat (uygulamadakinin web uyarlaması; 2.8'de yeniden tasarlandı)

const mvTop = (badge, cls, kicker, title) =>
  `<div class="mv-top"><span class="mv-badge${cls ? ` ${cls}` : ""}">${badge}</span><div class="mv-tt"><div class="kicker">${esc(kicker)}</div><h1>${esc(title)}</h1></div></div>`;
const mvStats = list => `<div class="stats">` + chunk(list.filter(Boolean), 2).map(p => `<div class="pair${p.length === 1 ? " one" : ""}">` +
  p.map(([n, l, c, h]) => `<a class="stat ${c}" href="${h}"${h.startsWith("?") ? " data-nav" : ""}><b${String(n).length > 5 || String(n).includes(" ") ? ` class="sm"` : ""}>${esc(n)}</b><span>${esc(l)}</span></a>`).join("") + `</div>`).join("") + `</div>`;
function chunk(a, n) { const out = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; }
const MV_NOTE = `<p class="note">Raflar, bu sitenin hazırladığı Resmî Gazete özetlerinden derlenir; resmî bir kayıt değildir. Bir düzenlemenin yürürlükteki güncel metni için kartlardaki <b>Güncel hâli</b>ne ya da <a href="https://www.mevzuat.gov.tr/" target="_blank" rel="noopener">mevzuat.gov.tr</a>'ye bakın; esas olan Resmî Gazete'deki metindir.</p>`;

function mvTile(r, fol, today) {
  const fresh = r.son && daysBetween(r.son, today) <= 14;
  return `<a class="mv-tile${fol ? " fol" : ""}" href="?mevzuat=${r.id}" data-nav><span class="e">${mevEmoji(r.id, r.grup)}</span><span class="l">${esc(r.ad)}<small>${sayi(r.say)} düzenleme${r.son ? ` · son ${shortDay(r.son)}` : ""}</small></span>` +
    (fol ? `<span class="mv-bell">${ic("bell")}</span>` : fresh ? `<i class="mv-dot"></i>` : "") + `</a>`;
}
function mvGroups(list, fol, today) {
  let s = "", group = "";
  for (const r of list) {
    if (r.grup !== group) { if (group) s += `</div>`; group = r.grup; s += `<h2 class="free mv-grp">${esc(r.grup)}</h2><div class="mv-grid">`; }
    s += mvTile(r, fol.includes(r.id), today);
  }
  return s + (group ? `</div>` : "");
}

async function showMevzuat(id, tur, q, yil) {
  loading("Mevzuat yükleniyor…");
  try { if (!MEV.shelves) MEV.shelves = JSON.parse(await getText("mevzuat/raflar.json", true)); } catch (e) { return showError(e, () => showMevzuat(id, tur, q, yil)); }
  try { await loadIndex(); } catch (e) { /* gün sayısı notu olmadan da çalışır */ }
  if (!mevOk(id)) id = "";
  const shelf = id && id !== "yeni" ? MEV.shelves.raflar.find(r => r.id === id) : null;
  if (id && id !== "yeni" && !shelf) id = "";
  if (!id) {
    let feed = null;
    try { feed = await mevEntries("yeni"); } catch (e) { /* önizleme olmadan da çalışır */ }
    return mevGrid(q, feed);
  }
  let entries;
  try { entries = await mevEntries(id); } catch (e) { return showError(e, () => showMevzuat(id, tur, q, yil)); }
  mevList(id, shelf, entries, MEV_TYPES.some(t => t[0] === tur) ? tur : "", q, /^\d{4}$/.test(yil || "") ? +yil : 0);
}

/** Raf listesi: kapak (arama, sayaçlar, arşiv), son düzenlemeler, takip edilen kurumlar, en çok düzenleme yapanlar, bütün raflar */
function mevGrid(q, feed) {
  const sh = MEV.shelves, today = todayKey(), fol = followed().map(x => x[0]);
  const total = sh.raflar.reduce((n, r) => n + (r.say || 0), 0);
  const days = INDEX ? INDEX.tarihler.length : 0, all = Math.round((ARSIV_SON - ARSIV_BAS) / 864e5) + 1;
  $app.innerHTML = `<a class="back" href="./" data-nav>${ic("arrow")}Özete dön</a>` +
    `<section class="card hero mv-hero2">` + mvTop(ic("book"), "", "MEVZUAT KÜTÜPHANESİ", "Kurumlara göre düzenlemeler") +
    `<p class="mv-lead">Resmî Gazete'de yayımlanan kanun, yönetmelik, tebliğ ve kararlar kurum kurum raflarda.</p>` +
    `<form class="mv-sbox mv-in" role="search">${ic("search")}<input type="search" id="mv-q" name="ara" placeholder="Kurum ara: tarım, üniversite, SGK…" value="${esc(q)}" autocomplete="off" enterkeyhint="search"></form>` +
    mvStats([[sayi(sh.raflar.length), "kurum rafı", "s1", "#mv-raflar"], [sayi(total), "düzenleme", "s3", "#mv-raflar"],
      feed ? [sayi(feed.filter(e => daysBetween(e.t, today) < 7).length), "son 7 günde", "s2", "?mevzuat=yeni"] : null,
      [sayi(fol.length), "takipte", "s4", "#mv-takip"]]) +
    (days ? `<div class="mv-cov2"><div class="r"><span>🗄️ Arşiv · 2000'den bu yana</span><b>${sayi(days)} / ${sayi(all)} gün</b></div>` +
      `<i class="bar"><i style="width:${Math.min(100, Math.max(1, days / all * 100)).toFixed(1)}%"></i></i><small>Raflar arşivle birlikte büyür; özetler tamamlandıkça eski düzenlemeler de eklenir.</small></div>` : "") +
    `</section><div id="mv-body"></div>` + MV_NOTE;
  const body = document.getElementById("mv-body");
  const draw = text => {
    const words = fold(text).split(/\s+/).filter(Boolean);
    if (words.length) {
      const found = sh.raflar.filter(r => words.every(w => fold(r.ad + " " + r.grup).includes(w)));
      body.innerHTML = `<a class="card mv-arch" href="?ara=${encodeURIComponent(text.trim())}" data-nav>${ic("search")}<span><b>“${esc(text.trim())}” geçen düzenlemeleri bütün arşivde ara</b><small>Kurum adında değil, özetlerin metninde arar</small></span><span class="go">›</span></a>` +
        (found.length ? mvGroups(found, fol, today) : `<section class="card cal-empty"><div class="big">🔎</div><h2>Kurum bulunamadı</h2><p>Aramanıza uyan bir kurum rafı yok. Raflar, özetlerde adı geçen kurumlardan oluşur.</p></section>`);
      return;
    }
    let s = `<h3 class="mv-h">SON DÜZENLEMELER<a href="?mevzuat=yeni" data-nav>Tümü · ${sh.yeni.say} ›</a></h3><section class="card mv-latest">`;
    if (!feed) s += `<p class="hint">Son düzenlemeler yüklenemedi.</p>`;
    else {
      for (const e of feed.slice(0, 4)) {
        const [, ad, cls] = mevType(e.k), org = e.a || (sh.raflar.find(r => r.id === e.r) || {}).ad || "";
        s += `<a class="mv-lrow k-${cls}" href="?gun=${isoOf(e.t)}&madde=${encodeURIComponent(e.b)}" data-nav><span class="d"><b>${dayOf(e.t)}</b>${up(monOf(e.t).slice(0, 3))}</span>` +
          `<span class="t"><b>${esc(e.b)}</b><small>${ad}${org ? ` · ${esc(org)}` : ""}</small></span></a>`;
      }
      const counts = {};
      for (const e of feed) counts[e.k] = (counts[e.k] || 0) + 1;
      s += `<div class="mv-types sm">` + MEV_TYPES.filter(([k]) => counts[k]).map(([k, ad, cls]) => `<a class="mv-chip k-${cls}" href="?mevzuat=yeni&tur=${k}" data-nav>${ad} <b>${counts[k]}</b></a>`).join("") + `</div>`;
    }
    s += `</section>`;
    const folShelves = sh.raflar.filter(r => fol.includes(r.id));
    s += `<h3 class="mv-h" id="mv-takip">TAKİP ETTİĞİN KURUMLAR${folShelves.length ? `<a href="?radar" data-nav>Radar ›</a>` : ""}</h3>`;
    s += folShelves.length ? `<div class="mv-grid">${folShelves.map(r => mvTile(r, true, today)).join("")}</div>`
      : `<a class="card mv-cta" href="?radar" data-nav><span class="e">${ic("bell")}</span><span class="l"><b>Bir kurumu takip et</b><small>Rafını açıp <b>Takip et</b>e dokun; o kurum Resmî Gazete'de bir şey yayımlayınca Bildirim Radarı'nda ve gün sayfasında işaretlenir.</small></span><span class="go">›</span></a>`;
    if (feed && feed.length) {
      const span = daysBetween(feed.reduce((m, e) => e.t < m ? e.t : m, feed[0].t), today) + 1;
      const counts = {};
      for (const e of feed) if (e.r && e.r !== "diger") counts[e.r] = (counts[e.r] || 0) + 1;
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
      if (top.length) {
        const most = top[0][1];
        s += `<h3 class="mv-h">SON ${span} GÜNDE EN ÇOK DÜZENLEME</h3><section class="card mv-top5">` + top.map(([rid, n]) => {
          const r = sh.raflar.find(x => x.id === rid);
          return r ? `<a href="?mevzuat=${rid}" data-nav><span class="e">${mevEmoji(rid, r.grup)}</span><span class="n">${esc(r.ad)}<i class="bar"><i style="width:${Math.max(6, Math.round(n * 100 / most))}%"></i></i></span><b>${n}</b></a>` : "";
        }).join("") + `</section>`;
      }
    }
    s += `<h3 class="mv-h" id="mv-raflar">BÜTÜN RAFLAR<span>${sh.raflar.length}</span></h3>` + mvGroups(sh.raflar, fol, today);
    body.innerHTML = s;
  };
  const input = document.getElementById("mv-q"), form = $app.querySelector(".mv-in");
  let timer = 0;
  const apply = () => { history.replaceState(null, "", mevUrl("", "", input.value.trim())); lastSearch = location.search; draw(input.value); };
  form.addEventListener("submit", e => { e.preventDefault(); clearTimeout(timer); apply(); input.blur(); });
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(apply, 200); });
  draw(q);
  setMeta("Mevzuat: kurumlara göre düzenlemeler | Resmî Gazete Özeti", "Resmî Gazete'de yayımlanan düzenlemeler kurumlara göre: bakanlıklar, kurullar, üniversiteler, yargı. Yönetmelik, tebliğ, karar ve kanun özetleri.", "?mevzuat");
}

/** Bir rafın (ya da "Son düzenlemeler"in) sayfası: kapak (takip, sayaçlar, tür dağılımı), arama, tür ve yıl çipleri, kartlar */
function mevList(id, shelf, entries, tur, q, yil) {
  const feed = id === "yeni";
  const title = feed ? "Son düzenlemeler" : shelf.ad;
  const st = { tur, q, yil, limit: MEV_PAGE };
  const today = todayKey();
  const byType = {};
  for (const e of entries) byType[e.k] = (byType[e.k] || 0) + 1;
  const stats = [[sayi(entries.length), "düzenleme", "s1", "#mv-list"]];
  if (feed) {
    stats.push([sayi(entries.filter(e => daysBetween(e.t, today) < 7).length), "son 7 günde", "s2", "#mv-list"]);
    stats.push([sayi(new Set(entries.map(e => e.r)).size), "kurum", "s3", "#mv-list"]);
  } else {
    stats.push([sayi(entries.filter(e => daysBetween(e.t, today) < 30).length), "son 30 günde", "s2", "#mv-list"]);
    if (shelf.son) stats.push([`${dayOf(shelf.son)} ${monOf(shelf.son).slice(0, 3)}`, "son yayım", "s3", "#mv-list"]);
  }
  stats.push([sayi(entries.filter(e => e.p).length), "personel", "s4", "#mv-list"]);
  const head = () => {
    const on = !feed && followed().some(x => x[0] === id);
    return mvTop(feed ? "🆕" : mevEmoji(id, shelf.grup), "e", feed ? "TÜM KURUMLAR" : up(shelf.grup), title) +
      (feed ? "" : `<div class="mv-acts"><a class="mv-follow${on ? " on" : ""}" href="#" data-follow>${ic("bell")}${on ? "Takip ediliyor ✓" : "Takip et"}</a><a class="mv-act" href="?radar" data-nav>${ic("radar")}Bildirim Radarı</a></div>`) +
      `<form class="mv-sbox mv-in" role="search">${ic("search")}<input type="search" id="mv-q" name="ara" placeholder="${feed ? "Son düzenlemelerde ara…" : "Bu rafta ara…"}" value="${esc(st.q)}" autocomplete="off" enterkeyhint="search"></form>` +
      mvStats(stats) +
      (entries.length ? `<div class="mv-dist" aria-hidden="true">${MEV_TYPES.filter(([k]) => byType[k]).map(([k, , cls]) => `<i class="k-${cls}" style="flex:${byType[k]}"></i>`).join("")}</div>` : "");
  };
  $app.innerHTML = `<a class="back" href="?mevzuat" data-nav>${ic("arrow")}Raflar</a>` +
    `<section class="card hero mv-hero2 shelf" id="mv-head">${head()}</section>` +
    `<div class="mv-types" id="mv-types"></div><div class="mv-years" id="mv-years"></div><div id="mv-list"></div>` + MV_NOTE;
  const matches = (type, year) => {
    const words = fold(st.q).split(/\s+/).filter(Boolean);
    return entries.map((e, i) => [i, e]).filter(([, e]) => (!type || e.k === type) && (!year || +e.t.slice(0, 4) === year) &&
      (!words.length || words.every(w => fold(`${e.b} ${e.s || ""} ${e.a || ""}`).includes(w))));
  };
  const years = [...new Set(entries.map(e => +e.t.slice(0, 4)))].sort((a, b) => b - a);
  const draw = () => {
    const forTypes = matches("", st.yil), counts = {};
    for (const [, e] of forTypes) counts[e.k] = (counts[e.k] || 0) + 1;
    document.getElementById("mv-types").innerHTML =
      `<a class="mv-chip${st.tur ? "" : " on"}" href="#" data-t="">Tümü <b>${forTypes.length}</b></a>` +
      MEV_TYPES.filter(([k]) => counts[k] || k === st.tur).map(([k, ad, cls]) => `<a class="mv-chip k-${cls}${st.tur === k ? " on" : ""}" href="#" data-t="${k}">${ad} <b>${counts[k] || 0}</b></a>`).join("");
    const yb = document.getElementById("mv-years");
    if (!feed && years.length > 1) {
      const fy = {};
      for (const [, e] of matches(st.tur, 0)) fy[+e.t.slice(0, 4)] = (fy[+e.t.slice(0, 4)] || 0) + 1;
      yb.innerHTML = `<a class="${st.yil ? "" : "on"}" href="#" data-y="">Bütün yıllar</a>` +
        years.filter(y => fy[y] || y === st.yil).map(y => `<a class="${st.yil === y ? "on" : ""}" href="#" data-y="${y}">${y} <b>${fy[y] || 0}</b></a>`).join("");
    } else yb.innerHTML = "";
    const list = matches(st.tur, st.yil);
    const box = document.getElementById("mv-list");
    if (!list.length) {
      box.innerHTML = `<section class="card cal-empty"><div class="big">🔎</div><h2>Sonuç yok</h2><p>${entries.length ? "Aramanıza, seçtiğiniz türe ya da yıla uyan düzenleme bulunamadı." : "Bu rafta henüz düzenleme yok."}</p></section>` +
        (st.q ? `<a class="card mv-arch" href="?ara=${encodeURIComponent(st.q)}" data-nav>${ic("search")}<span><b>“${esc(st.q)}” için bütün arşivde ara</b><small>Bütün günlerin özetlerinde arar</small></span><span class="go">›</span></a>` : "");
      return;
    }
    const sv = saved();
    let s = `<p class="mv-count">${list.length} düzenleme</p>`;
    for (const [i, e] of list.slice(0, st.limit)) {
      const [, ad, cls] = mevType(e.k);
      const href = mevHref(e), on = !!sv[itemKey(e.t, href, e.b)];
      s += `<article class="card mv-item k-${cls}"><a class="mv-open" href="?gun=${isoOf(e.t)}&madde=${encodeURIComponent(e.b)}" data-nav><div class="mv-chips"><span class="mv-type">${ad}</span>` +
        (daysBetween(e.t, today) <= 14 ? `<span class="mv-new">Yeni</span>` : "") + (e.p ? `<span class="tagp">${ic("person")}Personel</span>` : "") + `</div><h4>${esc(e.b)}</h4>` +
        (e.s ? `<p class="mv-sum">${esc(e.s)}</p>` : "") +
        `<div class="mv-meta"><span>📰 RG ${shortDay(e.t)}${e.n ? ` · Sayı ${esc(e.n)}` : ""}${e.m ? ` (${esc(e.m)}. mükerrer)` : ""}</span>${e.y ? `<span>⏳ Yürürlük: ${esc(e.y)}</span>` : ""}</div></a>` +
        (e.a ? `<div class="mv-foot">` + (feed && mevOk(e.r) ? `<a class="mv-org" href="?mevzuat=${e.r}" data-nav>${ic("bank")}${esc(e.a)} ›</a>` : `<span class="mv-org">${ic("bank")}${esc(e.a)}</span>`) + `</div>` : "") +
        `<div class="mv-acts2"><a href="?gun=${isoOf(e.t)}&madde=${encodeURIComponent(e.b)}" data-nav>${ic("list")}Özette aç</a>` +
        `<a href="${esc(href)}" target="_blank" rel="noopener">${ic("doc")}Resmî Gazete</a>` +
        (MEV_CURRENT.includes(e.k) ? `<a href="https://www.mevzuat.gov.tr/aramasonuc?AranacakMetin=${encodeURIComponent(currentQuery(e.b))}" target="_blank" rel="noopener">${ic("history")}Güncel hâli</a>` : "") +
        `<a class="st${on ? " on" : ""}" href="#" data-msave="${i}">${ic(on ? "star" : "star-o")}${on ? "Kaydedildi" : "Kaydet"}</a>` +
        `<a href="#" data-mshare="${i}">${ic("share")}Paylaş</a></div></article>`;
    }
    if (list.length > st.limit) s += `<button type="button" class="mv-more" data-more>Daha fazla göster · ${list.length - st.limit} kaldı</button>`;
    box.innerHTML = s;
  };
  const sync = () => { history.replaceState(null, "", mevUrl(id, st.tur, st.q, st.yil)); lastSearch = location.search; };
  const wireSearch = () => {
    const input = document.getElementById("mv-q"), form = $app.querySelector(".mv-in");
    let timer = 0;
    form.addEventListener("submit", e => { e.preventDefault(); clearTimeout(timer); st.q = input.value.trim(); st.limit = MEV_PAGE; sync(); draw(); input.blur(); });
    input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => { st.q = input.value.trim(); st.limit = MEV_PAGE; sync(); draw(); }, 220); });
  };
  wireSearch();
  // Tek işleyici: başka bir rafa geçilince eskisi kaldırılır (yoksa iki işleyici birden çalışırdı)
  if (mevClick) $app.removeEventListener("click", mevClick);
  mevClick = e => {
    if (!document.getElementById("mv-list")) return;
    const chip = e.target.closest("[data-t]");
    if (chip) { e.preventDefault(); st.tur = chip.dataset.t; st.limit = MEV_PAGE; sync(); draw(); return; }
    const yr = e.target.closest("[data-y]");
    if (yr) { e.preventDefault(); st.yil = yr.dataset.y ? +yr.dataset.y : 0; st.limit = MEV_PAGE; sync(); draw(); return; }
    if (e.target.closest("[data-more]")) { st.limit += MEV_PAGE; draw(); return; }
    if (e.target.closest("[data-follow]")) {
      e.preventDefault(); toggleFollow(id);
      document.getElementById("mv-head").innerHTML = head(); wireSearch();
      return;
    }
    const sv = e.target.closest("[data-msave]");
    if (sv) {
      e.preventDefault();
      const en = entries[+sv.dataset.msave];
      if (!en) return;
      const href = mevHref(en), key = itemKey(en.t, href, en.b), all = saved();
      if (all[key]) {
        if (all[key].note && !confirm("Bu maddeye yazdığınız not da silinecek. Kayıttan çıkarılsın mı?")) return;
        delete all[key]; toast("Kayıttan çıkarıldı");
      } else { all[key] = { day: en.t, title: en.b, href, note: "", ts: Date.now() }; toast("Kaydedildi: menüdeki Kaydedilenler'de"); }
      setSaved(all);
      const y = window.scrollY; draw(); window.scrollTo(0, y);
      return;
    }
    const sh = e.target.closest("[data-mshare]");
    if (sh) {
      e.preventDefault();
      const en = entries[+sh.dataset.mshare];
      if (en) shareText(en.b, mevShareText(en, shelf ? shelf.ad : ""));
    }
  };
  $app.addEventListener("click", mevClick);
  draw();
  setMeta(`Mevzuat: ${title} | Resmî Gazete Özeti`, feed ? "Resmî Gazete'de yayımlanan en yeni düzenlemeler, bütün kurumlardan." : `${shelf.ad} tarafından Resmî Gazete'de yayımlanan düzenlemeler: yönetmelik, tebliğ, karar ve kanun özetleri.`, mevUrl(id, "", "", 0));
}

// ------------------------------------------------------------------ Bildirim Radarı sayfası (uygulamadakinin web uyarlaması)

const RADAR = { key: "", hits: null, pick: false };
let radarClick = null;
const kindOfType = t => ({ kan: "kanun", khk: "kanun", kar: "karar", yar: "yargi", yon: "yon", teb: "teb", ata: "ata", ilan: "ilan" }[t] || "diger");

/** Son RADAR_DAYS günde takip kelimeleri ve kayıtlı aramalar (özetlerde) ile takip edilen kurumların (raflarda) eşleşmeleri */
async function radarScan(words, searches, agencies) {
  await loadIndex();
  const today = todayKey();
  const days = INDEX.tarihler.filter(k => { const d = daysBetween(k, today); return d >= 0 && d < RADAR_DAYS; });
  const out = new Map();
  if (words.length || searches.length) {
    const htmls = await Promise.all(days.map(k => loadDay(k).catch(() => null)));
    days.forEach((k, i) => {
      if (!htmls[i]) return;
      for (const sec of parse(htmls[i]).sections) {
        if (sec.kind !== "mad") continue;
        for (const g of groupsOf(sec.nodes)) for (const it of g.items) {
          const text = it.title + " " + it.nodes.map(n => n.textContent).join(" ");
          const w = radarHits(text, words), s = radarHits(text, searches);
          if (!w.length && !s.length) continue;
          const p = itemParts(it);
          out.set(k + "|" + fold(it.title), { day: k, title: it.title, kind: g.kind, pers: p.pers || p.aud.length > 0, words: w, searches: s, agencies: [] });
        }
      }
    });
  }
  for (const [id] of agencies) {
    let list;
    try { list = await mevEntries(id); } catch (e) { continue; }
    for (const e of list) {
      const d = daysBetween(e.t, today);
      if (d < 0 || d >= RADAR_DAYS) continue;
      const key = e.t + "|" + fold(e.b), h = out.get(key);
      if (h) { if (!h.agencies.includes(id)) h.agencies.push(id); }
      else out.set(key, { day: e.t, title: e.b, kind: kindOfType(e.k), pers: !!e.p, words: [], searches: [], agencies: [id] });
    }
  }
  return [...out.values()].sort((a, b) => b.day.localeCompare(a.day));
}

async function showRadar(keep) {
  const words = watchWords(), searches = savedSearches(), agencies = followed(), job = pref("meslek", "");
  const key = JSON.stringify([words, searches, agencies.map(x => x[0]), INDEX && INDEX.guncel]);
  const y = keep ? window.scrollY : 0;
  if (!MEV.shelves) { try { MEV.shelves = JSON.parse(await getText("mevzuat/raflar.json", true)); } catch (e) { /* kurum listesi olmadan da çalışır */ } }
  const tracked = words.length + searches.length + agencies.length;
  if (RADAR.key !== key) { RADAR.hits = tracked ? null : []; }
  radarRender(words, searches, agencies, job);
  if (keep) window.scrollTo(0, y);
  if (RADAR.hits === null) {
    RADAR.key = key;
    let hits = [];
    try { hits = await radarScan(words, searches, agencies); } catch (e) { hits = []; }
    if (RADAR.key !== key || !new URLSearchParams(location.search).has("radar")) return;
    RADAR.hits = hits;
    const yy = window.scrollY;
    radarRender(words, searches, agencies, job);
    window.scrollTo(0, yy);
  }
}

function radarRender(words, searches, agencies, job) {
  const hits = RADAR.hits, days = RADAR_DAYS;
  const cnt = f => hits ? hits.filter(f).length : 0;
  const counts = Object.fromEntries(words.map(w => [w, cnt(h => h.words.includes(w))]));
  const sCounts = Object.fromEntries(searches.map(q => [q, cnt(h => h.searches.includes(q))]));
  const aCounts = Object.fromEntries(agencies.map(([id]) => [id, cnt(h => h.agencies.includes(id))]));
  const topW = Object.entries(counts).filter(x => x[1]).sort((a, b) => b[1] - a[1])[0];
  const topA = Object.entries(aCounts).filter(x => x[1]).sort((a, b) => b[1] - a[1])[0];
  const top = topW && (!topA || topW[1] >= topA[1]) ? "#" + topW[0] : topA ? agencyLabel(topA[0], (agencies.find(x => x[0] === topA[0]) || [])[1]) : "—";
  const prof = PROFESSIONS.find(p => p[0] === job);
  const have = new Set(words.map(fold));
  const sug = [...new Set([...(prof ? prof[3] : []), ...RADAR_SUG])].filter(w => !have.has(fold(w))).slice(0, prof ? 12 : 9);
  const folIds = agencies.map(x => x[0]);
  const tracked = words.length + searches.length + agencies.length;
  let s = `<a class="back" href="./" data-nav>${ic("arrow")}Özete dön</a>` +
    `<section class="card hero rd-hero"><div class="rd-top"><span class="rd-ic">#</span><div><div class="kicker">BİLDİRİM RADARI</div><h1>Kelimeni yaz, ben takip edeyim</h1></div></div>` +
    `<p class="rd-lead">Yazdığın kelime, seçtiğin kurum ya da kaydettiğin arama Resmî Gazete'de geçince burada, Geçmiş listesinde ve gün sayfasında <b>🎯 Takibinizde</b> diye işaretlenir.</p>` +
    mvStats([[sayi(tracked), "takipte", "s1", "#rd-words"], [hits ? sayi(hits.length) : "…", `${days} günde eşleşme`, "s2", "#rd-recent"], [top, "en çok geçen", "s3", "#rd-words"]]) + `</section>` +
    `<div class="card rd-warn"><span class="e">🔔</span><span><b>Bildirim Android uygulamasında</b><small>Web sitesi bildirim gönderemez. Aynı takip listesi uygulamada, yeni sayı çıkınca bildirimle haber verir.</small></span></div>`;
  // Ekleme formu, meslek ve öneriler
  s += `<section class="card rd-add">` + (words.length >= RADAR_MAX ? `<p class="rd-full">En çok ${RADAR_MAX} kelime takip edilebilir. Yeni kelime için aşağıdan birini kaldırın.</p>` :
    `<form class="rd-form" data-radd><label class="rd-in"><span>#</span><input name="k" type="text" maxlength="120" autocomplete="off" enterkeyhint="done" placeholder="kelime ya da meslek yaz"></label><button type="submit">＋ Ekle</button></form>`) +
    `<p class="rd-hint">Virgülle birden çok kelime yazabilirsin. Kelimenin başı yeter: "tarım" "tarımsal"ı da bulur; büyük-küçük harf ve ı/i farkı önemsizdir. En çok ${RADAR_MAX} kelime.</p>` +
    `<div class="rd-sl">Mesleğin ne? Dokun, sana uygun kelimeleri ve kurumları önereyim</div><div class="rd-jobs">` +
    PROFESSIONS.map(p => `<a class="${p[0] === job ? "on" : ""}" href="#" data-job="${p[0] === job ? "" : p[0]}"><i>${p[1]}</i>${esc(p[2])}${p[0] === job ? " ✓" : ""}</a>`).join("") + `</div>`;
  if (sug.length && words.length < RADAR_MAX) {
    s += `<div class="rd-sl">${prof ? esc(prof[2]) + " için öneriler" : "Öneriler"} · dokun, eklensin</div><div class="rd-sugs">` +
      sug.map(w => `<a href="#" data-wadd="${esc(w)}"><i>＋</i>${esc(w)}</a>`).join("");
    const left = prof ? prof[3].filter(w => !have.has(fold(w))) : [];
    if (left.length > 1) s += `<a class="all" href="#" data-wadd="${esc(left.join(", "))}"><i>✓</i>Hepsini ekle</a>`;
    s += `</div>`;
  }
  s += `</section>`;
  // Kurum takibi
  s += `<section class="card rd-box" id="rd-kurum"><div class="rd-bh"><span class="rd-bi">${ic("bank")}</span><div><b>Kurum takibi</b><small>Seçtiğin kurum Resmî Gazete'de bir şey yayımlarsa işaretlerim.</small></div></div>`;
  if (agencies.length) {
    s += `<div class="rd-kf">` + agencies.map(([id, name]) => `<span class="rd-kc"><b>${esc(agencyLabel(id, name))}</b>${hits ? `<em>${aCounts[id]}</em>` : ""}<a href="#" data-kdel="${id}" aria-label="Takibi bırak">✕</a></span>`).join("") + `</div>` +
      (hits ? `<p class="rd-sm">Sayılar: son ${days} günde yayımladıkları düzenleme.</p>` : "");
  }
  if (agencies.length < AGENCY_MAX) {
    const quick = [...new Set([...(prof ? prof[4] : []), ...Object.keys(FOLLOW_SHORT).slice(0, 10)])].filter(id => !folIds.includes(id)).slice(0, 10);
    if (quick.length) s += `<div class="rd-kq">` + quick.map(id => `<a href="#" data-kadd="${id}">${esc(FOLLOW_SHORT[id] || id)}</a>`).join("") + `</div>`;
    s += `<a class="rd-more" href="#" data-kpick>${RADAR.pick ? "▲ Kurum listesini kapat" : "＋ Başka kurum seç"}</a>`;
    if (RADAR.pick && MEV.shelves) {
      s += `<div class="rd-kq rd-all">` + MEV.shelves.raflar.filter(r => r.id !== "diger").map(r =>
        `<a href="#" data-${folIds.includes(r.id) ? "kdel" : "kadd"}="${r.id}" class="${folIds.includes(r.id) ? "on" : ""}">${mevEmoji(r.id, r.grup)} ${esc(r.ad)}${folIds.includes(r.id) ? " ✓" : ""}</a>`).join("") + `</div>`;
    }
  }
  s += `</section>`;
  // Kayıtlı aramalar
  s += `<section class="card rd-box" id="rd-arama"><div class="rd-bh"><span class="rd-bi s">${ic("search")}</span><div><b>Kayıtlı aramalar</b><small>Geçmiş'te bir arama yap ve <b>Aramayı kaydet</b>e dokun; uyan yeni düzenleme çıkınca işaretlerim.</small></div></div>` +
    searches.map(q => `<div class="rd-sr"><a class="rd-sq" href="?ara=${encodeURIComponent(q)}" data-nav>${ic("search")}<span><b>${esc(q)}</b><small>${!hits ? "taranıyor…" : sCounts[q] ? `son ${days} günde ${sCounts[q]} maddede` : `son ${days} günde eşleşme yok`}</small></span></a><a class="rd-x" href="#" data-sdel="${esc(q)}" aria-label="Aramayı sil">✕</a></div>`).join("") +
    (searches.length < SEARCH_MAX ? `<a class="rd-more" href="?gecmis" data-nav>🔎 Arşivde ara</a>` : "") + `</section>`;
  // Kelimeler
  s += `<h3 class="rd-h" id="rd-words">TAKİP ETTİĞİN KELİMELER<span>${words.length}</span></h3>`;
  if (!words.length) {
    s += `<section class="card cal-empty"><div class="big">🎯</div><h2>Henüz kelime yok</h2><p>Mesleğini, kurumunu ya da merak ettiğin konuyu yaz: "Ziraat", "Görevde yükselme", "Öğretmen" gibi.</p></section>`;
  } else {
    const most = Math.max(1, ...Object.values(counts));
    words.map((w, i) => [w, i]).sort((a, b) => (counts[b[0]] - counts[a[0]]) || a[1] - b[1]).forEach(([w, i]) => {
      const n = counts[w];
      s += `<div class="card rd-word c${i % 6}"><a class="rd-main" href="?ara=${encodeURIComponent(w)}" data-nav><span class="rd-n">${hits ? n : "…"}</span><span class="rd-t"><b>#${esc(w)}</b><small>` +
        (!hits ? "özetler taranıyor…" : n ? `son ${days} günde ${n} maddede geçti` : `son ${days} günde geçmedi · arşivde aramak için dokun`) +
        `</small><i class="rd-bar"><i style="width:${hits ? Math.min(100, Math.max(n ? 4 : 0, Math.round(n * 100 / most))) : 0}%"></i></i></span></a><a class="rd-x" href="#" data-wdel="${esc(w)}" aria-label="Kelimeyi kaldır">✕</a></div>`;
    });
  }
  // Son eşleşmeler
  if (tracked) {
    s += `<h3 class="rd-h" id="rd-recent">SON EŞLEŞMELER${hits ? `<span>${hits.length}</span>` : ""}</h3>`;
    if (!hits) s += `<section class="card cal-empty"><div class="spin" role="progressbar" aria-label="Taranıyor"></div><p>Son ${days} günün özetleri taranıyor…</p></section>`;
    else if (!hits.length) s += `<section class="card cal-empty"><div class="big">📭</div><p>Son ${days} günde takip ettiklerinle eşleşen düzenleme çıkmadı.</p></section>`;
    else {
      const names = Object.fromEntries(agencies);
      for (const h of hits.slice(0, 20)) {
        s += `<a class="card rd-hit k-${h.kind}" href="?gun=${isoOf(h.day)}&madde=${encodeURIComponent(h.title)}" data-nav><span class="rd-d">${dayOf(h.day)} ${monOf(h.day).slice(0, 3)}</span><span class="rd-hb"><b>${esc(h.title)}</b><span class="rd-ws">` +
          (h.pers ? `<em class="tagp">${ic("person")}Personel</em>` : "") + h.agencies.slice(0, 2).map(a => `<em class="ag">🏛 ${esc(agencyLabel(a, names[a]))}</em>`).join("") +
          h.words.slice(0, 3).map(w => `<em>#${esc(w)}</em>`).join("") + h.searches.slice(0, 2).map(q => `<em class="sq">🔎 ${esc(q)}</em>`).join("") + `</span></span><span class="go">›</span></a>`;
      }
      if (hits.length > 20) s += `<p class="note">ve ${hits.length - 20} eşleşme daha. Bir kelimenin tümünü görmek için kelimeye dokun.</p>`;
    }
  }
  s += `<p class="note">Kelimeler, kurumlar ve aramalar yalnızca bu tarayıcıda saklanır; menüdeki Kaydedilenler'den yedeğini indirebilirsin.</p>`;
  $app.innerHTML = s;
  setMeta("Bildirim Radarı | Resmî Gazete Özeti", "Takip ettiğiniz kelime, kurum ve aramaların Resmî Gazete özetlerinde geçtiği düzenlemeler.", "?radar");
  if (radarClick) $app.removeEventListener("click", radarClick);
  radarClick = e => {
    if (!new URLSearchParams(location.search).has("radar")) return;
    const t = e.target, a = (sel) => t.closest(sel);
    let changed = true;
    if (a("[data-wadd]")) { e.preventDefault(); const add = parseWords([a("[data-wadd]").dataset.wadd]); const cur = watchWords(); const next = parseWords([...cur, ...add]); if (next.length === cur.length) { toast(cur.length >= RADAR_MAX ? `En çok ${RADAR_MAX} kelime` : "Bu kelime zaten takipte"); return; } setWatch(next); }
    else if (a("[data-wdel]")) { e.preventDefault(); const d = fold(a("[data-wdel]").dataset.wdel); setWatch(watchWords().filter(w => fold(w) !== d)); }
    else if (a("[data-job]")) { e.preventDefault(); setPref("meslek", a("[data-job]").dataset.job); }
    else if (a("[data-kadd]")) { e.preventDefault(); toggleFollow(a("[data-kadd]").dataset.kadd); }
    else if (a("[data-kdel]")) { e.preventDefault(); toggleFollow(a("[data-kdel]").dataset.kdel); }
    else if (a("[data-kpick]")) { e.preventDefault(); RADAR.pick = !RADAR.pick; }
    else if (a("[data-sdel]")) { e.preventDefault(); const d = fold(a("[data-sdel]").dataset.sdel); setSearches(savedSearches().filter(q => fold(q) !== d)); }
    else changed = false;
    if (changed) showRadar(true);
  };
  $app.addEventListener("click", radarClick);
  const form = $app.querySelector("[data-radd]");
  if (form) form.addEventListener("submit", e => {
    e.preventDefault();
    const add = parseWords([form.k.value]);
    if (!add.length) { toast("Kelime en az 2 harf olmalı"); return; }
    const cur = watchWords(), next = parseWords([...cur, ...add]);
    if (next.length === cur.length) { toast(cur.length >= RADAR_MAX ? `En çok ${RADAR_MAX} kelime` : "Bu kelime zaten takipte"); return; }
    setWatch(next); toast(`Bildirim Radarı: ${next.length} kelime takipte`); showRadar(true);
  });
}

// ------------------------------------------------------------------ AI'ya Sor ve Bilgi Notu (uygulamadakinin web uyarlaması)

const FILTERS = [
  { key: "pers", chip: "Personel", title: "Sadece Personel", emoji: "👤", color: "#0B6B63" },
  { key: "yon", chip: "Yönetmelik", title: "Sadece Yönetmelikler", emoji: "📘", color: "#1A56C4" },
  { key: "kanun", chip: "Kanun", title: "Sadece Kanunlar", emoji: "📕", color: "#B71C1C" },
  { key: "cbk", chip: "CB Kararnamesi", title: "Sadece CB Kararnameleri", emoji: "🏛️", color: "#4C1D95" },
  { key: "cbkr", chip: "CB Kararı", title: "Sadece CB Kararları", emoji: "🛡️", color: "#6D28D9" },
  { key: "gen", chip: "Genelge", title: "Sadece Genelgeler", emoji: "✉️", color: "#3949AB" },
  { key: "teb", chip: "Tebliğ", title: "Sadece Tebliğler", emoji: "📄", color: "#0F766E" },
  { key: "aym", chip: "AYM Kararı", title: "Sadece AYM Kararları", emoji: "⚖️", color: "#795548" },
  { key: "yargi", chip: "Yargı Kararı", title: "Sadece Yargı Kararları", emoji: "🔨", color: "#5D4037" },
  { key: "ata", chip: "Atama", title: "Sadece Atamalar", emoji: "👔", color: "#C2410C" },
];
/** Grubun süzgeç türü (uygulamadaki filterKey ile aynı kural) */
function filterKeyOf(label, kind) {
  const s = low(label);
  if (kind === "kanun") return s.includes("kararname") ? "cbk" : "kanun";
  if (["yon", "teb", "gen", "ata"].includes(kind)) return kind;
  if (kind === "yargi") return s.includes("anayasa") ? "aym" : "yargi";
  if (kind === "karar") return s.includes("kararname") ? "cbk" : s.includes("cumhurbaşkan") ? "cbkr" : "";
  return "";
}
const prefKeys = () => pref("suzgec", "").split(",").filter(Boolean);

const ASK_GENEL = {
  role: "Sen, Türk idare hukuku ve kamu personel mevzuatı (657 sayılı Devlet Memurları Kanunu, sözleşmeli personel, görevde yükselme ve unvan değişikliği mevzuatı) alanında, bakanlıkların personel genel müdürlüklerinde ve hukuk müşavirliklerinde uzun yıllar çalışmış kıdemli bir mevzuat danışmanısın. Resmî Gazete'de yayımlanan düzenlemelerin kurumlara, kamu görevlilerine ve vatandaşlara etkisini doğru ve anlaşılır biçimde açıklarsın.",
  format: "1. Kısa cevap: 2-3 cümle.\n2. Dayanak: ilgili hükümler ve gerekçe.\n3. Dikkat edilmesi gerekenler: varsa süreler, istisnalar ve belirsiz noktalar.",
};
const ASKS = [
  { key: "durum", label: "👤 Kendi durumumu sor",
    q: "Kadrom/unvanım [...], hizmet sürem [...]. Bu düzenleme beni nasıl etkiler, başvuru veya kazanılmış hakkım var mı?",
    dq: "Kadrom/unvanım [...], hizmet sürem [...]. Bu sayıdaki düzenlemeler beni nasıl etkiler, başvuru veya kazanılmış hakkım var mı?",
    role: "Sen, memurların özlük hakları, atama ve yer değiştirme, görevde yükselme, unvan değişikliği, intibak ve kazanılmış haklar konusunda yıllarca danışmanlık yapmış kıdemli bir kamu personel mevzuatı uzmanısın. Soruyu soran kamu görevlisine, kendi durumuna göre somut ve uygulanabilir bir yanıt verirsin.",
    format: "1. Kısa cevap: düzenleme beni etkiliyor mu (evet / hayır / kısmen) ve neden; 2-3 cümle.\n2. Dayanak: ilgili hükümler (madde, fıkra) ve bu sonuca nasıl varıldığı.\n3. Şartlar ve süreler: başvuru, sınav, intibak ya da itiraz için aranan şartlar ve son tarihler.\n4. Yapmam gerekenler: somut adımlar ve hangi birime başvurulacağı.\n5. Netleşmesi gerekenler: durumuma göre değişebilecek ve kurumuma sormam gereken noktalar." },
  { key: "yazi", label: "📄 Üst yazı / duyuru taslağı",
    q: "Bu düzenlemeyi kurum içi birimlere duyurmak için resmi yazışma kurallarına uygun bir üst yazı taslağı hazırla.",
    dq: "Bu sayıdaki önemli düzenlemeleri kurum içi birimlere duyurmak için resmi yazışma kurallarına uygun bir üst yazı taslağı hazırla.",
    role: "Sen, Resmî Yazışmalarda Uygulanacak Usul ve Esaslar Hakkında Yönetmeliğe hâkim, bir kamu kurumunun personel dairesinde yıllarca resmî yazı ve duyuru hazırlamış deneyimli bir yazı işleri ve mevzuat uzmanısın.",
    format: "Tam bir resmî yazı taslağı hazırla:\n- Başlık: T.C. / [KURUM ADI] / [Birim adı]\n- Sayı: [...] · Konu: en çok 10 kelimelik kısa konu\n- İlgi: düzenlemenin yayımlandığı Resmî Gazete'nin tarihi ve sayısı\n- Metin: düzenlemenin özü, birimlere düşen yükümlülükler ve varsa son tarihler; 2-4 paragraf\n- Kapanış: \"Bilgilerinizi ve gereğini rica ederim.\"\n- İmza bloğu: [Ad SOYAD], [Unvan] · Dağıtım: Gereği: [...] / Bilgi: [...]\nKuruma özgü bilgiler için köşeli parantezli yer tutucular bırak. Taslağın altında, yazı gönderilmeden önce doğrulanması gereken 2-3 noktayı ayrıca listele." },
  { key: "fark", label: "⚖️ Eski ve yeni fark analizi",
    q: "Eski ve yeni hükümler arasındaki farkların uygulamada yaratacağı sonuçları ve dikkat edilmesi gereken noktaları analiz et.",
    dq: "Bu sayıdaki eski ve yeni hükümler arasındaki farkların uygulamada yaratacağı sonuçları ve dikkat edilmesi gereken noktaları analiz et.",
    role: "Sen, mevzuat değişikliklerinin etki analizini yapan, idare hukukunda uzman kıdemli bir hukuk müşavirisin. Değişikliklerin uygulamadaki sonuçlarını, kimin lehine ya da aleyhine olduğunu ve geçiş dönemi sorunlarını ayrıntılı değerlendirirsin.",
    format: "1. Özet: değişikliğin özü; 2-3 cümle.\n2. Karşılaştırma tablosu: Hüküm | Eski hâli | Yeni hâli | Uygulamadaki sonucu | Kimleri etkiler.\n3. Lehe ve aleyhe sonuçlar: kimin lehine, kimin aleyhine.\n4. Geçiş dönemi ve kazanılmış haklar.\n5. Uygulamada dikkat edilecek noktalar ve olası tereddütler." },
  { key: "sure", label: "⏳ Kritik süreler ve eylem planı",
    q: "Bu düzenlemedeki başvuru, itiraz, intibak ve yürürlük sürelerini adım adım yapılacaklar listesi olarak çıkar.",
    dq: "Bu sayıdaki düzenlemelerde yer alan başvuru, itiraz, intibak ve yürürlük sürelerini adım adım yapılacaklar listesi olarak çıkar.",
    role: "Sen, kamu kurumlarının mevzuat değişikliklerine uyum süreçlerini planlayan ve takip eden deneyimli bir kamu yönetimi ve uyum uzmanısın. Süreleri doğru hesaplar, işleri sorumlularıyla birlikte takvime bağlarsın.",
    format: "1. Takvim tablosu: Tarih / son gün | Yapılacak iş | Sorumlu (kurum, birim ya da personel) | Dayanak hüküm. Tarihleri yayım ve yürürlük tarihinden hesapla; hesaplanamayan süreleri açıkça belirt.\n2. Adım adım yapılacaklar: ☐ işaretli kontrol listesi.\n3. Süre kaçırılırsa: doğabilecek sonuçlar ve hak kayıpları." },
  { key: "sade", label: "🗣️ Sade özet (3 madde)",
    q: "Hukuki terim kullanmadan, bu düzenlemenin pratikte neyi değiştirdiğini 3 kısa maddede anlat.",
    dq: "Hukuki terim kullanmadan, bu sayının pratikte neyi değiştirdiğini 3 kısa maddede anlat.",
    role: "Sen, hukuki metinleri hukukçu olmayan herkesin anlayacağı dile çeviren deneyimli bir kamu iletişimi uzmanısın.",
    format: "Tam olarak 3 madde yaz; her madde en çok 2 kısa cümle olsun ve hukuki terim içermesin. Ardından tek cümleyle \"Kimleri ilgilendiriyor?\" sorusunu yanıtla. Gerekirse günlük hayattan kısa bir örnek ver." },
];
const ASK_RULES = [
  "Yanıtını aşağıdaki bilgilere ve yürürlükteki mevzuata dayandır. Bilgilerde bulunmayan bir konuyu kesinmiş gibi yazma; böyle bir noktada \"metinde yer almıyor\" de ve neyin kontrol edilmesi gerektiğini belirt.",
  "Bir hükme dayandığında madde ve fıkra numarasını (biliniyorsa) yaz.",
  "Tarih ve süre hesaplarında Resmî Gazete'deki yayım tarihini ve yürürlük tarihini esas al; hesabını kısaca göster.",
  "Bilgiler, Resmî Gazete metninden yapay zekâ ile hazırlanmış bir özettir; gerektiğinde BAĞLANTI satırındaki asıl metne dayan.",
  "Kesin işlem gerektiren konularda asıl metnin incelenmesini ve gerekirse kurumun hukuk biriminden görüş alınmasını öner.",
  "Türkçe yaz; açık, resmî ve anlaşılır ol. Gereksiz tekrar ve genel geçer uyarılardan kaçın.",
];
const TASK_ITEM = "Aşağıda bir Resmî Gazete düzenlemesinin bilgileri var. Bunları incele ve en alttaki soruyu bu bilgilere dayanarak net, doğru ve anlaşılır biçimde yanıtla.";
const TASK_DAY = "Aşağıda bir Resmî Gazete sayısının özeti ve bu sayıdaki düzenlemelerin bilgileri var. Bunları incele ve en alttaki soruyu bu bilgilere dayanarak net, doğru ve anlaşılır biçimde yanıtla.";
const ASK_OZET = { key: "ozet", label: "📰 Özetini çıkar", q: "", dq: "Bu sayının günlük özetini hazırla.",
  role: "Sen, Resmî Gazete'yi her gün takip ederek kamu kurumları için günlük mevzuat bülteni hazırlayan deneyimli bir mevzuat editörüsün. Önemli olanı ayırt eder, kısa ve doğru yazarsın.",
  format: "1. Günün özeti: 3-5 cümle.\n2. Öne çıkanlar: geniş kesimleri etkileyen 3-6 düzenleme; tutar, oran ve tarih gibi kritik bilgilerle.\n3. Maddeler: bölüm sırasıyla her düzenleme için 1-3 cümle; çıkaran kurum ve yürürlük tarihi.\n4. Personel mevzuatı: kamu personelini ilgilendiren düzenlemeler ve etkileri (yoksa bunu belirt).\n5. Kısa değerlendirme: bu sayının pratikte ne anlama geldiği." };
const TASK_OFFICIAL_DAY = "Aşağıda bir Resmî Gazete sayısının künyesi ve resmî fihrist sayfasının bağlantısı var. Bağlantıdaki fihristi ve düzenlemelerin metinlerini oku ve en alttaki soruyu bu metinlere dayanarak net, doğru ve anlaşılır biçimde yanıtla.";
const OFFICIAL_RULE = "Aşağıda yalnızca sayının künyesi ve resmî fihrist sayfasının bağlantısı var. Bağlantıdaki metinlere erişebiliyorsan oku; erişemediğin düzenlemeyi yalnızca başlığıyla an, \"metne ulaşılamadı\" diye belirt ve içeriğini tahmin etme.";
const AI_CUT = "\n…(metnin devamı kısaltıldı)";

const plainOf = el => { const c = el.cloneNode(true); c.querySelectorAll("br").forEach(b => b.replaceWith("\n")); return c.textContent.replace(/[ \t]+/g, " ").trim(); };
const htmlText = html => { const d = document.createElement("div"); d.innerHTML = html; return plainOf(d); };

/** Maddenin istemdeki düz metni (uygulamadaki promptFor ile aynı sıra) */
function itemText(item, k, d, compact) {
  const p = itemParts(item);
  const sb = [];
  sb.push(compact ? item.title : "KONU: " + item.title);
  if (p.kurum) sb.push("KURUM: " + p.kurum);
  if (p.yur) sb.push("YÜRÜRLÜK: " + p.yur);
  if (!compact) sb.push("DAYANAK: " + longOf(k) + " tarihli" + (d.issue ? ` ve ${d.issue} sayılı` : "") + " Resmî Gazete");
  sb.push("BAĞLANTI: " + item.href);
  if (!compact) p.ekler.forEach(e => sb.push(`EK: ${e.t} – ${e.h}`));
  if (p.pers) sb.push("TÜR: Personel mevzuatı");
  if (p.aud.length) sb.push("İLGİLİ: " + p.aud.join(", "));
  const paras = p.lead.map(plainOf).filter(Boolean);
  if (paras.length) sb.push("\n" + (compact ? "" : "ÖZET\n") + paras.join("\n"));
  p.trans.forEach(t => sb.push(`\nGEÇİŞ HÜKMÜ${compact ? ":" : " VE KAZANILMIŞ HAKLAR\n"} ${htmlText(t)}`));
  const changes = [], lines = [];
  for (const el of p.details) {
    if (tag(el) === "table") {
      const rows = rowsOf(el), head = rows[0].map(c => low(c.textContent.trim()));
      const o = head.findIndex(h => h.startsWith("eski") || h.startsWith("önceki")), n = head.findIndex(h => h.startsWith("yeni"));
      if (o >= 0 && n >= 0) { rows.slice(1).forEach(r => changes.push({ label: (r[0] || {}).textContent || "", old: (r[o] || {}).textContent || "", nw: (r[n] || {}).textContent || "" })); continue; }
      rows.forEach(r => lines.push(r.map(c => c.textContent.trim()).join(" | ")));
    } else if (["ul", "ol"].includes(tag(el))) [...el.children].forEach(li => lines.push(plainOf(li)));
    else lines.push(plainOf(el));
  }
  if (changes.length) {
    if (compact) sb.push("DEĞİŞEN HÜKÜMLER: " + changes.map(c => c.label.trim()).join("; "));
    else { sb.push("\nESKİ – YENİ KARŞILAŞTIRMASI"); changes.forEach((c, i) => sb.push(`${i + 1}. ${c.label.trim()}\n   Eski: ${c.old.trim()}\n   Yeni: ${c.nw.trim()}`)); }
  }
  if (!compact && lines.length) sb.push("\nAYRINTILAR\n" + lines.map(x => "- " + x).join("\n"));
  return sb.join("\n").trim();
}
function dayText(P, compact) {
  const { k, d, groups } = P;
  const sb = [`KÜNYE: ${longOf(k)} tarihli${d.issue ? ` ve ${d.issue} sayılı` : ""} Resmî Gazete`, "BAĞLANTI: " + (d.official || `https://www.resmigazete.gov.tr/eskiler/${k.slice(0, 4)}/${k.slice(4, 6)}/${k}.htm`)];
  for (const sec of d.sections) {
    if (sec.kind !== "ozet" && sec.kind !== "one") continue;
    sb.push("\n" + up(sec.title));
    sec.nodes.forEach(el => { if (["ul", "ol"].includes(tag(el))) [...el.children].forEach(li => sb.push("- " + plainOf(li))); else sb.push(plainOf(el)); });
  }
  sb.push("\nMADDELER");
  let n = 0;
  for (const g of groups) { sb.push("\n" + g.label); for (const it of g.items) sb.push(`\n${++n}. ` + itemText(it, k, d, compact)); }
  return sb.join("\n").trim();
}
function archiveNoteText(P) {
  return P.archive ? `\n\nNOT: Bu bilgiler ${longOf(P.k)} tarihli Resmî Gazete'ye aittir; düzenleme o tarihten sonra değiştirilmiş ya da yürürlükten kaldırılmış olabilir. Yanıtında bugünkü durumunu da belirt; bilmiyorsan bunu açıkça söyle ve güncel metin için mevzuat.gov.tr'ye bakılmasını öner.` : "";
}
/** İstemi birleştirir; sığmazsa yalnızca bilgi bloğu sondan kısalır (rol, kurallar ve soru tam kalır) */
function buildPrompt(P, item, kindKey, question, maxChars) {
  const kind = [ASK_OZET, ...ASKS].find(a => a.key === kindKey) || ASK_GENEL;
  const day = !item;
  const rules = P.official ? ASK_RULES.map((r, i) => i === 3 ? OFFICIAL_RULE : r) : ASK_RULES;
  const head = `${kind.role}\n\nGÖREV\n${P.official ? TASK_OFFICIAL_DAY : day ? TASK_DAY : TASK_ITEM}\n\nKURALLAR\n${rules.map(r => "- " + r).join("\n")}\n\nYANIT BİÇİMİ\n${kind.format}\n\n=== RESMÎ GAZETE BİLGİLERİ ===\n`;
  const tail = `\n=== BİLGİLERİN SONU ===\n\nSORU: ${question.trim()}`;
  const room = maxChars - head.length - tail.length;
  let text = P.official ? `KÜNYE: ${longOf(P.k)} tarihli Resmî Gazete\nBAĞLANTI: ${P.d.official}\n\nFİHRİST: sayfadaki bölümleri, düzenlemelerin başlıklarını ve asıl metinlerinin bağlantılarını bağlantıdan oku.` : (day ? dayText(P, false) : itemText(item, P.k, P.d, false)) + archiveNoteText(P);
  if (day && text.length > room) text = dayText(P, true) + archiveNoteText(P);
  if (text.length > room) {
    const limit = Math.max(0, room - AI_CUT.length), nl = text.lastIndexOf("\n", limit);
    text = text.slice(0, nl > limit * 0.6 ? nl : limit).trimEnd() + AI_CUT;
  }
  return head + text + tail;
}

function closeModal() {
  const m = document.querySelector(".site-modal");
  if (m) m.remove();
  document.body.classList.remove("site-noscroll", "printing-note");
}
function openModal(html, cls = "") {
  closeModal();
  document.body.insertAdjacentHTML("beforeend", `<div class="site-modal ${cls}" role="dialog" aria-modal="true"><div class="site-sheet">${html}</div></div>`);
  document.body.classList.add("site-noscroll");
  const m = document.querySelector(".site-modal");
  m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-close]")) closeModal(); });
  return m;
}
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

function openAsk(P, item) {
  const kinds = P.official ? [ASK_OZET, ...ASKS.filter(a => a.key !== "fark")] : ASKS;
  const m = openModal(`<div class="sheet-grip"></div><h3>✨ AI'ya Sor</h3><p class="sheet-sub">${esc(item ? item.title : `${longOf(P.k)} sayısı`)}</p>` +
    `<div class="site-chips">${kinds.map(a => `<button type="button" class="fchip" data-kind="${a.key}">${a.label}</button>`).join("")}</div>` +
    `<textarea class="site-q" rows="4" placeholder="Sorunuzu yazın ya da yukarıdan bir şablon seçin…"></textarea>` +
    `<div class="sheet-btns"><button type="button" class="sbtn alt" data-act="gpt">ChatGPT'de Aç</button><button type="button" class="sbtn" data-act="share">${navigator.share ? "Diğer AI / Paylaş" : "İstemi kopyala"}</button></div>` +
    `<p class="sheet-note" data-note>🔒 Soru, seçtiğiniz yapay zekâ hizmetine gider; ad ve kimlik bilgisi yazmayın.</p><button type="button" class="sbtn ghost" data-close>Kapat</button>`, "ask");
  let kind = "";
  const q = m.querySelector(".site-q"), note = m.querySelector("[data-note]");
  m.querySelectorAll("[data-kind]").forEach(b => b.addEventListener("click", () => {
    kind = b.dataset.kind === kind ? "" : b.dataset.kind;
    m.querySelectorAll("[data-kind]").forEach(x => x.classList.toggle("on", x.dataset.kind === kind));
    const a = kinds.find(x => x.key === kind);
    q.value = a ? (item ? a.q : a.dq) : "";
    q.focus();
  }));
  const question = () => {
    const v = q.value.trim();
    if (!v) { toast("Önce bir soru seçin ya da yazın"); q.focus(); return null; }
    const hole = v.indexOf("[...]");
    if (hole >= 0) { toast("[...] yerlerini kendi bilginizle doldurun"); q.focus(); q.setSelectionRange(hole, hole + 5); return null; }
    return v;
  };
  m.querySelector('[data-act="gpt"]').addEventListener("click", async () => {
    const v = question(); if (!v) return;
    const full = buildPrompt(P, item, kind, v, 1e9);
    try { await navigator.clipboard.writeText(full); } catch (e) { /* pano yok */ }
    let max = 8000, url = "";
    const enc = t => encodeURIComponent(t);
    let prompt = full, cut = false;
    while (enc(prompt).length > 7000 && max > 1500) { max -= 700; prompt = buildPrompt(P, item, kind, v, max); cut = true; }
    url = "https://chatgpt.com/?q=" + enc(prompt);
    window.open(url, "_blank", "noopener");
    note.textContent = cut ? "✓ İstem uzun olduğu için ChatGPT'ye kısaltılarak gönderildi; tamamı panoda, isterseniz yapıştırın." : "✓ İstem ChatGPT'de açıldı ve panoya da kopyalandı.";
    note.classList.add("ok");
  });
  m.querySelector('[data-act="share"]').addEventListener("click", async () => {
    const v = question(); if (!v) return;
    const full = buildPrompt(P, item, kind, v, 1e9);
    try { await navigator.clipboard.writeText(full); } catch (e) { /* pano yok */ }
    note.textContent = "✓ İstem panoya kopyalandı, seçtiğiniz yapay zekâ uygulamasına yapıştırabilirsiniz.";
    note.classList.add("ok");
    if (navigator.share) { try { await navigator.share({ text: full }); } catch (e) { /* vazgeçildi */ } }
  });
}

/** Bilgi Notu: maddenin tek sayfalık özeti; "Yazdır / PDF" tarayıcının yazdırma penceresinden A4 PDF verir */
function openNote(P, item) {
  const p = itemParts(item), d = P.d;
  const row = (a, b) => b ? `<tr><th>${a}</th><td>${b}</td></tr>` : "";
  const details = p.details.length ? detailsHtml(p.details).html : "";
  const cmp = details.startsWith('<div class="cmp">') ? "" : "";
  void cmp;
  const m = openModal(`<div class="note-doc"><div class="note-top"><b>BİLGİ NOTU</b><span>${longOf(P.k)}${d.issue ? ` · Sayı ${esc(d.issue)}` : ""}</span></div>` +
    `<h2>${esc(item.title)}</h2><table class="note-meta">` +
    row("Kurum", esc(p.kurum)) + row("Yürürlük", esc(p.yur)) + row("Dayanak", `${longOf(P.k)} tarihli${d.issue ? ` ve ${esc(d.issue)} sayılı` : ""} Resmî Gazete`) +
    row("Bağlantı", /^https?:/.test(item.href) ? `<a href="${esc(item.href)}">${esc(item.href)}</a>` : "") + row("İlgili", esc(p.aud.join(", "))) + `</table>` +
    (p.lead.length ? `<h4>Özet</h4>${p.lead.map(block).join("")}` : "") +
    p.trans.map(t => `<div class="note-trans"><b>Geçiş hükmü ve kazanılmış haklar</b>${t}</div>`).join("") +
    (details ? `<h4>Ayrıntılar</h4>${details}` : "") +
    (P.archive ? `<p class="note-warn">Bu not arşiv özetinden derlenmiştir; düzenleme yayımından sonra değiştirilmiş ya da yürürlükten kaldırılmış olabilir.</p>` : "") +
    `<p class="note-foot">Bu not yapay zekâ ile hazırlanan özetten derlenmiştir ve bilgilendirme amaçlıdır; bağlayıcı olan Resmî Gazete'de yayımlanan asıl metindir. Hukuki danışmanlık değildir.</p></div>` +
    `<div class="sheet-btns no-print"><button type="button" class="sbtn" data-act="print">🖨️ Yazdır / PDF</button><button type="button" class="sbtn alt" data-act="copy">Metni kopyala</button></div><button type="button" class="sbtn ghost no-print" data-close>Kapat</button>`, "notemodal");
  m.querySelector('[data-act="print"]').addEventListener("click", () => {
    document.body.classList.add("printing-note");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-note"), 500);
  });
  m.querySelector('[data-act="copy"]').addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(itemText(item, P.k, d, false)); toast("Not metni kopyalandı"); } catch (e) { prompt("Not metni:", itemText(item, P.k, d, false)); }
  });
}

// ------------------------------------------------------------------ hakkında (uygulamadaki Hakkında ile aynı)

function showAbout() {
  const t = theme();
  const link = (href, e, label, attrs = "") =>
    `<a href="${esc(href)}"${attrs}><span class="e">${e}</span><span class="l">${label}</span><span class="go">›</span></a>`;
  $app.innerHTML = `<a class="back" href="./" data-nav>${ic("arrow")}Özete dön</a>` +
    `<section class="card dev"><div class="avatar photo"><img src="gelistirici.jpg" alt="Birol ABANUZOĞLU" width="88" height="88"></div>` +
    `<h1>Birol ABANUZOĞLU</h1><p class="role">Ziraat Mühendisi · Sitenin ve uygulamanın geliştiricisi</p><div class="tags">` +
    ["Kamu Yönetimi", "Mevzuat", "İnsan Kaynakları", "Tarım Ekonomisi", "Dijital Dönüşüm", "Ankara"]
      .map((x, i) => `<span class="${i % 2 ? "tg2" : "tg1"}">${x}</span>`).join("") + `</div></section>` +
    `<section class="why"><div class="why-k">NEDEN BU UYGULAMA?</div><blockquote>“Resmî Gazete’yi okumak işimin bir parçası. ` +
    `Bu uygulamayı, aynı ihtiyacı duyan herkes için o sabah okumasını birkaç dakikaya indirmek üzere yaptım.”</blockquote></section>` +
    `<h2 class="free"><span class="ic how-ic">${ic("bulb")}</span>Nasıl çalışır?</h2><ol class="how">` +
    `<li><b>Gece yarısı alınır.</b> Resmî Gazete her gece 00.00'da yayımlanır. Birkaç dakika sonra sayının tamamı (kanunlar, yönetmelikler, tebliğler, kararlar, atamalar, ilanlar ve varsa mükerrer sayı) <a href="https://www.resmigazete.gov.tr" target="_blank" rel="noopener">resmigazete.gov.tr</a> adresinden alınır.</li>` +
    `<li><b>Sade Türkçeye çevrilir.</b> Yapay zekâ her başlığı okur, kısa ve anlaşılır bir özet yazar; türünü, ilgili kurumu, kimleri ilgilendirdiğini ve yürürlük tarihini ayırır. Öne çıkan düzenlemeler ayrıca işaretlenir.</li>` +
    `<li><b>Eski ve yeni yan yana.</b> Bir yönetmeliği ya da kanunu değiştiren düzenlemelerde eski hüküm ile yeni hüküm yan yana gösterilir, değişen kısımlar vurgulanır.</li>` +
    `<li><b>Atamalar tablo olur.</b> Atama kararlarında kurum, görev, eski ve yeni görevli tek tabloda listelenir; üst düzey görevlerde önceki görevli de araştırılıp yazılır.</li>` +
    `<li><b>Gece yayımlanır.</b> Özet 00.15 civarında bu sitede ve Android uygulamasında yayımlanır; uygulama bildirim gönderir. Bildirim Radarı'ndaki kelimelerin, kurumların ya da kayıtlı aramaların geçtiği maddeler \"🎯 Takibinizde\" diye işaretlenir.</li>` +
    `<li><b>İstediğin gibi oku.</b> Süzgeçlerle yalnızca ilgilendiğin türleri gör, maddeleri kaydet, not ekle, AI'ya sor ya da bilgi notu çıkar. Mevzuat'ta kurumlara göre, Geçmiş'te bütün arşivde ara; yürürlük takvimi ve haftalık/aylık bülten özetlerden kendiliğinden hazırlanır.</li>` +
    `<li><b>Asıl metin bir tık uzakta.</b> Her kartın altındaki <b>Tam metin</b> bağlantısı Resmî Gazete'deki asıl metni açar. Bağlayıcı olan her zaman oradaki metindir.</li>` +
    `<li><b>Hesap yok, izleme yok.</b> Kayıtların, notların ve takip ettiklerin yalnızca bu tarayıcıda tutulur; menüden yedeğini indirip başka cihaza taşıyabilirsin. Site çerez ve ziyaretçi takibi kullanmaz.</li>` +
    `</ol>` +
    `<div class="trans-box ab-warn">${ic("warn")}<div>Resmî bir kamu sitesi değildir. Özetler bilgilendirme amaçlıdır; ` +
    `bağlayıcı olan, Resmî Gazete'de yayımlanan asıl metindir.</div></div>` +
    `<section class="card links">` +
    link("#", "📤", "Siteyi arkadaşlarınla paylaş", ` data-paylas`) +
    link("https://www.linkedin.com/in/birolabanuzoglu", "💼", "LinkedIn: linkedin.com/in/birolabanuzoglu", ` target="_blank" rel="noopener"`) +
    link("mailto:birolabanuzoglu@gmail.com?subject=Resm%C3%AE%20Gazete%20%C3%96zeti%20Geri%20Bildirim", "✉️", "Bana yazın: birolabanuzoglu@gmail.com") +
    link("https://github.com/birolabanuzoglu/resmi-gazete-ozet/blob/main/GIZLILIK.md", "🛡️", "Gizlilik ve KVKK", ` target="_blank" rel="noopener"`) +
    link("https://github.com/birolabanuzoglu/resmi-gazete-ozet#telif-ve-kullan%C4%B1m", "©️", "Telif ve kullanım", ` target="_blank" rel="noopener"`) +
    `</section><p class="note ab-foot">Web sitesi · © 2026 · Simgeler: Material Icons (Apache 2.0)</p>`;
  $app.querySelector("[data-paylas]").addEventListener("click", e => { e.preventDefault(); shareSite(); });
  setMeta("Hakkında | Resmî Gazete Özeti", "Bu siteyi kim, neden ve nasıl hazırlıyor.", "?hakkinda");
}

// ------------------------------------------------------------------ sayfa içi arama (uygulamadaki "Ara")

let findState = { hits: [], cur: -1 };
function closeFind() {
  const bar = document.querySelector(".site-find");
  if (bar) bar.remove();
  clearFindMarks();
}
function clearFindMarks() {
  $app.querySelectorAll("mark.pg").forEach(m => { m.replaceWith(document.createTextNode(m.textContent)); });
  $app.normalize();
  findState = { hits: [], cur: -1 };
}
function openFind() {
  if (document.querySelector(".site-find")) { document.querySelector(".site-find input").focus(); return; }
  document.querySelector("header.site-top").insertAdjacentHTML("afterend", `<div class="site-find"><div class="sf-box">${ic("search")}<input type="search" placeholder="Bu sayfada ara…" autocomplete="off" enterkeyhint="search"><span class="sf-cnt"></span><button type="button" class="sf-x" aria-label="Temizle" hidden>${ic("close")}</button></div><button type="button" class="sf-b" data-prev aria-label="Önceki">${ic("expand").replace("<svg", '<svg style="transform:rotate(180deg)"')}</button><button type="button" class="sf-b" data-next aria-label="Sonraki">${ic("expand")}</button><button type="button" class="sf-b" data-close aria-label="Kapat">${ic("close")}</button></div>`);
  const bar = document.querySelector(".site-find"), input = bar.querySelector("input"), cnt = bar.querySelector(".sf-cnt"), clr = bar.querySelector(".sf-x");
  const go = d => {
    if (!findState.hits.length) return;
    findState.cur = (findState.cur + d + findState.hits.length) % findState.hits.length;
    findState.hits.forEach((m, i) => m.classList.toggle("cur", i === findState.cur));
    const m = findState.hits[findState.cur];
    const det = m.closest("details"); if (det) det.open = true;
    m.scrollIntoView({ block: "center", behavior: "smooth" });
    cnt.textContent = `${findState.cur + 1}/${findState.hits.length}`;
  };
  const run = () => {
    clearFindMarks();
    const q = input.value.trim();
    clr.hidden = !q;
    if (!q) { cnt.textContent = ""; return; }
    const words = q.split(/\s+/).map(trPattern).join("[^\\p{L}\\p{N}]+");
    const re = new RegExp(words, "giu");
    const walker = document.createTreeWalker($app, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest("svg,script,style,.site-find") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue; re.lastIndex = 0;
      if (!re.test(text)) continue;
      re.lastIndex = 0;
      const frag = document.createDocumentFragment(); let last = 0, mm;
      while ((mm = re.exec(text))) {
        if (!mm[0]) { re.lastIndex++; continue; }
        frag.append(text.slice(last, mm.index));
        const mk = document.createElement("mark"); mk.className = "pg"; mk.textContent = mm[0]; frag.append(mk);
        last = mm.index + mm[0].length;
      }
      frag.append(text.slice(last)); node.replaceWith(frag);
    }
    findState.hits = [...$app.querySelectorAll("mark.pg")]; findState.cur = -1;
    if (!findState.hits.length) { cnt.textContent = "Yok"; return; }
    go(1);
  };
  let t = 0;
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(run, 180); });
  input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); if (e.shiftKey) go(-1); else go(1); } if (e.key === "Escape") closeFind(); });
  clr.addEventListener("click", () => { input.value = ""; run(); input.focus(); });
  bar.querySelector("[data-next]").addEventListener("click", () => go(1));
  bar.querySelector("[data-prev]").addEventListener("click", () => go(-1));
  bar.querySelector("[data-close]").addEventListener("click", closeFind);
  input.focus();
}
document.addEventListener("click", e => {
  const a = e.target.closest("#ara-btn");
  if (!a) return;
  // Mevzuat sayfasındayken "Ara" o sayfanın kendi arama kutusuna gider
  const mv = document.getElementById("mv-q");
  if (mv) { e.preventDefault(); e.stopPropagation(); mv.focus(); return; }
  // Özet sayfasındayken "Ara" sayfa içinde arar; diğer ekranlarda tüm özetlerde aranır
  if (document.querySelector("#app .hero") && CURP && new URLSearchParams(location.search).has("gun") || (document.querySelector("#app .hero") && CURP && !location.search)) {
    e.preventDefault(); e.stopPropagation(); openFind();
  }
}, true);

// ------------------------------------------------------------------ genel

function loading(text) {
  $app.innerHTML = `<div class="ld"><i></i>${esc(text)}</div>`;
}
function showError(e, retry) {
  $app.innerHTML = `<section class="card hero"><div class="empty"><b>Özetlere ulaşılamadı</b><p>İnternet bağlantınızı kontrol edip yeniden deneyin.</p>` +
    `<button class="retry" type="button">Yeniden dene</button><p class="err">${esc(e && e.message || e)}</p></div></section>`;
  $app.querySelector(".retry").addEventListener("click", retry);
}
let toastTimer = 0;
function toast(text) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.append(t); }
  t.textContent = text;
  t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("on"), 2200);
}

/**
 * Sayfadaki bir başlığa (ör. Geçmiş'te "#y-2022") atlar. Geçmiş'in ay blokları ekrana gelene kadar tahmini boyla
 * tutulur (content-visibility:auto); yumuşak kaydırma yol üstündeki aylar gerçek boyuna büyürken eski hedefte
 * durduğu için 2022'ye basınca 2026'da kalınıyordu. Burada anında atlanır ve yerleşim oturdukça konum düzeltilir.
 */
function jumpTo(id) {
  const el = document.getElementById(id);
  if (!el) return false;
  // Atlamadan önce Geçmiş listesinin bütün ayları gerçek boyuyla çizilir; tahmini boylar kalırsa hedef kayar
  const days = el.closest("#days");
  if (days && !days.classList.contains("full")) { days.classList.add("full"); void days.offsetHeight; }
  const jump = () => el.scrollIntoView({ behavior: "instant", block: "start" });
  jump();
  requestAnimationFrame(() => { jump(); setTimeout(jump, 150); });
  return true;
}

let lastSearch = null;
async function route() {
  lastSearch = location.search;
  closeFind();
  if (window.speechSynthesis) speechSynthesis.cancel();
  const q = new URLSearchParams(location.search);
  closeDrawer();
  // Üstteki Mevzuat düğmesi, Mevzuat sayfasındayken dolu görünür
  const mevBtn = document.getElementById("mev-btn");
  if (mevBtn) mevBtn.classList.toggle("on", q.has("mevzuat"));
  const abBtn = document.getElementById("ab-btn");
  if (abBtn) abBtn.classList.toggle("on", q.has("hakkinda"));
  $app.classList.toggle("about", q.has("hakkinda") || q.has("takvim") || q.has("bulten") || q.has("mevzuat") || q.has("radar"));
  applyFont();
  MISS = null;
  if (q.has("hakkinda")) { showAbout(); return; }
  // Eski "Araçlar" adresi: ana sayfa açılır, ayarlar sol menüde
  if (q.has("araclar")) { history.replaceState(null, "", "./"); await route(); openDrawer("gorunum"); return; }
  if (q.has("mevzuat")) { await showMevzuat(q.get("mevzuat") || "", q.get("tur") || "", (q.get("ara") || "").trim(), q.get("yil") || ""); return; }
  if (q.has("radar")) { try { await loadIndex(); } catch (e) { return showError(e, route); } await showRadar(); return; }
  if (q.has("takvim")) { await showCalendar(); return; }
  if (q.has("bulten")) { await showBulletin(+q.get("bulten")); return; }
  try { await loadIndex(); } catch (e) { return showError(e, route); }
  if (q.has("gun")) await showDay(normKey(q.get("gun")), (q.get("ara") || "").trim(), q.get("madde") || "");
  else if (q.has("gecmis") || q.has("ara") || q.has("tur")) await showList((q.get("ara") || "").trim(), q.get("tur") || "");
  else await showDay(INDEX.guncel, "");
  // Sayfa içi adresle açıldıysa (ör. …#sec-ata) içerik çizildikten sonra oraya kaydır
  if (location.hash.length > 1) jumpTo(decodeURIComponent(location.hash.slice(1)));
}
function go(url) {
  history.pushState(null, "", url);
  route().then(() => { if (!location.hash) window.scrollTo(0, 0); });
}
document.addEventListener("click", e => {
  const a = e.target.closest("a[data-nav]");
  if (!a || e.defaultPrevented || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  go(a.getAttribute("href"));
});
// Sayfa içi bağlantılar (#g-1 gibi) da popstate üretir; aynı sayfaysa yeniden çizilmez
window.addEventListener("popstate", () => { if (location.search !== lastSearch) route(); });

// Tema: Sistem, Açık ya da Koyu (Hakkında'daki seçici; tercih yalnızca tarayıcıda saklanır)
function theme() {
  try { return localStorage.getItem("tema") || "sistem"; } catch (e) { return "sistem"; }
}
function applyTheme() {
  const t = theme();
  const dark = t === "koyu" || (t === "sistem" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.classList.toggle("light", !dark);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", dark ? "#5E1012" : "#B71C1C");
}
function setTheme(t) {
  try { localStorage.setItem("tema", t); } catch (e) { /* gizli sekme */ }
  applyTheme();
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
applyTheme();
route();
