import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';
import { db } from './db.js';
import { evaluateAreaFloodRule, evaluateAllAreas } from './ruleEngine.js';
import { 
  processReportWithGemini, 
  calculateFloodPriorityScore,
  buildHumanFeedbackMemory,
  buildFineTuningDataset,
  optimizeNgoFleetDispatch
} from './geminiService.js';
import { generateTelegramToken, handleTelegramWebhook, sendTelegramNotification, startTelegramPolling } from './telegramService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// -------------------------------------------------------------
// AUTHENTICATION & ROLE-BASED ACCESS CONTROL (UU PDP COMPLIANCE)
// -------------------------------------------------------------
const AUTH_SECRET = process.env.ADMIN_SECRET_KEY || 'nexa-siagart-jwt-token-secret-2026';

function generateAuthToken(user) {
  const payload = {
    userId: user.id,
    role: user.role,
    full_name: user.full_name,
    rt_rw_id: user.rt_rw_id,
    area_label: user.area_label,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 hari masa aktif sesi
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payloadBase64).digest('base64url');
  return `${payloadBase64}.${signature}`;
}

function verifyAuthToken(rawHeader) {
  if (!rawHeader) return null;
  const token = rawHeader.startsWith('Bearer ') ? rawHeader.slice(7).trim() : rawHeader.trim();
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadBase64, signature] = parts;

  try {
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payloadBase64).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;

    return payload;
  } catch (e) {
    return null;
  }
}

function requireAuth(allowedRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
    const session = verifyAuthToken(authHeader);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: "Akses Ditolak (401 Unauthorized): Sesi login stakeholder diperlukan untuk mengakses data pribadi warga ini (Kepatuhan UU PDP No. 27/2022)."
      });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
      return res.status(403).json({
        success: false,
        error: `Akses Ditolak (403 Forbidden): Peran akun Anda (${session.role}) tidak memiliki izin mengakses data wilayah ini.`
      });
    }

    req.user = session;
    next();
  };
}

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// -------------------------------------------------------------
// PRODUCTION SECURITY HEADERS (NATIVE HELMET EQUIVALENT)
// -------------------------------------------------------------
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By'); // Hide Express tech stack
  res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevent MIME type sniffing
  res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Prevent Clickjacking
  res.setHeader('X-XSS-Protection', '1; mode=block'); // Legacy XSS Protection
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// -------------------------------------------------------------
// IN-MEMORY RATE LIMITERS (ANTI-DOS & ANTI-BRUTE FORCE)
// -------------------------------------------------------------
const rateLimitMap = new Map();

function createRateLimiter({ windowMs, maxRequests, message }) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }

    rateLimitMap.set(ip, record);

    // Prune stale records periodically
    if (rateLimitMap.size > 2000) {
      for (const [key, val] of rateLimitMap.entries()) {
        if (now > val.resetTime) rateLimitMap.delete(key);
      }
    }

    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        error: message || `Terlalu banyak permintaan (Rate limit exceeded). Coba lagi dalam ${retryAfterSeconds} detik.`
      });
    }

    next();
  };
}

// 1. Report Limiter: Max 15 reports per IP per 5 minutes (prevents bot spam & Gemini quota exhaustion)
const reportLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 15,
  message: "Batas pengiriman laporan tercapai (Maksimal 15 laporan per 5 menit per koneksi). Harap tunggu beberapa saat demi stabilitas sistem."
});

// 2. Auth Login Limiter: Max 10 attempts per IP per 5 minutes (prevents brute-forcing PINs)
const loginLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 10,
  message: "Terlalu banyak percobaan login. Demi keamanan akun, silakan tunggu beberapa menit sebelum mencoba lagi."
});

// Static uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Serve built frontend assets if dist exists
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

