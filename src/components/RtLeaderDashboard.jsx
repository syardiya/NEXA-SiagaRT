import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle, Send, Clock, 
  Users, Sparkles, CheckSquare, Upload, Flame, CheckCircle2, 
  Camera, ArrowRight, Copy, Megaphone
} from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

export default function RtLeaderDashboard({ 
  reports = [], 
  tasks = [], 
  areas = [], 
  users = [],
  onVerifyReport, 
  onCreateTask, 
  onCompleteTask, 
  onOpenTelegram,
  onSwitchToNgo
}) {
  const [taskModalReport, setTaskModalReport] = useState(null);
  const [sopPlan, setSopPlan] = useState('');
  const [deadlineMinutes, setDeadlineMinutes] = useState(105);
  const [volunteerCount, setVolunteerCount] = useState(8);
  const [afterPhotoModalTask, setAfterPhotoModalTask] = useState(null);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState('');
  const [afterPhotoCompressing, setAfterPhotoCompressing] = useState(false);

  // Community Coordination Broadcast Template State
  const [selectedPhaseTemplate, setSelectedPhaseTemplate] = useState('PREVENT'); // 'PREVENT' | 'RESPOND' | 'RECOVER'
  const [copiedBroadcast, setCopiedBroadcast] = useState(false);

  const afterCameraInputRef = useRef(null);
  const afterGalleryInputRef = useRef(null);

  const handleAfterPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAfterPhotoCompressing(true);
    try {
      const res = await compressImage(file);
      if (res.dataUrl) {
        setAfterPhotoUrl(res.dataUrl);
      }
    } catch (err) {
      console.warn("Gagal memproses foto:", err);
    } finally {
      setAfterPhotoCompressing(false);
      e.target.value = '';
    }
  };

  // Multi RT Leader Switcher
  const rtLeaders = users.filter(u => u.role === 'RT_Leader');
  const [selectedLeaderId, setSelectedLeaderId] = useState('');
  const currentLeader = rtLeaders.find(u => u.id === selectedLeaderId) || rtLeaders[0] || {
    id: "user-rt-bambang",
    full_name: "Pak Bambang Supriyadi",
    area_label: "RT 04 / RW 02 Kampung Melayu",
    telegram_subscribe_token: "TOKEN_RT04_KM89",
    rt_rw_id: "area-km-04-02"
  };

  // 1. Community Verification Queue (All pending reports in RT/RW)
  const pendingReports = reports.filter(r => r.status === 'Pending');
  const activeTasks = tasks.filter(t => t.status === 'In_Progress');
  const completedTasks = tasks.filter(t => t.status === 'Completed');

  // Broadcast Templates for RT/RW to forward to Residents' WhatsApp / Telegram Group
  const broadcastTemplates = {
    PREVENT:
      `📢 *[PENGUMUMAN SIAGA RT — FASE PREVENT (SEBELUM HUJAN)]*\n` +
      `Wilayah: *${currentLeader.area_label}*\n` +
      `Koordinator: *${currentLeader.full_name}*\n\n` +
      `Bapak/Ibu Warga yang kami hormati,\n` +
      `Berdasarkan pantauan cuaca dan laporan di sistem *NEXA SiagaRT*, terdapat titik saluran drainase yang perlu segera dibersihkan sebelum hujan turun.\n\n` +
      `*Apa yang Harus Dilakukan Warga Saat Ini:*\n` +
      `1. Mohon kerja sama warga/relawan lingkungan untuk berkumpul di titik saluran yang dilaporkan.\n` +
      `2. Bersihkan sampah/endapan di depan rumah masing-masing dan jangan membuang sampah ke selokan.\n` +
      `3. Jika melihat sumbatan baru, segera laporkan melalui web NEXA SiagaRT.\n\n` +
      `_Terima kasih atas gotong royong warga ${currentLeader.area_label}!_`,
    RESPOND:
      `🚨 *[PERINGATAN DARURAT RT — FASE RESPOND (SAAT BANJIR)]*\n` +
      `Wilayah: *${currentLeader.area_label}*\n` +
      `Koordinator: *${currentLeader.full_name}*\n\n` +
      `Bapak/Ibu Warga yang kami hormati,\n` +
      `Debit air mulai meningkat di lingkungan kita. Pengurus RT/RW bersama Relawan Warga sedang melakukan penanganan prioritas.\n\n` +
      `*Panduan Keselamatan Warga Saat Ini:*\n` +
      `1. *Matikan aliran listrik* (MCB) jika air mulai mendekati lantai rumah dan amankan dokumen penting ke tempat tinggi.\n` +
      `2. *Prioritas Evakuasi:* Utamakan keselamatan Lansia (60+), Balita (0-5 thn), Ibu Hamil, dan Penyandang Disabilitas menuju Posko Pengungsian RT/Musholla terdekat.\n` +
      `3. *Dilarang mendekati arus deras* atau saluran induk yang meluap.\n` +
      `4. Bagi rumah yang memiliki warga rentan/terisolasi, segera kirim laporan kebutuhan bantuan di NEXA SiagaRT agar Relawan tahu siapa yang harus ditolong pertama.\n\n` +
      `_Tetap tenang dan ikuti arahan pengurus RT/RW setempat._`,
    RECOVER:
      `✅ *[INFO PEMULIHAN RT — FASE RECOVER (PASCA BANJIR)]*\n` +
      `Wilayah: *${currentLeader.area_label}*\n` +
      `Koordinator: *${currentLeader.full_name}*\n\n` +
      `Bapak/Ibu Warga yang kami hormati,\n` +
      `Genangan air telah surut. Saat ini pengurus RT/RW sedang mendata dampak pasca-banjir dan kebutuhan lanjutan warga.\n\n` +
      `*Langkah Pemulihan Lingkungan:*\n` +
      `1. Pastikan instalasi listrik benar-benar kering sebelum dinyalakan kembali.\n` +
      `2. Laporkan sisa lumpur atau kerusakan fasilitas melalui NEXA SiagaRT untuk evaluasi dan pembersihan bersama.\n` +
      `3. Warga yang membutuhkan pemeriksaan kesehatan pasca-banjir dapat melapor ke Posko RT.`
  };

  const handleCopyBroadcast = () => {
    navigator.clipboard.writeText(broadcastTemplates[selectedPhaseTemplate]);
    setCopiedBroadcast(true);
    setTimeout(() => setCopiedBroadcast(false), 3000);
  };

  const handleOpenTaskCreation = (report) => {
    setTaskModalReport(report);
    setSopPlan(report.ai_suggested_action || '');
    setVolunteerCount(report.recommended_volunteers || 6);
  };

  const handleConfirmTask = (e) => {
    e.preventDefault();
    if (!taskModalReport) return;
    onCreateTask({
      hazard_report_id: taskModalReport.id,
      title: `Aksi Relawan Warga: ${taskModalReport.hazard_type_label} - ${taskModalReport.kelurahan}`,
      sop_action_plan: sopPlan,
      deadline_minutes: deadlineMinutes,
      volunteers_count: volunteerCount
    });
    setTaskModalReport(null);
  };

  const handleConfirmCompleteTask = (e) => {
    e.preventDefault();
    if (!afterPhotoModalTask) return;
    onCompleteTask({
      taskId: afterPhotoModalTask.id,
      after_photo_url: afterPhotoUrl
    });
    setAfterPhotoModalTask(null);
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Top Banner: RT Central Action Hub & NEXA Bot */}
      <div className="bg-white border-2 border-emerald-600/30 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg md:text-xl font-extrabold text-slate-900">
                  Pusat Komando RT/RW — Verifikasi & Koordinasi Komunitas
                </h2>
                <span className="text-xs bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-md font-bold border border-emerald-300">
                  PREVENT & RESPOND Coordinator
                </span>
                {rtLeaders.length > 1 && (
                  <select
                    value={currentLeader.id}
                    onChange={(e) => setSelectedLeaderId(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-bold focus:outline-none"
                  >
                    {rtLeaders.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.full_name} ({l.area_label})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-xs md:text-sm text-slate-600 mt-1">
                2 Tanggung Jawab Utama RT: <strong>(1) Community Verification</strong> (Validasi laporan AI) & <strong>(2) Community Coordination</strong> (Menggerakkan warga/relawan & pengumuman).
              </p>
            </div>
          </div>

          {/* NEXA Bot Box */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-right text-xs">
              <div className="flex items-center gap-1.5 justify-end text-blue-700 font-extrabold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>NEXA Bot Siaga</span>
              </div>
              <span className="text-[11px] text-slate-600 font-medium">Notifikasi RT Aktif</span>
            </div>

            <button
              onClick={() => onOpenTelegram(currentLeader.telegram_subscribe_token)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Buka NEXA Bot</span>
            </button>
          </div>
        </div>

        {/* Info Koordinasi RT/RW + Dukungan Relawan (Volunteers) */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-slate-700 font-medium">
            <strong className="text-emerald-800">Alur Tindakan Nyata:</strong> Penggerak utama di lapangan adalah <strong>RT/RW bersama warga setempat</strong>. Jika saat banjir membutuhkan tangan tambahan, <strong>Relawan (Volunteers / NGO)</strong> siap mendukung berdasarkan prioritas risiko AI.
          </div>
          {onSwitchToNgo && (
            <button
              onClick={onSwitchToNgo}
              className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 underline shrink-0"
            >
              <span>Buka Portal Relawan (Volunteers)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* FITUR PANDUAN & TEMPLATE PENGUMUMAN WARGA (SIAP FORWARD KE GRUP WA/TELEGRAM RT) */}
      <div className="bg-white border-2 border-blue-200 rounded-2xl p-5 shadow-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Template Pengumuman & Panduan Warga (Siap Teruskan ke Grup Warga)
              </h3>
              <p className="text-xs text-slate-600">
                Pilih fase kondisi untuk menyalin pesan panduan resmi RT/RW (*What should residents do based on the alert*).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setSelectedPhaseTemplate('PREVENT')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedPhaseTemplate === 'PREVENT' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              1. PREVENT (Sebelum Hujan)
            </button>
            <button
              onClick={() => setSelectedPhaseTemplate('RESPOND')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedPhaseTemplate === 'RESPOND' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              2. RESPOND (Saat Banjir)
            </button>
            <button
              onClick={() => setSelectedPhaseTemplate('RECOVER')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedPhaseTemplate === 'RECOVER' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              3. RECOVER (Pasca Banjir)
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <pre className="text-xs text-slate-800 font-sans whitespace-pre-line leading-relaxed flex-1">
            {broadcastTemplates[selectedPhaseTemplate]}
          </pre>
          <button
            onClick={handleCopyBroadcast}
            className={`shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer ${
              copiedBroadcast
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>{copiedBroadcast ? '✓ Teks Berhasil Disalin!' : 'Salin Teks untuk Grup Warga'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Community Verification vs Community Coordination Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Responsibility 1 — Community Verification */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-extrabold text-slate-900 text-base">
                1. Community Verification (Validasi Laporan Warga & AI)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                {pendingReports.length} Menunggu
              </span>
            </div>
          </div>

          {pendingReports.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-600 shadow-xs">
              <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-slate-900 text-base">Semua Laporan di Wilayah RT Telah Diverifikasi!</p>
              <p className="text-xs text-slate-600 mt-1">
                Tidak ada laporan yang menunggu verifikasi saat ini.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReports.map(report => (
                <div 
                  key={report.id} 
                  className={`bg-white border-2 rounded-2xl p-5 shadow-xs transition-all ${
                    report.ai_flag === 'Mismatch' 
                      ? 'border-amber-400' 
                      : 'border-slate-200 hover:border-blue-400'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                          report.hazard_type === 'Flood'
                            ? 'bg-red-100 text-red-900 border-red-300'
                            : 'bg-blue-100 text-blue-900 border-blue-200'
                        }`}>
                          {report.hazard_type_label}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          {report.rt_code} {report.rw_code} - {report.kelurahan}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-base mt-1.5">{report.description}</h4>
                    </div>

                    {/* AI Flag Badge */}
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-extrabold ${
                        report.ai_flag === 'Valid' 
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        <Sparkles className="w-3.5 h-3.5" />
                        AI: {report.ai_flag} ({Math.round((report.ai_confidence || 0.95) * 100)}%)
                      </span>
                    </div>
                  </div>

                  {/* AI Reasoning Notice */}
                  <div className="mt-3 p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-800 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-blue-900">Hasil Saringan AI:</strong> {report.ai_reasoning}
                      {report.ai_flag === 'Mismatch' && (
                        <p className="text-amber-900 font-bold mt-1">
                          ⚠️ Peringatan: Informasi tampak kurang akurat. Silakan konfirmasi kondisi lokal sebelum menggerakkan warga.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Photo & Exact Location */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="relative rounded-xl overflow-hidden border border-slate-300 h-32 bg-slate-100">
                      <img 
                        src={report.raw_photo_url || report.blurred_photo_url || report.photo_url} 
                        alt="Lokasi Laporan" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1.5 right-1.5 bg-white/95 text-[11px] font-bold text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 shadow-xs">
                        Foto Laporan Warga
                      </div>
                    </div>

                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
                      <div>
                        <span className="text-slate-500 font-semibold">Lokasi:</span>
                        <p className="font-bold text-slate-900">{report.exact_location?.address || `Wilayah ${report.rt_code} ${report.kelurahan}`}</p>
                      </div>
                      <div className="pt-1 border-t border-slate-200 text-xs">
                        <span className="text-slate-500 font-semibold">Pelapor:</span> <strong className="text-slate-900">{report.reporter_name || 'Warga RT'}</strong>
                      </div>
                      <div className="text-xs flex items-center justify-between">
                        <span><span className="text-slate-500 font-semibold">Flood Severity:</span> <strong className="text-amber-800">{report.flood_severity || report.ai_suggested_severity || 'Medium'}</strong></span>
                        <span><span className="text-slate-500 font-semibold">Priority:</span> <strong className="text-red-700">{report.emergency_priority || 'Medium'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: Verify vs Reject */}
                  <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => onVerifyReport(report.id, 'Rejected')}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                    >
                      Tandai Tidak Akurat (Tolak)
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onVerifyReport(report.id, 'Verified')}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
                      >
                        Verifikasi Kondisi Lokal
                      </button>

                      <button
                        onClick={() => handleOpenTaskCreation(report)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>Verifikasi & Bagikan Tugas ke Relawan</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Responsibility 2 — Community Coordination (Volunteer Tasks) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-slate-900 text-base">
                2. Community Coordination (Tugas Relawan Warga)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-900 border border-blue-200">
                {activeTasks.length} Berjalan
              </span>
            </div>
          </div>

          {activeTasks.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-600 text-xs shadow-xs">
              Belum ada tugas aktif. Verifikasi laporan warga di sebelah kiri untuk membagikan tugas kepada relawan lingkungan.
            </div>
          ) : (
            <div className="space-y-4">
              {activeTasks.map(task => (
                <div key={task.id} className="bg-white border-2 border-blue-200 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                        Koordinasi RT/RW & Relawan
                      </span>
                      <h4 className="font-extrabold text-slate-900 text-sm md:text-base mt-1.5">{task.title}</h4>
                      <p className="text-xs text-slate-600 font-medium">{task.exact_address}</p>
                    </div>
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                      Berjalan
                    </span>
                  </div>

                  {/* BMKG Rain Countdown Badge */}
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-amber-900">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                      <div>
                        <strong className="block text-slate-900">Target Waktu Tindakan:</strong>
                        <span className="text-xs font-semibold text-amber-800">{task.rain_forecast_note}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-800 font-bold bg-white px-2.5 py-1 rounded-lg border border-amber-200">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>{task.volunteers_count || 8} Relawan</span>
                    </div>
                  </div>

                  {/* SOP Action Plan */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-800">
                    <strong className="text-slate-900 block mb-1">Arahan Tugas untuk Relawan:</strong>
                    <pre className="whitespace-pre-line font-sans text-xs text-slate-700 leading-relaxed">
                      {task.sop_action_plan}
                    </pre>
                  </div>

                  {/* Mark Completed Button */}
                  <button
                    onClick={() => setAfterPhotoModalTask(task)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verifikasi Hasil & Unggah Bukti Selesai</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Completed History Summary */}
          {completedTasks.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                Tindakan Selesai Diverifikasi RT ({completedTasks.length})
              </h4>
              <div className="space-y-2">
                {completedTasks.map(t => (
                  <div key={t.id} className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-2xs">
                    <div>
                      <strong className="text-slate-900 block">{t.title}</strong>
                      <span className="text-xs font-semibold text-emerald-700">✓ Bukti terverifikasi oleh RT/RW</span>
                    </div>
                    <span className="text-xs font-bold text-slate-600">{t.volunteers_count} Relawan</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Creation Modal - Clean White */}
      {taskModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-300 rounded-2xl shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Bagikan Tugas ke Relawan Warga</h3>
              </div>
              <button onClick={() => setTaskModalReport(null)} className="text-slate-500 hover:text-slate-900 font-bold">✕</button>
            </div>

            <form onSubmit={handleConfirmTask} className="space-y-3.5 text-xs md:text-sm">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Lokasi Tindakan:</label>
                <input
                  type="text"
                  readOnly
                  value={taskModalReport.exact_location?.address || taskModalReport.kelurahan}
                  className="w-full bg-slate-100 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Target Waktu (Menit):</label>
                  <input
                    type="number"
                    value={deadlineMinutes}
                    onChange={(e) => setDeadlineMinutes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-amber-800 font-extrabold"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">Jumlah Relawan Dibutuhkan:</label>
                  <input
                    type="number"
                    value={volunteerCount}
                    onChange={(e) => setVolunteerCount(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-extrabold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Instruksi Tugas (Rekomendasi AI - Bisa Disesuaikan RT):
                </label>
                <textarea
                  rows={4}
                  value={sopPlan}
                  onChange={(e) => setSopPlan(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-sans leading-relaxed"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2 font-medium">
                <Send className="w-4 h-4 shrink-0 text-blue-600" />
                <span>Tugas ini otomatis dikirim melalui NEXA Bot dan tampil di halaman informasi warga.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setTaskModalReport(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-sm"
                >
                  Bagikan Tugas Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Task & Upload After Photo Modal */}
      {afterPhotoModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Verifikasi Hasil Tindakan Relawan</h3>
              </div>
              <button onClick={() => setAfterPhotoModalTask(null)} className="text-slate-500 hover:text-slate-900 font-bold">✕</button>
            </div>

            <form onSubmit={handleConfirmCompleteTask} className="space-y-3.5 text-xs md:text-sm">
              <p className="text-slate-700">
                Unggah foto bukti kondisi setelah ditangani oleh relawan warga untuk diverifikasi oleh RT/RW.
              </p>

              <div className="relative rounded-xl overflow-hidden border border-slate-300 h-40 bg-slate-100 flex items-center justify-center">
                {afterPhotoUrl ? (
                  <>
                    <img src={afterPhotoUrl} alt="After cleanup" className="w-full h-full object-cover" />
                    <div className="absolute bottom-1.5 right-1.5 bg-white/95 text-xs font-bold text-emerald-800 px-2.5 py-0.5 rounded border border-emerald-300">
                      {afterPhotoCompressing ? "Mengompres foto..." : "Pratinjau Foto Bukti"}
                    </div>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">
                    {afterPhotoCompressing ? "Mengompres foto..." : "Silakan ambil atau pilih foto bukti tindakan"}
                  </span>
                )}
              </div>

              <input
                ref={afterCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleAfterPhotoChange}
                className="hidden"
              />
              <input
                ref={afterGalleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleAfterPhotoChange}
                className="hidden"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => afterCameraInputRef.current?.click()}
                  disabled={afterPhotoCompressing}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Buka Kamera</span>
                </button>
                <button
                  type="button"
                  onClick={() => afterGalleryInputRef.current?.click()}
                  disabled={afterPhotoCompressing}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Pilih Galeri</span>
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAfterPhotoModalTask(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-sm"
                >
                  Verifikasi & Tandai Selesai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
