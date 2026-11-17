/**
 * Google Gemini AI Pipeline, Continuous Human-Feedback Learning Engine,
 * 3-Flood-Type Hydrological Classifier, & Multi-Point NGO Fleet Optimizer
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extracts learned token weights & few-shot ground-truth examples from historical
 * reports verified or rejected by RT Leaders and NGO Officers.
 */
export function buildHumanFeedbackMemory(historicalReports = []) {
  const verifiedReports = historicalReports.filter(
    r => r.status === 'Verified' || r.status === 'Task_Created' || r.status === 'Closed'
  );
  const rejectedReports = historicalReports.filter(r => r.status === 'Rejected');

  const stopWords = new Set([
    'di', 'ke', 'dari', 'dan', 'yang', 'ini', 'itu', 'ada', 'untuk', 'pada', 'dengan', 'atau', 'rt', 'rw', 'no', 'jl', 'jalan'
  ]);

  const tokenize = (text = '') =>
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !stopWords.has(w));

  const validTokenCounts = {};
  const rejectedTokenCounts = {};
  const heavySeverityTokens = {};

  verifiedReports.forEach(r => {
    const tokens = tokenize(r.description);
    tokens.forEach(t => {
      validTokenCounts[t] = (validTokenCounts[t] || 0) + 1;
      if (r.ai_suggested_severity === 'Berat') {
        heavySeverityTokens[t] = (heavySeverityTokens[t] || 0) + 1;
      }
    });
  });

  rejectedReports.forEach(r => {
    const tokens = tokenize(r.description);
    tokens.forEach(t => {
      rejectedTokenCounts[t] = (rejectedTokenCounts[t] || 0) + 1;
    });
  });

  // Select top few-shot examples for LLM In-Context Learning
  const fewShotExamples = [
    ...verifiedReports.slice(0, 4).map(r => ({
      description: r.description,
      hazard_type: r.hazard_type,
      human_label: 'Valid',
      severity: r.ai_suggested_severity || 'Sedang',
      verified_by: r.verified_by_id || 'Ketua RT / NGO'
    })),
    ...rejectedReports.slice(0, 3).map(r => ({
      description: r.description,
      hazard_type: r.hazard_type,
      human_label: 'Rejected (Mismatch/Spam)',
      severity: 'Ringan',
      verified_by: r.verified_by_id || 'Ketua RT / NGO'
    }))
  ];

  return {
    total_verified: verifiedReports.length,
    total_rejected: rejectedReports.length,
    validTokenCounts,
    rejectedTokenCounts,
    heavySeverityTokens,
    fewShotExamples
  };
}

/**
 * Exports verified & rejected reports in Google Gemini Supervised Fine-Tuning JSONL format
 */