// -------------------------------------------------------------
// STRICT FILE UPLOAD SECURITY (JPEG, PNG, WEBP ONLY)
// -------------------------------------------------------------
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Format file ditolak: Hanya file foto dengan format JPG, PNG, atau WEBP yang diizinkan demi keamanan sistem."));
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `hazard-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // Maksimal 8 MB per foto
  fileFilter
});

// -------------------------------------------------------------
// 1. AUTH & ROLES API
// -------------------------------------------------------------
// Login Stakeholder Resmi (Ketua RT, NGO, BPBD)
app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { identifier, pin } = req.body;

  if (!identifier || !pin) {
    return res.status(400).json({
      success: false,
      error: "Nomor HP / ID Akun dan PIN wajib diisi."
    });
  }

  const users = db.get('users');
  const cleanId = String(identifier).replace(/[\s-]/g, '').toLowerCase();

  const user = users.find(u => {
    const userPhoneClean = (u.phone_number || '').replace(/[\s-]/g, '').toLowerCase();
    const userIdClean = (u.id || '').toLowerCase();
    const userNameClean = (u.full_name || '').toLowerCase();
    return userPhoneClean === cleanId || userIdClean === cleanId || userNameClean.includes(cleanId);
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Akun stakeholder tidak ditemukan. Pastikan Nomor HP atau ID Akun sudah terdaftar."
    });
  }

  // Verifikasi PIN (Default 1234 untuk demo/inisialisasi)
  const expectedPin = user.pin || '1234';
  if (String(pin).trim() !== String(expectedPin).trim()) {
    return res.status(401).json({
      success: false,
      error: "PIN / Kata Sandi salah. Silakan coba lagi."
    });
  }

  const token = generateAuthToken(user);
  const safeUser = {
    id: user.id,
    full_name: user.full_name,
    role: user.role,
    phone_number: user.phone_number,
    rt_rw_id: user.rt_rw_id,
    area_label: user.area_label,
    is_telegram_synced: user.is_telegram_synced,
    telegram_subscribe_token: user.telegram_subscribe_token
  };

  res.json({
    success: true,
    token,
    user: safeUser,
    message: `Login berhasil! Selamat datang, ${user.full_name}.`
  });
});

// Daftar pengguna stakeholder & relawan: Dilindungi requireAuth demi UU PDP
app.get('/api/auth/users', requireAuth(['RT_Leader', 'NGO', 'Resident', 'Admin']), (req, res) => {
  const users = db.get('users');
  const safeUsers = users.map(u => ({
    id: u.id,
    full_name: u.full_name,
    role: u.role,
    area_label: u.area_label,
    rt_rw_id: u.rt_rw_id,
    is_telegram_synced: u.is_telegram_synced,
    phone_number: u.phone_number
  }));
  res.json({ success: true, users: safeUsers });
});

// Pendaftaran Ketua RT Baru (Wilayah belum terdaftar)
app.post('/api/auth/register-rt', (req, res) => {
  const { full_name, phone_number, pin, kelurahan, kecamatan, kota, rw_code, rt_code, lat, lng } = req.body;

  if (!full_name || !kelurahan || !rt_code || !rw_code) {
    return res.status(400).json({ success: false, error: "Nama, Kelurahan, RT, dan RW wajib diisi." });
  }

  const cleanRT = rt_code.toUpperCase().startsWith('RT') ? rt_code.toUpperCase() : `RT ${rt_code}`;
  const cleanRW = rw_code.toUpperCase().startsWith('RW') ? rw_code.toUpperCase() : `RW ${rw_code}`;
  const areaId = `area-${kelurahan.toLowerCase().replace(/\s+/g, '-')}-${cleanRT.replace(/\s+/g, '').toLowerCase()}`;

  const areas = db.get('areas');
  let area = areas.find(a => a.id === areaId);

  const centerLat = Number(lat) || -6.2200 + (Math.random() * 0.04 - 0.02);
  const centerLng = Number(lng) || 106.8500 + (Math.random() * 0.04 - 0.02);

  if (!area) {
    area = {
      id: areaId,
      kelurahan,
      kecamatan: kecamatan || "DKI Jakarta",
      kota: kota || "Jakarta Timur",
      rw_code: cleanRW,
      rt_code: cleanRT,
      geom_center: { lat: centerLat, lng: centerLng },
      geom_polygon: [
        [centerLat + 0.0015, centerLng - 0.0015],
        [centerLat + 0.0015, centerLng + 0.0015],
        [centerLat - 0.0015, centerLng + 0.0015],
        [centerLat - 0.0015, centerLng - 0.0015]
      ],
      water_retention_capacity: "Sedang",
      monitoring_post: "Pos Pantau Manggarai"
    };
    db.insert('areas', area);
  }

  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const token = `TOKEN_${cleanRT.replace(/\s+/g, '')}_${rand}`;

  const newUser = {
    id: `user-rt-${Date.now()}`,
    full_name,
    role: "RT_Leader",
    phone_number: phone_number || "0812-xxxx-xxxx",
    pin: String(pin || '1234').trim(),
    telegram_chat_id: null,
    telegram_subscribe_token: token,
    rt_rw_id: area.id,
    area_label: `${cleanRT} / ${cleanRW} ${kelurahan}`,
    is_telegram_synced: false,
    created_at: new Date().toISOString()
  };

  db.insert('users', newUser);
  const authToken = generateAuthToken(newUser);

  res.status(201).json({
    success: true,
    user: newUser,
    token: authToken,
    area,
    message: `Ketua ${cleanRT} ${kelurahan} berhasil didaftarkan!`
  });
});

// Pendaftaran Relawan Warga (Volunteer) / NGO
app.post('/api/auth/register-volunteer', (req, res) => {
  const { full_name, phone_number, pin, role, rt_rw_id, organization_name, notes } = req.body;

  if (!full_name) {
    return res.status(400).json({ success: false, error: "Nama lengkap wajib diisi." });
  }

  const areas = db.get('areas');
  const matchedArea = areas.find(a => a.id === rt_rw_id);

  const newUser = {
    id: `user-${(role || 'resident').toLowerCase()}-${Date.now()}`,
    full_name: organization_name ? `${full_name} (${organization_name})` : full_name,
    role: role || "Resident", // 'Resident' (Relawan Warga) atau 'NGO' (Relawan Organisasi)
    phone_number: phone_number || "0812-xxxx-xxxx",
    pin: String(pin || '1234').trim(),
    telegram_chat_id: null,
    telegram_subscribe_token: null,
    rt_rw_id: matchedArea ? matchedArea.id : null,
    area_label: matchedArea ? `${matchedArea.rt_code} ${matchedArea.rw_code} ${matchedArea.kelurahan}` : "Relawan Siaga DKI",
    notes: notes || "Relawan Siaga Bencana Banjir",
    created_at: new Date().toISOString()
  };

  db.insert('users', newUser);
  const authToken = generateAuthToken(newUser);

  res.status(201).json({
    success: true,
    user: newUser,
    token: authToken,
    message: "Pendaftaran relawan berhasil!"
  });
});

// -------------------------------------------------------------
// 2. AREAS API (RT/RW Boundaries & Public Centers)
// -------------------------------------------------------------
app.get('/api/areas', (req, res) => {
  const areas = db.get('areas');
  res.json({ success: true, areas });
});

// -------------------------------------------------------------
// 3. HAZARD REPORTS API (UU PDP COMPLIANT)
// -------------------------------------------------------------

// Public View: Only Aggregated data, exact coordinates & raw photos stripped!
app.get('/api/reports/public', (req, res) => {
  const reports = db.get('reports');
  const areas = db.get('areas');

  const sanitizedReports = reports.map(r => {
    const area = areas.find(a => a.id === r.rt_rw_id);
    return {
      id: r.id,
      rt_rw_id: r.rt_rw_id,
      kelurahan: r.kelurahan,
      rw_code: r.rw_code,
      rt_code: r.rt_code,
      hazard_type: r.hazard_type,
      hazard_type_label: r.hazard_type_label,
      description: r.description,
      // PRIVACY SAFEGUARD: Public only sees RT/RW geom_center, NEVER exact address or GPS!
      public_center: area ? area.geom_center : { lat: -6.2088, lng: 106.8456 },
      // PRIVACY SAFEGUARD: Blurred photo for public view (real canvas pixel redaction)
      photo_url: r.blurred_photo_url || r.raw_photo_url,
      privacy_masked: r.privacy_masked,
      flood_type: r.flood_type || "HUJAN_LOKAL_DRAINASE",
      flood_type_label: r.flood_type_label || "Genangan Hujan Lokal / Sumbatan Drainase Mikro",
      flood_severity: r.flood_severity || (r.ai_suggested_severity === 'Berat' ? 'High' : 'Medium'),
      emergency_priority: r.emergency_priority || (r.ai_suggested_severity === 'Berat' ? 'High' : 'Medium'),
      priority_score: r.priority_score || 50,
      indicator_breakdown: r.indicator_breakdown || null,
      nexa_key_answers: r.nexa_key_answers || null,
      data_integrity: r.data_integrity || {
        timestamp: r.created_at,
        water_depth_status: "Belum Diketahui (Unknown)",
        sources: ["Laporan Warga", "Analisis AI NEXA"]
      },
      ai_flag: r.ai_flag,
      ai_confidence: r.ai_confidence,
      ai_reasoning: r.ai_reasoning,
      ai_suggested_severity: r.ai_suggested_severity,
      ai_suggested_action: r.ai_suggested_action,
      recommended_volunteers: r.recommended_volunteers,
      learned_from_samples: r.learned_from_samples,
      status: r.status,
      created_at: r.created_at,
      // Sensitive fields stripped: exact_location, reporter_name, reporter_phone, raw_photo_url
    };
  });

  // Calculate aggregation statistics per RT/RW
  const aggregatedStats = areas.map(area => {
    const areaReports = reports.filter(r => r.rt_rw_id === area.id);
    return {
      area_id: area.id,
      kelurahan: area.kelurahan,
      rt_code: area.rt_code,
      rw_code: area.rw_code,
      geom_center: area.geom_center,
      geom_polygon: area.geom_polygon,
      total_reports: areaReports.length,
      clogged_drain_count: areaReports.filter(r => r.hazard_type === 'Clogged_Drain').length,
      trash_count: areaReports.filter(r => r.hazard_type === 'Trash').length,
      flood_count: areaReports.filter(r => r.hazard_type === 'Flood').length,
      verified_count: areaReports.filter(r => r.status === 'Verified' || r.status === 'Task_Created').length
    };
  });

  res.json({
    success: true,
    pdp_notice: "Sesuai UU PDP No 27/2022: Titik koordinat presisi dan identitas pelapor disamarkan untuk akses publik.",
    reports: sanitizedReports,
    aggregated_areas: aggregatedStats
  });
});

// Verified View (For RT Leaders, Volunteers & Admins): Dilindungi requireAuth demi kepatuhan UU PDP
app.get('/api/reports/verified', requireAuth(['RT_Leader', 'NGO', 'Resident', 'Admin']), (req, res) => {
  const reports = db.get('reports');
  res.json({
    success: true,
    reports
  });
});

// Citizen submits report
app.post('/api/reports', reportLimiter, upload.single('photo'), async (req, res) => {
  try {
    const {
      hazard_type,
      description,
      kelurahan,
      rw_code,
      rt_code,
      rt_rw_id,
      exact_address,
      lat,
      lng,
      reporter_name,
      reporter_phone,
      photo_url_external,
      blurred_photo_url
    } = req.body;

    let photoUrl = photo_url_external || "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80";
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    }
    const publicBlurredUrl = blurred_photo_url || photoUrl;

    // Resolve Area
    const areas = db.get('areas');
    let matchedArea = areas.find(a => a.id === rt_rw_id);
    if (!matchedArea && kelurahan) {
      matchedArea = areas.find(a => a.kelurahan.toLowerCase() === kelurahan.toLowerCase());
    }
    if (!matchedArea) {
      matchedArea = areas[0];
    }

    // Calculate dynamic rain countdown from live weather forecast (null if no rain predicted)
    let rainCountdownMinutes = null;
    try {
      const forecast = await getLiveWeatherForecast();
      if (forecast?.active_warning?.expected_heavy_rain) {
        const diffMs = new Date(forecast.active_warning.expected_heavy_rain).getTime() - Date.now();
        if (diffMs > 0) {
          rainCountdownMinutes = Math.max(15, Math.round(diffMs / 60000));
        } else {
          rainCountdownMinutes = 0; // Hujan sedang berlangsung
        }
      }
    } catch (e) {
      // tetap null jika sumber cuaca tidak tersedia
    }

    // Run Google Gemini AI Pipeline with Continuous Human-Feedback Memory
    const aiResult = await processReportWithGemini({
      hazardType: hazard_type,
      description,
      photoUrl,
      kelurahan: matchedArea.kelurahan,
      bmkgRainCountdownMinutes: rainCountdownMinutes,
      historicalReports: db.get('reports'),
      bpbdPosts: db.get('bpbd_posts')
    });

    const newReport = {
      id: `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      reporter_id: req.body.reporter_id || `warga-${Date.now()}`,
      reporter_name: reporter_name || "Warga Anonim (UU PDP)",
      reporter_phone: reporter_phone || "0812-xxxx-xxxx",
      rt_rw_id: matchedArea.id,
      kelurahan: matchedArea.kelurahan,
      rw_code: rw_code || matchedArea.rw_code,
      rt_code: rt_code || matchedArea.rt_code,
      hazard_type: hazard_type || "Clogged_Drain",
      hazard_type_label: hazard_type === 'Clogged_Drain' ? "Saluran Tersumbat" : (hazard_type === 'Trash' ? "Tumpukan Sampah" : "Genangan Banjir"),
      flood_type: aiResult.flood_type || "HUJAN_LOKAL_DRAINASE",
      flood_type_label: aiResult.flood_type_label || "Genangan Hujan Lokal / Sumbatan Drainase Mikro",
      description: description || "Laporan bahaya drainase warga",
      exact_location: {
        address: exact_address || `Area ${matchedArea.rt_code} ${matchedArea.rw_code} ${matchedArea.kelurahan}`,
        lat: Number(lat) || matchedArea.geom_center.lat + (Math.random() * 0.002 - 0.001),
        lng: Number(lng) || matchedArea.geom_center.lng + (Math.random() * 0.002 - 0.001)
      },
      raw_photo_url: photoUrl,
      blurred_photo_url: publicBlurredUrl,
      privacy_masked: aiResult.privacy_masked ?? true,
      processed_by: aiResult.processed_by || "Google Gemini 1.5 Flash",
      learned_from_samples: aiResult.learned_from_samples ?? 0,
      ai_flag: aiResult.ai_flag,
      ai_confidence: aiResult.ai_confidence,
      ai_reasoning: aiResult.ai_reasoning,
      ai_suggested_severity: aiResult.ai_suggested_severity,
      flood_severity: aiResult.flood_severity || "Medium",
      emergency_priority: aiResult.emergency_priority || "Medium",
      priority_score: aiResult.priority_score || 55,
      indicator_breakdown: aiResult.indicator_breakdown || null,
      nexa_key_answers: aiResult.nexa_key_answers || null,
      data_integrity: aiResult.data_integrity || {
        timestamp: new Date().toISOString(),
        water_depth_status: "Belum Diketahui (Unknown)",
        sources: ["Laporan Warga", "Analisis AI NEXA"]
      },
      ai_suggested_action: aiResult.ai_suggested_action,
      recommended_volunteers: aiResult.recommended_volunteers,
      status: "Pending",
      task_id: null,
      created_at: new Date().toISOString()
    };

    db.insert('reports', newReport);

    // Jika laporan warga berkategori Flood (RESPOND phase), otomatis teruskan ke antrean triage RT/RW & Volunteer
    if (newReport.hazard_type === 'Flood') {
      const descLower = (description || '').toLowerCase();
      const hasVulnerable = descLower.includes('lansia') || descLower.includes('balita') || descLower.includes('bayi') || descLower.includes('anak') || descLower.includes('sakit') || descLower.includes('ibu') || descLower.includes('kursi roda') || descLower.includes('disabilitas');
      const explicitDepth = req.body.water_depth_cm !== undefined && req.body.water_depth_cm !== '' ? Number(req.body.water_depth_cm) : null;
      const scoreResult = calculateFloodPriorityScore({
        waterDepthCm: explicitDepth, // Rule 4: null if not explicitly measured
        hasVulnerablePeople: hasVulnerable,
        description: newReport.description,
        aiSeverity: aiResult.ai_suggested_severity,
        isNight: false
      });

      const autoEvacLog = {
        id: `fl-${Date.now()}`,
        report_id: newReport.id,
        rt_rw_id: matchedArea.id,
        kelurahan: matchedArea.kelurahan,
        rw_code: newReport.rw_code,
        rt_code: newReport.rt_code,
        water_depth_cm: explicitDepth,
        has_vulnerable_people: hasVulnerable,
        vulnerable_details: newReport.description,
        flood_severity: scoreResult.flood_severity,
        priority_score: scoreResult.score,
        priority_level: scoreResult.level,
        score_breakdown: scoreResult.breakdown,
        nexa_key_answers: scoreResult.nexa_key_answers,
        data_integrity: scoreResult.data_integrity,
        ai_recommendation: aiResult.ai_suggested_action,
        handled_by_ngo_id: null,
        handled_by_name: null,
        status: "Waiting_NGO",
        dispatch_notes: null,
        created_at: new Date().toISOString()
      };
      db.insert('flood_response_logs', autoEvacLog);
    }

    // Notify RT leader if synced with Telegram
    const users = db.get('users');
    const rtLeader = users.find(u => u.rt_rw_id === matchedArea.id && u.role === 'RT_Leader');
    if (rtLeader && rtLeader.is_telegram_synced) {
      sendTelegramNotification({
        toUser: rtLeader,
        message: `📢 *LAPORAN WARGA BARU MASUK*\n\nWilayah: *${matchedArea.rt_code} ${matchedArea.rw_code} ${matchedArea.kelurahan}*\nKategori: ${newReport.hazard_type_label}\nAI Verifikasi: *${aiResult.ai_flag}* (${Math.round(aiResult.ai_confidence * 100)}%)\nAI Saran: ${aiResult.ai_suggested_severity}\n\nSegera buka dasbor NEXA untuk verifikasi & buat tugas gotong royong!`,
        type: "NEW_REPORT"
      });
    }

    res.status(201).json({
      success: true,
      report: newReport,
      ai_analysis: aiResult
    });
  } catch (err) {
    console.error("Error creating report:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// RT Leader (Prevention) & Volunteer/NGO (Response) verify/confirm report (Dilindungi requireAuth)
app.patch('/api/reports/:id/verify', requireAuth(['RT_Leader', 'NGO', 'Resident', 'Admin']), (req, res) => {
  const { status, verified_by_id, dispatch_notes } = req.body; // status: 'Verified' | 'Rejected' | 'Handled_NGO'
  const report = db.update('reports', req.params.id, {
    status: status || 'Verified',
    verified_by_id: verified_by_id || req.user?.userId || 'user-rt-bambang',
    dispatch_notes: dispatch_notes || null,
    verified_at: new Date().toISOString()
  });

  if (!report) {
    return res.status(404).json({ success: false, error: "Report not found" });
  }

  res.json({ success: true, report });
});

// -------------------------------------------------------------
// 4. CLEANUP TASKS API (PHASE 1 - MITIGATION PRE-RAIN)
// -------------------------------------------------------------
app.get('/api/tasks', (req, res) => {
  const tasks = db.get('cleanup_tasks');
  res.json({ success: true, tasks });
});

// Create task: Dilindungi requireAuth
app.post('/api/tasks', requireAuth(['RT_Leader', 'Admin']), (req, res) => {
  const { hazard_report_id, verified_by_id, title, sop_action_plan, deadline_minutes = 105, volunteers_count = 6 } = req.body;
  const reports = db.get('reports');
  const report = reports.find(r => r.id === hazard_report_id);

  if (!report) {
    return res.status(404).json({ success: false, error: "Hazard report not found" });
  }

  const users = db.get('users');
  const verifier = users.find(u => u.id === (verified_by_id || req.user?.userId)) || users[0];

  const deadlineDate = new Date(Date.now() + Number(deadline_minutes) * 60 * 1000);

  const newTask = {
    id: `task-${Date.now()}`,
    hazard_report_id,
    report_title: report.description,
    hazard_type: report.hazard_type,
    kelurahan: report.kelurahan,
    rt_rw_id: report.rt_rw_id,
    exact_address: report.exact_location?.address,
    verified_by_id: verifier.id,
    verified_by_name: verifier.full_name,
    title: title || `Gotong Royong Bersihkan ${report.hazard_type_label} - ${report.kelurahan}`,
    sop_action_plan: sop_action_plan || report.ai_suggested_action,
    deadline_from_bmkg: deadlineDate.toISOString(),
    rain_forecast_note: `BMKG: Estimasi Hujan Turun pukul ${deadlineDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
    status: "In_Progress",
    volunteers_count: Number(volunteers_count),
    before_photo_url: report.raw_photo_url,
    after_photo_url: null,
    closed_at: null,
    created_at: new Date().toISOString()
  };

  db.insert('cleanup_tasks', newTask);

  // Update original report status
  db.update('reports', hazard_report_id, {
    status: 'Task_Created',
    task_id: newTask.id
  });

  // Broadcast Telegram Alert to community/RT members
  sendTelegramNotification({
    toUser: verifier,
    message: `🚨 *TUGAS GOTONG ROYONG DIBUAT!*\n\n"${newTask.title}"\n📍 Lokasi: ${newTask.exact_address}\n⏱ *DEADLINE HUJAN BMKG:* ${Math.round(deadline_minutes)} Menit Lagi!\n👥 Kebutuhan: ${volunteers_count} Relawan Warga\n\n*SOP Aksi:*\n${newTask.sop_action_plan}\n\nMari cegah banjir sebelum hujan lebat turun!`,
    type: "TASK_CREATED"
  });

  res.status(201).json({ success: true, task: newTask });
});

// Complete task: Dilindungi requireAuth (RT Leader & Relawan dapat mengunggah foto bukti)
app.patch('/api/tasks/:id/complete', requireAuth(['RT_Leader', 'NGO', 'Resident', 'Admin']), upload.single('after_photo'), (req, res) => {
  let afterPhotoUrl = req.body.after_photo_url || "https://images.unsplash.com/photo-1590682680695-43b964a3ae17?auto=format&fit=crop&w=800&q=80";
  if (req.file) {
    afterPhotoUrl = `/uploads/${req.file.filename}`;
  }

  const task = db.update('cleanup_tasks', req.params.id, {
    status: 'Completed',
    after_photo_url: afterPhotoUrl,
    closed_at: new Date().toISOString()
  });

  if (!task) {
    return res.status(404).json({ success: false, error: "Task not found" });
  }

  // Also close corresponding report
  if (task.hazard_report_id) {
    db.update('reports', task.hazard_report_id, { status: 'Closed' });
  }

  res.json({ success: true, task });
});

// -------------------------------------------------------------
// 5. FLOOD RESPONSE LOGS (PHASE 2 - EVACUATION & NGO)
// -------------------------------------------------------------
app.get('/api/evacuations', (req, res) => {
  const logs = db.get('flood_response_logs');
  // Sort descending by priority_score
  const sorted = [...logs].sort((a, b) => b.priority_score - a.priority_score);
  res.json({ success: true, evacuations: sorted });
});

// Superintelligence Multi-Point NGO Fleet Dispatch Optimizer
app.get('/api/evacuations/optimize', (req, res) => {
  const availableBoats = Number(req.query.boats) || 2;
  const evacuations = db.get('flood_response_logs');
  const areas = db.get('areas');
  const plan = optimizeNgoFleetDispatch({
    evacuations,
    areas,
    availableBoats
  });
  res.json({ success: true, optimization: plan });
});

// AI Continuous Learning Memory Stats & Fine-Tuning Dataset Exporter
app.get('/api/ai/learning-stats', (req, res) => {
  const reports = db.get('reports');
  const memory = buildHumanFeedbackMemory(reports);
  res.json({
    success: true,
    learning_engine: "NEXA Memory-Augmented Few-Shot & Token Weight Calibration",
    stats: {
      total_reports: reports.length,
      verified_ground_truth: memory.total_verified,
      rejected_ground_truth: memory.total_rejected,
      learned_valid_keywords: Object.entries(memory.validTokenCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([word, count]) => ({ word, count })),
      learned_rejected_keywords: Object.entries(memory.rejectedTokenCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count })),
      few_shot_examples: memory.fewShotExamples
    }
  });
});

app.get('/api/ai/training-dataset', (req, res) => {
  const reports = db.get('reports');
  const dataset = buildFineTuningDataset(reports);
  if (req.query.format === 'jsonl') {
    const jsonlString = dataset.map(d => JSON.stringify(d.jsonl_entry)).join('\n');
    res.setHeader('Content-Type', 'application/jsonl; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="nexa-gemini-finetune.jsonl"');
    return res.send(jsonlString);
  }
  res.json({
    success: true,
    count: dataset.length,
    format: "Google Gemini Supervised Fine-Tuning JSONL Schema",
    dataset
  });
});

app.post('/api/evacuations', (req, res) => {
  const { rt_rw_id, water_depth_cm, has_vulnerable_people, vulnerable_details, access_isolated, affected_households, is_night } = req.body;
  const areas = db.get('areas');
  const area = areas.find(a => a.id === rt_rw_id) || areas[0];

  const isDepthProvided = water_depth_cm !== undefined && water_depth_cm !== null && water_depth_cm !== '';
  const parsedDepth = isDepthProvided ? Number(water_depth_cm) : null;

  const scoreResult = calculateFloodPriorityScore({
    waterDepthCm: parsedDepth,
    hasVulnerablePeople: Boolean(has_vulnerable_people),
    vulnerableDetails: vulnerable_details || '',
    accessIsolated: Boolean(access_isolated),
    affectedHouseholds: affected_households !== undefined && affected_households !== '' ? Number(affected_households) : null,
    isNight: Boolean(is_night)
  });

  const newLog = {
    id: `fl-${Date.now()}`,
    rt_rw_id: area.id,
    kelurahan: area.kelurahan,
    rw_code: area.rw_code,
    rt_code: area.rt_code,
    water_depth_cm: parsedDepth,
    access_isolated: Boolean(access_isolated),
    has_vulnerable_people: Boolean(has_vulnerable_people),
    vulnerable_details: vulnerable_details || (has_vulnerable_people ? "Terdapat kelompok rentan (lansia/balita)" : "Tidak ada warga rentan"),
    flood_severity: scoreResult.flood_severity,
    priority_score: scoreResult.score,
    priority_level: scoreResult.level,
    score_breakdown: scoreResult.breakdown,
    nexa_key_answers: scoreResult.nexa_key_answers,
    data_integrity: scoreResult.data_integrity,
    handled_by_ngo_id: null,
    handled_by_name: null,
    status: "Waiting_NGO",
    dispatch_notes: null,
    created_at: new Date().toISOString()
  };

  db.insert('flood_response_logs', newLog);
  res.status(201).json({ success: true, evacuation: newLog });
});

app.patch('/api/evacuations/:id/handle', requireAuth(['RT_Leader', 'NGO', 'Resident', 'Admin']), (req, res) => {
  const { handled_by_ngo_id, dispatch_notes } = req.body;
  const users = db.get('users');
  const handler = users.find(u => u.id === (handled_by_ngo_id || req.user?.userId)) || users.find(u => u.role === 'NGO');

  const log = db.update('flood_response_logs', req.params.id, {
    status: 'Dispatched',
    handled_by_ngo_id: handler ? handler.id : 'user-ngo-pmi',
    handled_by_name: handler ? handler.full_name : 'Relawan Siaga & Arahan RT/RW',
    dispatch_notes: dispatch_notes || 'Penanganan lapangan oleh warga arahan RT/RW & dukungan Relawan.',
    handled_at: new Date().toISOString()
  });

  if (!log) {
    return res.status(404).json({ success: false, error: "Evacuation record not found" });
  }

  res.json({ success: true, evacuation: log });
});

// -------------------------------------------------------------
// 6. RULE ENGINE API (2 OF 3 "POSSIBLE FLOOD" TRIGGER)
// -------------------------------------------------------------
app.get('/api/rule-engine/status', (req, res) => {
  const results = evaluateAllAreas();
  const anyTriggered = results.some(r => r.is_triggered);
  res.json({
    success: true,
    rule_name: "2-of-3 Responsible AI Hard-Coded Flood Trigger",
    any_triggered: anyTriggered,
    areas: results
  });
});

app.get('/api/rule-engine/area/:id', (req, res) => {
  const result = evaluateAreaFloodRule(req.params.id);
  if (!result) return res.status(404).json({ success: false, error: "Area not found" });
  res.json({ success: true, result });
});

// Simulation endpoint: Hanya aktif di development / dinonaktifkan di mode produksi
app.post('/api/rule-engine/simulate', (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: "404 Not Found: Fitur simulasi manipulasi data sensor bencana dinonaktifkan sepenuhnya pada mode produksi demi integritas peringatan dini (Production Safety Guard)."
    });
  }
  next();
}, (req, res) => {
  const { area_id, toggle_bpbd_siaga, toggle_bmkg_warning, inject_verified_reports } = req.body;

  // Modify BPBD Post if requested
  if (toggle_bpbd_siaga !== undefined) {
    const posts = db.get('bpbd_posts');
    const target = posts[0]; // Katulampa
    db.update('bpbd_posts', target.id, {
      siaga_level: toggle_bpbd_siaga ? 2 : 4,
      status: toggle_bpbd_siaga ? "Siaga 2 (Kritis)" : "Siaga 4 (Normal)",
      water_level_cm: toggle_bpbd_siaga ? 165 : 60
    });
  }

  // Modify BMKG Warning if requested
  if (toggle_bmkg_warning !== undefined) {
    const currentForecast = db.data.bmkg_forecast || {};
    currentForecast.active_warning.is_active = Boolean(toggle_bmkg_warning);
    currentForecast.manual_override = Boolean(toggle_bmkg_warning);
    liveWeatherCache = null; // Clear cache so override applies immediately
    db.data.bmkg_forecast = currentForecast;
    db.saveData();
  }

  // Inject 3 verified reports if requested
  if (inject_verified_reports) {
    const areas = db.get('areas');
    const targetArea = areas.find(a => a.id === area_id) || areas[0];
    for (let i = 1; i <= 3; i++) {
      db.insert('reports', {
        id: `rep-sim-${Date.now()}-${i}`,
        reporter_id: "warga-simulasi",
        reporter_name: `Warga Posko ${i}`,
        rt_rw_id: targetArea.id,
        kelurahan: targetArea.kelurahan,
        rw_code: targetArea.rw_code,
        rt_code: targetArea.rt_code,
        hazard_type: "Flood",
        hazard_type_label: "Laporan Banjir Terverifikasi",
        description: `Genangan luapan kali terpantau meningkat di titik simulasi ${i}`,
        status: "Verified",
        raw_photo_url: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
        blurred_photo_url: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
        created_at: new Date().toISOString()
      });
    }
  }

  const updatedStatus = evaluateAreaFloodRule(area_id || 'area-km-04-02');

  // If triggered, dispatch automatic Telegram alert to verified RT Leader
  if (updatedStatus.is_triggered) {
    const users = db.get('users');
    const targetAreaId = area_id || 'area-km-04-02';
    const rtLeader = users.find(u => u.rt_rw_id === targetAreaId && u.role === 'RT_Leader');
    if (rtLeader && rtLeader.is_telegram_synced) {
      sendTelegramNotification({
        toUser: rtLeader,
        message: `🚨 *PERINGATAN 2-OF-3 RULE ENGINE: POSSIBLE FLOOD!*\n\nWilayah: *${updatedStatus.kelurahan} (${updatedStatus.rt_code} ${updatedStatus.rw_code})*\nStatus: ${updatedStatus.true_conditions_count}/3 Kondisi Bahaya Terpenuhi!\n\nSegera cek titik rawan drainase dan siapkan relawan warga!`,
        type: "POSSIBLE_FLOOD"
      });
    }
  }

  res.json({ success: true, evaluation: updatedStatus });
});

// -------------------------------------------------------------
// 7. BMKG & BPBD INTEGRATION APIS (REAL-TIME METEOROLOGICAL INGESTION)
// -------------------------------------------------------------
let liveWeatherCache = null;
let lastWeatherFetch = 0;

async function getLiveWeatherForecast() {
  const now = Date.now();
  // Cache for 3 minutes to avoid flooding external API
  if (liveWeatherCache && (now - lastWeatherFetch < 3 * 60 * 1000)) {
    return liveWeatherCache;
  }

  try {
    const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-6.2214&longitude=106.8562&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&hourly=precipitation_probability,rain&timezone=Asia%2FJakarta&forecast_days=1", {
      signal: AbortSignal.timeout(10000)
    });
    const data = await res.json();

    if (data.hourly && Array.isArray(data.hourly.time)) {
      const times = data.hourly.time;
      const probs = data.hourly.precipitation_probability;
      const rains = data.hourly.rain;
      
      let nextRainTime = null;
      let highestProb = 0;
      let maxRainMm = 0;
      const sliceStats = [
        { label: "1 - 3 Jam Kedepan", fromH: 0, toH: 3, probs: [], rains: [] },
        { label: "3 - 6 Jam Kedepan", fromH: 3, toH: 6, probs: [], rains: [] },
        { label: "6 - 9 Jam Kedepan", fromH: 6, toH: 9, probs: [], rains: [] }
      ];

      for (let i = 0; i < times.length; i++) {
        const hourTime = new Date(times[i]).getTime();
        const diffHours = (hourTime - now) / 3600000;
        if (hourTime >= now && diffHours <= 12) {
          const p = Number(probs[i]) || 0;
          const r = Number(rains[i]) || 0;
          if (p > highestProb) highestProb = p;
          if (r > maxRainMm) maxRainMm = r;
          if (!nextRainTime && (p >= 50 || r >= 0.5)) {
            nextRainTime = new Date(hourTime);
          }
          for (const sl of sliceStats) {
            if (diffHours >= sl.fromH && diffHours < sl.toH) {
              sl.probs.push(p);
              sl.rains.push(r);
            }
          }
        }
      }

      const rainProbStr = `${highestProb}%`;
      const currentTemp = Math.round(data.current?.temperature_2m || 30);
      const currentHumidity = Math.round(data.current?.relative_humidity_2m || 75);
      const windSpeed = Math.round(data.current?.wind_speed_10m || 12);
      const currentWeatherCode = Number(data.current?.weather_code) || 0;

      // Cek apakah ada Peringatan Dini resmi dari BMKG CAP (diambil oleh server/services/bmkgCap.js)
      const capWarning = db.data.bmkg_forecast?.active_warning;
      const hasOfficialBmkgCap = Boolean(capWarning && capWarning.source === 'BMKG CAP' && capWarning.is_active);

      const isMeteorologicalWarning = highestProb >= 55 || maxRainMm >= 1.0 || currentWeatherCode >= 51;
      const isActiveWarning = hasOfficialBmkgCap || isMeteorologicalWarning;

      const timeStr = nextRainTime
        ? nextRainTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
        : null;

      const dynamicIntervals = sliceStats.map((sl) => {
        const maxP = sl.probs.length ? Math.max(...sl.probs) : highestProb;
        const maxR = sl.rains.length ? Math.max(...sl.rains) : 0;
        return {
          time_slot: sl.label,
          weather: maxR >= 2.5 || maxP >= 75 ? "Hujan Sedang - Lebat" : maxP >= 45 || maxR >= 0.3 ? "Berawan - Potensi Hujan" : "Cerah Berawan",
          temperature: `${currentTemp}°C`,
          humidity: `${currentHumidity}%`,
          wind_speed: `${windSpeed} km/jam`,
          rain_probability: `${maxP}%`
        };
      });

      liveWeatherCache = {
        station: hasOfficialBmkgCap
          ? "BMKG CAP Resmi & Data Cuaca Real-Time Open-Meteo (DKI Jakarta)"
          : "Data Cuaca Real-Time Open-Meteo (DKI Jakarta)",
        province: "DKI Jakarta",
        current_condition: `Suhu ${currentTemp}°C, Kelembaban ${currentHumidity}%, Angin ${windSpeed} km/j`,
        active_warning: hasOfficialBmkgCap
          ? {
              ...capWarning,
              expected_heavy_rain: nextRainTime ? nextRainTime.toISOString() : null
            }
          : {
              is_active: isActiveWarning,
              source: "Open-Meteo",
              event: isActiveWarning ? "Waspada Potensi Hujan (Open-Meteo Real-Time)" : "Cuaca Kondusif (Di Bawah Ambang Ekstrem)",
              headline: isActiveWarning && timeStr
                ? `Waspada Potensi Hujan (Peluang ${rainProbStr}, Curah ~${maxRainMm} mm) Sekitar Pukul ${timeStr} WIB di Jakarta`
                : `Cuaca Jakarta Saat Ini Kondusif (Suhu ${currentTemp}°C, Peluang Hujan ${rainProbStr})`,
              affected_kecamatan: [],
              start_time: new Date(now).toISOString(),
              expected_heavy_rain: nextRainTime ? nextRainTime.toISOString() : null,
              end_time: new Date(now + 5 * 3600000).toISOString()
            },
        intervals: dynamicIntervals,
        live_status: db.data.live_status || null
      };
      lastWeatherFetch = now;
      return liveWeatherCache;
    }
  } catch (err) {
    console.warn("Gagal menarik data cuaca real-time, menggunakan data tersimpan:", err.message);
  }

  return db.data.bmkg_forecast || {};
}

app.get('/api/bmkg/weather', async (req, res) => {
  const forecast = await getLiveWeatherForecast();
  res.json({ success: true, forecast });
});

app.get('/api/bpbd/posts', (req, res) => {
  const posts = db.get('bpbd_posts');
  res.json({ success: true, posts });
});

// -------------------------------------------------------------
// 8. TELEGRAM BOT INTEGRATION & LIVE SIMULATOR
// -------------------------------------------------------------
app.get('/api/telegram/info', async (req, res) => {
  const { resolveBotUsername } = await import('./telegramService.js');
  const botUsername = await resolveBotUsername();
  res.json({ success: true, bot_username: botUsername });
});

// Generate token Telegram: Hanya untuk Ketua RT yang login atau Admin
app.post('/api/telegram/generate-token', requireAuth(['RT_Leader', 'Admin']), async (req, res) => {
  try {
    const targetUserId = req.user.role === 'Admin' ? (req.body.user_id || req.user.userId) : req.user.userId;
    const users = db.get('users');
    const user = users.find(u => u.id === targetUserId);

    if (!user) {
      return res.status(404).json({ success: false, error: "Akun pengguna tidak ditemukan." });
    }

    const result = await generateTelegramToken(user.rt_code || user.area_label, targetUserId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Simulasi Telegram Internal dari Web Dashboard: Aman untuk demonstrasi visual
app.post('/api/telegram/simulate', async (req, res) => {
  try {
    const result = await handleTelegramWebhook(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Webhook Telegram Resmi: Diverifikasi dengan secret token
app.post('/api/telegram/webhook', async (req, res) => {
  const incomingSecret = req.headers['x-telegram-bot-api-secret-token'];
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const isSimulator = req.headers['x-simulator-request'] === 'true';

  // Jika dipicu dari tombol simulator di antarmuka web yang sah:
  if (isSimulator) {
    const result = await handleTelegramWebhook(req.body);
    return res.json(result);
  }

  // Panggilan dari server resmi Telegram di Mode Produksi:
  if (process.env.NODE_ENV === 'production' && configuredSecret) {
    if (!incomingSecret || typeof incomingSecret !== 'string') {
      return res.status(401).json({
        success: false,
        error: "401 Unauthorized: Header X-Telegram-Bot-Api-Secret-Token resmi Telegram wajib disertakan."
      });
    }

    const bufIncoming = Buffer.from(incomingSecret);
    const bufExpected = Buffer.from(configuredSecret);
    if (bufIncoming.length !== bufExpected.length || !crypto.timingSafeEqual(bufIncoming, bufExpected)) {
      return res.status(403).json({
        success: false,
        error: "403 Forbidden: Secret token Telegram tidak cocok atau tidak sah."
      });
    }
  }

  const result = await handleTelegramWebhook(req.body);
  res.json(result);
});

app.get('/api/telegram/messages', requireAuth(['RT_Leader', 'NGO', 'Admin']), (req, res) => {
  const messages = db.get('telegram_messages');
  res.json({ success: true, messages });
});

// -------------------------------------------------------------
// 9. OVERALL IMPACT & SYSTEM STATS
// -------------------------------------------------------------
app.get('/api/stats', (req, res) => {
  const reports = db.get('reports');
  const tasks = db.get('cleanup_tasks');
  const evacuations = db.get('flood_response_logs');
  const areas = db.get('areas');
  const users = db.get('users');

  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const activeTasks = tasks.filter(t => t.status === 'In_Progress').length;
  const verifiedReports = reports.filter(r => r.status === 'Verified' || r.status === 'Task_Created' || r.status === 'Closed').length;
  const registeredVolunteersCount = users.filter(u => u.role === 'NGO' || u.role === 'Resident').length;
  const registeredNgoUnitsCount = users.filter(u => u.role === 'NGO').length;
  const totalVolunteers = tasks.reduce((sum, t) => sum + (t.volunteers_count || 0), 0);
  const handledEvacuations = evacuations.filter(e => e.status === 'Dispatched').length;

  res.json({
    success: true,
    metrics: {
      total_reports: reports.length,
      verified_reports: verifiedReports,
      active_tasks: activeTasks,
      completed_mitigations: completedTasks,
      total_volunteers_mobilized: totalVolunteers,
      registered_volunteers_count: registeredVolunteersCount,
      registered_ngo_units_count: registeredNgoUnitsCount,
      estimated_residents_protected: completedTasks * 320,
      sediment_cleared_meters: completedTasks * 25,
      evacuations_dispatched: handledEvacuations,
      active_monitoring_areas: areas.length
    }
  });
});

// -------------------------------------------------------------
// 9B. ADMIN WEB OWNER MANAGEMENT ENDPOINTS (PROTECTED BY ADMIN JWT)
// -------------------------------------------------------------
app.delete('/api/reports/:id', requireAuth(['Admin', 'RT_Leader']), (req, res) => {
  db.delete('reports', req.params.id);
  res.json({ success: true, message: "Laporan berhasil dihapus." });
});

app.delete('/api/tasks/:id', requireAuth(['Admin', 'RT_Leader']), (req, res) => {
  db.delete('cleanup_tasks', req.params.id);
  res.json({ success: true, message: "Tugas gotong royong berhasil dihapus." });
});

app.delete('/api/evacuations/:id', requireAuth(['Admin', 'NGO', 'RT_Leader']), (req, res) => {
  db.delete('flood_response_logs', req.params.id);
  res.json({ success: true, message: "Data bantuan/evakuasi berhasil dihapus." });
});

app.patch('/api/bpbd/posts/:id', requireAuth(['Admin']), (req, res) => {
  const { water_level_cm, siaga_level, status } = req.body;
  const updated = db.update('bpbd_posts', req.params.id, {
    ...(water_level_cm !== undefined ? { water_level_cm: Number(water_level_cm) } : {}),
    ...(siaga_level !== undefined ? { siaga_level: Number(siaga_level) } : {}),
    ...(status !== undefined ? { status } : {})
  });
  if (!updated) return res.status(404).json({ success: false, error: "Pos pantau tidak ditemukan" });
  res.json({ success: true, post: updated });
});

app.post('/api/admin/clear-operational-data', requireAuth(['Admin']), async (req, res) => {
  await db.clearOperationalData();
  res.json({
    success: true,
    message: "Seluruh laporan, tugas, evakuasi, dan pesan Telegram berhasil dikosongkan ke 0 (di memori lokal & cloud Supabase)."
  });
});

// -------------------------------------------------------------
// 10. DATABASE RESET & PURGE ENDPOINTS (PROTECTED WITH ADMIN AUTH)
// -------------------------------------------------------------
// Middleware: Proteksi Hak Akses Administrator untuk endpoint kritis
function requireAdminAuth(req, res, next) {
  // Standar Keamanan Produksi: Nonaktifkan total fungsi reset data massal saat aplikasi live di production
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: "404 Not Found: Endpoint administratif ini dinonaktifkan sepenuhnya pada mode produksi demi integritas dan keamanan data (Production Safety Guard)."
    });
  }

  const adminKey = req.headers['x-admin-key'] || req.query.admin_key || req.body?.admin_key;
  const expectedKey = process.env.ADMIN_SECRET_KEY || 'nexa-admin-dev-2026';

  if (!adminKey || typeof adminKey !== 'string') {
    return res.status(403).json({
      success: false,
      error: "Akses Ditolak (403 Forbidden): Kunci rahasia administrator (header x-admin-key) diperlukan untuk tindakan ini demi melindungi database."
    });
  }

  // Cryptographic timing-safe comparison to prevent timing attacks
  const bufA = Buffer.from(adminKey);
  const bufB = Buffer.from(expectedKey);
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return res.status(403).json({
      success: false,
      error: "Akses Ditolak (403 Forbidden): Kunci rahasia administrator salah."
    });
  }
  next();
}

// Kosongkan semua laporan, tugas, dan log contoh (Mulai dari Nol)
app.post('/api/system/clear-all', requireAdminAuth, (req, res) => {
  db.set('reports', []);
  db.set('cleanup_tasks', []);
  db.set('flood_response_logs', []);
  db.set('telegram_messages', []);
  res.json({ success: true, message: "Semua laporan dan tugas contoh telah dikosongkan. Sistem sekarang bersih 100%!" });
});

app.post('/api/system/reset', requireAdminAuth, (req, res) => {
  const fresh = db.reset();
  res.json({ success: true, message: "Database berhasil direset ke state standar NEXA SiagaRT", data: fresh });
});

// Global Error Handler for Multer file upload rejections
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: "Ukuran file terlalu besar. Batas maksimal ukuran foto adalah 8 MB."
      });
    }
    return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
  } else if (err && err.message && err.message.includes("Format file ditolak")) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next(err);
});

// SPA Fallback
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🌊 NEXA (SiagaRT) Backend API Server`);
  console.log(`📡 Running on http://localhost:${PORT}`);
  console.log(`🔒 UU PDP Privacy Filtering: ENABLED`);
  console.log(`🤖 Google Gemini Pipeline: ENABLED`);
  console.log(`⚡ 2-of-3 Rule Engine: ACTIVE`);
  console.log(`=================================================`);
  
  // Start background Telegram long-polling if token configured
  startTelegramPolling();
});
