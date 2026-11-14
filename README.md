# NEXA (SiagaRT) - Neighborhood Emergency eXchange and Action

Sistem Manajemen Risiko dan Penanganan Banjir Berbasis Komunitas (AI-Assisted Human-in-the-Loop)
Dikembangkan oleh Tim Antigravity (BGT Team)

---

## 1. Ringkasan Eksekutif dan Tujuan Produk

NEXA SiagaRT adalah platform mitigasi dan tanggap darurat banjir di tingkat RT dan RW yang dirancang untuk menjawab keterlambatan penanganan genangan di DKI Jakarta. Sistem ini bekerja melalui dua fase strategis:

1. Fase 1 (Mitigasi Sebelum Hujan):
   Mengubah laporan warga mengenai saluran air tersumbat dan tumpukan sampah menjadi rencana aksi gotong royong terukur. Sistem menghitung tenggat waktu pengerjaan berdasarkan prakiraan hujan lebat dari data BMKG agar saluran bersih sebelum air datang.

2. Fase 2 (Tanggap Darurat dan Evakuasi):
   Mengoordinasikan relawan eksternal dan posko bantuan dengan papan prioritas evakuasi transparan yang menghitung kedalaman genangan serta keberadaan kelompok rentan (lansia, balita, dan penyandang disabilitas).

Sistem menerapkan prinsip Human-in-the-Loop secara penuh. Kecerdasan buatan dari Google Gemini bertindak sebagai asisten analitis yang memberikan saran awal, sementara hak verifikasi dan keputusan pengerahan warga mutlak dipegang oleh Ketua RT.

---

## 2. Kepatuhan Regulasi Privasi (UU No. 27/2022 tentang PDP)

Pemisahan data dan hak akses diatur secara ketat untuk melindungi data pribadi warga:

1. Tampilan Publik dan Warga (Tanpa Login):
   - Warga dapat mengirim laporan bahaya dengan melampirkan teks, foto, dan perkiraan lokasi.
   - Peta publik hanya menyajikan data agregat per wilayah RT atau RW.
   - Titik koordinat GPS presisi dan alamat rumah pelapor disembunyikan di layer backend.
   - Foto yang ditampilkan ke publik disaring untuk menyamarkan visual wajah dan pelat nomor kendaraan.

2. Tampilan Ketua RT dan RW (Login Terverifikasi):
   - Memiliki akses ke detail laporan internal, termasuk alamat presisi untuk pengecekan fisik di lapangan.
   - Berhak memvalidasi atau menolak laporan warga.
   - Berhak mengubah dan menerbitkan tugas gotong royong ke grup lingkungan.
   - Dapat menghubungkan akun dasbor ke bot Telegram resmi melalui deep link unik.

3. Tampilan Lembaga Kemanusiaan dan Relawan Eksternal (Login Terbatas):
   - Mengakses dasbor prioritas evakuasi berbasis tingkat keparahan wilayah RT.
   - Tidak dapat melihat identitas pribadi warga pelapor guna mencegah penyalahgunaan data.
   - Wajib melakukan konfirmasi penanganan di sistem sebelum unit bantuan dikerahkan ke lokasi.

---

## 3. Arsitektur AI Pipeline Google Gemini

Sistem memanfaatkan Google Gemini API secara multimodal di sisi backend:

1. Task 1: Validasi Konten dan Deteksi Mismatch (Gemini Vision)
   Memeriksa kesesuaian antara foto yang diunggah dengan narasi deskripsi laporan. Jika warga melaporkan banjir namun foto memperlihatkan jalan kering atau foto yang tidak relevan, sistem menandai laporan dengan status Mismatch.

2. Task 2: Pemeriksaan Privasi (UU PDP)
   Mendeteksi keberadaan elemen sensitif seperti wajah warga atau pelat nomor kendaraan bermotor pada foto laporan, kemudian menandai kebutuhan sensor sebelum citra disajikan ke publik.

3. Task 3: Penyusunan Draf Tingkat Keparahan dan Rencana Aksi (Gemini LLM)
   Menggabungkan data sisa waktu hujan BMKG dengan detail laporan warga untuk menghasilkan estimasi tingkat keparahan (Ringan, Sedang, atau Berat), estimasi jumlah relawan yang dibutuhkan, serta draf langkah operasional pembersihan saluran.

