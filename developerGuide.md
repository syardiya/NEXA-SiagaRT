# Cetak Biru Teknis dan Panduan Pengembang: NEXA (SiagaRT)

Neighborhood Emergency eXchange and Action
Dokumen Arsitektur Teknis, Skema Basis Data Produksi, dan Standar Rekayasa Perangkat Lunak
Dikembangkan oleh Tim Antigravity (BGT Team)

---

## 1. Ikhtisar Arsitektur dan Filosofi Sistem

NEXA SiagaRT adalah platform penanganan risiko banjir berbasis komunitas tingkat rukun tetangga di DKI Jakarta. Sistem ini dirancang menggunakan paradigma AI-Assisted Human-in-the-Loop:

1. Peran Kecerdasan Buatan (Google Gemini):
   Kecerdasan buatan difungsikan sebagai analis data otomatis. AI menerima masukan teks dan visual dari warga, memeriksa keaslian laporan, menandai potensi pelanggaran privasi, dan merumuskan draf tindakan gotong royong sebelum hujan lebat tiba.

2. Peran Manusia (Ketua RT dan RW):
   Kedaulatan validasi dan eksekusi berada mutlak di tangan Ketua RT. AI tidak memiliki kewenangan mengubah status laporan menjadi terverifikasi secara mandiri. Keputusan penugasan warga, penyesuaian draf langkah aksi, dan penolakan laporan palsu sepenuhnya ditentukan oleh aparat lingkungan terkait.

3. Dua Fase Operasional:
   - Fase 1 (Mitigasi dan Pencegahan): Fokus pada pembersihan sedimentasi saluran dan timbunan sampah sebelum hujan ekstrem turun, mengacu pada hitungan mundur prakiraan BMKG.
   - Fase 2 (Tanggap Darurat dan Evakuasi): Fokus pada pembobotan prioritas penyelamatan warga terdampak banjir dengan memperhatikan kedalaman air dan kelompok rentan.

---

## 2. Pengelolaan Hak Akses dan Kepatuhan UU Privasi (UU No. 27/2022 PDP)

Sistem mengimplementasikan kontrol akses berbasis peran (Role-Based Access Control / RBAC) yang terbagi menjadi tiga tingkatan:

1. Warga dan Publik (Unauthenticated):
   - Hak Akses: Mengirim laporan bahaya dan mendaftarkan diri sebagai relawan gotong royong.
   - Batasan Tampilan: Hanya dapat melihat peta agregat per wilayah RT atau RW. Koordinat presisi GPS dan alamat rumah pelapor disembunyikan di layer server. Foto publik disaring untuk menyamarkan wajah dan pelat nomor kendaraan bermotor.

2. Ketua RT dan RW (Authenticated - RT_Leader):
   - Hak Akses: Melihat antrean laporan berstatus Pending, melihat alamat presisi pelapor untuk inspeksi lapangan, memvalidasi atau menolak laporan, menyunting draf SOP gotong royong, menerbitkan tugas lingkungan, serta menautkan bot Telegram resmi melalui deep link.

3. Lembaga Kemanusiaan dan Relawan Eksternal (Authenticated - NGO):
   - Hak Akses: Mengakses dasbor prioritas evakuasi Fase 2, melihat statistik kedalaman air dan jumlah warga rentan per RT, serta menandai penanganan evakuasi.
   - Batasan Tampilan: Tidak memiliki akses ke data identitas individual pelapor untuk mencegah kebocoran data pribadi warga saat kondisi darurat.

---

## 3. Skema Basis Data Produksi (PostgreSQL dan PostGIS)

Untuk mendukung pemrosesan data spasial berkecepatan tinggi pada skala produksi metropolitan, basis data direkomendasikan menggunakan PostgreSQL versi 15 atau lebih baru dengan ekstensi PostGIS.

### Script DDL SQL Lengkap:

