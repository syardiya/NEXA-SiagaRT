# NEXA (SiagaRT) — Neighborhood Emergency eXchange and Action

**Penilaian Risiko Banjir & Prioritas Bantuan Tingkat RT Berbantuan AI (*Real-Time Flood Risk Intelligence & Community Action*)**  
Dikembangkan oleh Tim Antigravity (BGT Team)

---

## 1. Ringkasan Eksekutif & 3 Pertanyaan Utama NEXA

NEXA SiagaRT adalah platform **Super Intelligence** mitigasi dan tanggap darurat banjir tingkat RT/RW di DKI Jakarta yang menjawab **3 pertanyaan kritis** sebelum, saat, dan sesudah banjir:

1. **Seberapa Bahaya Banjirnya? (*Flood Severity*)** — Menilai kondisi fisik air, kecepatan kenaikan air, arus/sumbatan drainase, serta tinggi muka air pintu air hulu.
2. **Siapa yang Paling Berisiko? (*Vulnerability & Exposure*)** — Mengidentifikasi keberadaan kelompok rentan (lansia, balita, ibu hamil, penyandang disabilitas/kursi roda, warga sakit) dan isolasi akses jalan.
3. **Siapa yang Harus Ditolong Pertama? (*Emergency Priority*)** — Memisahkan *Flood Severity* dari *Emergency Priority* (*Urgency != Flood Depth*) agar RT/RW dan Relawan bergerak ke titik paling kritis secara manusiawi dan akurat.

Sistem bekerja melalui siklus lengkap **PREVENT (Sebelum Banjir) → RESPOND (Saat Banjir) → RECOVER (Pasca Banjir)** dengan prinsip **Human-in-the-Loop**: AI membantu analisis dan rekomendasi cepat, sedangkan verifikasi dan keputusan pengerahan tetap dipegang manusia (Ketua RT, Relawan/NGO, dan Pemilik Web).

---

## 2. Sumber Data Real-Time (Bebas Data Dummy)

Seluruh data meteorologi dan hidrologi ditarik langsung dari sumber resmi dan diperbarui berkala di server:

| Sumber Data | Endpoint / Layanan | Modul | Siklus Update |
|---|---|---|---|
| **Tinggi Muka Air (TMA) Pintu Air & Bendungan** | `https://bpbd.jakarta.go.id/waterlevel` & `/api/charttma` (Sumber: Dinas SDA DKI) | `server/services/pintuAir.js`, `ambang.js`, `liveData.js` | Tiap 10 menit |
| **Peringatan Dini Cuaca Resmi BMKG (CAP XML)** | `https://www.bmkg.go.id/alerts/nowcast/id` | `server/services/bmkgCap.js`, `liveData.js` | Tiap 10 menit |
| **Prakiraan Cuaca & Peluang Hujan Per Jam** | `https://api.open-meteo.com/v1/forecast` | `server/server.js` (`getLiveWeatherForecast`) | Tiap 3 menit |
| **Database Cloud & Geospasial** | Supabase PostgreSQL + PostGIS + `server/data/nexa.db.json` | `server/db.js` | Real-time |

Data operasional awal (`reports`, `cleanup_tasks`, `flood_response_logs`, `telegram_messages`) dimulai bersih dari **`0`** sehingga seluruh data yang tampil di peta maupun dashboard berasal murni dari input pengguna dan feed resmi.

---

## 3. Arsitektur AI Pipeline (Google Gemini 3 Flash)

Sistem memanggil **Google Gemini (`gemini-3-flash-preview`)** secara multimodal (foto + teks) di sisi backend (`server/geminiService.js`), dengan konteks tambahan berupa **data TMA pintu air BPBD real-time**, **estimasi hujan Open-Meteo**, dan **memori pembelajaran manusia (*Few-Shot Ground Truth*)**:

1. **Validasi Konten & Deteksi Mismatch (Gemini Vision):** Memeriksa kesesuaian foto dengan deskripsi warga (`Valid`, `Mismatch`, atau `Spam`).
2. **Klasifikasi 3 Mekanisme Banjir Jakarta:** `HUJAN_LOKAL_DRAINASE`, `KIRIMAN_HULU`, atau `ROB_PESISIR`.
3. **4-Indicator Flood Risk & Emergency Priority Scoring:**
   * **Physical Hazard (40%):** Kedalaman air (jika diukur/disebutkan; tetap `null` / *"Belum Diketahui"* jika tidak diketahui, tidak pernah dipaksa `0`), arus deras, sumbatan/kepadatan sampah.
   * **Population Exposure & Access Isolation (15%):** Jalan/gang terputus dan jumlah rumah terdampak.
   * **Population Vulnerability (30%):** Lansia, balita/bayi, ibu hamil, disabilitas/kursi roda, warga sakit.
   * **Evacuation Capacity (15%):** Ketersediaan jalur pengungsian atau kebutuhan perahu karet.
4. **Continuous Human-Feedback Learning & Fine-Tuning Exporter:**
   * Setiap verifikasi Ketua RT/Relawan (`Verified` / `Rejected`) memperbarui memori *Few-Shot* AI (`/api/ai/learning-stats`).
   * Dataset berlabel dapat diekspor langsung dalam format `.JSONL` standar fine-tuning Gemini (`/api/ai/training-dataset?format=jsonl`).
5. **Multi-Point NGO Fleet Dispatch Optimizer:** Mengoptimalkan pembagian rute armada/perahu karet relawan menggunakan jarak Haversine + skor prioritas darurat (`/api/evacuations/optimize`).

---

## 4. Aturan Peringatan Dini Banjir (2-of-3 Rule Engine)

