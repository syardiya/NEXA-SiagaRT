import { db } from './db.js';

/**
 * Hard-coded Rule Engine for Jakarta Flood Early Warning & 3-Flood-Type Hydrological Classifier.
 * As per PRD Section 6 (Responsible AI):
 * 1. Triggers "Possible flood, needs verification" IF at least 2 of 3 conditions are TRUE:
 *    - Condition 1: BPBD Pos Pantau terdekat berstatus Siaga 3, 2, atau 1.
 *    - Condition 2: Data Cuaca / BMKG Terdapat heavy-rain warning aktif di kecamatan tersebut.
 *    - Condition 3: Internal Data Terkumpul >= 3 Laporan Banjir 'Verified' dalam 2 jam terakhir di kelurahan yang sama.
 * 2. Classifies Jakarta's 3 Distinct Flood Mechanisms:
 *    - HUJAN_LOKAL_DRAINASE (Local Rainfall + Clogged Micro-Drainage) -> Safe for Pre-Rain RT Gotong Royong
 *    - KIRIMAN_HULU (Upstream Ciliwung/Katulampa/Manggarai Overflow) -> Cancel Gotong Royong if Siaga 1-2, Trigger NGO Evacuation
 *    - ROB_PESISIR (Coastal Tidal Flood / Pasar Ikan) -> Polder Pump & Coastal NGO Evacuation Protocol
 */

export function classifyJakartaFloodMechanism({ kelurahan = '', kecamatan = '', nearestPost = null, isHeavyRainActive = false }) {
  const kelLower = kelurahan.toLowerCase();
  const kecLower = kecamatan.toLowerCase();
  const postNameLower = (nearestPost?.name || '').toLowerCase();

  const isCoastal =
    kelLower.includes('penjaringan') ||
    kelLower.includes('pluit') ||
    kelLower.includes('muara') ||
    kelLower.includes('ancol') ||
    kecLower.includes('penjaringan') ||
    postNameLower.includes('pasar ikan');

  const isRiverBasin =
    kelLower.includes('kampung melayu') ||
    kelLower.includes('bidara cina') ||
    kelLower.includes('rawajati') ||
    kelLower.includes('bukit duri') ||
    kelLower.includes('cawang') ||
    kelLower.includes('pejaten') ||
    postNameLower.includes('katulampa') ||
    postNameLower.includes('manggarai') ||
    postNameLower.includes('depok');

  if (isCoastal) {
    const isTideHigh = nearestPost && nearestPost.siaga_level <= 3;
    return {
      code: 'ROB_PESISIR',
      label: 'Banjir Rob Pesisir (Pasang Laut)',
      gotong_royong_safe: !isTideHigh,
      primary_actor: 'Dinas SDA (Pompa Polder) & Tim Evakuasi NGO',
      protocol_summary: isTideHigh
        ? 'PERINGATAN ROB: Ketinggian air laut di Pos Pasar Ikan meningkat. Kerja bakti keruk got biasa TIDAK efektif menahan air pasang laut. Pastikan pompa polder aktif dan evakuasi lansia/balita bersama NGO.'
        : 'Pantau jadwal pasang maksimum laut dan pastikan pintu klep saluran pesisir tidak terganjal sampah.'
    };
  }

  if (isRiverBasin && nearestPost && nearestPost.siaga_level <= 2) {
    return {
      code: 'KIRIMAN_HULU',
      label: 'Banjir Kiriman Hulu (Luapan Sungai Ciliwung)',
      gotong_royong_safe: false,
      primary_actor: 'BPBD & Tim SAR / NGO (Evakuasi Darurat)',
      protocol_summary: `BAHAYA LUAPAN SUNGAI (${nearestPost.status}): Debit kiriman dari hulu sangat tinggi (${nearestPost.water_level_cm} cm). DILARANG melakukan kerja bakti di pinggir kali/saluran induk! Langsung jalankan evakuasi warga rentan bersama NGO.`
    };
  }

  if (isRiverBasin && nearestPost && nearestPost.siaga_level === 3) {
    return {
      code: 'KIRIMAN_DAN_LOKAL',
      label: 'Kombinasi Kiriman Hulu (Waspada) & Drainase Lokal',
      gotong_royong_safe: true,
      primary_actor: 'Ketua RT (Bersihkan Saluran Dalam) & Siaga NGO',
      protocol_summary: `Pos ${nearestPost.name} berstatus Waspada (${nearestPost.water_level_cm} cm). Bersihkan hanya saluran mikro di permukiman warga dan siapkan posko evakuasi bersama NGO jika air sungai terus naik.`
    };
  }

  return {
    code: 'HUJAN_LOKAL_DRAINASE',
    label: 'Genangan Hujan Lokal & Sumbatan Drainase Mikro',
    gotong_royong_safe: true,
    primary_actor: 'Ketua RT & Warga (Pencegahan Pra-Hujan)',
    protocol_summary: isHeavyRainActive
      ? 'Pencegahan Pra-Hujan Aktif: Segera keruk sumbatan lumpur dan sampah di mulut gorong-gorong RT sebelum hujan lebat turun.'
      : 'Kondisi pintu air sungai aman. Fokus pada pemeliharaan kebersihan gorong-gorong lingkungan RT.'
  };
}