```sql
-- Mengaktifkan ekstensi UUID dan Spasial PostGIS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Tabel Wilayah RT / RW
CREATE TABLE rt_rw_areas (
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

CREATE INDEX idx_areas_geom_center ON rt_rw_areas USING GIST (geom_center);
CREATE INDEX idx_areas_geom_polygon ON rt_rw_areas USING GIST (geom_polygon);
CREATE INDEX idx_areas_kelurahan ON rt_rw_areas (kelurahan);

-- 2. Tabel Pengguna dan Aparat Lingkungan
CREATE TABLE users (
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

CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_telegram_token ON users (telegram_subscribe_token);
CREATE INDEX idx_users_rt_rw_id ON users (rt_rw_id);

-- 3. Tabel Laporan Bahaya Warga
CREATE TABLE hazard_reports (
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

CREATE INDEX idx_reports_exact_location ON hazard_reports USING GIST (exact_location);
CREATE INDEX idx_reports_status ON hazard_reports (status);
CREATE INDEX idx_reports_rt_rw_id ON hazard_reports (rt_rw_id);
CREATE INDEX idx_reports_hazard_type ON hazard_reports (hazard_type);
CREATE INDEX idx_reports_created_at ON hazard_reports (created_at DESC);

-- 4. Tabel Tugas Gotong Royong (Fase 1)
CREATE TABLE cleanup_tasks (
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

CREATE INDEX idx_tasks_status ON cleanup_tasks (status);
CREATE INDEX idx_tasks_deadline ON cleanup_tasks (deadline_at);
CREATE INDEX idx_tasks_rt_rw_id ON cleanup_tasks (rt_rw_id);

-- 5. Tabel Log Tanggap Bencana dan Evakuasi (Fase 2)
CREATE TABLE flood_response_logs (
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

CREATE INDEX idx_flood_priority_score ON flood_response_logs (priority_score DESC);
CREATE INDEX idx_flood_status ON flood_response_logs (status);

-- 6. Tabel Riwayat Pesan Bot Telegram
CREATE TABLE telegram_messages (
    id VARCHAR(64) PRIMARY KEY,
    recipient_name VARCHAR(150) NOT NULL,
    chat_id VARCHAR(50) NOT NULL,
    area_label VARCHAR(150),
    message_type VARCHAR(50) NOT NULL,
    message_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tg_chat_id ON telegram_messages (chat_id);
CREATE INDEX idx_tg_created_at ON telegram_messages (created_at DESC);
```

---

## 4. Pipeline Analisis Kecerdasan Buatan (Google Gemini)

Integrasi kecerdasan buatan dijalankan pada sisi server melalui berkas `server/geminiService.js`:

1. Alur Masukan Multimodal:
   - Server menerima foto laporan warga (melalui unggahan multipart form atau data URI base64).
   - Fungsi `resolveImageToPart()` membaca berkas lokal atau remote URL aman, kemudian mengonversinya menjadi objek `inline_data` standar Google Gemini API.
   - Pemeriksaan keamanan `isSafePublicImageUrl()` diterapkan untuk mencegah eksploitasi Server-Side Request Forgery (SSRF) terhadap alamat lokal atau metadata cloud.

2. Fallback Model Otomatis:
   Sistem menyusun daftar prioritas model:
   - `gemini-3.5-flash-lite`
   - `gemini-3.1-flash-lite`
   - `gemini-2.5-flash`
   - `gemini-1.5-flash`
   Jika salah satu model mengalami batas kuota atau kendala versi di Google AI Studio, sistem secara otomatis mencoba model kandidat berikutnya tanpa memutus alur pengguna.

3. Format Luaran JSON Terstruktur:
   Permintaan ke Gemini API dikunci menggunakan parameter `responseMimeType: "application/json"` dengan skema luaran:
   - `ai_flag`: Menilai keaslian laporan ("Valid", "Mismatch", atau "Spam").
   - `ai_confidence`: Nilai keyakinan model (skala 0.00 hingga 1.00).
   - `ai_reasoning`: Penjelasan ringkas dasar pertimbangan analisis visual dan teks.
   - `has_privacy_elements`: Boolean pendeteksi keberadaan wajah atau pelat nomor.
   - `ai_suggested_severity`: Saran tingkat keparahan ("Ringan", "Sedang", "Berat").
   - `ai_suggested_action`: Draf langkah gotong royong terukur sebelum hujan tiba.
   - `recommended_volunteers`: Estimasi kebutuhan tenaga kerja warga.

