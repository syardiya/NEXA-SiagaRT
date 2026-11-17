import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, HeartHandshake, Anchor, 
  ShieldCheck, CheckCircle2, Droplets, Plus,
  Sparkles, CheckSquare, Cpu, Navigation, Download, Flame, Camera, Upload
} from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

export default function NgoDashboard({ 
  reports = [],
  tasks = [],
  evacuations = [], 
  areas = [], 
  users = [],
  stats = {},
  loggedInUser = null,
  onVerifyReport,
  onCompleteTask,
  onHandleEvacuation, 
  onCreateEvacuation 
}) {
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedEvac, setSelectedEvac] = useState(null);
  const [dispatchNotes, setDispatchNotes] = useState('Ditindaklanjuti oleh Relawan Lingkungan & arahan RT/RW setempat.');
  const [reportFilter, setReportFilter] = useState('ALL'); // 'ALL' | 'FLOOD_ONLY'
  
  // Volunteer PREVENT Task Proof Upload State
  const [afterPhotoModalTask, setAfterPhotoModalTask] = useState(null);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState('');
  const [afterPhotoCompressing, setAfterPhotoCompressing] = useState(false);
  const afterCameraInputRef = useRef(null);
  const afterGalleryInputRef = useRef(null);

  // Fleet Optimizer & AI Learning State
  const [availableBoats, setAvailableBoats] = useState(2);
  const [fleetOptimization, setFleetOptimization] = useState(null);
  const [learningStats, setLearningStats] = useState(null);

  // New Flood Response Form State (Rule 4: depth can be left blank if unknown)
  const [selectedAreaId, setSelectedAreaId] = useState(areas[0]?.id || 'area-km-04-02');
  const [waterDepth, setWaterDepth] = useState('');
  const [hasVulnerable, setHasVulnerable] = useState(true);
  const [accessIsolated, setAccessIsolated] = useState(false);
  const [vulnerableDetails, setVulnerableDetails] = useState('');
  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    fetch(`/api/evacuations/optimize?boats=${availableBoats}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setFleetOptimization(data.optimization);
      })
      .catch(() => {});
  }, [evacuations, availableBoats]);

  useEffect(() => {
    fetch('/api/ai/learning-stats')
      .then(r => r.json())
      .then(data => {
        if (data.success) setLearningStats(data.stats);
      })
      .catch(() => {});
  }, [reports]);

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

  const handleConfirmCompleteTask = (e) => {
    e.preventDefault();
    if (!afterPhotoModalTask || !onCompleteTask) return;
    onCompleteTask({
      taskId: afterPhotoModalTask.id,
      after_photo_url: afterPhotoUrl
    });
    setAfterPhotoModalTask(null);
    setAfterPhotoUrl('');
  };

  const handleConfirmDispatch = (e) => {
    e.preventDefault();
    if (!selectedEvac) return;
    onHandleEvacuation({
      id: selectedEvac.id,
      handled_by_ngo_id: loggedInUser?.id || 'user-ngo-tagana',
      dispatch_notes: dispatchNotes
    });
    setSelectedEvac(null);
  };

  const handleCreateNewEvac = (e) => {
    e.preventDefault();
    onCreateEvacuation({
      rt_rw_id: selectedAreaId,
      water_depth_cm: waterDepth === '' ? null : Number(waterDepth),
      has_vulnerable_people: hasVulnerable,
      access_isolated: accessIsolated,
      vulnerable_details: vulnerableDetails,
      is_night: isNight
    });
    setShowNewModal(false);
    setWaterDepth('');
    setVulnerableDetails('');
  };

  const activePreventTasks = tasks.filter(t => t.status === 'In_Progress');
  const registeredVolunteersCount =
    stats.registered_volunteers_count ??
    users.filter(u => u.role === 'NGO' || u.role === 'Resident').length;
  const registeredNgoUnitsCount =
    stats.registered_ngo_units_count ??
    users.filter(u => u.role === 'NGO').length;

  const filteredCitizenReports = reports
    .filter(r => reportFilter === 'FLOOD_ONLY' ? r.hazard_type === 'Flood' : true)
    .sort((a, b) => {
      if (a.hazard_type === 'Flood' && b.hazard_type !== 'Flood') return -1;
      if (a.hazard_type !== 'Flood' && b.hazard_type === 'Flood') return 1;
      return (b.priority_score || 50) - (a.priority_score || 50);
    });

  return (
    <div className="space-y-6 text-slate-900">
      {/* Top Banner - Volunteer & RT/RW Response Portal */}
      <div className="bg-white border-2 border-rose-500/30 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-rose-100 text-rose-800 border border-rose-300">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg md:text-xl font-extrabold text-slate-900">
                  Halaman Portal Relawan (Volunteers) — Aksi PREVENT & RESPOND
                </h2>
                <span className="text-xs bg-rose-100 text-rose-900 px-2.5 py-0.5 rounded-md font-bold border border-rose-300">
                  {loggedInUser ? `Masuk Sebagai: ${loggedInUser.full_name}` : 'Portal Relawan & Dukungan Bantuan'}
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-600 mt-1">
                Tempat relawan warga maupun komunitas/NGO menjalankan tugas pencegahan dari RT/RW (<strong>PREVENT</strong>) serta menindaklanjuti prioritas bantuan banjir (<strong>RESPOND: Urgency &ne; Flood Depth</strong>).
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs md:text-sm shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Input Kondisi Banjir & Kebutuhan Bantuan</span>
          </button>
        </div>
      </div>

      {/* BAGIAN PREVENT UNTUK RELAWAN: TUGAS LAPANGAN DARI RT/RW */}
      <div className="bg-white border-2 border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-extrabold text-slate-900 text-base md:text-lg">
                1. Tugas Pencegahan dari RT/RW untuk Relawan (Fase PREVENT — Sebelum Banjir)
              </h3>
              <p className="text-xs text-slate-600">
                Sesuai alur: RT/RW membagikan tugas pembersihan saluran $\rightarrow$ Relawan melakukan tindakan & mengunggah foto bukti.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
            {activePreventTasks.length} Tugas Aktif
          </span>
        </div>

        {activePreventTasks.length === 0 ? (
          <div className="p-6 text-center text-slate-600 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            Belum ada tugas pencegahan yang sedang aktif saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePreventTasks.map(task => (
              <div key={task.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <strong className="text-slate-900 block text-sm md:text-base font-extrabold">{task.title}</strong>
                      <span className="text-xs font-semibold text-slate-600">📍 {task.exact_address || task.kelurahan}</span>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-bold shrink-0">
                      {task.rain_forecast_note}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 bg-white p-3 rounded-xl border border-slate-200 font-sans whitespace-pre-line leading-relaxed">
                    {task.sop_action_plan}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-700 font-semibold">
                    Kebutuhan: <strong>{task.volunteers_count || 6} Relawan</strong>
                  </span>
                  <button
                    onClick={() => setAfterPhotoModalTask(task)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Unggah Bukti Tindakan Selesai</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FITUR SUPERINTELLIGENCE: ORKESTRASI PRIORITAS BANTUAN MULTI-TITIK */}
      {fleetOptimization && fleetOptimization.allocations?.length > 0 && (
        <div className="bg-white border-2 border-blue-300 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base md:text-lg">
                  2. AI Triage: Siapa yang Harus Ditolong Pertama? (Fase RESPOND — Saat Banjir)
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Menentukan urutan respons lapangan paling optimal saat kapasitas tim/perahu terbatas (menggabungkan skor kerentanan warga, keterisolasian akses, dan jarak tempuh).
              </p>
            </div>

            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-xl border border-blue-200 text-xs">
              <span className="font-bold text-slate-800">Kapasitas Tim / Perahu Siap:</span>
              <select
                value={availableBoats}
                onChange={(e) => setAvailableBoats(Number(e.target.value))}
                className="bg-white border border-blue-300 rounded-lg px-2.5 py-1 font-extrabold text-blue-900"
              >
                <option value={1}>1 Tim / Perahu</option>
                <option value={2}>2 Tim / Perahu</option>
                <option value={3}>3 Tim / Perahu</option>
                <option value={4}>4 Tim / Perahu</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {fleetOptimization.allocations.map((alloc) => {
              const isWave1 = alloc.wave === 1;
              return (
                <div
                  key={alloc.evacuation_id}
                  className={`p-4 rounded-xl border-2 space-y-2 ${
                    isWave1 ? 'bg-blue-50/50 border-blue-400' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold ${
                      isWave1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-800'
                    }`}>
                      Prioritas #{alloc.rank} • {alloc.assigned_boat}
                    </span>
                    <span className="text-xs font-extrabold text-blue-900">
                      ETA ~{alloc.estimated_arrival_minutes} mnt ({alloc.distance_km} km)
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{alloc.location_label}</h4>
                    <span className={`text-[11px] font-bold ${isWave1 ? 'text-emerald-800' : 'text-amber-800'}`}>
                      {alloc.dispatch_phase}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                    {alloc.optimization_reason}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BAGIAN LAPORAN WARGA MASUK & TRIAGE AI (MENJAWAB 3 PERTANYAAN UTAMA NEXA) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-600" />
              <h3 className="font-extrabold text-slate-900 text-base md:text-lg">
                Laporan Warga & Klasifikasi Kebutuhan AI (Tindak Lanjut RT/RW & Relawan)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-900 border border-rose-300">
                {filteredCitizenReports.length} Laporan
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Menampilkan pemisahan <strong>Flood Severity (Bahaya Fisik)</strong> vs <strong>Emergency Priority (Urgensi Bantuan)</strong> serta jawaban atas 3 pertanyaan kunci NEXA.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setReportFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                reportFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs border border-slate-300' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Laporan ({reports.length})
            </button>
            <button
              onClick={() => setReportFilter('FLOOD_ONLY')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                reportFilter === 'FLOOD_ONLY' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Khusus Banjir / Darurat ({reports.filter(r => r.hazard_type === 'Flood').length})
            </button>
          </div>
        </div>

        {filteredCitizenReports.length === 0 ? (
          <div className="p-8 text-center text-slate-600 bg-slate-50 rounded-xl border border-slate-200">
            Belum ada laporan warga pada kategori ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCitizenReports.map(report => {
              const isConfirmed = report.status === 'Verified' || report.status === 'Task_Created' || report.status === 'Closed' || report.status === 'Handled_NGO';
              const isRejected = report.status === 'Rejected';
              const floodSev = report.flood_severity || (report.ai_suggested_severity === 'Berat' ? 'High' : 'Medium');
              const emergPrio = report.emergency_priority || (report.ai_suggested_severity === 'Berat' ? 'High' : 'Medium');

              return (
                <div
                  key={report.id}
                  className={`border-2 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all ${
                    report.hazard_type === 'Flood'
                      ? 'bg-rose-50/30 border-rose-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                            report.hazard_type === 'Flood'
                              ? 'bg-red-100 text-red-900 border-red-300'
                              : 'bg-blue-100 text-blue-900 border-blue-200'
                          }`}>
                            {report.hazard_type_label || report.hazard_type}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {report.kelurahan} ({report.rt_code} {report.rw_code})
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-sm md:text-base mt-1.5">
                          {report.description}
                        </h4>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <span className="block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                          1. Flood Severity: <strong>{floodSev}</strong>
                        </span>
                        <span className={`block px-2.5 py-0.5 rounded-md text-[11px] font-extrabold border ${
                          emergPrio === 'Critical' || emergPrio === 'High'
                            ? 'bg-red-100 text-red-900 border-red-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          2. Priority: {emergPrio}
                        </span>
                      </div>
                    </div>

                    {report.nexa_key_answers && (
                      <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200 text-[11px] text-slate-800 space-y-1">
                        <div><strong className="text-blue-900">• Seberapa Bahaya?</strong> {report.nexa_key_answers.how_dangerous}</div>
                        <div><strong className="text-blue-900">• Siapa Paling Berisiko?</strong> {report.nexa_key_answers.who_most_at_risk}</div>
                        <div><strong className="text-blue-900">• Siapa Ditolong Pertama?</strong> {report.nexa_key_answers.who_needs_help_first}</div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                      <div className="sm:col-span-4 rounded-xl overflow-hidden border border-slate-300 h-28 bg-slate-100">
                        <img
                          src={report.photo_url || report.blurred_photo_url || report.raw_photo_url}
                          alt="Foto Laporan"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="sm:col-span-8 bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Rekomendasi Tindakan (AI: {report.ai_flag} {Math.round((report.ai_confidence || 0.95) * 100)}%):</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                          {report.ai_suggested_action || report.ai_reasoning}
                        </p>
                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-600">
                          <span>Sumber: Laporan Warga</span>
                          <span>{new Date(report.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between gap-2">
                    {isConfirmed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-extrabold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Sudah Ditindaklanjuti (Status Diperbarui untuk Warga)</span>
                      </span>
                    ) : isRejected ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-300 text-xs font-bold">
                        <span>Ditandai Tidak Akurat</span>
                      </span>
                    ) : (
                      <>
                        {onVerifyReport && (
                          <button
                            onClick={() => onVerifyReport(report.id, 'Rejected')}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                          >
                            Tidak Akurat
                          </button>
                        )}
                        <button
                          onClick={() => onVerifyReport && onVerifyReport(report.id, 'Verified')}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer"
                        >
                          <CheckSquare className="w-4 h-4" />
                          <span>Terima & Tindak Lanjuti Laporan</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BAGIAN ANTREAN PRIORITAS 4 INDIKATOR & DATA DINAMIS RELAWAN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Priority Queue Sorted by 4 Indicators */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Anchor className="w-5 h-5 text-rose-600" />
              <h3 className="font-extrabold text-slate-900 text-base">
                Daftar Prioritas Bantuan Darurat (Berdasarkan 4 Indikator Risiko)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-600">UNDRR & AIDR Framework</span>
          </div>

          <div className="space-y-4">
            {evacuations.map(evac => {
              const isDispatched = evac.status === 'Dispatched';
              const isCritical = evac.priority_score >= 75 || evac.priority_level === 'Critical';
              const isDepthKnown = evac.water_depth_cm !== null && evac.water_depth_cm !== undefined && evac.water_depth_cm !== '';
              const floodSev = evac.flood_severity || (isDepthKnown && evac.water_depth_cm >= 75 ? 'Critical' : 'Medium');
              const bd = evac.score_breakdown || {};

              return (
                <div 
                  key={evac.id}
                  className={`bg-white border-2 rounded-2xl p-5 shadow-xs transition-all ${
                    isCritical 
                      ? 'border-red-400' 
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                          Flood Severity: <strong>{floodSev}</strong>
                        </span>
                        <span className={`px-3 py-0.5 rounded-md text-xs font-extrabold border ${
                          isCritical 
                            ? 'bg-red-100 text-red-900 border-red-300' 
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          Emergency Priority: {evac.priority_level} ({evac.priority_score} / 100)
                        </span>
                      </div>

                      <h4 className="text-base md:text-lg font-extrabold text-slate-900">
                        {evac.kelurahan} ({evac.rt_code} {evac.rw_code})
                      </h4>
                    </div>

                    {isDispatched ? (
                      <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        Ditangani ({evac.handled_by_name})
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedEvac(evac)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                      >
                        <HeartHandshake className="w-4 h-4" />
                        <span>Tindak Lanjuti Bantuan</span>
                      </button>
                    )}
                  </div>

                  {/* 4-Indicator Breakdown */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-600 block">1. Bahaya Fisik (40%):</span>
                      <strong className="text-slate-900 text-sm">
                        {isDepthKnown ? `${evac.water_depth_cm} cm` : 'Belum Diketahui'}
                      </strong>
                      {bd.indicator_1_physical_hazard_40 !== undefined && (
                        <span className="block text-[10px] text-blue-700 font-bold">+{bd.indicator_1_physical_hazard_40}/40 poin</span>
                      )}
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-600 block">2. Eksposur & Akses (15%):</span>
                      <strong className="text-slate-900 text-sm">
                        {evac.access_isolated ? 'Akses Terputus' : 'Akses Terbuka'}
                      </strong>
                      {bd.indicator_2_exposure_isolation_15 !== undefined && (
                        <span className="block text-[10px] text-blue-700 font-bold">+{bd.indicator_2_exposure_isolation_15}/15 poin</span>
                      )}
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-600 block">3. Kerentanan (30%):</span>
                      <strong className="text-slate-900 text-sm">
                        {evac.has_vulnerable_people ? 'Ada Kelompok Rentan' : 'Warga Umum'}
                      </strong>
                      {bd.indicator_3_vulnerability_30 !== undefined && (
                        <span className="block text-[10px] text-rose-700 font-bold">+{bd.indicator_3_vulnerability_30}/30 poin</span>
                      )}
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-600 block">4. Kapasitas Evakuasi (15%):</span>
                      <strong className="text-slate-900 text-sm">
                        {isDispatched ? 'Tim di Lokasi' : 'Butuh Bantuan'}
                      </strong>
                      {bd.indicator_4_evacuation_capacity_15 !== undefined && (
                        <span className="block text-[10px] text-amber-800 font-bold">+{bd.indicator_4_evacuation_capacity_15}/15 poin</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1">
                    <div>
                      <strong className="text-slate-900">Kondisi Warga & Kebutuhan:</strong>{' '}
                      <span>{evac.vulnerable_details}</span>
                    </div>
                    {isDispatched && evac.dispatch_notes && (
                      <div className="pt-1.5 border-t border-slate-200 text-emerald-800 font-semibold">
                        <strong>Status Penanganan:</strong> {evac.dispatch_notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Data Dinamis Relawan & Kalibrasi Pembelajaran AI */}
        <div className="lg:col-span-4 space-y-4">
          {/* Data Kapasitas Relawan Murni dari Database (Bukan Angka Statis) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3.5">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-600" />
              <span>Data Relawan Terdaftar (Live Database)</span>
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700 font-semibold">Akun Relawan Terdaftar:</span>
                <strong className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-extrabold border border-blue-200">
                  {registeredVolunteersCount} Akun Relawan
                </strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700 font-semibold">Unit Komunitas / NGO:</span>
                <strong className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 font-extrabold border border-rose-200">
                  {registeredNgoUnitsCount} Unit Terdaftar
                </strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700 font-semibold">Tugas Pencegahan Aktif:</span>
                <strong className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold border border-emerald-200">
                  {activePreventTasks.length} Tugas RT
                </strong>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-emerald-300 rounded-2xl p-5 shadow-xs space-y-3.5">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-600" />
              <span>Kalibrasi & Pembelajaran AI</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Membandingkan klasifikasi AI dengan verifikasi manusia oleh RT/RW & Relawan (*Historical Incident Learning*).
            </p>

            {learningStats && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <span className="text-slate-600 font-semibold block">Laporan Terverifikasi:</span>
                  <strong className="text-lg font-black text-emerald-800">{learningStats.verified_ground_truth} Data</strong>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <span className="text-slate-600 font-semibold block">Tidak Akurat / Ditolak:</span>
                  <strong className="text-lg font-black text-amber-900">{learningStats.rejected_ground_truth} Data</strong>
                </div>
              </div>
            )}

            <a
              href="/api/ai/training-dataset?format=jsonl"
              download="nexa-gemini-finetune.jsonl"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Training Dataset (.JSONL)</span>
            </a>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span>4 Aturan Integritas Data NEXA</span>
            </h3>
            <ul className="text-xs text-slate-700 space-y-2 leading-relaxed">
              <li><strong>1. Timestamp:</strong> Setiap laporan dan pembacaan sensor memiliki tanggal & jam jelas.</li>
              <li><strong>2. Location & Privacy:</strong> Lokasi geografis tercatat dengan penyamaran piksel foto di tampilan publik.</li>
              <li><strong>3. Data Source:</strong> Sumber indikator dicatat transparan (Warga, RT/RW, BMKG, Pos BPBD/DSDA).</li>
              <li><strong>4. Missing Data Rule:</strong> Informasi yang belum diketahui tetap berstatus <em>"Belum Diketahui (Unknown)"</em> dan tidak pernah diubah menjadi angka 0.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal Unggah Bukti Tindakan Relawan (Fase PREVENT) */}
      {afterPhotoModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Unggah Bukti Tindakan Relawan</h3>
              </div>
              <button onClick={() => setAfterPhotoModalTask(null)} className="text-slate-500 hover:text-slate-900 font-bold">✕</button>
            </div>

            <form onSubmit={handleConfirmCompleteTask} className="space-y-3.5 text-xs md:text-sm">
              <p className="text-slate-700">
                Unggah foto kondisi saluran/lingkungan setelah selesai ditangani oleh relawan.
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-sm cursor-pointer"
                >
                  Kirim Bukti & Selesaikan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispatch Confirmation Modal */}
      {selectedEvac && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Perbarui Status Penanganan Bantuan</h3>
              </div>
              <button onClick={() => setSelectedEvac(null)} className="text-slate-500 hover:text-slate-900 font-bold">✕</button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="space-y-3.5 text-xs md:text-sm">
              <div>
                <span className="text-slate-600 font-bold block mb-1">Lokasi Sasaran:</span>
                <p className="font-extrabold text-slate-900 text-sm bg-slate-100 p-3 rounded-xl border border-slate-200">
                  {selectedEvac.kelurahan} ({selectedEvac.rt_code} {selectedEvac.rw_code})
                </p>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Catatan Tindakan (Agar Warga Dapat Melihat Perkembangan):</label>
                <textarea
                  rows={3}
                  required
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-sans leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedEvac(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-white shadow-sm cursor-pointer"
                >
                  Simpan & Perbarui Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Input New Emergency Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Input Kondisi Banjir & Kebutuhan Bantuan</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-500 hover:text-slate-900 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateNewEvac} className="space-y-3.5 text-xs md:text-sm">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Pilih Wilayah RT/RW:</label>
                <select
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-semibold"
                >
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>{a.kelurahan} - {a.rt_code} {a.rw_code}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Ketinggian Air (cm) — <span className="font-normal text-slate-500">Kosongkan jika belum diketahui</span>:
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 40 (Jika dikosongkan tercatat Belum Diketahui)"
                  value={waterDepth}
                  onChange={(e) => setWaterDepth(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold"
                />
              </div>

              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="vulnCheck"
                    checked={hasVulnerable}
                    onChange={(e) => setHasVulnerable(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="vulnCheck" className="text-slate-800 font-bold">
                    Terdapat Kelompok Rentan (Lansia, Balita, Kursi Roda, Sakit)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isoCheck"
                    checked={accessIsolated}
                    onChange={(e) => setAccessIsolated(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isoCheck" className="text-slate-800 font-bold">
                    Akses Jalan Keluar-Masuk Terputus (Access Isolation)
                  </label>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Rincian Kondisi & Kebutuhan Bantuan:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 1 lansia kursi roda tinggal sendiri, butuh bantuan evakuasi"
                  value={vulnerableDetails}
                  onChange={(e) => setVulnerableDetails(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-white cursor-pointer"
                >
                  Analisis 4 Indikator & Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