4. Task 4: Pembobotan Prioritas Evakuasi (Fase 2)
   Menggunakan formula deterministik transparan untuk menentukan urutan evakuasi:
   Skor = (Kedalaman Air dalam cm x 0.45) + (Kelompok Rentan ? 40 : 0) + (Kedalaman >= 75 cm ? 15 : 0)

---

## 4. Logika Peringatan Dini Banjir (Responsible AI Rule Engine)

Keputusan mengenai potensi banjir tidak diserahkan pada model bahasa generatif, melainkan dieksekusi oleh mesin aturan deterministik di server. Status peringatan dini aktif apabila minimal 2 dari 3 parameter berikut terpenuhi:

1. Data BPBD: Pos pantau air terdekat berstatus Siaga 3, Siaga 2, atau Siaga 1.
2. Data BMKG (CAP API): Peringatan dini hujan lebat aktif untuk wilayah kecamatan terkait.
3. Data Internal: Terdapat 3 atau lebih laporan banjir berstatus terverifikasi dalam kurun waktu 2 jam terakhir di kelurahan yang sama.

---

## 5. Integrasi Bot Telegram

Sistem menyediakan kanal notifikasi otomatis melalui Telegram tanpa biaya operasional SMS:

1. Ketua RT masuk ke dasbor dan menekan tombol tautan Telegram.
2. Server membuat token registrasi unik (contoh: TOKEN_RT04_KM89).
3. Ketua RT diarahkan ke tautan deep link bot Telegram.
4. Server menangkap perintah awal bot, menyimpan ID obrolan, dan mengaitkannya ke data RT terkait.
5. Notifikasi laporan baru dan instruksi gotong royong dikirimkan langsung ke ponsel Ketua RT.

---

## 6. Struktur Direktori Proyek

```
NEXA SiagaRT/
|-- README.md                 Dokumentasi umum dan panduan operasional
|-- developerGuide.md         Spesifikasi teknis, DDL database, dan blueprint sistem
|-- .env.example              Template variabel lingkungan aman
|-- .gitignore                Aturan proteksi berkas rahasia dan data dinamis
|-- package.json              Daftar dependensi Node.js
|-- vite.config.js            Konfigurasi bundler frontend
|-- tailwind.config.js        Konfigurasi antarmuka Tailwind CSS
|-- server/
|   |-- server.js             Entry point API Express, middleware keamanan, dan routing
|   |-- db.js                 Manajemen data dan persistensi
|   |-- geminiService.js      Pipeline multimodal Google Gemini
|   |-- telegramService.js    Layanan komunikasi Telegram (polling dan pengiriman pesan)
|   |-- ruleEngine.js         Mesin evaluasi aturan deterministik banjir
|   |-- uploads/              Direktori penyimpanan berkas foto
|   \-- data/                 Direktori berkas data lokal
\-- src/
    |-- main.jsx              Inisialisasi aplikasi React
    |-- App.jsx               Komponen induk dan pengatur navigasi
    |-- index.css             Konfigurasi gaya global
    \-- components/           Komponen antarmuka (Dasbor RT, NGO, Peta Publik, Modal)
```

---

## 7. Panduan Menjalankan Sistem

### Kebutuhan Sistem:
- Node.js versi 18 ke atas
- NPM versi 9 ke atas
- Kunci API Google Gemini (dapat diperoleh melalui Google AI Studio)
- Token Bot Telegram (opsional, diperoleh melalui BotFather)

### Langkah Pemasangan:

1. Salin berkas konfigurasi lingkungan:
   ```bash
   cp .env.example .env
   ```

2. Isi variabel pada berkas .env:
   ```env
   GEMINI_API_KEY=kunci_api_gemini_anda
   TELEGRAM_BOT_TOKEN=token_bot_telegram_anda
   ADMIN_SECRET_KEY=kunci_rahasia_admin_produksi
   PORT=5001
   NODE_ENV=development
   ```

3. Pasang seluruh dependensi:
   ```bash
   npm install
   ```

4. Jalankan aplikasi dalam mode pengembangan:
   ```bash
   npm run dev
   ```
   Aplikasi dapat diakses melalui peramban di http://localhost:3000 dan backend di http://localhost:5001.

5. Membangun versi produksi frontend:
   ```bash
   npm run build
   ```

6. Menjalankan server backend secara mandiri:
   ```bash
   npm run server
   ```