4. Logika Cadangan Cerdas (Heuristic Engine Fallback):
   Bila koneksi internet menuju API Google terputus atau kunci API tidak terpasang, sistem secara otomatis mengaktifkan mesin heuristik berbasis aturan inferensi lokal sehingga fungsi aplikasi tetap beroperasi secara normal tanpa menimbulkan pesan kesalahan fatal bagi pengguna.

---

## 5. Logika Mesin Aturan Deteksi Dini Banjir (Responsible AI)

Mengikuti prinsip kecerdasan buatan yang bertanggung jawab, penetapan status bahaya banjir tidak diserahkan pada model probabilitas generatif. Mesin aturan deterministik pada `server/ruleEngine.js` mengevaluasi parameter fisik secara ketat.

Notifikasi "Possible flood, needs verification" dinyatakan aktif jika sedikitnya 2 dari 3 kondisi berikut terpenuhi:

1. Kondisi 1 (Data Status Pos Pantau BPBD):
   Pos pantau sungai terdekat dengan wilayah kelurahan (misal: Pos Manggarai, Katulampa, Karet) mencatat ketinggian air pada tingkat Siaga 3, Siaga 2, atau Siaga 1.

2. Kondisi 2 (Data Peringatan Dini Cuaca Ekstrem BMKG):
   Terdapat peringatan dini aktif berformat Common Alerting Protocol (CAP) dari BMKG untuk wilayah kecamatan terkait dengan prakiraan hujan lebat dalam 1 hingga 3 jam ke depan.

3. Kondisi 3 (Akumulasi Laporan Internal):
   Tercatat sedikitnya 3 laporan banjir yang telah berstatus Terverifikasi oleh Ketua RT dalam kurun waktu 2 jam terakhir pada kelurahan yang sama.

---

## 6. Arsitektur Komunikasi Telegram Bot

Sistem menyediakan integrasi bot Telegram dua arah pada `server/telegramService.js`:

1. Mekanisme Deep Link Registrasi:
   - Sistem membangkitkan token acak saat Ketua RT menekan tombol tautan Telegram di dasbor.
   - Tautan berformat `https://t.me/UsernameBot?start=TOKEN_RTxx` dibuka oleh pengguna.
   - Saat pengguna menekan tombol Start di Telegram, klien Telegram mengirimkan payload `/start TOKEN_RTxx` ke server.

2. Mode Penerimaan Pesan (Long Polling vs Webhook):
   - Lingkungan Pengembangan dan Internal: Menggunakan background long-polling (`getUpdates`). Metode ini memungkinkan server lokal atau server di balik NAT menerima pesan secara instan tanpa memerlukan IP publik atau sertifikat domain HTTPS.
   - Lingkungan Produksi Cloud: Dapat beralih menggunakan endpoint webhook HTTPS terdaftar via `setWebhook` yang diarahkan ke rute `/api/telegram/webhook`.

3. Validasi Keamanan Webhook Telegram:
   - Endpoint `/api/telegram/webhook` pada mode produksi memvalidasi keaslian panggilan melalui header resmi `X-Telegram-Bot-Api-Secret-Token`.
   - Pemeriksaan dilakukan menggunakan fungsi perbandingan waktu konstan `crypto.timingSafeEqual` terhadap variabel lingkungan `TELEGRAM_WEBHOOK_SECRET` guna mencegah pemalsuan identitas server pengirim.
   - Endpoint pembangkitan token `/api/telegram/generate-token` dilindungi ketat menggunakan otentikasi sesi `requireAuth(['RT_Leader', 'Admin'])`.

