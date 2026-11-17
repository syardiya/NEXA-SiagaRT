// TMA pintu air Jakarta - diambil dari halaman resmi BPBD DKI (sumber data: Dinas SDA DKI).
// Halaman: https://bpbd.jakarta.go.id/waterlevel  (HTML biasa, tabel dirender server)
// Struktur yang dibaca: <thead> baris "Pintu Air" berisi jam; <tbody> baris per pintu air,
// sel berisi "20 &nbsp;cm (H)" dan class siaga1..siaga4 (4 = normal).
// Tidak ada angka palsu: jika gagal, mengembalikan data terakhir yang valid (ditandai stale)
// atau daftar kosong dengan alasan.
// Butuh Node 18+. Tanpa dependensi.

const URL_TMA = process.env.PINTU_AIR_URL || 'https://bpbd.jakarta.go.id/waterlevel';
const CACHE_MS = 10 * 60 * 1000; // halaman sumber sendiri refresh tiap 15 menit; jangan terlalu sering
let cache = { at: 0, data: null };
let lastGood = null;

const CUACA = { T: 'Terang', MT: 'Mendung Tipis', M: 'Mendung', G: 'Gerimis', H: 'Hujan' };
const SIAGA = { 1: 'Siaga I', 2: 'Siaga II', 3: 'Siaga III', 4: 'Normal (Siaga IV)' };

const strip = s => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();

function parseTma(html) {
  const thead = (html.match(/<thead[\s\S]*?<\/thead>/i) || [''])[0];
  const headRow = (thead.match(/<tr[\s\S]*?<\/tr>/gi) || []).find(r => /Pintu\s*Air/i.test(r));
  if (!headRow) throw new Error('Header tabel TMA tidak ditemukan (halaman berubah atau diblokir)');
  const times = [...headRow.matchAll(/>\s*(\d{1,2}:\d{2})\s*</g)].map(m => m[1]);
  if (!times.length) throw new Error('Kolom jam tidak ditemukan');

  const tbody = (html.match(/<tbody[\s\S]*?<\/tbody>/i) || [''])[0];
  const items = [];
  for (const tr of tbody.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
    const tds = [...tr.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/gi)];
    if (tds.length < 2) continue;
    const nama = strip(tds[0][2]);
    const riwayat = [];
    tds.slice(1).forEach((td, i) => {
      const m = strip(td[2]).match(/^(-?\d+(?:[.,]\d+)?)\s*cm(?:\s*\(([A-Z]{1,2})\))?/i);
      if (!m || !times[i]) return; // sel kosong = belum ada data jam itu
      const cls = (td[1].match(/class="([^"]*)"/) || [, ''])[1].match(/siaga([1-4])/);
      riwayat.push({
        jam: times[i],
        tma_cm: Number(m[1].replace(',', '.')),
        cuaca_kode: m[2] || null,
        cuaca: m[2] ? CUACA[m[2].toUpperCase()] || m[2] : null,
        siaga: cls ? Number(cls[1]) : null,
      });
    });
    if (!nama || !riwayat.length) continue;
    const hm = j => { const [h, m] = j.split(':').map(Number); return h * 60 + m; };
    const terbaru = riwayat.reduce((a, b) => (hm(b.jam) > hm(a.jam) ? b : a));
    items.push({
      nama,
      tma_cm: terbaru.tma_cm,
      jam: terbaru.jam,
      cuaca: terbaru.cuaca,
      siaga: terbaru.siaga,
      status: terbaru.siaga ? SIAGA[terbaru.siaga] : null,
      riwayat: riwayat.sort((a, b) => hm(a.jam) - hm(b.jam)),
    });
  }
  if (!items.length) throw new Error('Tidak ada baris pintu air yang terbaca');
  return items;
}

async function getPintuAir() {
  if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;
  let out;
  try {
    const res = await fetch(URL_TMA, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; nexa-flood-app/1.0)', Accept: 'text/html' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = parseTma(await res.text());
    const tanggal = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
    out = { source: 'BPBD DKI Jakarta (sumber: Dinas SDA)', url: URL_TMA, tanggal,
            fetchedAt: new Date().toISOString(), stale: false, items };
    lastGood = out;
  } catch (e) {
    out = lastGood
      ? { ...lastGood, stale: true, error: e.message }
      : { source: 'tidak-tersedia', error: e.message, stale: true, items: [] };
  }
  cache = { at: Date.now(), data: out };
  return out;
}

export { getPintuAir, parseTma };