Untuk mencegah alarm palsu (*false positive*), status peringatan dini wilayah (`WARNING` / `CRITICAL`) di `server/ruleEngine.js` hanya aktif jika minimal **2 dari 3 sinyal independen** terpenuhi:
1. **BPBD / Dinas SDA:** Pos pantau terkait berstatus **Siaga 3, Siaga 2, atau Siaga 1**.
2. **BMKG CAP Resmi:** Peringatan dini cuaca ekstrem aktif untuk Jakarta / kecamatan terkait.
3. **Laporan Internal Warga:** Minimal **3 laporan banjir terverifikasi** dalam **2 jam terakhir** di kelurahan yang sama.

---

## 5. Kepatuhan Privasi (UU PDP No. 27/2022) & Portal Peran

1. **Halaman Publik Warga (Tanpa Login):**
   * Peta hanya menampilkan **titik agregat wilayah RT** (koordinat rumah pelapor disembunyikan di backend).
   * Foto laporan yang tampil di endpoint publik otomatis diburamkan secara permanen di level piksel (*Canvas pixelation + Gaussian blur + watermark*) oleh `src/utils/imageCompressor.js`.
2. **Pusat Komando Ketua RT/RW (Login):**
   * Melihat lokasi presisi dan foto asli untuk verifikasi lapangan, menerbitkan jadwal Gotong Royong + SOP + Template Broadcast WA/Telegram (PREVENT/RESPOND/RECOVER).
3. **Portal Relawan / Volunteers & NGO (Daftar / Login):**
   * Mendukung pendaftaran relawan warga maupun unit NGO, menangani tugas pencegahan sebelum hujan, mengunggah foto bukti selesai, dan mengelola prioritas evakuasi banjir.
4. **Dashboard Admin / Pemilik Web (`/admin` — Halaman Terpisah):**
   * Terpisah dari navigasi publik warga (akses langsung via `/admin` atau `#admin`, default ID: `112`, PIN: `1234`).
   * Memantau total laporan & sebaran terbanyak per wilayah RT/RW, memantau data real-time cuaca/pintu air/AI, mengekspor dataset `.JSONL`, melakukan aksi langsung (verifikasi/tolak/hapus laporan, tugas, evakuasi), serta tombol **Reset Laporan ke 0**.

---

## 6. Integrasi Bot Telegram 2-Arah

Mendukung mode **Webhook** dan **Long-Polling** (`server/telegramService.js`):
* Pengurus RT dapat menautkan akun via deep-link token (`/start TOKEN_...`).
* Mendukung perintah interaktif `/status`, `/cek`, `/tugas`, `/link`, `/help`, serta pesan teks bebas.

---

## 7. Struktur Direktori Proyek

```text
NEXA SiagaRT/
├── README.md
├── developerGuide.md
├── package.json
├── vite.config.js
├── server/
│   ├── server.js               # Express API, Open-Meteo feed, Auth/JWT, Admin endpoints
│   ├── db.js                   # Store in-memory + sinkronisasi Supabase PostgreSQL/PostGIS
│   ├── liveData.js             # Scheduler 10 menit untuk BPBD TMA & BMKG CAP
│   ├── services/
│   │   ├── pintuAir.js         # Scraper real-time https://bpbd.jakarta.go.id/waterlevel
│   │   ├── ambang.js           # Ambang Siaga resmi per pintu air (/api/charttma)
│   │   └── bmkgCap.js          # Parser XML resmi https://www.bmkg.go.id/alerts/nowcast/id
│   ├── geminiService.js        # Pipeline Google Gemini 3 Flash + 4-Indicator Scoring + Optimizer
│   ├── ruleEngine.js           # Mesin evaluasi 2-of-3 + mekanisme banjir Jakarta
│   ├── telegramService.js      # Bot Telegram 2-arah (Webhook & Polling)
│   ├── uploads/                # Berkas foto laporan warga
│   └── data/                   # Cache lokal (nexa.db.json)
└── src/
    ├── App.jsx                 # Routing publik, dashboard peran, & /admin
    ├── index.css               # Konfigurasi gaya Tailwind CSS (Clean Light Mode)
    ├── utils/
    │   └── imageCompressor.js  # Kompresi + Pixel-level Privacy Blur (UU PDP)
    └── components/
        ├── Navbar.jsx
        ├── PublicMap.jsx
        ├── ReportModal.jsx
        ├── RtLeaderDashboard.jsx
        ├── NgoDashboard.jsx
        ├── AdminDashboard.jsx  # Halaman terpisah Pemilik Web (/admin)
        ├── LoginModal.jsx
        ├── RegisterModal.jsx
        ├── ImpactStatsBar.jsx
        └── TelegramSimulatorModal.jsx
```

---

## 8. Panduan Menjalankan Sistem

### Kebutuhan Sistem
* Node.js 18+ (disarankan 20+)
* NPM 9+
* `GEMINI_API_KEY` (Google AI Studio)
* `DATABASE_URL` (Supabase PostgreSQL + PostGIS — opsional untuk cloud persistence)
* `TELEGRAM_BOT_TOKEN` (opsional, dari `@BotFather`)

### Instalasi & Menjalankan Lokal
```bash
cp .env.example .env
# Isi GEMINI_API_KEY, DATABASE_URL, TELEGRAM_BOT_TOKEN di .env

npm install
npm run dev
```
* **Frontend:** `http://localhost:3000` (atau `http://localhost:5173`)
* **Backend API:** `http://localhost:5001`
* **Dashboard Pemilik Web:** `http://localhost:3000/admin` (ID: `112`, PIN: `1234`)

### Build Produksi
```bash
npm run build
npm run server
```
