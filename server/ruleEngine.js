import { db } from './db.js';

/**
 * Hard-coded Rule Engine for Jakarta Flood Early Warning.
 * As per PRD Section 6 (Responsible AI):
 * Triggers "Possible flood, needs verification" IF at least 2 of 3 conditions are TRUE:
 * Condition 1: BPBD Pos Pantau terdekat berstatus Siaga 3, 2, atau 1.
 * Condition 2: Data BMKG (CAP API) Terdapat heavy-rain warning di kecamatan tersebut.
 * Condition 3: Internal Data Terkumpul >= 3 Laporan Banjir 'Verified' dalam 2 jam terakhir di kelurahan yang sama.
 */

export function evaluateAreaFloodRule(areaId) {
  const areas = db.get('areas');
  const area = areas.find(a => a.id === areaId);
  if (!area) return null;

  const bpbdPosts = db.get('bpbd_posts');
  const bmkgForecast = db.data.bmkg_forecast || {};
  const reports = db.get('reports');

  // Condition 1: BPBD Pos Pantau Status
  const nearestPost = bpbdPosts.find(p => p.name.toLowerCase().includes(area.kelurahan.toLowerCase()) || 
                                          p.flow_destination.toLowerCase().includes(area.kelurahan.toLowerCase()) ||
                                          (area.monitoring_post && p.name.includes(area.monitoring_post.replace('Pos Pantau ', ''))))
                      || bpbdPosts.find(p => p.id === 'pos-manggarai'); // Default Ciliwung basin

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

  // Condition 2: BMKG CAP API Heavy-Rain Warning for this kecamatan
  const warning = bmkgForecast.active_warning || {};
  const affected = warning.affected_kecamatan || [];
  const isCondition2 = Boolean(warning.is_active && (
    affected.some(kec => kec.toLowerCase() === area.kecamatan.toLowerCase()) ||
    affected.length === 0
  ));
  const condition2Details = {
    warning_event: warning.event || "Tidak ada peringatan aktif",
    affected_kecamatan: affected,
    area_kecamatan: area.kecamatan,
    satisfied: isCondition2,
    expected_heavy_rain: warning.expected_heavy_rain,
    explanation: isCondition2
      ? `BMKG CAP Warning AKTIF untuk Kecamatan ${area.kecamatan}: "${warning.headline}". Estimasi hujan lebat: ${new Date(warning.expected_heavy_rain).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB.`
      : `Tidak ada peringatan hujan ekstrem BMKG untuk Kecamatan ${area.kecamatan}.`
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
      : `Hanya ada ${verifiedCount} dari minimal 3 laporan banjir terverifikasi dalam 2 jam terakhir di ${area.kelurahan}.`
  };

  // Rule 2 of 3 calculation
  const trueConditionsCount = [isCondition1, isCondition2, isCondition3].filter(Boolean).length;
  const isTriggered = trueConditionsCount >= 2;

  let alertLevel = "SAFE";
  if (trueConditionsCount === 1) alertLevel = "MONITOR";
  if (trueConditionsCount === 2) alertLevel = "WARNING";
  if (trueConditionsCount === 3) alertLevel = "CRITICAL";

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
    notification_message: isTriggered 
      ? `⚠️ SIAGA: Possible flood in ${area.kelurahan} (${area.rt_code} ${area.rw_code}), needs verification! (${trueConditionsCount}/3 kondisi terpenuhi)`
      : `Status Terkendali (${trueConditionsCount}/3 kondisi terpenuhi)`,
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