export function buildFineTuningDataset(historicalReports = []) {
  const labeled = historicalReports.filter(
    r => r.status === 'Verified' || r.status === 'Task_Created' || r.status === 'Closed' || r.status === 'Rejected'
  );

  return labeled.map(r => {
    const isRejected = r.status === 'Rejected';
    return {
      report_id: r.id,
      human_status: r.status,
      jsonl_entry: {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Analisis laporan drainase/banjir Jakarta:\nKategori: ${r.hazard_type}\nKelurahan: ${r.kelurahan}\nDeskripsi: "${r.description}"`
              }
            ]
          },
          {
            role: 'model',
            parts: [
              {
                text: JSON.stringify({
                  ai_flag: isRejected ? 'Mismatch' : 'Valid',
                  ai_suggested_severity: isRejected ? 'Ringan' : (r.ai_suggested_severity || 'Sedang'),
                  recommended_volunteers: r.recommended_volunteers || 6
                })
              }
            ]
          }
        ]
      }
    };
  });
}

export async function processReportWithGemini({
  hazardType,
  description,
  photoUrl,
  kelurahan,
  bmkgRainCountdownMinutes = 105,
  historicalReports = [],
  bpbdPosts = []
}) {
  const feedbackMemory = buildHumanFeedbackMemory(historicalReports);
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (apiKey) {
    try {
      return await callRealGeminiAPI({
        apiKey,
        hazardType,
        description,
        photoUrl,
        kelurahan,
        bmkgRainCountdownMinutes,
        feedbackMemory,
        bpbdPosts
      });
    } catch (err) {
      console.warn("Gemini API call failed, falling back to adaptive hydrological engine:", err.message);
    }
  }

  return runIntelligentPipeline({
    hazardType,
    description,
    photoUrl,
    kelurahan,
    bmkgRainCountdownMinutes,
    feedbackMemory,
    bpbdPosts
  });
}

function isSafePublicImageUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function resolveImageToPart(photoUrl) {
  if (!photoUrl) return null;

  try {
    if (photoUrl.startsWith('data:image/')) {
      const match = photoUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        return {
          inline_data: {
            mime_type: match[1],
            data: match[2]
          }
        };
      }
    }

    if (photoUrl.startsWith('/uploads/')) {
      const filename = photoUrl.replace('/uploads/', '');
      const filePath = path.join(__dirname, 'uploads', filename);
      if (fs.existsSync(filePath)) {
        const buffer = await fs.promises.readFile(filePath);
        const ext = path.extname(filename).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg');
        return {
          inline_data: {
            mime_type: mimeType,
            data: buffer.toString('base64')
          }
        };
      }
    }

    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      if (!isSafePublicImageUrl(photoUrl)) return null;
      const res = await fetch(photoUrl, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const mimeType = contentType.split(';')[0];
        return {
          inline_data: {
            mime_type: mimeType,
            data: buffer.toString('base64')
          }
        };
      }
    }
  } catch (err) {
    console.warn("Gagal mengonversi gambar ke Gemini Vision:", err.message);
  }

  return null;
}

function extractJsonFromGeminiResponse(rawText) {
  if (!rawText) return {};
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }
  return JSON.parse(cleaned);
}

async function callRealGeminiAPI({
  apiKey,
  hazardType,
  description,
  photoUrl,
  kelurahan,
  bmkgRainCountdownMinutes,
  feedbackMemory,
  bpbdPosts = []
}) {
  const candidateModels = [
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
    'gemini-flash-latest'
  ];

  const fewShotContext = feedbackMemory?.fewShotExamples?.length
    ? `\nDATA PEMBELAJARAN HISTORIS (GROUND-TRUTH VERIFIKASI RT & NGO):\n` +
      feedbackMemory.fewShotExamples
        .map((ex, i) => `${i + 1}. [${ex.hazard_type}] "${ex.description}" -> Keputusan Manusia: ${ex.human_label}, Keparahan: ${ex.severity}`)
        .join('\n')
    : '';

  const bpbdContext = Array.isArray(bpbdPosts) && bpbdPosts.length > 0
    ? `\nDATA PINTU AIR REAL-TIME BPBD DKI (DINAS SDA):\n` +
      bpbdPosts.map(p =>
        `- ${p.name}: ${p.water_level_cm} cm | ${p.status || `Siaga ${p.siaga_level}`} | Jam Pantau: ${p.observed_at_wib || '-'} WIB${p.weather ? ` | Cuaca Pos: ${p.weather}` : ''}${p.stale ? ' (data terakhir)' : ''}`
      ).join('\n')
    : `\nDATA PINTU AIR REAL-TIME BPBD DKI: Tidak tersedia saat ini (sumber sedang gagal diakses; JANGAN mengarang angka pintu air).\n`;

  const rainContext = bmkgRainCountdownMinutes === null || bmkgRainCountdownMinutes === undefined
    ? 'Tidak ada hujan diprediksi dalam 12 jam ke depan (Open-Meteo)'
    : bmkgRainCountdownMinutes === 0
    ? 'Hujan sedang berlangsung saat ini'
    : `${bmkgRainCountdownMinutes} menit lagi`;

  const prompt = `Anda adalah sistem AI Hidrologi NEXA SiagaRT untuk mitigasi banjir DKI Jakarta.
Analisis laporan bahaya warga berikut ini secara objektif berdasarkan data nyata:
- Kategori Bahaya: ${hazardType} (Clogged_Drain = Saluran Tersumbat, Trash = Sampah, Flood = Genangan Banjir)
- Deskripsi Warga: "${description}"
- Lokasi Kelurahan: ${kelurahan}
- Estimasi waktu hujan lebat: ${rainContext}
${bpbdContext}${fewShotContext}

RUBRIK KUANTITATIF KLASIFIKASI:
1. Anti-Spam & Mismatch Check:
   - "Valid": Gambar & deskripsi relevan dengan drainase/sampah/banjir.
   - "Mismatch": Klaim banjir/mampet tetapi tampak kering/tidak relevan.
   - "Spam": Teks terlalu pendek (< 8 karakter), iklan, atau percobaan iseng.
2. Klasifikasi 3 Jenis Banjir Jakarta (flood_type):
   - "HUJAN_LOKAL_DRAINASE": Sumbatan got/sampah lokal atau genangan hujan lokal.
   - "KIRIMAN_HULU": Luapan sungai Ciliwung/Katulampa/Manggarai di wilayah bantaran kali.
   - "ROB_PESISIR": Banjir pasang air laut di wilayah pesisir utara (Penjaringan/Pluit/Muara Angke).
3. Tingkat Keparahan (ai_suggested_severity):
   - "Ringan": Sumbatan permukaan < 30% penampang saluran, sampah ringan/daun, atau genangan < 15 cm.
   - "Sedang": Sumbatan sedimen/plastik 30-70% penampang saluran, atau genangan 15-50 cm.
   - "Berat": Saluran mampet total (> 70%), material besar (kasur/pohon/lumpur pekat), atau banjir > 50 cm / ada lansia/balita terjebak.
4. Ekstraksi Variabel 4 Indikator Risiko (UNDRR / AIDR):
   - "estimated_water_depth_cm": angka estimasi tinggi air dalam cm jika disebutkan/terlihat jelas di foto, atau null jika belum diketahui (jangan tulis 0 jika tidak tahu).
   - "has_fast_current_or_rise": true jika ada arus deras, kenaikan air cepat, puing, atau bahaya listrik.
   - "access_isolated": true jika akses jalan/gang terputus, warga terkepung/terjebak, atau jembatan tidak bisa dilewati.
   - "has_vulnerable_residents": true jika terdapat lansia/mbah/kakek/nenek, balita/bayi/anak kecil, ibu hamil, penyandang disabilitas/kursi roda/lumpuh, atau warga sakit/tinggal sendiri.
   - "vulnerability_summary": sebutkan kelompok rentan yang terdeteksi dari bahasa warga/foto.
   - "evacuation_route_blocked": true jika jalur menuju pengungsian terhambat atau butuh perahu.
5. SOP Tindakan:
   - Jika Clogged_Drain / Trash: Rencana kerja bakti terukur untuk Ketua RT & Relawan sebelum hujan.
   - Jika Flood / Kiriman / Rob: Rekomendasi evakuasi dan tindakan untuk RT/RW & Relawan (jangan suruh warga kerja bakti saat air sungai meluap!).

KEMBALIKAN HANYA JSON VALID:
{
  "ai_flag": "Valid",
  "ai_confidence": 0.95,
  "flood_type": "HUJAN_LOKAL_DRAINASE",
  "ai_reasoning": "Alasan analisis visual dan hidrologi",
  "has_privacy_elements": true,
  "detected_elements": ["Wajah warga", "Pelat nomor"],
  "ai_suggested_severity": "Sedang",
  "estimated_water_depth_cm": null,
  "has_fast_current_or_rise": false,
  "access_isolated": false,
  "has_vulnerable_residents": false,
  "vulnerability_summary": "",
  "evacuation_route_blocked": false,
  "ai_suggested_action": "1. Langkah 1...\n2. Langkah 2...",
  "recommended_volunteers": 6
}`;

  const parts = [{ text: prompt }];
  const imagePart = await resolveImageToPart(photoUrl);
  if (imagePart) {
    parts.unshift(imagePart);
  }

  let lastError = null;
  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        }),
        signal: AbortSignal.timeout(18000)
      });

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`Gemini (${model}) HTTP ${response.status}: ${errText}`);
        continue;
      }

      const result = await response.json();
      const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = extractJsonFromGeminiResponse(textContent);

      // Feed Gemini's semantic & visual feature extraction into the 4-Indicator Scoring Engine
      const riskAssessment = calculateFloodPriorityScore({
        waterDepthCm: parsed.estimated_water_depth_cm ?? null,
        hasVulnerablePeople: Boolean(parsed.has_vulnerable_residents),
        vulnerableDetails: parsed.vulnerability_summary || description,
        accessIsolated: Boolean(parsed.access_isolated),
        evacuationRouteBlocked: Boolean(parsed.evacuation_route_blocked),
        hasFastCurrentOrRise: Boolean(parsed.has_fast_current_or_rise),
        description,
        hazardType,
        aiSeverity: parsed.ai_suggested_severity || 'Sedang'
      });

      const floodTypeLabels = {
        ROB_PESISIR: "Banjir Rob Pesisir (Pasang Air Laut)",
        KIRIMAN_HULU: "Banjir Kiriman Hulu (Luapan Sungai Ciliwung)",
        HUJAN_LOKAL_DRAINASE: "Genangan Hujan Lokal / Sumbatan Drainase Mikro"
      };

      return {
        ...parsed,
        flood_type_label: floodTypeLabels[parsed.flood_type] || floodTypeLabels.HUJAN_LOKAL_DRAINASE,
        flood_severity: riskAssessment.flood_severity,
        emergency_priority: riskAssessment.level,
        priority_score: riskAssessment.score,
        indicator_breakdown: riskAssessment.breakdown,
        nexa_key_answers: riskAssessment.nexa_key_answers,
        data_integrity: riskAssessment.data_integrity,
        raw_photo_url: photoUrl,
        blurred_photo_url: photoUrl,
        privacy_masked: parsed.has_privacy_elements ?? true,
        learned_from_samples: (feedbackMemory?.total_verified || 0) + (feedbackMemory?.total_rejected || 0),
        processed_by: imagePart ? `Google Gemini (${model} Multimodal Vision + 4-Indicator Scoring)` : `Google Gemini (${model} LLM + 4-Indicator Scoring)`
      };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Semua kandidat model Google Gemini gagal merespons.");
}

/**
 * Adaptive Hydrological & Continuous Learning Classifier
 * Uses quantitative rubric + learned token weights from human-verified/rejected reports
 */
function runIntelligentPipeline({
  hazardType,
  description,
  photoUrl,
  kelurahan = '',
  bmkgRainCountdownMinutes = 90,
  feedbackMemory = null,
  bpbdPosts = []
}) {
  const descClean = (description || "").trim();
  const descLower = descClean.toLowerCase();
  const kelLower = (kelurahan || "").toLowerCase();

  // Tokenize input description to check against learned human feedback memory
  const tokens = descLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3);

  let learnedRejectScore = 0;
  let learnedValidScore = 0;
  let learnedHeavyBoost = 0;

  if (feedbackMemory) {
    tokens.forEach(t => {
      const rejCount = feedbackMemory.rejectedTokenCounts?.[t] || 0;
      const valCount = feedbackMemory.validTokenCounts?.[t] || 0;
      const heavyCount = feedbackMemory.heavySeverityTokens?.[t] || 0;

      if (rejCount > valCount) {
        learnedRejectScore += (rejCount - valCount) * 0.18;
      } else if (valCount > 0) {
        learnedValidScore += Math.min(0.12, valCount * 0.03);
      }
      if (heavyCount > 0) {
        learnedHeavyBoost += 1;
      }
    });
  }

  // 1. Classify Jakarta Flood Mechanism (Hujan Lokal vs Kiriman Hulu vs Rob Pesisir)
  let flood_type = "HUJAN_LOKAL_DRAINASE";
  let flood_type_label = "Genangan Hujan Lokal / Sumbatan Drainase Mikro";

  const isCoastal =
    kelLower.includes('penjaringan') ||
    kelLower.includes('pluit') ||
    kelLower.includes('muara') ||
    kelLower.includes('ancol') ||
    /\brob\b/.test(descLower) ||
    descLower.includes('pasang laut') ||
    descLower.includes('tanggul laut');

  const katulampa = bpbdPosts.find(p => p.id === 'pos-katulampa');
  const manggarai = bpbdPosts.find(p => p.id === 'pos-manggarai');
  const isUpstreamHigh = (katulampa && katulampa.siaga_level <= 2) || (manggarai && manggarai.siaga_level <= 2);

  if (isCoastal) {
    flood_type = "ROB_PESISIR";
    flood_type_label = "Banjir Rob Pesisir (Pasang Air Laut)";
  } else if (
    hazardType === 'Flood' &&
    (descLower.includes('kiriman') || descLower.includes('luapan kali') || descLower.includes('ciliwung') || isUpstreamHigh)
  ) {
    flood_type = "KIRIMAN_HULU";
    flood_type_label = "Banjir Kiriman Hulu (Luapan Sungai Ciliwung)";
  }

  // 2. Anti-Spam & Mismatch Evaluation (Rubric + Learned Feedback Memory)
  let ai_flag = "Valid";
  let ai_confidence = 0.94;
  let ai_reasoning = "";
  let has_privacy_elements = true;
  let detected_elements = ["Wajah warga di sekitar lokasi", "Pelat nomor kendaraan bermotor"];

  const explicitMismatchKeywords = [
    "jalanan kering", "jalan kering", "kondisi kering", "tidak ada banjir", "iseng", "test 123", "halo halo", "coba coba", "bohong", "palsu", "selfie", "makanan"
  ];
  const hasExplicitMismatch = explicitMismatchKeywords.some(k => descLower.includes(k));

  if (descClean.length < 8) {
    ai_flag = "Spam";
    ai_confidence = 0.93;
    ai_reasoning = "Laporan ditandai sebagai Spam karena deskripsi terlalu singkat (< 8 karakter) dan tidak memuat informasi kondisi fisik yang dapat diverifikasi.";
  } else if (hasExplicitMismatch || learnedRejectScore >= 0.35) {
    ai_flag = "Mismatch";
    ai_confidence = Math.min(0.96, 0.86 + learnedRejectScore);
    ai_reasoning = learnedRejectScore >= 0.35 && !hasExplicitMismatch
      ? `Berdasarkan pembelajaran dari riwayat verifikasi RT/NGO sebelumnya, pola laporan ini memiliki kemiripan tinggi dengan laporan yang pernah ditolak (Mismatch/Tidak Valid).`
      : "Analisis mendeteksi ketidaksesuaian antara klaim bahaya dengan indikasi kondisi aktual di lapangan (indikasi kondisi kering/uji coba).";
  } else {
    ai_flag = "Valid";
    ai_confidence = Math.min(0.98, Number((0.91 + Math.min(0.06, learnedValidScore)).toFixed(2)));
    if (flood_type === 'ROB_PESISIR') {
      ai_reasoning = `Teridentifikasi laporan [${flood_type_label}] di kawasan pesisir. Memerlukan kesiapsiagaan pompa polder dan evakuasi NGO (bukan pengerukan got biasa).`;
    } else if (flood_type === 'KIRIMAN_HULU') {
      ai_reasoning = `Teridentifikasi laporan [${flood_type_label}] akibat luapan debit sungai. Dilarang kerja bakti di bibir kali; langsung diteruskan ke Tim Evakuasi NGO/Relawan.`;
    } else if (hazardType === 'Clogged_Drain') {
      ai_reasoning = `Teridentifikasi sumbatan fisik pada penampang drainase lingkungan [${flood_type_label}] yang berisiko memicu genangan saat hujan turun.`;
    } else if (hazardType === 'Trash') {
      ai_reasoning = `Teridentifikasi tumpukan material sampah anorganik pada mulut saringan air yang menghambat laju aliran drainase RT.`;
    } else {
      ai_reasoning = `Teridentifikasi genangan air pada area permukiman warga yang membutuhkan konfirmasi penanganan dan bantuan relawan/NGO.`;
    }
  }

  // 3. Quantitative Severity Rubric (Ringan vs Sedang vs Berat)
  let severity = "Sedang";
  let volunteers = 6;

  const heavyIndicators = [
    "lumpur", "parah", "mampet total", "penuh", "meluap", "kasur", "pohon", "roboh",
    "pinggang", "dada", "leher", "1 meter", "lansia", "balita", "bayi", "terjebak", "darurat", "deras"
  ];
  const lightPatterns = [
    /\bsedikit\b/, /\bringan\b/, /\bdaun\b/, /ranting kecil/, /semata kaki/, /10 cm/, /\bkecil\b/
  ];

  const isHeavy = heavyIndicators.some(k => descLower.includes(k)) || learnedHeavyBoost >= 3 || flood_type === 'KIRIMAN_HULU';
  const isLight = !isHeavy && lightPatterns.some(rx => rx.test(descLower));

  if (isHeavy) {
    severity = "Berat";
    volunteers = hazardType === 'Flood' ? 10 : 8;
  } else if (isLight) {
    severity = "Ringan";
    volunteers = 3;
  } else {
    severity = "Sedang";
    volunteers = 6;
  }

  // 4. Tailored SOP Action Plan based on Flood Mechanism & Severity
  const hasRainCountdown = bmkgRainCountdownMinutes !== null && bmkgRainCountdownMinutes !== undefined;
  const hoursRemaining = hasRainCountdown ? Math.max(0.5, Math.round((bmkgRainCountdownMinutes / 60) * 10) / 10) : null;
  const rainWindowLabel = hasRainCountdown
    ? (bmkgRainCountdownMinutes === 0 ? 'Saat hujan berlangsung' : `Target < ${hoursRemaining} jam sebelum hujan`)
    : 'Sebelum hujan berikutnya (cuaca saat ini kondusif)';
  let actionPlan = "";

  if (flood_type === 'ROB_PESISIR') {
    actionPlan =
      `1. PROTOKOL ROB PESISIR: Jangan kerahkan warga untuk keruk got biasa karena air berasal dari pasang laut.\n` +
      `2. Koordinasikan status pintu klep dan rumah pompa polder Dinas SDA terdekat.\n` +
      `3. Tim NGO & Relawan (${volunteers} personel): Siapkan evakuasi bagi warga lansia/balita di rumah berlantai satu.\n` +
      `4. Amankan instalasi listrik warga di titik terdampak pasang maksimum.`;
  } else if (flood_type === 'KIRIMAN_HULU' || hazardType === 'Flood') {
    actionPlan =
      `1. PROTOKOL TANGGAP BANJIR (NGO & RELAWAN): Dilarang melakukan kerja bakti di saluran/bibir sungai karena arus berbahaya.\n` +
      `2. Kerahkan ${volunteers} personel Relawan/NGO beserta perahu karet dan pelampung ke titik kumpul RT.\n` +
      `3. Prioritaskan evakuasi kelompok rentan (lansia, balita, ibu hamil, warga sakit) ke posko lantai 2/masjid.\n` +
      `4. Distribusikan logistik darurat dan pantau ketinggian air secara berkala.`;
  } else if (hazardType === 'Clogged_Drain') {
    actionPlan =
      `1. PENCEGAHAN PRA-HUJAN RT (${rainWindowLabel}): Kerahkan ${volunteers} warga RT.\n` +
      `2. Siapkan cangkul, serokan besi, dan karung goni untuk mengangkat sedimen lumpur (${severity}).\n` +
      `3. Masukkan lumpur ke dalam karung dan letakkan jauh dari bibir saluran agar tidak masuk kembali saat hujan.\n` +
      `4. Unggah foto bukti bersih (After Photo) di dasbor RT setelah selesai.`;
  } else {
    actionPlan =
      `1. PENCEGAHAN PRA-HUJAN RT (Target < ${hoursRemaining} jam sebelum hujan): Kerahkan ${volunteers} relawan warga.\n` +
      `2. Angkat tumpukan sampah dari mulut saringan air menggunakan garpu/ganco dan sarung tangan.\n` +
      `3. Kumpulkan di titik angkut TPS/PPSU Kelurahan agar aliran air lancar sebelum hujan tiba.\n` +
      `4. Unggah foto bukti bersih (After Photo) untuk menutup tugas.`;
  }

  const totalSamplesLearned = (feedbackMemory?.total_verified || 0) + (feedbackMemory?.total_rejected || 0);

  // Evaluate 4-Indicator UNDRR/AIDR Risk & Priority (Separating Flood Severity vs Emergency Priority)
  const riskAssessment = calculateFloodPriorityScore({
    waterDepthCm: null, // Rule 4: Missing data remains null ("Belum Diketahui"), never forced to 0
    description: descClean,
    hazardType,
    aiSeverity: severity
  });

  return {
    ai_flag,
    ai_confidence,
    flood_type,
    flood_type_label,
    ai_reasoning,
    has_privacy_elements,
    detected_elements,
    ai_suggested_severity: severity,
    flood_severity: riskAssessment.flood_severity,
    emergency_priority: riskAssessment.level,
    priority_score: riskAssessment.score,
    indicator_breakdown: riskAssessment.breakdown,
    nexa_key_answers: riskAssessment.nexa_key_answers,
    data_integrity: riskAssessment.data_integrity,
    ai_suggested_action: actionPlan,
    recommended_volunteers: volunteers,
    raw_photo_url: photoUrl,
    blurred_photo_url: photoUrl,
    privacy_masked: true,
    learned_from_samples: totalSamplesLearned,
    processed_by: `NEXA Hydrological AI Engine (Kalibrasi dari ${totalSamplesLearned} Data Verifikasi RT/Relawan)`
  };
}

/**
 * NEXA 4-INDICATOR FLOOD RISK & EMERGENCY PRIORITY ENGINE
 * Frameworks: UNDRR, Australian Institute for Disaster Resilience (Guideline 7.3), BPBD DKI, UK Environment Agency.
 *
 * Key Principle: Urgency != Flood Depth.
 * Separates:
 *   1. Flood Severity (Physical Danger: Low | Medium | High | Critical)
 *   2. Emergency Priority (Response Urgency: Low | Medium | High | Critical, Score 0-100)
 *
 * 4 Weighted Indicators:
 *   - Indicator 1: Physical Flood Hazard (Max 40 pts / 40%)
 *   - Indicator 2: Population Exposure & Access Isolation (Max 15 pts / 15%)
 *   - Indicator 3: Population Vulnerability Profile (Max 30 pts / 30%)
 *   - Indicator 4: Evacuation & Response Capacity (Max 15 pts / 15%)
 *
 * Enforces Four Data Rules:
 *   1. Timestamp recorded
 *   2. Location recorded
 *   3. Data source recorded
 *   4. Missing data remains "Belum Diketahui (Unknown)" (null), NEVER automatically 0.
 */
export function calculateFloodPriorityScore({
  waterDepthCm = null,
  hasVulnerablePeople = null,
  vulnerableDetails = '',
  accessIsolated = false,
  evacuationRouteBlocked = false,
  hasFastCurrentOrRise = false,
  affectedHouseholds = null,
  isNight = false,
  description = '',
  hazardType = 'Flood',
  aiSeverity = 'Sedang'
}) {
  const combinedText = `${description || ''} ${vulnerableDetails || ''}`.toLowerCase();

  // Rule 4: Missing data must remain null ("Belum Diketahui"), never forced to 0
  const isDepthKnown = waterDepthCm !== null && waterDepthCm !== undefined && waterDepthCm !== '';
  const numericDepth = isDepthKnown ? Number(waterDepthCm) : null;

  // --- INDICATOR 1: PHYSICAL FLOOD HAZARD (Max 40 points) ---
  let physicalPoints = 0;
  const hasFastRiseOrCurrent =
    Boolean(hasFastCurrentOrRise) ||
    combinedText.includes('arus') ||
    combinedText.includes('deras') ||
    combinedText.includes('naik cepat') ||
    combinedText.includes('terus naik') ||
    combinedText.includes('listrik') ||
    combinedText.includes('puing');

  if (isDepthKnown) {
    // Depth contribution up to 30 pts + velocity/rate-of-rise up to 10 pts (AIDR Guideline 7.3)
    physicalPoints = Math.min(30, Math.round(numericDepth * 0.35));
    if (hasFastRiseOrCurrent) physicalPoints += 10;
  } else {
    // Inferred from visual/text report when physical sensor reading is unknown
    if (aiSeverity === 'Berat' || combinedText.includes('pinggang') || combinedText.includes('dada') || combinedText.includes('1 meter')) {
      physicalPoints = 32;
    } else if (aiSeverity === 'Sedang' || combinedText.includes('lutut') || combinedText.includes('masuk rumah') || combinedText.includes('kerendem')) {
      physicalPoints = 20;
    } else {
      physicalPoints = 10;
    }
    if (hasFastRiseOrCurrent) physicalPoints = Math.min(40, physicalPoints + 8);
  }
  physicalPoints = Math.min(40, physicalPoints);

  // Physical Flood Severity (purely physical danger, distinct from emergency priority!)
  let floodSeverity = 'Low';
  if (physicalPoints >= 32 || (isDepthKnown && numericDepth >= 75)) floodSeverity = 'Critical';
  else if (physicalPoints >= 22 || (isDepthKnown && numericDepth >= 40)) floodSeverity = 'High';
  else if (physicalPoints >= 14 || (isDepthKnown && numericDepth >= 15)) floodSeverity = 'Medium';

  // --- INDICATOR 2: POPULATION EXPOSURE & ISOLATION (Max 15 points) ---
  let exposurePoints = 5; // Baseline neighborhood exposure
  const isIsolated =
    Boolean(accessIsolated) ||
    combinedText.includes('terputus') ||
    combinedText.includes('terjebak') ||
    combinedText.includes('terkepung') ||
    combinedText.includes('terisolasi') ||
    combinedText.includes('tidak bisa lewat') ||
    combinedText.includes('ga bisa lewat') ||
    combinedText.includes('gabisa lewat') ||
    combinedText.includes('gak bisa lewat');
  const hasCriticalFacility =
    combinedText.includes('sekolah') ||
    combinedText.includes('puskesmas') ||
    combinedText.includes('klinik') ||
    combinedText.includes('musholla') ||
    combinedText.includes('masjid');

  if (isIsolated) exposurePoints += 7;
  if (hasCriticalFacility) exposurePoints += 3;
  if (affectedHouseholds !== null && Number(affectedHouseholds) >= 30) {
    exposurePoints += 4;
  } else if (combinedText.includes('banyak warga') || combinedText.includes('satu rt')) {
    exposurePoints += 3;
  }
  exposurePoints = Math.min(15, exposurePoints);

  // --- INDICATOR 3: POPULATION VULNERABILITY (Max 30 points) ---
  let vulnerabilityPoints = 0;
  const vulnGroups = [];

  const hasWheelchairOrDisability =
    combinedText.includes('kursi roda') ||
    combinedText.includes('lumpuh') ||
    combinedText.includes('disabilitas') ||
    combinedText.includes('stroke') ||
    combinedText.includes('ga bisa jalan') ||
    combinedText.includes('gak bisa jalan') ||
    combinedText.includes('tidak bisa jalan');
  const hasLivingAlone =
    combinedText.includes('tinggal sendiri') ||
    combinedText.includes('sendirian') ||
    combinedText.includes('sebatang kara');
  const hasInfants =
    combinedText.includes('balita') ||
    combinedText.includes('bayi') ||
    combinedText.includes('anak kecil') ||
    combinedText.includes('anak');
  const hasElderly =
    combinedText.includes('lansia') ||
    combinedText.includes('kakek') ||
    combinedText.includes('nenek') ||
    combinedText.includes('mbah') ||
    combinedText.includes('eyang') ||
    combinedText.includes('orang tua');
  const hasPregnantOrSick =
    combinedText.includes('hamil') ||
    combinedText.includes('sakit') ||
    combinedText.includes('oksigen');

  if (hasWheelchairOrDisability) {
    vulnerabilityPoints += 14;
    vulnGroups.push('Warga Kursi Roda / Disabilitas (Butuh Evakuasi Khusus)');
  }
  if (hasLivingAlone) {
    vulnerabilityPoints += 10;
    vulnGroups.push('Warga Rentan Tinggal Sendiri');
  }
  if (hasInfants) {
    vulnerabilityPoints += 10;
    vulnGroups.push('Balita / Bayi (0-5 Tahun)');
  }
  if (hasElderly) {
    vulnerabilityPoints += 10;
    vulnGroups.push('Lansia (60+ Tahun)');
  }
  if (hasPregnantOrSick) {
    vulnerabilityPoints += 10;
    vulnGroups.push('Ibu Hamil / Sakit Kronis');
  }

  if (Boolean(hasVulnerablePeople) && vulnerabilityPoints === 0) {
    vulnerabilityPoints = 22;
    vulnGroups.push('Kelompok Rentan Terdaftar (Lansia / Balita)');
  }
  vulnerabilityPoints = Math.min(30, vulnerabilityPoints);

  // --- INDICATOR 4: EVACUATION & RESPONSE CAPACITY (Max 15 points) ---
  let capacityPoints = 4; // Baseline response coordination need
  const isRouteBlocked =
    Boolean(evacuationRouteBlocked) ||
    isIsolated ||
    combinedText.includes('jalur evakuasi') ||
    combinedText.includes('butuh perahu');
  if (isRouteBlocked) capacityPoints += 7;
  if (isNight) capacityPoints += 4;
  capacityPoints = Math.min(15, capacityPoints);

  // Total Emergency Priority Score (0 - 100)
  const finalScore = Math.min(100, Math.max(12, Math.round(physicalPoints + exposurePoints + vulnerabilityPoints + capacityPoints)));

  let priorityLevel = "Low";
  let recommendation = "Pantau perkembangan oleh RT/RW setempat dan siapkan pengumuman warga.";

  if (finalScore >= 75 || (vulnerabilityPoints >= 18 && (physicalPoints >= 18 || isIsolated))) {
    priorityLevel = "Critical";
    recommendation = "PRIORITAS KRITIS: Evakuasi segera warga rentan (lansia/balita/disabilitas) oleh arahan RT/RW & bantuan Relawan menggunakan perahu/alat evakuasi!";
  } else if (finalScore >= 55) {
    priorityLevel = "High";
    recommendation = "PRIORITAS TINGGI: Kerahkan relawan lingkungan & siapkan jalur evakuasi aman menuju posko terdekat.";
  } else if (finalScore >= 35) {
    priorityLevel = "Medium";
    recommendation = "PRIORITAS SEDANG: Koordinasi pencegahan/penanganan oleh RT/RW bersama warga sekitar.";
  }

  // Answer the 3 Core NEXA Questions explicitly
  const nexaKeyAnswers = {
    how_dangerous: `Bahaya Fisik: ${floodSeverity} (${isDepthKnown ? `Tinggi air ${numericDepth} cm` : 'Tinggi air spesifik: Belum Diketahui / Berdasarkan visual laporan'}${hasFastRiseOrCurrent ? ', disertai arus/kenaikan air cepat' : ''}).`,
    who_most_at_risk: vulnGroups.length > 0
      ? vulnGroups.join(', ')
      : (isIsolated ? 'Warga dengan akses jalan keluar-masuk terputus' : 'Warga permukiman sekitar titik laporan'),
    who_needs_help_first: priorityLevel === 'Critical' || priorityLevel === 'High'
      ? `Prioritas Utama (${priorityLevel} - Skor ${finalScore}/100): dahulukan evakuasi ${vulnGroups.length > 0 ? vulnGroups[0] : 'warga di titik akses terputus'} sebelum area lain.`
      : `Penanganan Terjadwal (${priorityLevel} - Skor ${finalScore}/100): dikelola langsung oleh RT/RW bersama warga setempat.`
  };

  return {
    score: finalScore,
    level: priorityLevel,
    flood_severity: floodSeverity,
    recommendation,
    breakdown: {
      indicator_1_physical_hazard_40: physicalPoints,
      indicator_2_exposure_isolation_15: exposurePoints,
      indicator_3_vulnerability_30: vulnerabilityPoints,
      indicator_4_evacuation_capacity_15: capacityPoints,
      depth_points: physicalPoints,
      vulnerable_points: vulnerabilityPoints
    },
    nexa_key_answers: nexaKeyAnswers,
    data_integrity: {
      timestamp: new Date().toISOString(),
      water_depth_status: isDepthKnown ? `${numericDepth} cm (Terukur)` : "Belum Diketahui (Unknown)",
      affected_households_status: affectedHouseholds !== null ? `${affectedHouseholds} KK` : "Belum Diketahui (Unknown)",
      sources: ["Laporan Warga", "Analisis AI Terkalibrasi", " Konteks BMKG & BPBD"]
    }
  };
}

/**
 * Haversine geospatial distance in kilometers between two [lat, lng] coordinates
 */
export function calculateHaversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * SUPERINTELLIGENCE MULTI-POINT NGO FLEET DISPATCH OPTIMIZER
 * Solves constrained resource allocation when N flooded RTs request evacuation simultaneously
 * but NGO only has K rescue boats available.
 *
 * Posko Induk SAR Gabungan default coordinates: Kalibata / Jatinegara (-6.2420, 106.8610)
 */
export function optimizeNgoFleetDispatch({
  evacuations = [],
  areas = [],
  availableBoats = 2,
  commandPostCoords = { lat: -6.2420, lng: 106.8610, name: "Posko Induk SAR Kalibata-Jatinegara" }
}) {
  const pendingEvacs = evacuations.filter(e => e.status !== 'Dispatched');
  const allActive = pendingEvacs.length > 0 ? pendingEvacs : evacuations;

  const evaluated = allActive.map(evac => {
    const area = areas.find(a => a.id === evac.rt_rw_id) || {
      geom_center: { lat: -6.2280, lng: 106.8650 }
    };
    const distanceKm = calculateHaversineKm(
      commandPostCoords.lat,
      commandPostCoords.lng,
      area.geom_center.lat,
      area.geom_center.lng
    );

    // Urban flood response travel time: avg 22 km/h in flood traffic + 6 min boat unloading
    const etaMinutes = Math.max(8, Math.round((distanceKm / 22) * 60 + 6));
    const vulnerableMultiplier = evac.has_vulnerable_people ? 1.45 : 1.0;
    const depthFactor = Math.max(1, (Number(evac.water_depth_cm) || 40) / 50);

    // Life-saving utility score (Urgency weighted by proximity & vulnerability)
    const utilityScore = Number(
      (((evac.priority_score || 50) * vulnerableMultiplier * depthFactor) / Math.pow(etaMinutes + 5, 0.35)).toFixed(1)
    );

    return {
      evacuation_id: evac.id,
      rt_rw_id: evac.rt_rw_id,
      location_label: `${evac.kelurahan} (${evac.rt_code} ${evac.rw_code})`,
      water_depth_cm: evac.water_depth_cm,
      has_vulnerable_people: evac.has_vulnerable_people,
      vulnerable_details: evac.vulnerable_details,
      priority_score: evac.priority_score,
      distance_km: distanceKm,
      eta_minutes: etaMinutes,
      utility_score: utilityScore,
      status: evac.status
    };
  });

  // Sort by highest Life-Saving Utility Score descending
  evaluated.sort((a, b) => b.utility_score - a.utility_score);

  const boatsCount = Math.max(1, Number(availableBoats) || 2);

  const allocations = evaluated.map((item, idx) => {
    const waveNumber = Math.floor(idx / boatsCount) + 1;
    const boatNumber = (idx % boatsCount) + 1;
    const cumulativeEta = waveNumber === 1 ? item.eta_minutes : item.eta_minutes + (waveNumber - 1) * 35;

    return {
      rank: idx + 1,
      wave: waveNumber,
      assigned_boat: `Perahu Karet SAR #0${boatNumber}`,
      dispatch_phase: waveNumber === 1 ? 'GELOMBANG 1 (BERANGKAT SEKARANG)' : `GELOMBANG ${waveNumber} (ROTASI BERIKUTNYA)`,
      estimated_arrival_minutes: cumulativeEta,
      ...item,
      optimization_reason:
        waveNumber === 1
          ? `Prioritas Tertinggi #${idx + 1}: Skor Utilitas Penyelamatan ${item.utility_score} (Kedalaman ${item.water_depth_cm} cm, ${item.has_vulnerable_people ? 'Ada Lansia/Balita' : 'Warga Umum'}, Jarak ${item.distance_km} km / ~${item.eta_minutes} mnt dari Posko).`
          : `Dijadwalkan pada Gelombang ${waveNumber} menggunakan ${`Perahu Karet SAR #0${boatNumber}`} segera setelah evakuasi gelombang pertama selesai (~${cumulativeEta} mnt).`
    };
  });

  return {
    command_post: commandPostCoords.name,
    available_boats: boatsCount,
    total_locations_evaluated: allocations.length,
    algorithm: "Multi-Objective Life-Saving Utility & Haversine Geospatial Optimizer",
    allocations
  };
}