export function evaluateAreaFloodRule(areaId) {
  const areas = db.get('areas');
  const area = areas.find(a => a.id === areaId);
  if (!area) return null;

  const bpbdPosts = db.get('bpbd_posts');
  const bmkgForecast = db.data.bmkg_forecast || {};
  const reports = db.get('reports');

  // Condition 1: BPBD Pos Pantau Status
  const kelLower = (area.kelurahan || '').toLowerCase();
  const monitorBase = (area.monitoring_post || '').replace(/pos\s*pantau\s*/i, '').trim().toLowerCase();
  const nearestPost = bpbdPosts.find(p => {
    const pName = (p.name || '').toLowerCase();
    const pFlow = (p.flow_destination || '').toLowerCase();
    return (
      (kelLower && pName.includes(kelLower)) ||
      (kelLower && pFlow.includes(kelLower)) ||
      (monitorBase && pName.includes(monitorBase))
    );
  }) || bpbdPosts.find(p => p.id === 'pos-manggarai') || bpbdPosts[0] || null;

  const isCondition1 = nearestPost ? (nearestPost.siaga_level <= 3) : false;
  const condition1Details = nearestPost ? {
    post_name: nearestPost.name,
    water_level_cm: nearestPost.water_level_cm,
    status: nearestPost.status,
    siaga_level: nearestPost.siaga_level,
    satisfied: isCondition1,
    explanation: isCondition1 
      ? `Pos Pantau ${nearestPost.name} mencapai ${nearestPost.water_level_cm} cm (${nearestPost.status}) yang memenuhi ambang batas Siaga 3/2/1.`
      : `Pos Pantau ${nearestPost.name} saat ini ${nearestPost.water_level_cm} cm (Normal / Siaga 4).`
  } : { satisfied: false, explanation: "Data pos pantau tidak tersedia." };

  // Condition 2: BMKG / Real-Time Heavy-Rain Warning for this kecamatan
  const warning = bmkgForecast.active_warning || {};
  const affected = warning.affected_kecamatan || [];
  const isCondition2 = Boolean(warning.is_active && (
    affected.some(kec => {
      const k = (kec || '').toLowerCase();
      return k === (area.kecamatan || '').toLowerCase() || k.includes('jakarta');
    }) ||
    affected.length === 0
  ));
  const condition2Details = {
    warning_event: warning.event || "Tidak ada peringatan aktif",
    affected_kecamatan: affected,
    area_kecamatan: area.kecamatan,
    satisfied: isCondition2,
    expected_heavy_rain: warning.expected_heavy_rain,
    explanation: isCondition2
      ? `Peringatan Hujan Lebat AKTIF untuk Kecamatan ${area.kecamatan}: "${warning.headline}".`
      : `Cuaca di Kecamatan ${area.kecamatan} saat ini kondusif (di bawah ambang batas hujan ekstrem).`
  };

  // Condition 3: Internal Data >= 3 Verified Flood Reports in last 2 hours
  const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
  const recentVerifiedReports = reports.filter(r => {
    const reportTime = new Date(r.created_at).getTime();
    return (
      (r.rt_rw_id === area.id || r.kelurahan.toLowerCase() === area.kelurahan.toLowerCase()) &&
      (r.status === 'Verified' || r.status === 'Task_Created') &&
      r.hazard_type === 'Flood' &&
      reportTime >= twoHoursAgo
    );
  });

  const verifiedCount = recentVerifiedReports.length;
  const isCondition3 = verifiedCount >= 3;
  const condition3Details = {
    verified_count: verifiedCount,
    threshold: 3,
    timeframe: "2 jam terakhir",
    satisfied: isCondition3,
    recent_reports: recentVerifiedReports.map(r => ({ id: r.id, desc: r.description, time: r.created_at })),
    explanation: isCondition3
      ? `Terkumpul ${verifiedCount} laporan banjir berstatus Terverifikasi dalam 2 jam terakhir di ${area.kelurahan} (Ambang batas >= 3 terpenuhi).`
      : `Tercatat ${verifiedCount} dari minimal 3 laporan banjir terverifikasi dalam 2 jam terakhir di ${area.kelurahan}.`
  };

  // Rule 2 of 3 calculation
  const trueConditionsCount = [isCondition1, isCondition2, isCondition3].filter(Boolean).length;
  const isTriggered = trueConditionsCount >= 2;

  let alertLevel = "SAFE";
  if (trueConditionsCount === 1) alertLevel = "MONITOR";
  if (trueConditionsCount === 2) alertLevel = "WARNING";
  if (trueConditionsCount === 3) alertLevel = "CRITICAL";

  // Classify flood mechanism (Local vs Upstream Kiriman vs Coastal Rob)
  const floodMechanism = classifyJakartaFloodMechanism({
    kelurahan: area.kelurahan,
    kecamatan: area.kecamatan,
    nearestPost,
    isHeavyRainActive: isCondition2
  });

  return {
    area_id: area.id,
    kelurahan: area.kelurahan,
    kecamatan: area.kecamatan,
    kota: area.kota,
    rt_code: area.rt_code,
    rw_code: area.rw_code,
    geom_center: area.geom_center,
    is_triggered: isTriggered,
    true_conditions_count: trueConditionsCount,
    required_count: 2,
    alert_level: alertLevel,
    flood_mechanism: floodMechanism,
    notification_message: isTriggered 
      ? `⚠️ SIAGA [${floodMechanism.label}]: Potensi banjir di ${area.kelurahan} (${area.rt_code} ${area.rw_code})! (${trueConditionsCount}/3 kondisi terpenuhi). ${floodMechanism.protocol_summary}`
      : `Status Terkendali (${trueConditionsCount}/3 kondisi terpenuhi) — Karakteristik Wilayah: ${floodMechanism.label}.`,
    conditions: {
      condition_1_bpbd: condition1Details,
      condition_2_bmkg: condition2Details,
      condition_3_internal: condition3Details
    },
    evaluated_at: new Date().toISOString()
  };
}

export function evaluateAllAreas() {
  const areas = db.get('areas');
  return areas.map(area => evaluateAreaFloodRule(area.id));
}
