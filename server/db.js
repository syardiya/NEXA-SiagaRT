import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import { startLiveData } from './liveData.js';
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

  reports: [],

  cleanup_tasks: [],

  flood_response_logs: [],

  bpbd_posts: [],

  bmkg_forecast: {
    station: null,
    province: "DKI Jakarta",
    current_condition: null,
    active_warning: {
      is_active: false
    },
    intervals: []
  },

  telegram_messages: []
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

      // 3. Hazard Reports (Always sync exact state from cloud, including 0 rows)
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
      this.data.reports = reportsRes.rows.map(r => ({
        ...r,
        exact_location: {
          address: r.exact_address,
          lat: Number(r.lat),
          lng: Number(r.lng)
        }
      }));

      // 4. Cleanup Tasks
      const tasksRes = await pgPool.query(`SELECT * FROM cleanup_tasks ORDER BY created_at DESC`);
      this.data.cleanup_tasks = tasksRes.rows;

      // 5. Flood Logs
      const floodRes = await pgPool.query(`SELECT * FROM flood_response_logs ORDER BY created_at DESC`);
      this.data.flood_response_logs = floodRes.rows;

      // 6. Telegram Messages
      const tgRes = await pgPool.query(`SELECT * FROM telegram_messages ORDER BY created_at DESC`);
      this.data.telegram_messages = tgRes.rows;

      this.saveData();
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
        item.id, item.rt_rw_id, item.water_depth_cm ?? null, item.has_vulnerable_people ?? false, item.vulnerable_count || 0,
        item.priority_score, item.priority_level, item.status || 'Waiting_NGO', item.handled_by_ngo_id,
        item.handled_at, item.vulnerable_details || item.notes || '', item.created_at || new Date().toISOString()
      ]);
      console.log(`[POSTGRES] Log Evakuasi ${item.id} berhasil tersimpan di cloud Supabase!`);
    } else if (table === 'users') {
      await pgPool.query(`
        INSERT INTO users (
          id, full_name, role, phone_number, telegram_chat_id, telegram_subscribe_token,
          rt_rw_id, area_label, is_telegram_synced, password_hash, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          phone_number = EXCLUDED.phone_number,
          area_label = EXCLUDED.area_label
      `, [
        item.id,
        item.full_name,
        item.role || 'Resident',
        item.phone_number || '0812-xxxx-xxxx',
        item.telegram_chat_id || null,
        item.telegram_subscribe_token || null,
        item.rt_rw_id || null,
        item.area_label || 'Relawan Warga',
        item.is_telegram_synced ?? false,
        item.pin || '1234',
        item.created_at || new Date().toISOString()
      ]);
      console.log(`[POSTGRES] Akun Pengguna/Relawan ${item.full_name} berhasil tersimpan di cloud Supabase!`);
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

  async clearOperationalData() {
    this.data.reports = [];
    this.data.cleanup_tasks = [];
    this.data.flood_response_logs = [];
    this.data.telegram_messages = [];
    this.saveData();

    if (pgPool) {
      try {
        await pgPool.query(`DELETE FROM cleanup_tasks`);
        await pgPool.query(`DELETE FROM flood_response_logs`);
        await pgPool.query(`DELETE FROM hazard_reports`);
        await pgPool.query(`DELETE FROM telegram_messages`);
        console.log("[POSTGRES] Semua laporan, tugas gotong royong, evakuasi, dan log Telegram di cloud Supabase berhasil dikosongkan ke 0!");
      } catch (err) {
        console.error("[POSTGRES CLEAR ERROR]:", err.message);
      }
    }
    return this.data;
  }

  reset() {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveData();
    return this.data;
  }
}

export const db = new Database();
startLiveData(db);
