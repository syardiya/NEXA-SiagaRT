import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle, Send, Clock, 
  Users, Sparkles, CheckSquare, Upload, Flame, CheckCircle2, Camera
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
  onSimulateWebhook
}) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [taskModalReport, setTaskModalReport] = useState(null);
  const [sopPlan, setSopPlan] = useState('');
  const [deadlineMinutes, setDeadlineMinutes] = useState(105);
  const [volunteerCount, setVolunteerCount] = useState(8);
  const [afterPhotoModalTask, setAfterPhotoModalTask] = useState(null);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState('https://images.unsplash.com/photo-1590682680695-43b964a3ae17?auto=format&fit=crop&w=800&q=80');
  const [afterPhotoCompressing, setAfterPhotoCompressing] = useState(false);

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

  // Filter pending reports needing verification
  const pendingReports = reports.filter(r => r.status === 'Pending');
  const verifiedReports = reports.filter(r => r.status === 'Verified' || r.status === 'Task_Created');
  const activeTasks = tasks.filter(t => t.status === 'In_Progress');
  const completedTasks = tasks.filter(t => t.status === 'Completed');

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
      title: `Pembersihan Gotong Royong: ${taskModalReport.hazard_type_label} - ${taskModalReport.kelurahan}`,
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
    <div className="space-y-6">
      {/* Top Banner: RT Command Info & Telegram Status */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-sky-950/80 border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white">Dasbor Komando Ketua RT / RW</h2>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold border border-emerald-500/30">
                  Verified Leader
                </span>
                {rtLeaders.length > 1 && (
                  <select
                    value={currentLeader.id}
                    onChange={(e) => setSelectedLeaderId(e.target.value)}
                    className="bg-slate-800 border border-emerald-500/50 rounded-lg px-2.5 py-1 text-xs text-emerald-300 font-semibold focus:outline-none"
                  >
                    {rtLeaders.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.full_name} ({l.area_label})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Wilayah Pengawasan: <strong className="text-emerald-300">{currentLeader.full_name}</strong> — <strong>{currentLeader.area_label}</strong>
              </p>
            </div>
          </div>

          {/* Telegram Deep Link Box (PRD Section 3) */}
          <div className="flex items-center gap-3 bg-slate-900/90 p-3 rounded-xl border border-sky-500/30 shadow-lg">
            <div className="text-right text-xs">
              <div className="flex items-center gap-1.5 justify-end text-sky-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Bot Telegram Siaga</span>
              </div>
              <span className="text-[11px] text-emerald-300">Notifikasi Real-Time Aktif</span>
            </div>

            <button
              onClick={() => onOpenTelegram(currentLeader.telegram_subscribe_token)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-md shadow-sky-500/20 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Buka Bot Telegram</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Reports vs Active Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Verification Queue (Pending Citizen Reports) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">Antrean Verifikasi Laporan Warga</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {pendingReports.length} Menunggu
              </span>
            </div>
            <span className="text-xs text-slate-400">Human-in-the-loop AI</span>
          </div>

          {pendingReports.length === 0 ? (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-8 text-center text-slate-400">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="font-semibold text-white">Semua Laporan Warga Telah Diverifikasi!</p>
              <p className="text-xs text-slate-400 mt-1">Lingkungan RT Anda saat ini siap menghadapi potensi cuaca ekstrem.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReports.map(report => (
                <div 
                  key={report.id} 
                  className={`bg-slate-900 border rounded-xl p-4 shadow-lg transition-all ${
                    report.ai_flag === 'Mismatch' 
                      ? 'border-amber-500/50 hover:border-amber-400' 
                      : 'border-slate-700 hover:border-sky-500/50'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-500/20 text-sky-300">
                          {report.hazard_type_label}
                        </span>
                        <span className="text-xs text-slate-400">
                          {report.rt_code} {report.rw_code} - {report.kelurahan}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-sm mt-1">{report.description}</h4>
                    </div>

                    {/* AI Flag Badge */}
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        report.ai_flag === 'Valid' 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        <Sparkles className="w-3 h-3" />
                        AI: {report.ai_flag} ({Math.round((report.ai_confidence || 0.95) * 100)}%)
                      </span>
                    </div>
                  </div>

                  {/* AI Reasoning Notice */}
                  <div className="mt-2.5 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-sky-300">Catatan Gemini AI:</strong> {report.ai_reasoning}
                      {report.ai_flag === 'Mismatch' && (
                        <p className="text-amber-300 font-semibold mt-1">
                          ⚠️ Peringatan: Citra tidak cocok dengan klaim banjir. Cek ulang sebelum kerahkan warga.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Photo & Exact Location (Verified RT view) */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Photo with privacy note */}
                    <div className="relative rounded-lg overflow-hidden border border-slate-700 h-28 bg-slate-950">
                      <img 
                        src={report.raw_photo_url || report.blurred_photo_url} 
                        alt="Hazard" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 right-1 bg-slate-900/90 text-[10px] text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40">
                        Foto Asli (Khusus RT)
                      </div>
                    </div>

                    {/* Location & Reporter */}
                    <div className="space-y-1 bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/60 text-slate-300">
                      <div>
                        <span className="text-slate-400">Alamat Presisi:</span>
                        <p className="font-semibold text-white">{report.exact_location?.address || 'Jl. Pemukiman RT 04'}</p>
                      </div>
                      <div className="pt-1 border-t border-slate-700/50 text-[11px]">
                        <span className="text-slate-400">Pelapor:</span> {report.reporter_name} ({report.reporter_phone})
                      </div>
                      <div className="text-[11px]">
                        <span className="text-slate-400">Saran Keparahan:</span>{' '}
                        <strong className="text-amber-300">{report.ai_suggested_severity || 'Sedang'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: Verify vs Reject */}
                  <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => onVerifyReport(report.id, 'Rejected')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 hover:bg-rose-950/60 border border-rose-800/40 transition-colors"
                    >
                      Tolak (Spam / Mismatch)
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onVerifyReport(report.id, 'Verified')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors"
                      >
                        Verifikasi Saja
                      </button>

                      <button
                        onClick={() => handleOpenTaskCreation(report)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-all"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Verifikasi & Buat Tugas</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Active Cleanup Tasks (Phase 1 Gotong Royong) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-sky-400" />
              <h3 className="font-bold text-white text-base">Tugas Gotong Royong (Phase 1)</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {activeTasks.length} Aktif
              </span>
            </div>
          </div>

          {activeTasks.length === 0 ? (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 text-center text-slate-400 text-xs">
              Belum ada tugas aktif. Verifikasi laporan di sebelah kiri untuk membuat tugas mitigasi.
            </div>
          ) : (
            <div className="space-y-4">
              {activeTasks.map(task => (
                <div key={task.id} className="bg-slate-900 border border-sky-500/40 rounded-xl p-4 shadow-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        Target Pre-Rain BMKG
                      </span>
                      <h4 className="font-bold text-white text-sm mt-1">{task.title}</h4>
                      <p className="text-xs text-slate-400">{task.exact_address}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                      In Progress
                    </span>
                  </div>

                  {/* BMKG Rain Countdown Badge */}
                  <div className="bg-gradient-to-r from-amber-950/60 to-slate-900 p-3 rounded-lg border border-amber-600/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-amber-200">
                      <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                      <div>
                        <strong className="block text-white">Tenggat Hujan BMKG:</strong>
                        <span className="text-[11px] text-amber-300">{task.rain_forecast_note}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300 font-semibold bg-slate-800 px-2.5 py-1 rounded">
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      <span>{task.volunteers_count || 8} Relawan</span>
                    </div>
                  </div>

                  {/* SOP Action Plan */}
                  <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 text-xs text-slate-300">
                    <strong className="text-white block mb-1">SOP Rencana Aksi Gotong Royong:</strong>
                    <pre className="whitespace-pre-line font-sans text-xs text-slate-300 leading-relaxed">
                      {task.sop_action_plan}
                    </pre>
                  </div>

                  {/* Mark Completed Button */}
                  <button
                    onClick={() => setAfterPhotoModalTask(task)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Selesaikan Tugas & Unggah Foto Bersih</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Completed History Summary */}
          {completedTasks.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Riwayat Gotong Royong Selesai ({completedTasks.length})
              </h4>
              <div className="space-y-2">
                {completedTasks.map(t => (
                  <div key={t.id} className="bg-slate-800/40 p-3 rounded-xl border border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-slate-200 block">{t.title}</strong>
                      <span className="text-[11px] text-emerald-400">✓ Selesai sebelum hujan turun</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{t.volunteers_count} Relawan</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Creation Modal */}
      {taskModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Buat Tugas Gotong Royong Pre-Rain</h3>
              </div>
              <button onClick={() => setTaskModalReport(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleConfirmTask} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Target Lokasi Pembersihan:</label>
                <input
                  type="text"
                  readOnly
                  value={taskModalReport.exact_location?.address}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Tenggat Waktu BMKG (Menit):</label>
                  <input
                    type="number"
                    value={deadlineMinutes}
                    onChange={(e) => setDeadlineMinutes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-bold text-amber-300"
                  />
                  <span className="text-[10px] text-slate-400">Estimasi hujan lebat tiba</span>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Kebutuhan Relawan RT:</label>
                  <input
                    type="number"
                    value={volunteerCount}
                    onChange={(e) => setVolunteerCount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Warga digerakkan</span>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex items-center justify-between">
                  <span>Draf SOP Tindakan (Generated by Gemini):</span>
                  <span className="text-[10px] text-sky-400">Bisa disesuaikan</span>
                </label>
                <textarea
                  rows={5}
                  value={sopPlan}
                  onChange={(e) => setSopPlan(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-sans leading-relaxed"
                />
              </div>

              <div className="p-3 bg-sky-950/40 border border-sky-600/30 rounded-lg text-[11px] text-sky-300 flex items-center gap-2">
                <Send className="w-4 h-4 shrink-0 text-sky-400" />
                <span>Tugas akan otomatis disiarkan ke bot Telegram Ketua RT & grup relawan lingkungan.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTaskModalReport(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-lg shadow-emerald-600/25"
                >
                  Konfirmasi & Terbitkan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Task & Upload After Photo Modal */}
      {afterPhotoModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Tutup Tugas: Unggah Bukti Pembersihan</h3>
              </div>
              <button onClick={() => setAfterPhotoModalTask(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleConfirmCompleteTask} className="space-y-3 text-xs">
              <p className="text-slate-300">
                Hebat! Saluran air telah dibersihkan sebelum hujan lebat turun. Unggah foto kondisi bersih (After Photo) sebagai bukti pertanggungjawaban gotong royong.
              </p>

              <div className="relative rounded-lg overflow-hidden border border-slate-700 h-36 bg-slate-950">
                <img src={afterPhotoUrl} alt="After cleanup" className="w-full h-full object-cover" />
                <div className="absolute bottom-1 right-1 bg-emerald-950/90 text-[10px] text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                  {afterPhotoCompressing ? "Mengoptimalkan foto..." : "After Photo Preview"}
                </div>
              </div>

              {/* Hidden file inputs for camera & gallery */}
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

              <div className="space-y-2">
                <label className="text-slate-300 font-semibold block">Bukti Foto Hasil Bersih:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => afterCameraInputRef.current?.click()}
                    disabled={afterPhotoCompressing}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Foto Kamera Langsung</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => afterGalleryInputRef.current?.click()}
                    disabled={afterPhotoCompressing}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Pilih dari Galeri</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAfterPhotoModalTask(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-lg shadow-emerald-600/25"
                >
                  Tandai Selesai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
