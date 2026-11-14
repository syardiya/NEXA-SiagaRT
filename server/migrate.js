import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;
import { INITIAL_DATA } from './db.js';

export async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("ERROR: Variabel DATABASE_URL tidak ditemukan di .env!");
    console.log("Pastikan Anda sudah mengisi DATABASE_URL di file .env Anda.");
    process.exit(1);
  }

  let connectionUrl = databaseUrl;
  // Jika URL menggunakan Transaction Pooler (:6543) di Supabase, khusus saat migrasi skema tabel
  // dialihkan ke port :5432 (Session Pooler) agar ekstensi PostGIS & pembuatan tabel berjalan 100% mulus
  if (connectionUrl.includes('pooler.supabase.com:6543')) {
    connectionUrl = connectionUrl.replace(':6543', ':5432');
  }

  console.log("Menghubungkan ke database PostgreSQL/Supabase...");
  const pool = new Pool({
    connectionString: connectionUrl,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();

  try {
    console.log("1. Mengaktifkan ekstensi UUID dan Spasial PostGIS...");
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "postgis";`);

    console.log("2. Membuat tabel RT/RW Areas...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS rt_rw_areas (
        id VARCHAR(64) PRIMARY KEY,
        kelurahan VARCHAR(100) NOT NULL,
        kecamatan VARCHAR(100) NOT NULL,
        kota VARCHAR(100) NOT NULL DEFAULT 'Jakarta Timur',
        rw_code VARCHAR(10) NOT NULL,
        rt_code VARCHAR(10) NOT NULL,
        monitoring_post VARCHAR(100),
        geom_center GEOMETRY(Point, 4326) NOT NULL,
        geom_polygon GEOMETRY(Polygon, 4326) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_areas_geom_center ON rt_rw_areas USING GIST (geom_center);
      CREATE INDEX IF NOT EXISTS idx_areas_geom_polygon ON rt_rw_areas USING GIST (geom_polygon);
    `);

    console.log("3. Membuat tabel Users & Aparat RT...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        role VARCHAR(30) NOT NULL CHECK (role IN ('Resident', 'RT_Leader', 'RW_Leader', 'NGO', 'Admin')),
        phone_number VARCHAR(30) NOT NULL,
        telegram_chat_id VARCHAR(50),
        telegram_subscribe_token VARCHAR(100) UNIQUE,
        rt_rw_id VARCHAR(64) REFERENCES rt_rw_areas(id) ON DELETE SET NULL,
        area_label VARCHAR(150),
        is_telegram_synced BOOLEAN DEFAULT FALSE,
        password_hash VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
      CREATE INDEX IF NOT EXISTS idx_users_telegram_token ON users (telegram_subscribe_token);
    `);

    console.log("4. Membuat tabel Hazard Reports (Laporan Warga)...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS hazard_reports (
        id VARCHAR(64) PRIMARY KEY,
        reporter_id VARCHAR(64),
        reporter_name VARCHAR(150) NOT NULL,
        reporter_phone VARCHAR(50) NOT NULL,
        rt_rw_id VARCHAR(64) NOT NULL REFERENCES rt_rw_areas(id) ON DELETE CASCADE,
        kelurahan VARCHAR(100) NOT NULL,
        rw_code VARCHAR(10) NOT NULL,
        rt_code VARCHAR(10) NOT NULL,
        hazard_type VARCHAR(50) NOT NULL CHECK (hazard_type IN ('Clogged_Drain', 'Trash', 'Flood')),
        hazard_type_label VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        exact_address TEXT NOT NULL,
        exact_location GEOMETRY(Point, 4326) NOT NULL,
        raw_photo_url TEXT NOT NULL,
        blurred_photo_url TEXT,
        privacy_masked BOOLEAN DEFAULT TRUE,
        ai_flag VARCHAR(30) DEFAULT 'Valid' CHECK (ai_flag IN ('Valid', 'Mismatch', 'Spam')),
        ai_confidence NUMERIC(4, 2) DEFAULT 0.95,
        ai_reasoning TEXT,
        ai_suggested_severity VARCHAR(30) DEFAULT 'Sedang' CHECK (ai_suggested_severity IN ('Ringan', 'Sedang', 'Berat')),
        ai_suggested_action TEXT,
        recommended_volunteers INTEGER DEFAULT 5,
        status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Verified', 'Task_Created', 'Closed', 'Rejected')),
        verified_by_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        verified_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_reports_exact_location ON hazard_reports USING GIST (exact_location);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON hazard_reports (status);
      CREATE INDEX IF NOT EXISTS idx_reports_rt_rw_id ON hazard_reports (rt_rw_id);
    `);

    console.log("5. Membuat tabel Cleanup Tasks (Gotong Royong)...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS cleanup_tasks (
        id VARCHAR(64) PRIMARY KEY,
        hazard_report_id VARCHAR(64) NOT NULL REFERENCES hazard_reports(id) ON DELETE CASCADE,
        rt_rw_id VARCHAR(64) NOT NULL REFERENCES rt_rw_areas(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        deadline_at TIMESTAMP WITH TIME ZONE NOT NULL,
        target_volunteers INTEGER DEFAULT 5,
        confirmed_volunteers INTEGER DEFAULT 0,
        action_plan TEXT NOT NULL,
        status VARCHAR(30) DEFAULT 'Open' CHECK (status IN ('Open', 'In_Progress', 'Completed')),
        verified_by_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        after_photo_url TEXT,
        closed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON cleanup_tasks (status);
    `);

    console.log("6. Membuat tabel Flood Response Logs (Fase 2)...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS flood_response_logs (
        id VARCHAR(64) PRIMARY KEY,
        rt_rw_id VARCHAR(64) NOT NULL REFERENCES rt_rw_areas(id) ON DELETE CASCADE,
        water_depth_cm INTEGER NOT NULL DEFAULT 0,
        has_vulnerable_people BOOLEAN NOT NULL DEFAULT FALSE,
        vulnerable_count INTEGER DEFAULT 0,
        priority_score INTEGER NOT NULL,
        priority_level VARCHAR(30) NOT NULL,
        status VARCHAR(30) DEFAULT 'Needs_Evacuation' CHECK (status IN ('Needs_Evacuation', 'Assigned', 'Resolved')),
        handled_by_ngo_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        handled_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_flood_priority_score ON flood_response_logs (priority_score DESC);
    `);

    console.log("7. Membuat tabel Telegram Messages...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS telegram_messages (
        id VARCHAR(64) PRIMARY KEY,
        recipient_name VARCHAR(150) NOT NULL,
        chat_id VARCHAR(50) NOT NULL,
        area_label VARCHAR(150),
        message_type VARCHAR(50) NOT NULL,
        message_content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_tg_chat_id ON telegram_messages (chat_id);
    `);

    // SEEDING DATA
    console.log("8. Memeriksa dan mengisi data awal (Seeding)...");
    const areasRes = await client.query('SELECT COUNT(*) FROM rt_rw_areas');
    if (parseInt(areasRes.rows[0].count) === 0) {
      console.log("Menyemai data wilayah RT...");
      for (const a of INITIAL_DATA.areas) {
        const polyPoints = a.geom_polygon.map(p => `${p[1]} ${p[0]}`).join(', ');
        const closedPoly = `${polyPoints}, ${a.geom_polygon[0][1]} ${a.geom_polygon[0][0]}`;
        await client.query(`
          INSERT INTO rt_rw_areas (id, kelurahan, kecamatan, kota, rw_code, rt_code, monitoring_post, geom_center, geom_polygon)
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            ST_SetSRID(ST_MakePoint($8, $9), 4326),
            ST_SetSRID(ST_GeomFromText($10), 4326)
          )
          ON CONFLICT (id) DO NOTHING
        `, [
          a.id, a.kelurahan, a.kecamatan, a.kota || 'Jakarta Timur', a.rw_code, a.rt_code, a.monitoring_post,
          a.geom_center.lng, a.geom_center.lat,
          `POLYGON((${closedPoly}))`
        ]);
      }
    }

    const usersRes = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(usersRes.rows[0].count) === 0) {
      console.log("Menyemai data pengguna & Ketua RT...");
      for (const u of INITIAL_DATA.users) {
        await client.query(`
          INSERT INTO users (id, full_name, role, phone_number, telegram_chat_id, telegram_subscribe_token, rt_rw_id, area_label, is_telegram_synced)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `, [
          u.id, u.full_name, u.role, u.phone_number, u.telegram_chat_id, u.telegram_subscribe_token, u.rt_rw_id, u.area_label, u.is_telegram_synced ?? false
        ]);
      }
    }

    const reportsRes = await client.query('SELECT COUNT(*) FROM hazard_reports');
    if (parseInt(reportsRes.rows[0].count) === 0) {
      console.log("Menyemai data laporan awal...");
      for (const r of INITIAL_DATA.reports) {
        await client.query(`
          INSERT INTO hazard_reports (
            id, reporter_id, reporter_name, reporter_phone, rt_rw_id, kelurahan, rw_code, rt_code,
            hazard_type, hazard_type_label, description, exact_address, exact_location,
            raw_photo_url, blurred_photo_url, privacy_masked, ai_flag, ai_confidence, ai_reasoning,
            ai_suggested_severity, ai_suggested_action, recommended_volunteers, status, created_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
            ST_SetSRID(ST_MakePoint($13, $14), 4326),
            $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
          )
          ON CONFLICT (id) DO NOTHING
        `, [
          r.id, r.reporter_id, r.reporter_name, r.reporter_phone, r.rt_rw_id, r.kelurahan, r.rw_code, r.rt_code,
          r.hazard_type, r.hazard_type_label, r.description, r.exact_location?.address || 'Jakarta',
          r.exact_location?.lng || 106.8456, r.exact_location?.lat || -6.2088,
          r.raw_photo_url, r.blurred_photo_url, r.privacy_masked ?? true, r.ai_flag, r.ai_confidence || 0.95,
          r.ai_reasoning, r.ai_suggested_severity, r.ai_suggested_action, r.recommended_volunteers || 6,
          r.status, r.created_at || new Date().toISOString()
        ]);
      }
    }

    console.log("MIGRASI POSTGRESQL + POSTGIS SUKSES SEPENUHNYA!");
  } catch (err) {
    console.error("Gagal menjalankan migrasi:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

// Jalankan jika dieksekusi langsung
if (process.argv[1]?.endsWith('migrate.js')) {
  runMigration();
}
