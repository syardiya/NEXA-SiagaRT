// Ambang Siaga I/II/III per pintu air, dari API internal halaman BPBD:
//   POST https://bpbd.jakarta.go.id/api/charttma  (form: pintuair_id, pintuair)
// Terverifikasi dari Terminal tanpa token/cookie. Ambang jarang berubah -> cache 24 jam
// (12 request/hari). id pos diambil dari <select id="grf"> di halaman waterlevel.
const URL_API = process.env.CHARTTMA_URL || 'https://bpbd.jakarta.go.id/api/charttma';
const IDS = {
  'Bendung Katulampa': 7, 'Pos Depok': 1, 'Manggarai BKB': 14, 'PA. Karet': 13,
  'Pos Krukut Hulu': 4, 'Pos Pesanggrahan': 2, 'Pos Angke Hulu': 3, 'Waduk Pluit': 8,
  'Pasar Ikan - Laut': 20, 'Pos Cipinang Hulu': 5, 'Pos Sunter Hulu': 6, 'Pulo Gadung': 19,
};
const DAY = 24 * 60 * 60 * 1000;
let cache = { at: 0, data: null };
const sleep = ms => new Promise(r => setTimeout(r, ms));
export const keyOf = n => String(n).trim().toLowerCase();
const first = v => { const n = parseFloat(String(v ?? '').split(',')[0]); return Number.isFinite(n) ? n : null; };

export function parseAmbang(json) {
  return { siaga1_cm: first(json.siaga1), siaga2_cm: first(json.siaga2), siaga3_cm: first(json.siaga3) };
}

// Mengembalikan { "<nama pintu air lowercase>": {siaga1_cm, siaga2_cm, siaga3_cm} }.
// Yang gagal diambil tidak ada di hasil (tidak dikarang).
export async function getAmbang(only = null) {
  if (cache.data && Date.now() - cache.at < DAY) return cache.data;
  const out = { ...(cache.data || {}) };
  let ok = 0;
  for (const [nama, id] of Object.entries(IDS)) {
    if (only && !only.some(w => keyOf(nama).includes(w))) continue; // hanya pos yang dipantau
    try {
      const res = await fetch(URL_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (compatible; nexa-flood-app/1.0)' },
        body: new URLSearchParams({ pintuair_id: String(id), pintuair: nama }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const a = parseAmbang(await res.json());
      if (a.siaga1_cm !== null || a.siaga2_cm !== null || a.siaga3_cm !== null) { out[keyOf(nama)] = a; ok++; }
    } catch { /* lewati; coba lagi di siklus berikutnya */ }
    await sleep(300); // sopan ke server sumber
  }
  // jika semua gagal, coba lagi dalam 10 menit (bukan 24 jam)
  cache = { at: ok ? Date.now() : Date.now() - DAY + 10 * 60 * 1000, data: out };
  return out;
}