4. Penyiaran Instruksi Tugas:
   Setelah tugas gotong royong disahkan oleh Ketua RT, server secara asinkron memformat pesan berstruktur rapi yang berisi batas waktu BMKG, lokasi koordinasi, dan daftar alat kerja untuk dikirimkan langsung ke ponsel Ketua RT.

---

## 7. Standar Keamanan Backend dan Perlindungan Data

Aplikasi dilengkapi proteksi keamanan lapis ganda di berkas `server/server.js`:

1. Pembatasan Laju Permintaan (Rate Limiting):
   - `loginLimiter`: Membatasi percobaan otentikasi maksimal 10 kali dalam jendela waktu 5 menit untuk mencegah serangan brute-force.
   - `reportLimiter`: Membatasi pembuatan laporan maksimal 15 kali per 5 menit per alamat IP guna menekan potensi spam denial-of-service.

2. Otentikasi Timing-Safe:
   Verifikasi kunci rahasia administratif menggunakan fungsi `crypto.timingSafeEqual` pada perbandingan buffer string untuk meniadakan celah serangan analisis waktu respons (timing attack).

3. Sanitasi dan Filter Berkas Unggahan:
   Pustaka Multer dikonfigurasi dengan filter ketat: hanya menerima berkas bertipe MIME `image/jpeg`, `image/png`, dan `image/webp` dengan batasan ukuran berkas maksimal 8 Megabyte. Nama berkas disimpan menggunakan pengacak kriptografi (`crypto.randomBytes`) guna mencegah eksploitasi path traversal.

4. Header Keamanan Standar:
   Server menonaktifkan header identifikasi `X-Powered-By` serta menerapkan header `X-Content-Type-Options: nosniff` dan `X-Frame-Options: SAMEORIGIN`.

5. Penonaktifan Rute Uji Coba pada Mode Produksi:
   Endpoint pengujian dan simulasi (seperti `/api/system/clear-all`, `/api/system/reset`, dan `/api/rule-engine/simulate`) secara otomatis menghasilkan respons `404 Not Found` apabila variabel lingkungan `NODE_ENV` bernilai `production`.

---

## 8. Panduan Migrasi Menuju Produksi Penuh

Berikut adalah langkah-langkah transisi dari penyimpanan lokal menuju infrastruktur produksi mandiri:

1. Penyediaan Basis Data PostgreSQL:
   - Buat basis data baru bernama `nexa_siagart` pada server PostgreSQL.
   - Eksekusi script DDL SQL yang tercantum pada Bagian 3 dokumen ini.
   - Pastikan ekstensi `postgis` dan `uuid-ossp` terpasang secara sempurna.

2. Konfigurasi Variabel Lingkungan Produksi:
   Atur variabel lingkungan pada server hosting (Docker, AWS ECS, GCP Cloud Run, atau VPS Linux):
   ```env
   NODE_ENV=production
   PORT=5001
   DATABASE_URL=postgresql://nama_pengguna:kata_sandi@host_db:5432/nexa_siagart
   ADMIN_SECRET_KEY=kunci_rahasia_panjang_yang_diacak_kriptografi
   GEMINI_API_KEY=kunci_api_resmi_dari_google_ai_studio
   TELEGRAM_BOT_TOKEN=token_bot_resmi_dari_botfather
   TELEGRAM_BOT_USERNAME=NexaSiagaBot
   TELEGRAM_WEBHOOK_SECRET=token_rahasia_acak_untuk_verifikasi_webhook
   ```

3. Pengelolaan Proses dan Reverse Proxy:
   - Gunakan process manager seperti PM2 atau container orchestration Docker untuk memastikan server backend otomatis menyala kembali jika terjadi kegagalan sistem.
   - Pasang reverse proxy Nginx di depan aplikasi untuk menangani terminasi SSL HTTPS (Let's Encrypt / Certbot), kompresi Gzip, dan penyajian berkas statis antarmuka hasil kompilasi `dist/`.
