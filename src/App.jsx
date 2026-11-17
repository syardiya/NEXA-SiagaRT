import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PublicMap from './components/PublicMap';
import ReportModal from './components/ReportModal';
import RtLeaderDashboard from './components/RtLeaderDashboard';
import NgoDashboard from './components/NgoDashboard';
import AdminDashboard from './components/AdminDashboard';
import TelegramSimulatorModal from './components/TelegramSimulatorModal';
import RegisterModal from './components/RegisterModal';
import LoginModal from './components/LoginModal';
import ImpactStatsBar from './components/ImpactStatsBar';
import { 
  Camera, ShieldCheck, Flame, CheckCircle, Sparkles, MapPin,
  Bell, HelpCircle, Info, X, Clock, Droplets, CheckCircle2, AlertTriangle
} from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState('PUBLIC'); // 'PUBLIC' | 'RT_LEADER' | 'NGO' | 'ADMIN'
  const [isAdminRoute, setIsAdminRoute] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.startsWith('/admin') || window.location.hash === '#admin';
  });
  const [areas, setAreas] = useState([]);
  const [reports, setReports] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [evacuations, setEvacuations] = useState([]);
  const [bpbdPosts, setBpbdPosts] = useState([]);
  const [bmkgForecast, setBmkgForecast] = useState({});
  const [ruleStatus, setRuleStatus] = useState(null);
  const [telegramMessages, setTelegramMessages] = useState([]);
  const [stats, setStats] = useState({});
  const [botUsername, setBotUsername] = useState('NexaSiagaBot');
  const [users, setUsers] = useState([]);

  // Modals & Navigation Panels
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isHowToModalOpen, setIsHowToModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeTelegramToken, setActiveTelegramToken] = useState('TOKEN_RT04_KM89');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleLoginSuccess = (user, token) => {
    setLoggedInUser(user);
    if (token) {
      localStorage.setItem('nexa_auth_token', token);
      localStorage.setItem('nexa_user', JSON.stringify(user));
    }
    if (user.role === 'RT_Leader') {
      setCurrentRole('RT_LEADER');
      if (user.telegram_subscribe_token) {
        setActiveTelegramToken(user.telegram_subscribe_token);
      }
      showToast(`Selamat datang di Pusat Komando RT/RW, ${user.full_name}!`);
    } else if (user.role === 'NGO' || user.role === 'Resident') {
      setCurrentRole('NGO');
      showToast(`Selamat datang di Halaman Portal Relawan, ${user.full_name}!`);
    } else if (user.role === 'Admin') {
      setCurrentRole('ADMIN');
      setIsAdminRoute(true);
      if (window.location.pathname !== '/admin') {
        window.history.pushState({}, '', '/admin');
      }
      showToast(`Selamat datang di Dashboard Admin (Pemilik Web)!`);
    }
    fetchData(token, user.role);
  };

  const handleLogout = () => {
    localStorage.removeItem('nexa_auth_token');
    localStorage.removeItem('nexa_user');
    setLoggedInUser(null);
    setCurrentRole('PUBLIC');
    if (isAdminRoute) {
      setIsAdminRoute(false);
      window.history.pushState({}, '', '/');
    }
    showToast("Anda telah keluar ke Halaman Utama Warga.");
    fetchData(null, 'PUBLIC');
  };

  // Pantau perubahan URL (/admin atau #admin)
  useEffect(() => {
    const checkRoute = () => {
      const isAdm = window.location.pathname.startsWith('/admin') || window.location.hash === '#admin';
      setIsAdminRoute(isAdm);
    };
    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);
    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, []);

  // Restore authenticated session on initial mount
  useEffect(() => {
    const token = localStorage.getItem('nexa_auth_token');
    const savedUserStr = localStorage.getItem('nexa_user');
    if (token && savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        setLoggedInUser(savedUser);
      } catch (e) {
        localStorage.removeItem('nexa_auth_token');
        localStorage.removeItem('nexa_user');
      }
    }
  }, []);

  // Fetch all core system data
  const fetchData = async (overrideToken, overrideRole) => {
    try {
      const token = overrideToken !== undefined ? overrideToken : localStorage.getItem('nexa_auth_token');
      const role = overrideRole !== undefined ? overrideRole : currentRole;
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

      const shouldFetchVerified = Boolean(
        token && (
          role === 'RT_LEADER' ||
          role === 'NGO' ||
          role === 'ADMIN' ||
          role === 'Admin' ||
          isAdminRoute
        )
      );

      const [
        areasRes, 
        reportsRes, 
        tasksRes, 
        evacsRes, 
        ruleRes, 
        bpbdRes, 
        bmkgRes, 
        tgRes, 
        statsRes,
        botInfoRes,
        usersRes
      ] = await Promise.all([
        fetch('/api/areas').then(r => r.json()),
        fetch(shouldFetchVerified ? '/api/reports/verified' : '/api/reports/public', { headers: authHeaders }).then(r => r.json()),
        fetch('/api/tasks').then(r => r.json()),
        fetch('/api/evacuations').then(r => r.json()),
        fetch('/api/rule-engine/status').then(r => r.json()),
        fetch('/api/bpbd/posts').then(r => r.json()),
        fetch('/api/bmkg/weather').then(r => r.json()),
        fetch('/api/telegram/messages', { headers: authHeaders }).then(r => r.json()).catch(() => ({ messages: [] })),
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/telegram/info').then(r => r.json()).catch(() => ({ bot_username: 'NexaSiagaBot' })),
        fetch('/api/auth/users', { headers: authHeaders }).then(r => r.json()).catch(() => ({ users: [] }))
      ]);

      if (areasRes.success) setAreas(areasRes.areas);
      if (reportsRes.success) setReports(reportsRes.reports);
      if (tasksRes.success) setTasks(tasksRes.tasks);
      if (evacsRes.success) setEvacuations(evacsRes.evacuations);
      if (ruleRes.success) setRuleStatus(ruleRes);
      if (bpbdRes.success) setBpbdPosts(bpbdRes.posts);
      if (bmkgRes.success) setBmkgForecast(bmkgRes.forecast);
      if (tgRes.success) setTelegramMessages(tgRes.messages);
      if (statsRes.success) setStats(statsRes.metrics);
      if (botInfoRes?.bot_username) setBotUsername(botInfoRes.bot_username);
      if (usersRes?.users) setUsers(usersRes.users);
    } catch (err) {
      console.error("Error fetching NEXA data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [currentRole]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('nexa_auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const ensureLoggedIn = () => {
    const token = localStorage.getItem('nexa_auth_token');
    if (!token) {
      showToast("Silakan klik Masuk (Login) sebagai Pengurus RT / NGO terlebih dahulu.");
      setIsLoginModalOpen(true);
      return false;
    }
    return true;
  };

  const handleVerifyReport = async (reportId, status) => {
    if (!ensureLoggedIn()) return;
    try {
      const res = await fetch(`/api/reports/${reportId}/verify`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memverifikasi laporan");
      showToast(status === 'Verified' ? "✓ Laporan berhasil dikonfirmasi!" : "Laporan ditolak.");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateTask = async (taskPayload) => {
    if (!ensureLoggedIn()) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(taskPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat tugas gotong royong");
      showToast("✓ Jadwal Gotong Royong diterbitkan & dikirim ke Telegram!");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCompleteTask = async ({ taskId, after_photo_url }) => {
    if (!ensureLoggedIn()) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ after_photo_url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyelesaikan tugas");
      showToast("✓ Saluran berhasil dibersihkan sebelum hujan!");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleHandleEvacuation = async ({ id, handled_by_ngo_id, dispatch_notes }) => {
    if (!ensureLoggedIn()) return;
    try {
      const res = await fetch(`/api/evacuations/${id}/handle`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ handled_by_ngo_id, dispatch_notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengerahkan armada SAR");
      showToast("✓ Bantuan Relawan & Armada SAR berhasil dikerahkan!");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateEvacuation = async (payload) => {
    try {
      const res = await fetch('/api/evacuations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Permintaan evakuasi banjir berhasil dicatat!");
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSimulateRuleEngine = async (params) => {
    try {
      const res = await fetch('/api/rule-engine/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Simulasi berhasil dievaluasi oleh Rule-Engine!");
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSimulateTelegramWebhook = async (payload) => {
    try {
      const token = localStorage.getItem('nexa_auth_token');
      const res = await fetch('/api/telegram/simulate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-simulator-request': 'true',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Bot Telegram berhasil disinkronkan!");
        fetchData();
      } else {
        alert(data.message || data.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const activeTasksList = tasks.filter(t => t.status === 'In_Progress');
  const totalHistoryItems = reports.length + evacuations.length;

  // HALAMAN KHUSUS PEMILIK WEB (/admin) - TERPISAH DARI WEB PUBLIK WARGA
  if (isAdminRoute || currentRole === 'ADMIN') {
    return (
      <AdminDashboard
        areas={areas}
        reports={reports}
        tasks={tasks}
        evacuations={evacuations}
        bpbdPosts={bpbdPosts}
        bmkgForecast={bmkgForecast}
        ruleStatus={ruleStatus}
        users={users}
        stats={stats}
        loggedInUser={loggedInUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        onRefresh={() => fetchData()}
        onBackToPublic={() => {
          setIsAdminRoute(false);
          setCurrentRole('PUBLIC');
          window.history.pushState({}, '', '/');
          fetchData(null, 'PUBLIC');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold text-xs md:text-sm shadow-xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-white shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Bar (Putih Bersih dengan Lonceng Riwayat & Menu Garis 3) */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        bpbdAlert="Siaga 3"
        bmkgForecast={bmkgForecast}
        onOpenTelegram={() => setIsTelegramModalOpen(true)}
        onOpenRegister={() => setIsRegisterModalOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onOpenHowToReport={() => setIsHowToModalOpen(true)}
        onOpenAbout={() => setIsAboutModalOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        historyCount={totalHistoryItems}
        loggedInUser={loggedInUser}
        onLogout={handleLogout}
        isDemoMode={isDemoMode}
        onToggleDemoMode={() => setIsDemoMode(!isDemoMode)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        
        {/* VIEW 1: TAMPILAN UTAMA WARGA (PETA BENCANA & LAPORAN) */}
        {currentRole === 'PUBLIC' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Kartu Utama: Final NEXA Identity & Ajakan Melapor */}
            <div className="rounded-2xl bg-white border-2 border-blue-200 p-6 md:p-7 shadow-sm space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="max-w-2xl space-y-2.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-extrabold">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>PREVENT (Sebelum Banjir) • RESPOND (Saat Banjir) • RECOVER (Pasca Banjir)</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 leading-snug">
                    Penilaian Risiko Banjir & Prioritas Bantuan Tingkat RT Berbantuan AI
                  </h2>
                  <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
                    Menggabungkan kondisi lingkungan <em>real-time</em>, kerentanan populasi (lansia, balita, disabilitas), dan aksesibilitas evakuasi untuk mengubah laporan warga menjadi tindakan nyata bersama <strong>RT/RW & Relawan (Volunteers)</strong>.
                  </p>
                </div>

                {/* Tombol Utama Besar & Mudah Dilihat */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm md:text-base shadow-md transition-all cursor-pointer"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Kirim Laporan Bahaya / Banjir</span>
                  </button>

                  <button
                    onClick={() => setIsHowToModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs md:text-sm transition-all cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span>Cara Melapor</span>
                  </button>
                </div>
              </div>

              {/* 3 Pertanyaan Utama Identitas NEXA */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <strong className="text-blue-900 block font-extrabold">1. Seberapa Bahaya Banjirnya?</strong>
                  <span className="text-slate-600">Menilai <em>Flood Severity</em> (tinggi air, kecepatan naik air, dan bahaya arus/sumbatan).</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <strong className="text-rose-900 block font-extrabold">2. Siapa yang Paling Berisiko?</strong>
                  <span className="text-slate-600">Mengidentifikasi lansia, balita, warga berkursi roda, dan akses jalan yang terputus.</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <strong className="text-emerald-900 block font-extrabold">3. Siapa yang Ditolong Pertama?</strong>
                  <span className="text-slate-600">Menentukan <em>Emergency Priority</em> agar RT/RW dan Relawan bergerak ke titik paling kritis.</span>
                </div>
              </div>
            </div>

            {/* BAGIAN UTAMA 1: PETA BENCANA & TITIK LAPORAN */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base md:text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <span>Peta Bencana & Titik Laporan Lingkungan RT/RW</span>
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600">
                    Klik lingkaran angka di peta untuk melihat jumlah laporan di wilayah RT tersebut.
                  </p>
                </div>
              </div>

              <PublicMap
                areas={areas}
                reports={reports}
                currentRole={currentRole}
              />
            </div>

            {/* BAGIAN UTAMA 2: DAFTAR LAPORAN WARGA TERBARU & STATUS PENANGANAN */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base md:text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <span>Daftar Laporan Warga Terbaru & Rekomendasi AI ({reports.length})</span>
                  </h3>
                  <p className="text-xs text-slate-600">
                    Laporan saluran/sampah diverifikasi oleh RT (Pencegahan), sedangkan laporan banjir langsung ditangani NGO/Relawan (Pasca-Bencana).
                  </p>
                </div>

                <button
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-1"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Lihat Semua Riwayat Bencana</span>
                </button>
              </div>

              {reports.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-sm md:text-base font-extrabold text-slate-800">
                    Belum Ada Laporan Masuk (0 Laporan)
                  </p>
                  <p className="text-xs text-slate-600 max-w-lg mx-auto">
                    Sistem dimulai dalam keadaan bersih. Silakan klik tombol <strong>&quot;Kirim Laporan Bahaya / Banjir&quot;</strong> di atas untuk menguji alur laporan warga menuju Ketua RT dan Relawan.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reports.slice(0, 6).map(r => {
                    const isFlood = r.hazard_type === 'Flood';
                    const floodSev = r.flood_severity || (r.ai_suggested_severity === 'Berat' ? 'High' : 'Medium');
                    const emergPrio = r.emergency_priority || (r.ai_suggested_severity === 'Berat' ? 'High' : 'Medium');
                    return (
                      <div key={r.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                              isFlood
                                ? 'bg-red-100 text-red-900 border-red-300'
                                : 'bg-blue-100 text-blue-900 border-blue-200'
                            }`}>
                              {r.hazard_type_label || r.hazard_type}
                            </span>
                            <span className="text-[11px] font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                              Priority: {emergPrio} (Severity: {floodSev})
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-900 text-sm line-clamp-2">
                            {r.description}
                          </h4>

                          <p className="text-xs text-slate-600 font-semibold">
                            📍 {r.kelurahan} ({r.rt_code} {r.rw_code})
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">
                            {isFlood ? '➔ Koordinasi RT & Relawan' : '➔ Verifikasi Pencegahan RT'}
                          </span>
                          <span className={`font-extrabold ${
                            r.status === 'Verified' || r.status === 'Task_Created' || r.status === 'Closed'
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}>
                            {r.status === 'Pending' ? 'Menunggu Tindakan' : 'Sudah Ditindaklanjuti'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BAGIAN UTAMA 3: JADWAL GOTONG ROYONG AKTIF */}
            {activeTasksList.length > 0 && (
              <div className="bg-white border-2 border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-extrabold text-slate-900 text-base md:text-lg">
                      Kegiatan Gotong Royong Pencegahan Sebelum Hujan
                    </h3>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-900 px-3 py-1 rounded-lg border border-amber-300 font-extrabold">
                    ⏱ Target Sebelum Hujan BMKG
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeTasksList.map(task => (
                    <div key={task.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-slate-900 block text-sm md:text-base font-extrabold">{task.title}</strong>
                          <span className="text-xs font-semibold text-slate-600">{task.kelurahan}</span>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-bold shrink-0">
                          {task.rain_forecast_note}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 bg-white p-3 rounded-xl border border-slate-200 font-sans whitespace-pre-line leading-relaxed">
                        {task.sop_action_plan}
                      </p>
                      <div className="flex items-center justify-between text-xs text-slate-700 pt-1">
                        <span>Pengurus: <strong>{task.verified_by_name}</strong></span>
                        <span className="text-emerald-800 font-extrabold">{task.volunteers_count} Warga Terlibat</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ringkasan Dampak */}
            <ImpactStatsBar metrics={stats} />
          </div>
        )}

        {/* VIEW 2: DASBOR KETUA RT (FOKUS VERIFIKASI PENCEGAHAN PRA-HUJAN) */}
        {currentRole === 'RT_LEADER' && (
          <div className="animate-fade-in">
            <RtLeaderDashboard
              reports={reports}
              tasks={tasks}
              areas={areas}
              users={users}
              onVerifyReport={handleVerifyReport}
              onCreateTask={handleCreateTask}
              onCompleteTask={handleCompleteTask}
              onOpenTelegram={(token) => {
                if (token) setActiveTelegramToken(token);
                setIsTelegramModalOpen(true);
              }}
              onSwitchToNgo={() => setCurrentRole('NGO')}
            />
          </div>
        )}

        {/* VIEW 3: PORTAL RELAWAN (VOLUNTEERS) & DUKUNGAN NGO */}
        {currentRole === 'NGO' && (
          <div className="animate-fade-in">
            <NgoDashboard
              reports={reports}
              tasks={tasks}
              evacuations={evacuations}
              areas={areas}
              users={users}
              stats={stats}
              loggedInUser={loggedInUser}
              onVerifyReport={handleVerifyReport}
              onCompleteTask={handleCompleteTask}
              onHandleEvacuation={handleHandleEvacuation}
              onCreateEvacuation={handleCreateEvacuation}
            />
          </div>
        )}

      </main>

      {/* MODAL 1: FORMULIR LAPORAN WARGA */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        areas={areas}
        onReportSubmitted={(newReport) => {
          if (newReport?.hazard_type === 'Flood') {
            showToast("Laporan Banjir diterima & langsung diteruskan ke Tim NGO/Relawan!");
          } else {
            showToast("Laporan diterima & diteruskan ke Ketua RT serta Relawan!");
          }
          fetchData();
        }}
      />

      {/* MODAL 2: LONCENG RIWAYAT BENCANA & AKTIVITAS */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-3xl bg-white border border-slate-300 rounded-2xl shadow-2xl p-6 text-slate-900 my-8 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-slate-900">
                    Riwayat Bencana & Catatan Aktivitas Lingkungan
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600">
                    Rekam jejak peringatan cuaca BMKG, laporan banjir warga, gotong royong RT, dan evakuasi NGO
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-300 font-bold text-xs"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
              {/* Info Status Pintu Air & Cuaca Saat Ini */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 uppercase">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>Peringatan Cuaca & Pintu Air Terkini</span>
                </div>
                <p className="text-xs md:text-sm font-bold text-slate-900">
                  {bmkgForecast?.active_warning?.headline || "Waspada Potensi Hujan Sedang-Lebat di DKI Jakarta"}
                </p>
                <div className="flex flex-wrap gap-3 pt-1 text-xs text-slate-700 font-semibold">
                  {bpbdPosts.slice(0, 3).map(p => (
                    <span key={p.id} className="bg-white px-2.5 py-1 rounded-lg border border-amber-200">
                      {p.name}: <strong>{p.status} ({p.water_level_cm} cm)</strong>
                    </span>
                  ))}
                </div>
              </div>

              {/* Riwayat Evakuasi Banjir (NGO & Relawan) */}
              <div className="space-y-2.5">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-rose-600" />
                  <span>Riwayat Bencana Banjir & Evakuasi Relawan/NGO ({evacuations.length})</span>
                </h4>
                <div className="space-y-2.5">
                  {evacuations.map(ev => (
                    <div key={ev.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 text-sm">{ev.kelurahan} ({ev.rt_code} {ev.rw_code})</strong>
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-900 font-bold border border-red-200">
                            Tinggi Air: {ev.water_depth_cm !== null && ev.water_depth_cm !== undefined && ev.water_depth_cm !== '' ? `${ev.water_depth_cm} cm` : 'Belum Diketahui'}
                          </span>
                        </div>
                        <p className="text-slate-700">{ev.vulnerable_details}</p>
                        {ev.dispatch_notes && (
                          <p className="text-emerald-800 font-semibold">Tindakan NGO: {ev.dispatch_notes}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-lg font-extrabold border ${
                        ev.status === 'Dispatched'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {ev.status === 'Dispatched' ? `Ditangani (${ev.handled_by_name})` : 'Menunggu Evakuasi NGO'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Riwayat Semua Laporan Warga */}
              <div className="space-y-2.5">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Riwayat Laporan Lingkungan Warga ({reports.length})</span>
                </h4>
                <div className="space-y-2.5">
                  {reports.map(r => (
                    <div key={r.id} className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="space-y-1 max-w-xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-slate-900">{r.hazard_type_label || r.hazard_type}</span>
                          <span className="text-slate-600 font-semibold">• {r.kelurahan} ({r.rt_code} {r.rw_code})</span>
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-bold">
                            AI: {r.ai_suggested_severity || 'Sedang'}
                          </span>
                        </div>
                        <p className="text-slate-700">{r.description}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2.5 py-1 rounded-lg font-bold border ${
                          r.status === 'Pending'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        }`}>
                          {r.status === 'Pending' ? 'Menunggu Tindakan' : 'Sudah Diverifikasi'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs md:text-sm"
              >
                Tutup Riwayat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PANDUAN CARA MENGIRIM LAPORAN (RAMAH ORANG TUA) */}
      {isHowToModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-xl bg-white border border-slate-300 rounded-2xl shadow-2xl p-6 text-slate-900 my-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-slate-900">Cara Mengirim Laporan Warga</h3>
                  <p className="text-xs md:text-sm text-slate-600">Panduan singkat 3 langkah mudah tanpa perlu login</p>
                </div>
              </div>
              <button
                onClick={() => setIsHowToModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-800">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <strong className="text-slate-900 block text-base">Tekan Tombol "Kirim Laporan Bahaya / Banjir"</strong>
                  <p className="text-xs md:text-sm text-slate-600 mt-0.5 leading-relaxed">
                    Pilih jenis masalah: apakah <strong>Saluran Mampet / Sampah</strong> (untuk pencegahan sebelum hujan) atau <strong>Banjir / Darurat</strong> (untuk bantuan evakuasi).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <strong className="text-slate-900 block text-base">Ambil Foto & Pilih Wilayah RT Anda</strong>
                  <p className="text-xs md:text-sm text-slate-600 mt-0.5 leading-relaxed">
                    Gunakan tombol <strong>Buka Kamera HP</strong> untuk memotret kondisi got atau genangan air, lalu tulis keterangan singkat lokasi patokannya.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <strong className="text-slate-900 block text-base">AI Menganalisis & Meneruskan ke RT dan Relawan/NGO</strong>
                  <p className="text-xs md:text-sm text-slate-600 mt-0.5 leading-relaxed">
                    • Laporan <strong>Pencegahan (Saluran/Sampah)</strong> diverifikasi oleh <strong>Ketua RT</strong> untuk jadwal gotong royong warga.<br />
                    • Laporan <strong>Banjir & Pasca-Bencana</strong> langsung muncul di <strong>Dasbor NGO & Relawan</strong> lengkap dengan rekomendasi AI untuk segera ditangani!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsHowToModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs md:text-sm"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setIsHowToModalOpen(false);
                  setIsReportModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs md:text-sm shadow-sm flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Coba Kirim Laporan Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: TENTANG WEB NEXA SIAGART */}
      {isAboutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-xl bg-white border border-slate-300 rounded-2xl shadow-2xl p-6 text-slate-900 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200">
                  <Info className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-slate-900">Tentang NEXA SiagaRT</h3>
                  <p className="text-xs md:text-sm text-slate-600">Sistem Peringatan Dini & Mitigasi Banjir Lingkungan</p>
                </div>
              </div>
              <button
                onClick={() => setIsAboutModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="space-y-3.5 text-xs md:text-sm text-slate-700 leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
              <p>
                <strong className="text-slate-900">NEXA (SiagaRT)</strong> adalah sistem penilaian risiko banjir berbantuan AI yang menggabungkan kondisi lingkungan <em>real-time</em>, kerentanan populasi, dan kapasitas evakuasi untuk memprioritaskan respons darurat di tingkat RT/RW.
              </p>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                <strong className="text-emerald-950 block">1. Alur 3 Fase (PREVENT, RESPOND, RECOVER):</strong>
                <p className="text-slate-800">
                  • <strong>PREVENT (Sebelum Banjir):</strong> RT/RW memverifikasi laporan sumbatan saluran & menggerakkan relawan warga.<br />
                  • <strong>RESPOND (Saat Banjir):</strong> <em>AI-assisted triage</em> memisahkan <em>Flood Severity</em> vs <em>Emergency Priority</em>; warga arahan RT/RW bergerak dibantu Relawan (Volunteers / NGO).<br />
                  • <strong>RECOVER (Pasca Banjir):</strong> Dokumentasi dampak & evaluasi kesiapsiagaan berikutnya.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                <strong className="text-rose-950 block">2. Empat Indikator Penilaian Risiko AI (Urgency &ne; Flood Depth):</strong>
                <p className="text-slate-800">
                  Berlandaskan kerangka kerja <em>UNDRR, Australian Institute for Disaster Resilience (Guideline 7.3), BPBD DKI, & UK Environment Agency</em>:<br />
                  • <strong>Physical Flood Hazard (40%):</strong> Tinggi air, kecepatan naik air, dan bahaya arus/puing.<br />
                  • <strong>Population Exposure (15%):</strong> Warga terdampak, fasilitas kritis, & akses jalan terputus.<br />
                  • <strong>Population Vulnerability (30%):</strong> Balita, lansia 60+, pengguna kursi roda/disabilitas, ibu hamil, & warga rentan tinggal sendiri.<br />
                  • <strong>Evacuation & Response Capacity (15%):</strong> Keterjangkauan jalur evakuasi & ketersediaan relawan.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                <strong className="text-blue-950 block">3. Nilai Tambah Dibandingkan Sistem yang Sudah Ada (Benchmark):</strong>
                <p className="text-slate-800">
                  • <strong>Pantau Banjir & GIS BPBD DKI:</strong> Berorientasi pada pemantauan wilayah makro, sedangkan NEXA mengelola tindakan operasional langsung di tingkat RT/RW.<br />
                  • <strong>PetaBencana.id & InaRISK BNPB:</strong> Fokus pada berbagi informasi situasi & pemetaan risiko, sedangkan NEXA mengubah laporan menjadi pembagian tugas nyata.<br />
                  • <strong>DSDA DKI:</strong> Fokus pada infrastruktur makro (pintu air/pompa), yang datanya digunakan NEXA sebagai konteks urgensi tindakan komunitas RT.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsAboutModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs md:text-sm"
              >
                Mengerti & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Bot Simulator Modal */}
      <TelegramSimulatorModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        messages={telegramMessages}
        onSimulateWebhook={handleSimulateTelegramWebhook}
        token={activeTelegramToken}
        botUsername={botUsername}
      />

      {/* Registration Modal */}
      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        areas={areas}
        onRegistered={(newUser, token) => {
          handleLoginSuccess(newUser, token);
        }}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Footer Bersih */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-5 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900">NEXA SiagaRT</span>
            <span>• Sistem Pencegahan RT & Tanggap Bencana Relawan/NGO</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600 font-semibold">
            <span>Integrasi Cuaca BMKG & BPBD</span>
            <span>•</span>
            <span>Sesuai UU PDP</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
