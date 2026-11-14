import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'nexa.db.json');

let pgPool = null;
if (process.env.DATABASE_URL) {
  try {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    console.log("PostgreSQL Cloud Database Driver AKTIF (Supabase/PostGIS Ready)");
  } catch (e) {
    console.warn("Gagal inisialisasi pool PostgreSQL:", e.message);
  }
}

export const INITIAL_DATA = {
  areas: [
    {
      id: "area-km-04-02",
      kelurahan: "Kampung Melayu",
      kecamatan: "Jatinegara",
      kota: "Jakarta Timur",
      rw_code: "RW 02",
      rt_code: "RT 04",
      geom_center: { lat: -6.2285, lng: 106.8650 },
      geom_polygon: [
        [-6.2270, 106.8635],
        [-6.2270, 106.8665],
        [-6.2300, 106.8665],
        [-6.2300, 106.8635]
      ],
      water_retention_capacity: "Rendah (Dataran Cekungan Ciliwung)",
      monitoring_post: "Pos Pantau Manggarai"
    },
    {
      id: "area-bc-03-07",
      kelurahan: "Bidara Cina",
      kecamatan: "Jatinegara",
      kota: "Jakarta Timur",
      rw_code: "RW 07",
      rt_code: "RT 03",
      geom_center: { lat: -6.2360, lng: 106.8670 },
      geom_polygon: [
        [-6.2345, 106.8655],
        [-6.2345, 106.8685],
        [-6.2375, 106.8685],
        [-6.2375, 106.8655]
      ],
      water_retention_capacity: "Sedang",
      monitoring_post: "Pos Pantau Manggarai"
    },
    {
      id: "area-rw-02-07",
      kelurahan: "Rawajati",
      kecamatan: "Pancoran",
      kota: "Jakarta Selatan",
      rw_code: "RW 07",
      rt_code: "RT 02",
      geom_center: { lat: -6.2580, lng: 106.8570 },
      geom_polygon: [
        [-6.2565, 106.8555],
        [-6.2565, 106.8585],
        [-6.2595, 106.8585],
        [-6.2595, 106.8555]
      ],
      water_retention_capacity: "Rendah (Bantaran Kali)",
      monitoring_post: "Pos Pantau Katulampa / Depok"
    },
    {
      id: "area-bd-01-12",
      kelurahan: "Bukit Duri",
      kecamatan: "Tebet",
      kota: "Jakarta Selatan",
      rw_code: "RW 12",
      rt_code: "RT 01",
      geom_center: { lat: -6.2210, lng: 106.8580 },
      geom_polygon: [
        [-6.2195, 106.8565],
        [-6.2195, 106.8595],
        [-6.2225, 106.8595],
        [-6.2225, 106.8565]
      ],
      water_retention_capacity: "Rendah",
      monitoring_post: "Pos Pantau Manggarai"
    },
    {
      id: "area-cm-02-04",
      kelurahan: "Cipinang Melayu",
      kecamatan: "Makasar",
      kota: "Jakarta Timur",
      rw_code: "RW 04",
      rt_code: "RT 02",
      geom_center: { lat: -6.2490, lng: 106.9020 },
      geom_polygon: [
        [-6.2475, 106.9005],
        [-6.2475, 106.9035],
        [-6.2505, 106.9035],
        [-6.2505, 106.9005]
      ],
      water_retention_capacity: "Rendah (Bantaran Kali Sunter)",
      monitoring_post: "Pos Pantau Sunter Hulu"
    },
    {
      id: "area-pl-06-08",
      kelurahan: "Pluit",
      kecamatan: "Penjaringan",
      kota: "Jakarta Utara",
      rw_code: "RW 08",
      rt_code: "RT 06",
      geom_center: { lat: -6.1210, lng: 106.7930 },
      geom_polygon: [
        [-6.1195, 106.7915],
        [-6.1195, 106.7945],
        [-6.1225, 106.7945],
        [-6.1225, 106.7915]
      ],
      water_retention_capacity: "Rob Laut & Cekungan Pompa",
      monitoring_post: "Pos Pantau Pasar Ikan"
    }
  ],

  users: [
    {
      id: "user-rt-bambang",
      full_name: "Pak Bambang Supriyadi",
      role: "RT_Leader",
      phone_number: "0812-9843-1102",
      telegram_chat_id: "87123984",
      telegram_subscribe_token: "TOKEN_RT04_KM89",
      rt_rw_id: "area-km-04-02",
      area_label: "RT 04 / RW 02 Kampung Melayu",
      is_telegram_synced: true
    },
    {
      id: "user-rt-nuraini",
      full_name: "Ibu Nuraini Hasanah",
      role: "RT_Leader",
      phone_number: "0813-8821-4491",
      telegram_chat_id: null,
      telegram_subscribe_token: "TOKEN_RT03_BC45",
      rt_rw_id: "area-bc-03-07",
      area_label: "RT 03 / RW 07 Bidara Cina",
      is_telegram_synced: false
    },
    {
      id: "user-ngo-pmi",
      full_name: "PMI Kota Jakarta Timur (TRC)",
      role: "NGO",
      phone_number: "021-8192411",
      telegram_chat_id: "99182371",
      telegram_subscribe_token: null,
      rt_rw_id: null,
      area_label: "Seluruh Wilayah DKI Jakarta",
      team_assets: ["3 Perahu Karet", "1 Ambulans Gawat Darurat", "10 Relawan Siaga"]
    },
    {
      id: "user-ngo-tagana",
      full_name: "Tagana DKI Jakarta Unit SAR",
      role: "NGO",
      phone_number: "021-3901122",
      telegram_chat_id: "44910283",
      telegram_subscribe_token: null,
      rt_rw_id: null,
      area_label: "Seluruh Wilayah DKI Jakarta",
      team_assets: ["5 Perahu Karet Motorik", "Dapur Umum Lapangan", "18 Personel"]
    },
    {
      id: "user-admin-bpbd",
      full_name: "Pusdalops BPBD DKI Jakarta",
      role: "Admin",
      phone_number: "112",
      telegram_chat_id: "11200001",
      telegram_subscribe_token: null,
      rt_rw_id: null,
      area_label: "Command Center DKI Jakarta"
    },
    {
      id: "user-warga-andi",
      full_name: "Andi Prasetyo (Warga)",
      role: "Resident",
      phone_number: "0857-1928-3341",
      telegram_chat_id: null,
      telegram_subscribe_token: null,
      rt_rw_id: "area-km-04-02",
      area_label: "Warga RT 04 RW 02 Kampung Melayu"
    }
  ],

  reports: [
    {
      id: "rep-001",
      reporter_id: "user-warga-andi",
      reporter_name: "Andi Prasetyo",
      reporter_phone: "0857-1928-3341",
      rt_rw_id: "area-km-04-02",
      kelurahan: "Kampung Melayu",
      rw_code: "RW 02",
      rt_code: "RT 04",
      hazard_type: "Clogged_Drain",
      hazard_type_label: "Saluran Tersumbat",
      description: "Saluran gorong-gorong tersumbat lumpur padat dan sampah botol plastik sepanjang 15 meter. Air mampet dan berbau tidak sedap.",
      exact_location: {
        address: "Jl. Kebon Pala I No. 14, Depan Pos Ronda RT 04",
        lat: -6.2287,
        lng: 106.8648
      },
      raw_photo_url: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=800&q=80",
      blurred_photo_url: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=800&q=80",
      privacy_masked: true,
      ai_flag: "Valid",
      ai_confidence: 0.96,
      ai_reasoning: "Terdeteksi timbunan sedimen dan sampah anorganik padat menghalangi jalur drainase warga.",
      ai_suggested_severity: "Berat",
      ai_suggested_action: "Segera kerahkan 6-8 warga RT untuk pengerukan manual lumpur dan pengangkatan botol plastik sebelum hujan lebat.",
      status: "Task_Created",
      task_id: "task-001",
      created_at: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: "rep-002",
      reporter_id: "warga-anon-02",
      reporter_name: "Warga Anonim (UU PDP Dilindungi)",
      reporter_phone: "0812-7721-xxxx",
      rt_rw_id: "area-bc-03-07",
      kelurahan: "Bidara Cina",
      rw_code: "RW 07",
      rt_code: "RT 03",
      hazard_type: "Trash",
      hazard_type_label: "Tumpukan Sampah di Mulut Air",
      description: "Tumpukan sampah ranting pohon besar, kardus, dan kantong kresek menumpuk di pintu saringan air selokan utama menuju kali.",
      exact_location: {
        address: "Gang Sawo III dekat Musholla Al-Ikhlas",
        lat: -6.2363,
        lng: 106.8672
      },
      raw_photo_url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
      blurred_photo_url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
      privacy_masked: true,
      ai_flag: "Valid",
      ai_confidence: 0.91,
      ai_reasoning: "Objek ranting pohon dan sampah plastik berpotensi membendung aliran debit air tinggi.",
      ai_suggested_severity: "Sedang",
      ai_suggested_action: "Gotong royong pemindahan ranting dan karung sampah dengan perlengkapan gergaji dan karung goni.",
      status: "Pending",
      task_id: null,
      created_at: new Date(Date.now() - 3600000 * 1.5).toISOString()
    },
    {
      id: "rep-003",
      reporter_id: "warga-anon-03",
      reporter_name: "Warga Pelapor Cepat",
      reporter_phone: "0878-9901-xxxx",
      rt_rw_id: "area-bd-01-12",
      kelurahan: "Bukit Duri",
      rw_code: "RW 12",
      rt_code: "RT 01",
      hazard_type: "Flood",
      hazard_type_label: "Laporan Banjir Mendadak",
      description: "Lapor pak, jalanan banjir sudah setinggi pinggang orang dewasa!",
      exact_location: {
        address: "Jl. Bukit Duri Barat Gg. Merdeka",
        lat: -6.2212,
        lng: 106.8582
      },
      raw_photo_url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80",
      blurred_photo_url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80",
      privacy_masked: true,
      ai_flag: "Mismatch",
      ai_confidence: 0.88,
      ai_reasoning: "Gemini Vision mendeteksi foto jalan aspal kering pada siang hari tanpa ada genangan air yang sesuai dengan deskripsi 'banjir setinggi pinggang'.",
      ai_suggested_severity: "Ringan",
      ai_suggested_action: "Verifikasi ulang ke pelapor sebelum mengerahkan tim gotong royong.",
      status: "Pending",
      task_id: null,
      created_at: new Date(Date.now() - 3600000 * 0.8).toISOString()
    },
    {
      id: "rep-004",
      reporter_id: "warga-anon-04",
      reporter_name: "Supriyanto",
      reporter_phone: "0819-3321-8890",
      rt_rw_id: "area-rw-02-07",
      kelurahan: "Rawajati",
      rw_code: "RW 07",
      rt_code: "RT 02",
      hazard_type: "Flood",
      hazard_type_label: "Luapan Air Kali Ciliwung",
      description: "Air rembesan tanggul mulai meluap setinggi 40 cm di jalan pemukiman gang bawah.",
      exact_location: {
        address: "Jl. Binawarga II RT 02 RW 07 Rawajati",
        lat: -6.2582,
        lng: 106.8573
      },
      raw_photo_url: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
      blurred_photo_url: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
      privacy_masked: true,
      ai_flag: "Valid",
      ai_confidence: 0.98,
      ai_reasoning: "Genangan air keruh kecoklatan setinggi mata kaki hingga betis terverifikasi pada gambar.",
      ai_suggested_severity: "Berat",
      ai_suggested_action: "Pasang barikade karung pasir dan siapkan perahu evakuasi untuk lansia dan balita.",
      status: "Verified",
      task_id: null,
      created_at: new Date(Date.now() - 3600000 * 0.5).toISOString()
    }
  ],

  cleanup_tasks: [
    {
      id: "task-001",
      hazard_report_id: "rep-001",
      verified_by_id: "user-rt-bambang",
      verified_by_name: "Pak Bambang Supriyadi (Ketua RT 04)",
      rt_rw_id: "area-km-04-02",
      title: "Pembersihan Sedimen Saluran Utama Kebon Pala I",
      sop_action_plan: "1. Kumpulkan 8 warga di Pos Ronda RT 04.\n2. Bawa cangkul, serokan besi, karung plastik.\n3. Angkat endapan lumpur hitam dan bersihkan plastik kemasan.\n4. Buang sampah ke bak penampungan TPS Kampung Melayu.\n5. Selesaikan sebelum tenggat hujan lebat BMKG.",
      deadline_from_bmkg: new Date(Date.now() + 1000 * 60 * 105).toISOString(), // 1 hr 45 min
      rain_forecast_note: "BMKG: Estimasi Hujan Lebat pukul 16:30 WIB",
      status: "In_Progress",
      volunteers_count: 8,
      after_photo_url: null,
      closed_at: null,
      created_at: new Date(Date.now() - 3600000 * 1).toISOString()
    }
  ],

  flood_response_logs: [
    {
      id: "fl-001",
      rt_rw_id: "area-rw-02-07",
      kelurahan: "Rawajati",
      rw_code: "RW 07",
      rt_code: "RT 02",
      water_depth_cm: 85,
      has_vulnerable_people: true,
      vulnerable_details: "2 Lansia lumpuh tidur dan 1 balita usia 9 bulan di lantai 1",
      priority_score: 92,
      priority_level: "KRITIS / TINGGI",
      handled_by_ngo_id: "user-ngo-tagana",
      handled_by_name: "Tagana DKI Jakarta Unit SAR",
      status: "Dispatched",
      dispatch_notes: "Perahu karet bernomor 03 dan 4 personel rescue bergerak dari posko Kalibata.",
      created_at: new Date(Date.now() - 3600000 * 0.7).toISOString()
    },
    {
      id: "fl-002",
      rt_rw_id: "area-km-04-02",
      kelurahan: "Kampung Melayu",
      rw_code: "RW 02",
      rt_code: "RT 04",
      water_depth_cm: 60,
      has_vulnerable_people: true,
      vulnerable_details: "1 Lansia 72 tahun butuh evakuasi kursi roda",
      priority_score: 78,
      priority_level: "TINGGI",
      handled_by_ngo_id: "user-ngo-pmi",
      handled_by_name: "PMI Kota Jakarta Timur (TRC)",
      status: "Dispatched",
      dispatch_notes: "Tim evakuasi medis PMI sudah tiba di perbatasan Jl. Kebon Pala.",
      created_at: new Date(Date.now() - 3600000 * 0.4).toISOString()
    },
    {
      id: "fl-003",
      rt_rw_id: "area-bc-03-07",
      kelurahan: "Bidara Cina",
      rw_code: "RW 07",
      rt_code: "RT 03",
      water_depth_cm: 35,
      has_vulnerable_people: false,
      vulnerable_details: "Warga usia produktif siaga di lantai 2",
      priority_score: 42,
      priority_level: "SEDANG / MONITOR",
      handled_by_ngo_id: null,
      handled_by_name: null,
      status: "Waiting_NGO",
      dispatch_notes: null,
      created_at: new Date(Date.now() - 3600000 * 0.2).toISOString()
    }
  ],

  bpbd_posts: [
    {
      id: "pos-katulampa",
      name: "Pos Pantau Bendung Katulampa (Bogor)",
      water_level_cm: 95,
      status: "Siaga 3 (Waspada)",
      siaga_level: 3,
      safe_limit_cm: 80,
      siaga3_limit_cm: 81,
      siaga2_limit_cm: 151,
      siaga1_limit_cm: 201,
      flow_destination: "Kali Ciliwung -> Jakarta (estimasi tiba 6-9 jam)",
      updated_at: new Date().toISOString()
    },
    {
      id: "pos-manggarai",
      name: "Pos Pantau Pintu Air Manggarai",
      water_level_cm: 785,
      status: "Siaga 3 (Waspada)",
      siaga_level: 3,
      safe_limit_cm: 750,
      siaga3_limit_cm: 751,
      siaga2_limit_cm: 851,
      siaga1_limit_cm: 951,
      flow_destination: "Banjir Kanal Barat & Ciliwung Lama",
      updated_at: new Date().toISOString()
    },
    {
      id: "pos-karet",
      name: "Pos Pantau Pintu Air Karet",
      water_level_cm: 440,
      status: "Siaga 4 (Normal)",
      siaga_level: 4,
      safe_limit_cm: 450,
      siaga3_limit_cm: 451,
      siaga2_limit_cm: 551,
      siaga1_limit_cm: 651,
      flow_destination: "Banjir Kanal Barat",
      updated_at: new Date().toISOString()
    },
    {
      id: "pos-sunter-hulu",
      name: "Pos Pantau Sunter Hulu",
      water_level_cm: 140,
      status: "Siaga 4 (Normal)",
      siaga_level: 4,
      safe_limit_cm: 150,
      siaga3_limit_cm: 151,
      siaga2_limit_cm: 201,
      siaga1_limit_cm: 251,
      flow_destination: "Kali Sunter -> Cipinang",
      updated_at: new Date().toISOString()
    },
    {
      id: "pos-pasar-ikan",
      name: "Pos Pantau Pasar Ikan (Pompa Laut)",
      water_level_cm: 165,
      status: "Siaga 4 (Normal)",
      siaga_level: 4,
      safe_limit_cm: 170,
      siaga3_limit_cm: 171,
      siaga2_limit_cm: 200,
      siaga1_limit_cm: 250,
      flow_destination: "Teluk Jakarta (Pasang Rob Laut)",
      updated_at: new Date().toISOString()
    }
  ],

  bmkg_forecast: {
    station: "Stasiun Meteorologi Kemayoran & Halim PK",
    province: "DKI Jakarta",
    current_condition: "Berawan Tebal, Potensi Hujan Tinggi",
    active_warning: {
      is_active: true,
      event: "Peringatan Dini Cuaca Ekstrem (CAP API Valid)",
      headline: "Waspada Hujan Sedang-Lebat disertai Kilat/Petir dan Angin Kencang",
      affected_kecamatan: ["Jatinegara", "Pancoran", "Tebet", "Kramat Jati", "Makasar", "Penjaringan"],
      start_time: new Date(Date.now() - 3600000 * 1).toISOString(),
      expected_heavy_rain: new Date(Date.now() + 1000 * 60 * 105).toISOString(), // ~1 hr 45 min
      end_time: new Date(Date.now() + 3600000 * 5).toISOString()
    },
    intervals: [
      {
        time_slot: "Sekarang s/d 3 Jam",
        weather: "Hujan Sedang - Lebat",
        temperature: "27°C",
        humidity: "88%",
        wind_speed: "18 km/jam",
        rain_probability: "85%"
      },
      {
        time_slot: "+3 Jam s/d +6 Jam",
        weather: "Hujan Lebat Petir",
        temperature: "25°C",
        humidity: "94%",
        wind_speed: "24 km/jam",
        rain_probability: "90%"
      },
      {
        time_slot: "+6 Jam s/d +9 Jam",
        weather: "Hujan Ringan - Reda",
        temperature: "26°C",
        humidity: "86%",
        wind_speed: "12 km/jam",
        rain_probability: "40%"
      }
    ]
  },

  telegram_messages: [
    {
      id: "tg-001",
      to: "Pak Bambang Supriyadi (RT 04 / RW 02 Kampung Melayu)",
      chat_id: "87123984",
      message: "🚨 [NEXA SiagaRT Alert]\n\nTugas Gotong Royong Ditugaskan:\n📍 Lokasi: Kebon Pala I (RT 04 RW 02)\n⏱ Deadline Hujan BMKG: 1 Jam 45 Menit Lagi!\n🛠 Aksi: Pengerukan sedimen lumpur 15m & botol plastik.\n\nKlik link untuk pantau: https://nexasiaga.id/t/task-001",
      timestamp: new Date(Date.now() - 3600000 * 1).toISOString()
    }
  ]
};

