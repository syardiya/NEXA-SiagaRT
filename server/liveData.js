// Penyambung data real ke db.js (tanpa mengubah route yang sudah ada).
// Mengisi db.data.bpbd_posts (TMA pintu air, BPBD DKI) dan db.data.bmkg_forecast.active_warning
// (peringatan dini BMKG CAP) secara berkala. Tidak ada angka karangan: jika sumber gagal,
// data ditandai stale / tidak-tersedia di db.data.live_status.
import { getPintuAir } from './services/pintuAir.js';
import { getJakartaAlert } from './services/bmkgCap.js';
import { getAmbang, keyOf } from './services/ambang.js';

const LABEL = { 1: 'Siaga 1 (Awas)', 2: 'Siaga 2 (Bahaya)', 3: 'Siaga 3 (Waspada)', 4: 'Siaga 4 (Normal)' };
// Pertahankan id lama agar route/area.monitoring_post yang sudah ada tetap cocok
const OLD_ID = [[/katulampa/i, 'pos-katulampa'], [/manggarai/i, 'pos-manggarai'], [/karet/i, 'pos-karet'],
                [/sunter/i, 'pos-sunter-hulu'], [/pasar ikan/i, 'pos-pasar-ikan']];
// Pos yang dipantau aplikasi (sesuai areas[].monitoring_post di db.js). Ubah lewat env
// PINTU_AIR_WATCH="katulampa,depok,..." atau PINTU_AIR_WATCH=all untuk semua 12 pos BPBD.
const DEFAULT_WATCH = 'katulampa,depok,manggarai,karet,sunter hulu,pasar ikan';
const watchList = () => {
  const v = (process.env.PINTU_AIR_WATCH ?? DEFAULT_WATCH).trim().toLowerCase();
  return v === 'all' || v === '' ? null : v.split(',').map(x => x.trim()).filter(Boolean);
};
const slug = n => 'pos-' + n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const postId = n => (OLD_ID.find(([re]) => re.test(n)) || [, slug(n)])[1];

export async function refreshLive(db) {
  const status = { updated_at: new Date().toISOString() };

  try {
    const tma = await getPintuAir();
    const watch = watchList();
    const items = watch ? tma.items.filter(i => watch.some(w => i.nama.toLowerCase().includes(w))) : tma.items;
    let ambang = {};
    try { ambang = await getAmbang(watch); } catch { /* ambang opsional; status siaga tetap dari sumber */ }
    if (items.length) {
      db.data.bpbd_posts = items.map(i => {
        const amb = ambang[keyOf(i.nama)] || null;
        return {
        id: postId(i.nama),
        name: i.nama,
        water_level_cm: i.tma_cm,
        status: i.siaga ? LABEL[i.siaga] : null,
        siaga_level: i.siaga,
        // ambang resmi dari api/charttma BPBD (null jika gagal diambil; tidak dikarang)
        safe_limit_cm: null,
        siaga3_limit_cm: amb?.siaga3_cm ?? null,
        siaga2_limit_cm: amb?.siaga2_cm ?? null,
        siaga1_limit_cm: amb?.siaga1_cm ?? null,
        flow_destination: null,
        weather: i.cuaca,
        observed_at_wib: i.jam,
        source: tma.source,
        stale: tma.stale,
        updated_at: tma.fetchedAt,
        };
      });
    } else {
      db.data.bpbd_posts = [];
    }
    status.pintu_air = { ok: !tma.stale, source: tma.source, fetchedAt: tma.fetchedAt || null, error: tma.error || null };
  } catch (e) {
    status.pintu_air = { ok: false, error: e.message };
  }

  try {
    const cap = await getJakartaAlert();
    const prev = db.data.bmkg_forecast || {};
    db.data.bmkg_forecast = {
      station: null, current_condition: null, intervals: [], ...prev, province: 'DKI Jakarta',
      active_warning: cap
        ? { is_active: true, event: cap.event, headline: cap.headline, affected_kecamatan: cap.areas,
            start_time: cap.effective, expected_heavy_rain: null, end_time: cap.expires,
            source: 'BMKG CAP', source_url: cap.sourceUrl }
        : { is_active: false },
    };
    status.bmkg = { ok: true, source: 'BMKG CAP', checkedAt: new Date().toISOString() };
  } catch (e) {
    // gagal mengambil != tidak ada peringatan; jangan klaim aman
    const prev = db.data.bmkg_forecast || {};
    db.data.bmkg_forecast = { ...prev, active_warning: { is_active: false, unavailable: true, error: e.message } };
    status.bmkg = { ok: false, error: e.message };
  }

  db.data.live_status = status;
  db.saveData();
  return status;
}

export function startLiveData(db, { intervalMs = 10 * 60 * 1000 } = {}) {
  const run = () => refreshLive(db).then(
    s => console.log('[LIVE] pintu air:', s.pintu_air?.ok ? 'OK' : s.pintu_air?.error, '| BMKG:', s.bmkg?.ok ? 'OK' : s.bmkg?.error),
    e => console.error('[LIVE] gagal:', e.message));
  run();
  const t = setInterval(run, intervalMs);
  t.unref?.();
  // tombol "Kosongkan Data Contoh" memanggil db.reset(): isi ulang data real setelahnya
  const origReset = db.reset.bind(db);
  db.reset = () => { const r = origReset(); run(); return r; };
  return t;
}
