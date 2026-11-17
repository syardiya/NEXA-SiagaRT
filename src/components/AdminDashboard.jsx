import React, { useState, useEffect } from 'react';
import {
  Shield, BarChart3, MapPin, AlertTriangle, CheckCircle2, Trash2,
  RefreshCw, Lock, LogOut, Users, CloudRain, Waves, Sparkles,
  Download, ArrowLeft, Check, X, Flame, Droplets, Activity, Filter
} from 'lucide-react';

export default function AdminDashboard({
  areas = [],
  reports = [],
  tasks = [],
  evacuations = [],
  bpbdPosts = [],
  bmkgForecast = {},
  ruleStatus = null,
  users = [],
  stats = {},
  loggedInUser,
  onLoginSuccess,
  onLogout,
  onRefresh,
  onBackToPublic
}) {
  const [adminId, setAdminId] = useState('112');
  const [adminPin, setAdminPin] = useState('1234');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState('WILAYAH'); // 'WILAYAH' | 'LAPORAN' | 'TUGAS_EVAKUASI' | 'REALTIME_AI' | 'USERS'
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('ALL');
  const [aiLearningStats, setAiLearningStats] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editWaterLevel, setEditWaterLevel] = useState('');
  const [editSiagaLevel, setEditSiagaLevel] = useState(4);

  const isAdminAuthenticated = loggedInUser && loggedInUser.role === 'Admin';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('nexa_auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const fetchAiStats = async () => {
    try {
      const res = await fetch('/api/ai/learning-stats');
      const data = await res.json();
      if (data.success) setAiLearningStats(data.stats);
    } catch (e) {
      console.error('Error fetching AI learning stats:', e);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchAiStats();
    }
  }, [isAdminAuthenticated, reports.length]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: adminId.trim(),
          pin: adminPin.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal login Admin.');
      }
      if (data.user?.role !== 'Admin') {
        throw new Error('Akun ini bukan akun Pemilik Web / Administrator (Gunakan ID: 112).');
      }
      if (onLoginSuccess) {
        onLoginSuccess(data.user, data.token);
      }
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleVerifyReport = async (reportId, status) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/verify`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses laporan');
      if (onRefresh) await onRefresh();
      await fetchAiStats();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Hapus laporan ini secara permanen dari sistem & database?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus laporan');
      if (onRefresh) await onRefresh();
      await fetchAiStats();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({})
      });
      if (!res.ok) throw new Error('Gagal menyelesaikan tugas');
      if (onRefresh) await onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Hapus tugas gotong royong ini?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Gagal menghapus tugas');
      if (onRefresh) await onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatchEvacuation = async (evacId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/evacuations/${evacId}/handle`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          dispatch_notes: 'Dikerahkan langsung melalui instruksi Dashboard Admin (Pemilik Web).'
        })
      });
      if (!res.ok) throw new Error('Gagal memproses bantuan');
      if (onRefresh) await onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvacuation = async (evacId) => {
    if (!window.confirm('Hapus data permintaan bantuan/evakuasi ini?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/evacuations/${evacId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Gagal menghapus data evakuasi');
      if (onRefresh) await onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateBpbdPost = async (postId) => {
    setActionLoading(true);
    try {
      const statusMap = {
        1: 'Siaga 1 (Bahaya Banjir)',
        2: 'Siaga 2 (Kritis)',
        3: 'Siaga 3 (Waspada)',
        4: 'Siaga 4 (Normal)'
      };
      const res = await fetch(`/api/bpbd/posts/${postId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          water_level_cm: Number(editWaterLevel),
          siaga_level: Number(editSiagaLevel),
          status: statusMap[Number(editSiagaLevel)] || 'Siaga 4 (Normal)'
        })
      });
      if (!res.ok) throw new Error('Gagal memperbarui pos pantau pintu air');
      setEditingPostId(null);
      if (onRefresh) await onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearAllOperationalData = async () => {
    if (!window.confirm('PERINGATAN PEMILIK WEB:\nApakah Anda yakin ingin mengosongkan SEMUA laporan warga, tugas gotong royong, dan data evakuasi kembali ke 0?')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/clear-operational-data', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengosongkan data');
      alert(data.message);
      if (onRefresh) await onRefresh();
      await fetchAiStats();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Jika belum login sebagai Admin, tampilkan Gerbang Login Khusus Pemilik Web (/admin)
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 font-sans text-slate-900">
        <div className="w-full max-w-md bg-white border-2 border-slate-300 rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-sm">
                N
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                  Halaman Terpisah (/admin)
                </span>
                <h1 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  Dashboard Admin (Pemilik Web)
                </h1>
              </div>
            </div>
          </div>

          <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
            Halaman ini khusus untuk <strong>Pemilik Web / Administrator NEXA SiagaRT</strong> dan tidak ditampilkan di menu publik warga. Masuk untuk memantau jumlah laporan per wilayah, data real-time, serta mengelola seluruh aksi sistem.
          </p>

          <form onSubmit={handleAdminLogin} className="space-y-4 text-xs md:text-sm">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                ID Administrator / Pemilik Web:
              </label>
              <input
                type="text"
                required
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                placeholder="112"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                PIN Akses Admin:
              </label>
              <input
                type="password"
                required
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="1234"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-mono tracking-widest focus:outline-none focus:border-blue-600"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Default Admin ID: <strong>112</strong> | PIN: <strong>1234</strong>
              </span>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? 'Memverifikasi Akses Admin...' : 'Masuk ke Dashboard Admin'}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={onBackToPublic}
              className="text-slate-600 hover:text-blue-700 font-bold flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Halaman Web Publik</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Hitung Rekap Laporan per Wilayah (Berapa laporan & banyaknya di wilayah mana)
  const areaBreakdown = areas.map((area) => {
    const areaReports = reports.filter((r) => r.rt_rw_id === area.id);
    const floodCount = areaReports.filter((r) => r.hazard_type === 'Flood').length;
    const drainCount = areaReports.filter((r) => r.hazard_type === 'Clogged_Drain').length;
    const trashCount = areaReports.filter((r) => r.hazard_type === 'Trash').length;
    const pendingCount = areaReports.filter((r) => r.status === 'Pending').length;
    const verifiedCount = areaReports.filter(
      (r) => r.status === 'Verified' || r.status === 'Task_Created' || r.status === 'Closed'
    ).length;
    const areaTasks = tasks.filter((t) => t.rt_rw_id === area.id);
    const areaEvacs = evacuations.filter((ev) => ev.rt_rw_id === area.id);
    const ruleEval = ruleStatus?.areas?.find((a) => a.area_id === area.id);

    return {
      ...area,
      totalReports: areaReports.length,
      floodCount,
      drainCount,
      trashCount,
      pendingCount,
      verifiedCount,
      activeTasksCount: areaTasks.filter((t) => t.status === 'In_Progress').length,
      completedTasksCount: areaTasks.filter((t) => t.status === 'Completed').length,
      evacsCount: areaEvacs.length,
      isTriggered: ruleEval?.is_triggered || false,
      trueConditionsCount: ruleEval?.true_conditions_count || 0
    };
  }).sort((a, b) => b.totalReports - a.totalReports);

  const highestReportArea = areaBreakdown.find((a) => a.totalReports > 0) || null;
  const pendingReportsCount = reports.filter((r) => r.status === 'Pending').length;
  const verifiedReportsCount = reports.filter(
    (r) => r.status === 'Verified' || r.status === 'Task_Created' || r.status === 'Closed'
  ).length;
  const rejectedReportsCount = reports.filter((r) => r.status === 'Rejected').length;

  const filteredReports = selectedAreaFilter === 'ALL'
    ? reports
    : reports.filter((r) => r.rt_rw_id === selectedAreaFilter);

  const rtLeadersList = users.filter((u) => u.role === 'RT_Leader');
  const volunteersList = users.filter((u) => u.role === 'NGO' || u.role === 'Resident');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-14">
      {/* Top Bar Khusus Pemilik Web (Admin) */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-lg">
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-extrabold tracking-tight">
                  NEXA SiagaRT — Dashboard Admin (Pemilik Web)
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Real-Time Control
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Halaman Khusus Pemilik Web • Pemantauan Wilayah, Data Real-Time & Manajemen Aksi
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Segarkan Data</span>
            </button>

            <button
              onClick={handleClearAllOperationalData}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Kosongkan semua laporan, tugas, dan evakuasi kembali ke 0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Laporan ke 0</span>
            </button>

            <button
              onClick={onBackToPublic}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Lihat Web Publik</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-900/60 text-red-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        {/* 1. KARTU RINGKASAN REAL-TIME UTAMA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-slate-500">Total Laporan Masuk</span>
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-black text-slate-900">{reports.length}</div>
            <div className="flex flex-wrap gap-2 text-[11px] font-bold pt-1">
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                Pending: {pendingReportsCount}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Terverifikasi: {verifiedReportsCount}
              </span>
              {rejectedReportsCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200">
                  Ditolak: {rejectedReportsCount}
                </span>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-slate-500">Wilayah Laporan Terbanyak</span>
              <MapPin className="w-5 h-5 text-rose-600" />
            </div>
            {highestReportArea ? (
              <>
                <div className="text-lg font-black text-slate-900 truncate">
                  {highestReportArea.kelurahan} ({highestReportArea.rt_code})
                </div>
                <p className="text-xs font-bold text-rose-700">
                  {highestReportArea.totalReports} Laporan ({highestReportArea.floodCount} Banjir, {highestReportArea.drainCount + highestReportArea.trashCount} Saluran/Sampah)
                </p>
              </>
            ) : (
              <>
                <div className="text-lg font-black text-slate-400">Belum Ada Laporan (0)</div>
                <p className="text-xs text-slate-500">Semua wilayah saat ini bersih (0 laporan)</p>
              </>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-slate-500">Aksi Pencegahan & Evakuasi</span>
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-slate-900">
              {tasks.length + evacuations.length}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-bold pt-1">
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                Gotong Royong RT: {tasks.length}
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                Respon Banjir: {evacuations.length}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-slate-500">Pengurus RT & Relawan</span>
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-3xl font-black text-slate-900">
              {rtLeadersList.length + volunteersList.length}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-bold pt-1">
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                Ketua RT: {rtLeadersList.length}
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                Relawan/NGO: {volunteersList.length}
              </span>
            </div>
          </div>
        </div>

        {/* 2. BAR NAVIGASI TAB ADMIN */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('WILAYAH')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'WILAYAH'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>1. Sebaran Laporan per Wilayah ({areas.length} Wilayah)</span>
          </button>

          <button
            onClick={() => setActiveTab('LAPORAN')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'LAPORAN'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>2. Kelola & Aksi Semua Laporan ({reports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('TUGAS_EVAKUASI')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'TUGAS_EVAKUASI'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>3. Aksi Tugas RT & Evakuasi ({tasks.length + evacuations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('REALTIME_AI')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'REALTIME_AI'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <CloudRain className="w-4 h-4" />
            <span>4. Data Real-Time Cuaca, Pintu Air & AI</span>
          </button>

          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'USERS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>5. Daftar Akun RT & Relawan ({users.length})</span>
          </button>
        </div>

        {/* TAB 1: SEBARAN LAPORAN PER WILAYAH (BERAPA LAPORAN & BANYAKNYA DI WILAYAH MANA) */}
        {activeTab === 'WILAYAH' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Pemantauan Jumlah Laporan per Wilayah RT/RW (Diurutkan dari Terbanyak)
                </h2>
                <p className="text-xs md:text-sm text-slate-600">
                  Pantau wilayah mana yang memiliki laporan paling banyak (Saluran Mampet, Sampah, atau Banjir) beserta progres tindakannya.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50 text-slate-700 font-extrabold">
                    <th className="p-3.5">Wilayah Kelurahan & RT/RW</th>
                    <th className="p-3.5">Total Laporan</th>
                    <th className="p-3.5">Rincian Jenis Bahaya</th>
                    <th className="p-3.5">Status Verifikasi</th>
                    <th className="p-3.5">Tugas & Evakuasi</th>
                    <th className="p-3.5">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {areaBreakdown.map((area) => {
                    const maxReports = Math.max(...areaBreakdown.map((a) => a.totalReports), 1);
                    const barWidthPercent = area.totalReports > 0 ? Math.max(12, Math.round((area.totalReports / maxReports) * 100)) : 0;

                    return (
                      <tr key={area.id} className="hover:bg-slate-50/80">
                        <td className="p-3.5">
                          <div className="font-extrabold text-slate-900">
                            {area.kelurahan} ({area.rt_code} / {area.rw_code})
                          </div>
                          <div className="text-xs text-slate-500">
                            {area.kecamatan}, {area.kota} • {area.monitoring_post}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className={`text-lg font-black ${area.totalReports > 0 ? 'text-blue-700' : 'text-slate-400'}`}>
                              {area.totalReports}
                            </span>
                            <span className="text-xs text-slate-600 font-semibold">Laporan</span>
                          </div>
                          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden mt-1 border border-slate-200">
                            <div
                              className={`h-full rounded-full ${area.floodCount > 0 ? 'bg-red-600' : 'bg-blue-600'}`}
                              style={{ width: `${barWidthPercent}%` }}
                            />
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                            <span className="px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200">
                              Banjir: {area.floodCount}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                              Saluran: {area.drainCount}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200">
                              Sampah: {area.trashCount}
                            </span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                              Pending: {area.pendingCount}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                              Selesai/Verif: {area.verifiedCount}
                            </span>
                          </div>
                        </td>

                        <td className="p-3.5 text-xs font-semibold text-slate-700">
                          <div>Gotong Royong Aktif: <strong>{area.activeTasksCount}</strong> (Selesai: {area.completedTasksCount})</div>
                          <div>Permintaan Evakuasi: <strong>{area.evacsCount}</strong></div>
                        </td>

                        <td className="p-3.5">
                          <button
                            onClick={() => {
                              setSelectedAreaFilter(area.id);
                              setActiveTab('LAPORAN');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs cursor-pointer"
                          >
                            Lihat Laporan Wilayah Ini
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: KELOLA & AKSI SEMUA LAPORAN WARGA */}
        {activeTab === 'LAPORAN' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Manajemen & Aksi Laporan Warga ({filteredReports.length} Laporan)
                </h2>
                <p className="text-xs md:text-sm text-slate-600">
                  Pemilik web dapat memverifikasi laporan, menolak laporan yang tidak valid, atau menghapus laporan dari sistem.
                </p>
              </div>

              {/* Filter Wilayah */}
              <div className="flex items-center gap-2 text-xs">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-slate-700">Filter Wilayah:</span>
                <select
                  value={selectedAreaFilter}
                  onChange={(e) => setSelectedAreaFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                >
                  <option value="ALL">Semua Wilayah ({reports.length})</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.kelurahan} ({a.rt_code} {a.rw_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <p className="text-base font-extrabold text-slate-700">
                  Belum Ada Data Laporan (0 Laporan)
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Saat warga mengirim laporan dari halaman utama, laporan akan langsung muncul secara real-time di sini beserta di halaman Ketua RT dan Portal Relawan.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`px-2.5 py-0.5 rounded-md font-extrabold border ${
                          r.hazard_type === 'Flood'
                            ? 'bg-red-100 text-red-900 border-red-300'
                            : 'bg-blue-100 text-blue-900 border-blue-200'
                        }`}>
                          {r.hazard_type_label || r.hazard_type}
                        </span>
                        <span className="font-extrabold text-slate-900">
                          📍 {r.kelurahan} ({r.rt_code} {r.rw_code})
                        </span>
                        <span className="text-slate-500">
                          • Pelapor: <strong>{r.reporter_name}</strong> ({r.reporter_phone})
                        </span>
                        <span className={`px-2 py-0.5 rounded font-bold border ${
                          r.status === 'Pending'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : r.status === 'Rejected'
                            ? 'bg-red-100 text-red-900 border-red-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}>
                          Status: {r.status}
                        </span>
                      </div>

                      <p className="text-sm font-bold text-slate-900">{r.description}</p>

                      <div className="text-xs text-slate-600 flex flex-wrap gap-3">
                        <span>Alamat: <strong>{r.exact_location?.address || '-'}</strong></span>
                        <span>AI Severity: <strong>{r.flood_severity || r.ai_suggested_severity || 'Sedang'}</strong></span>
                        <span>Emergency Priority: <strong>{r.emergency_priority || 'Medium'} ({r.priority_score ?? '-'} poin)</strong></span>
                      </div>
                    </div>

                    {/* Tombol Aksi Admin */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {r.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleVerifyReport(r.id, 'Verified')}
                            disabled={actionLoading}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Verifikasi Valid</span>
                          </button>
                          <button
                            onClick={() => handleVerifyReport(r.id, 'Rejected')}
                            disabled={actionLoading}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteReport(r.id)}
                        disabled={actionLoading}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AKSI TUGAS GOTONG ROYONG RT & PERMINTAAN EVAKUASI BANJIR */}
        {activeTab === 'TUGAS_EVAKUASI' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kolom 1: Tugas Gotong Royong (PREVENT) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-emerald-600" />
                  <span>Daftar Tugas Gotong Royong RT ({tasks.length})</span>
                </h3>
                <p className="text-xs text-slate-600">
                  Aksi pencegahan sebelum hujan yang dijadwalkan oleh Ketua RT bersama Relawan.
                </p>
              </div>

              {tasks.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-semibold">
                  Belum ada tugas gotong royong aktif (0 Tugas).
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((t) => (
                    <div key={t.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-sm font-extrabold text-slate-900 block">{t.title}</strong>
                          <span className="text-xs text-slate-600 font-semibold">
                            📍 {t.kelurahan} • Oleh: {t.verified_by_name}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                          t.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {t.status === 'Completed' ? 'Selesai' : 'Berjalan'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 whitespace-pre-line bg-white p-2.5 rounded-lg border border-slate-200">
                        {t.sop_action_plan}
                      </p>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        {t.status !== 'Completed' && (
                          <button
                            onClick={() => handleCompleteTask(t.id)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                          >
                            ✓ Tandai Selesai
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold text-xs cursor-pointer"
                        >
                          🗑 Hapus Tugas
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Kolom 2: Permintaan Bantuan / Evakuasi Banjir (RESPOND) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-rose-600" />
                  <span>Daftar Permintaan Bantuan & Evakuasi Banjir ({evacuations.length})</span>
                </h3>
                <p className="text-xs text-slate-600">
                  Prioritas penyelamatan warga rentan (lansia, balita, disabilitas) saat banjir.
                </p>
              </div>

              {evacuations.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-semibold">
                  Belum ada permintaan evakuasi banjir (0 Permintaan).
                </div>
              ) : (
                <div className="space-y-3">
                  {evacuations.map((ev) => (
                    <div key={ev.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-sm font-extrabold text-slate-900 block">
                            {ev.kelurahan} ({ev.rt_code} {ev.rw_code})
                          </strong>
                          <span className="text-xs text-rose-800 font-bold">
                            Skor Prioritas: {ev.priority_score}/100 ({ev.priority_level}) • Tinggi Air: {ev.water_depth_cm !== null && ev.water_depth_cm !== undefined ? `${ev.water_depth_cm} cm` : 'Belum Diketahui'}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                          ev.status === 'Dispatched'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-red-100 text-red-900'
                        }`}>
                          {ev.status === 'Dispatched' ? 'Sudah Dikerahkan' : 'Menunggu Tim'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                        {ev.vulnerable_details}
                      </p>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        {ev.status !== 'Dispatched' && (
                          <button
                            onClick={() => handleDispatchEvacuation(ev.id)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                          >
                            ✓ Kerahkan Tim Bantuan
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteEvacuation(ev.id)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold text-xs cursor-pointer"
                        >
                          🗑 Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: DATA REAL-TIME CUACA, PINTU AIR BPBD, & PEMBELAJARAN AI */}
        {activeTab === 'REALTIME_AI' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cuaca Real-Time Open-Meteo / BMKG */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-extrabold text-slate-900">
                      Data Cuaca Real-Time (Open-Meteo & Ambang BMKG)
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                    Live Feed
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                  <div className="text-xs font-extrabold text-amber-900 uppercase">
                    {bmkgForecast?.active_warning?.event || 'Status Cuaca DKI Jakarta'}
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {bmkgForecast?.active_warning?.headline}
                  </p>
                  <p className="text-xs text-slate-700 font-semibold">
                    Kondisi Terkini: {bmkgForecast?.current_condition || 'Memuat...'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {(bmkgForecast?.intervals || []).map((inv, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <strong className="text-slate-900 block">{inv.time_slot}</strong>
                      <div className="text-blue-700 font-bold">{inv.weather}</div>
                      <div className="text-slate-600">Suhu: {inv.temperature} • Hujan: {inv.rain_probability}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Memori Pembelajaran AI (Continuous Learning) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-extrabold text-slate-900">
                      Status Memori AI & Ekspor Dataset Fine-Tuning
                    </h3>
                  </div>
                  <a
                    href="/api/ai/training-dataset?format=jsonl"
                    download="nexa-gemini-finetune.jsonl"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh .JSONL</span>
                  </a>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Setiap kali Ketua RT, Relawan, atau Admin memverifikasi laporan (Valid / Ditolak), AI NEXA secara otomatis memperbarui memori <em>Few-Shot Ground Truth</em> dan bobot kata kunci bahaya tanpa data statis.
                </p>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xl font-black text-slate-900">{aiLearningStats?.total_reports ?? reports.length}</div>
                    <div className="text-[11px] font-bold text-slate-600">Total Sampel</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="text-xl font-black text-emerald-800">{aiLearningStats?.verified_ground_truth ?? verifiedReportsCount}</div>
                    <div className="text-[11px] font-bold text-emerald-800">Valid Ground-Truth</div>
                  </div>
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                    <div className="text-xl font-black text-red-800">{aiLearningStats?.rejected_ground_truth ?? rejectedReportsCount}</div>
                    <div className="text-[11px] font-bold text-red-800">Ditolak / Hoaks</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabel Pos Pantau Pintu Air BPBD (Admin Bisa Update Tinggi Air) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Waves className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Data Pos Pantau Pintu Air BPBD & Kontrol Update Admin
                    </h3>
                    <p className="text-xs text-slate-600">
                      Pemilik web dapat memperbarui tinggi muka air (cm) dan status Siaga secara langsung sesuai kondisi lapangan.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bpbdPosts.map((post) => (
                  <div key={post.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-sm font-extrabold text-slate-900 block">{post.name}</strong>
                        <span className="text-xs text-slate-500">
                          {post.observed_at_wib ? `Update: ${post.observed_at_wib} WIB` : ''}
                          {post.weather ? ` • Cuaca Pos: ${post.weather}` : ''}
                          {!post.observed_at_wib && post.flow_destination ? post.flow_destination : ''}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-extrabold border ${
                        post.siaga_level <= 2
                          ? 'bg-red-100 text-red-900 border-red-300'
                          : post.siaga_level === 3
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}>
                        {post.status || `Siaga ${post.siaga_level || '-'}`}
                      </span>
                    </div>

                    <div className="text-2xl font-black text-blue-700">
                      {post.water_level_cm} <span className="text-xs font-bold text-slate-600">
                        cm{post.siaga3_limit_cm ? ` (Ambang Siaga 3: ${post.siaga3_limit_cm} cm)` : post.safe_limit_cm ? ` (Batas Aman: ${post.safe_limit_cm} cm)` : ''}
                      </span>
                    </div>

                    {editingPostId === post.id ? (
                      <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Tinggi Air (cm):</label>
                            <input
                              type="number"
                              value={editWaterLevel}
                              onChange={(e) => setEditWaterLevel(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Level Siaga:</label>
                            <select
                              value={editSiagaLevel}
                              onChange={(e) => setEditSiagaLevel(Number(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold"
                            >
                              <option value={4}>Siaga 4 (Normal)</option>
                              <option value={3}>Siaga 3 (Waspada)</option>
                              <option value={2}>Siaga 2 (Kritis)</option>
                              <option value={1}>Siaga 1 (Bahaya)</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingPostId(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold"
                          >
                            Batal
                          </button>
                          <button
                            onClick={() => handleUpdateBpbdPost(post.id)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold"
                          >
                            Simpan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingPostId(post.id);
                          setEditWaterLevel(String(post.water_level_cm));
                          setEditSiagaLevel(post.siaga_level || 4);
                        }}
                        className="w-full py-2 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-slate-300 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Ubah Tinggi Muka Air / Status Siaga
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DAFTAR AKUN PENGURUS RT & RELAWAN TERDAFTAR */}
        {activeTab === 'USERS' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">
                Daftar Akun Pengurus RT/RW & Relawan Terdaftar ({users.length} Akun)
              </h3>
              <p className="text-xs text-slate-600">
                Semua akun yang terdaftar dari formulir pendaftaran RT/Relawan tersimpan di database dan dapat dipantau di sini.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50 text-slate-700 font-extrabold">
                    <th className="p-3">Nama Lengkap / Unit</th>
                    <th className="p-3">Peran</th>
                    <th className="p-3">Nomor HP / Kontak</th>
                    <th className="p-3">Wilayah Tugas / Domisili</th>
                    <th className="p-3">Status Bot Telegram</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-3 font-extrabold text-slate-900">{u.full_name}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded font-bold text-xs ${
                          u.role === 'RT_Leader'
                            ? 'bg-emerald-100 text-emerald-900'
                            : u.role === 'Admin'
                            ? 'bg-slate-900 text-white'
                            : 'bg-blue-100 text-blue-900'
                        }`}>
                          {u.role === 'RT_Leader' ? 'Ketua RT/RW' : u.role === 'NGO' ? 'Relawan / NGO' : u.role === 'Resident' ? 'Relawan Warga' : 'Admin Pemilik Web'}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700">{u.phone_number}</td>
                      <td className="p-3 text-slate-700">{u.area_label || '-'}</td>
                      <td className="p-3">
                        {u.is_telegram_synced ? (
                          <span className="text-emerald-700 font-bold">✓ Terhubung ({u.telegram_chat_id})</span>
                        ) : (
                          <span className="text-slate-400">Belum ditautkan</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