// In-Memory Database store with Cloud PostgreSQL & local disk persistence
class Database {
  constructor() {
    this.data = this.loadData();
    if (pgPool) {
      this.syncFromPostgres();
    }
  }

  async syncFromPostgres() {
    try {
      console.log("[SUPABASE] Mensinkronkan data langsung dari cloud PostgreSQL...");
      // 1. RT RW Areas
      const areasRes = await pgPool.query(`
        SELECT id, kelurahan, kecamatan, kota, rw_code, rt_code, monitoring_post,
               ST_Y(geom_center) as center_lat, ST_X(geom_center) as center_lng,
               ST_AsGeoJSON(geom_polygon) as polygon_geojson
        FROM rt_rw_areas
      `);
      if (areasRes.rows.length > 0) {
        this.data.areas = areasRes.rows.map(r => ({
          id: r.id,
          kelurahan: r.kelurahan,
          kecamatan: r.kecamatan,
          kota: r.kota,
          rw_code: r.rw_code,
          rt_code: r.rt_code,
          monitoring_post: r.monitoring_post,
          geom_center: { lat: Number(r.center_lat), lng: Number(r.center_lng) },
          geom_polygon: JSON.parse(r.polygon_geojson).coordinates[0].map(c => [c[1], c[0]])
        }));
      }

      // 2. Users
      const usersRes = await pgPool.query(`SELECT * FROM users`);
      if (usersRes.rows.length > 0) {
        this.data.users = usersRes.rows;
      }

      // 3. Hazard Reports
      const reportsRes = await pgPool.query(`
        SELECT id, reporter_id, reporter_name, reporter_phone, rt_rw_id, kelurahan, rw_code, rt_code,
               hazard_type, hazard_type_label, description, exact_address,
               ST_Y(exact_location) as lat, ST_X(exact_location) as lng,
               raw_photo_url, blurred_photo_url, privacy_masked, ai_flag, ai_confidence, ai_reasoning,
               ai_suggested_severity, ai_suggested_action, recommended_volunteers, status, verified_by_id,
               verified_at, created_at
        FROM hazard_reports
        ORDER BY created_at DESC
      `);
      if (reportsRes.rows.length > 0) {
        this.data.reports = reportsRes.rows.map(r => ({
          ...r,
          exact_location: {
            address: r.exact_address,
            lat: Number(r.lat),
            lng: Number(r.lng)
          }
        }));
      }

      // 4. Cleanup Tasks
      const tasksRes = await pgPool.query(`SELECT * FROM cleanup_tasks ORDER BY created_at DESC`);
      if (tasksRes.rows.length > 0) {
        this.data.cleanup_tasks = tasksRes.rows;
      }

      // 5. Flood Logs
      const floodRes = await pgPool.query(`SELECT * FROM flood_response_logs ORDER BY created_at DESC`);
      if (floodRes.rows.length > 0) {
        this.data.flood_response_logs = floodRes.rows;
      }

      // 6. Telegram Messages
      const tgRes = await pgPool.query(`SELECT * FROM telegram_messages ORDER BY created_at DESC`);
      if (tgRes.rows.length > 0) {
        this.data.telegram_messages = tgRes.rows;
      }

      console.log(`[SUPABASE SUKSES] Data cloud tersinkron: ${this.data.reports?.length || 0} laporan, ${this.data.users?.length || 0} akun RT/RW.`);
    } catch (err) {
      console.warn("[SUPABASE SYNC WARNING] Gagal sinkronisasi dari cloud, menggunakan data lokal:", err.message);
    }
  }

  loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn("Could not load persisted database, using default seed:", err.message);
    }
    this.saveData(INITIAL_DATA);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  saveData(data = this.data) {
    try {
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error("Error saving database to file:", err.message);
    }
  }

  get(table) {
    return this.data[table] || [];
  }

  set(table, records) {
    this.data[table] = records;
    this.saveData();
  }

  insert(table, item) {
    if (!this.data[table]) this.data[table] = [];
    this.data[table].unshift(item);
    this.saveData();

    // Simpan langsung ke cloud PostgreSQL (Supabase) secara asinkron
    if (pgPool) {
      this.persistInsertToPostgres(table, item).catch(err => {
        console.error(`[POSTGRES INSERT ERROR] ${table}:`, err.message);
      });
    }

    return item;
  }

  async persistInsertToPostgres(table, item) {
    if (!pgPool) return;

    if (table === 'reports') {
      const lat = item.exact_location?.lat || -6.2088;
      const lng = item.exact_location?.lng || 106.8456;
      await pgPool.query(`
        INSERT INTO hazard_reports (
          id, reporter_id, reporter_name, reporter_phone, rt_rw_id, kelurahan, rw_code, rt_code,
          hazard_type, hazard_type_label, description, exact_address, exact_location,
          raw_photo_url, blurred_photo_url, privacy_masked, ai_flag, ai_confidence, ai_reasoning,
          ai_suggested_severity, ai_suggested_action, recommended_volunteers, status, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          ST_SetSRID(ST_MakePoint($13, $14), 4326),
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          verified_by_id = EXCLUDED.verified_by_id,
          verified_at = EXCLUDED.verified_at
      `, [
        item.id, item.reporter_id || 'warga-anon', item.reporter_name || 'Warga Anonim', item.reporter_phone || '0812-xxxx',
        item.rt_rw_id || 'area-km-04-02', item.kelurahan || 'Kampung Melayu', item.rw_code || 'RW 02', item.rt_code || 'RT 04',
        item.hazard_type || 'Clogged_Drain', item.hazard_type_label || 'Saluran Tersumbat', item.description || '',
        item.exact_location?.address || 'Jakarta', lng, lat,
        item.raw_photo_url || item.blurred_photo_url || '', item.blurred_photo_url || item.raw_photo_url || '',
        item.privacy_masked ?? true, item.ai_flag || 'Valid', item.ai_confidence || 0.95, item.ai_reasoning || '',
        item.ai_suggested_severity || 'Sedang', item.ai_suggested_action || '', item.recommended_volunteers || 6,
        item.status || 'Pending', item.created_at || new Date().toISOString()
      ]);
      console.log(`[POSTGRES] Laporan ${item.id} berhasil tersimpan permanen di cloud Supabase!`);
    } else if (table === 'cleanup_tasks') {
      await pgPool.query(`
        INSERT INTO cleanup_tasks (
          id, hazard_report_id, rt_rw_id, title, description, deadline_at,
          target_volunteers, confirmed_volunteers, action_plan, status,
          verified_by_id, after_photo_url, closed_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          confirmed_volunteers = EXCLUDED.confirmed_volunteers,
          after_photo_url = EXCLUDED.after_photo_url,
          closed_at = EXCLUDED.closed_at
      `, [
        item.id, item.hazard_report_id, item.rt_rw_id, item.title, item.description, item.deadline_at,
        item.target_volunteers || 5, item.confirmed_volunteers || 0, item.action_plan, item.status || 'In_Progress',
        item.verified_by_id, item.after_photo_url, item.closed_at, item.created_at || new Date().toISOString()
      ]);
      console.log(`[POSTGRES] Tugas Gotong Royong ${item.id} berhasil tersimpan di cloud Supabase!`);
    } else if (table === 'flood_response_logs') {
      await pgPool.query(`
        INSERT INTO flood_response_logs (
          id, rt_rw_id, water_depth_cm, has_vulnerable_people, vulnerable_count,
          priority_score, priority_level, status, handled_by_ngo_id, handled_at, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          handled_by_ngo_id = EXCLUDED.handled_by_ngo_id,
          handled_at = EXCLUDED.handled_at
      `, [
        item.id, item.rt_rw_id, item.water_depth_cm || 0, item.has_vulnerable_people ?? false, item.vulnerable_count || 0,
        item.priority_score, item.priority_level, item.status || 'Needs_Evacuation', item.handled_by_ngo_id,
        item.handled_at, item.notes, item.created_at || new Date().toISOString()
      ]);
      console.log(`[POSTGRES] Log Evakuasi ${item.id} berhasil tersimpan di cloud Supabase!`);
    } else if (table === 'telegram_messages') {
      await pgPool.query(`
        INSERT INTO telegram_messages (id, recipient_name, chat_id, area_label, message_type, message_content, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [
        item.id, item.to || item.recipient_name || 'RT', item.chat_id || '', item.area_label || '',
        item.type || item.message_type || 'NOTIFICATION', item.message || item.message_content || '',
        item.timestamp || item.created_at || new Date().toISOString()
      ]);
    }
  }

  update(table, id, patch) {
    if (!this.data[table]) return null;
    const index = this.data[table].findIndex(item => item.id === id);
    if (index === -1) return null;
    this.data[table][index] = { ...this.data[table][index], ...patch, updated_at: new Date().toISOString() };
    this.saveData();

    // Update langsung ke cloud PostgreSQL (Supabase)
    if (pgPool) {
      this.persistUpdateToPostgres(table, id, patch).catch(err => {
        console.error(`[POSTGRES UPDATE ERROR] ${table} ${id}:`, err.message);
      });
    }

    return this.data[table][index];
  }

  async persistUpdateToPostgres(table, id, patch) {
    if (!pgPool) return;

    if (table === 'reports') {
      const fields = [];
      const values = [id];
      let idx = 2;
      for (const [key, val] of Object.entries(patch)) {
        if (['status', 'verified_by_id', 'verified_at', 'task_id'].includes(key)) {
          fields.push(`${key} = $${idx}`);
          values.push(val);
          idx++;
        }
      }
      if (fields.length > 0) {
        await pgPool.query(`UPDATE hazard_reports SET ${fields.join(', ')} WHERE id = $1`, values);
        console.log(`[POSTGRES] Verifikasi Laporan ${id} tersimpan di cloud Supabase!`);
      }
    } else if (table === 'cleanup_tasks') {
      const fields = [];
      const values = [id];
      let idx = 2;
      for (const [key, val] of Object.entries(patch)) {
        if (['status', 'confirmed_volunteers', 'after_photo_url', 'closed_at'].includes(key)) {
          fields.push(`${key} = $${idx}`);
          values.push(val);
          idx++;
        }
      }
      if (fields.length > 0) {
        await pgPool.query(`UPDATE cleanup_tasks SET ${fields.join(', ')} WHERE id = $1`, values);
        console.log(`[POSTGRES] Status Tugas ${id} tersimpan di cloud Supabase!`);
      }
    } else if (table === 'flood_response_logs') {
      const fields = [];
      const values = [id];
      let idx = 2;
      for (const [key, val] of Object.entries(patch)) {
        if (['status', 'handled_by_ngo_id', 'handled_at'].includes(key)) {
          fields.push(`${key} = $${idx}`);
          values.push(val);
          idx++;
        }
      }
      if (fields.length > 0) {
        await pgPool.query(`UPDATE flood_response_logs SET ${fields.join(', ')} WHERE id = $1`, values);
      }
    } else if (table === 'users') {
      const fields = [];
      const values = [id];
      let idx = 2;
      for (const [key, val] of Object.entries(patch)) {
        if (['telegram_chat_id', 'is_telegram_synced', 'telegram_subscribe_token'].includes(key)) {
          fields.push(`${key} = $${idx}`);
          values.push(val);
          idx++;
        }
      }
      if (fields.length > 0) {
        await pgPool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $1`, values);
      }
    }
  }

  delete(table, id) {
    if (!this.data[table]) return false;
    this.data[table] = this.data[table].filter(item => item.id !== id);
    this.saveData();

    if (pgPool) {
      const tableName = table === 'reports' ? 'hazard_reports' : table;
      pgPool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]).catch(err => {
        console.error(`[POSTGRES DELETE ERROR] ${table} ${id}:`, err.message);
      });
    }

    return true;
  }

  reset() {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveData();
    return this.data;
  }
}

export const db = new Database();
