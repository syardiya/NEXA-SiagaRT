import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PublicMap from './components/PublicMap';
import ReportModal from './components/ReportModal';
import RtLeaderDashboard from './components/RtLeaderDashboard';
import NgoDashboard from './components/NgoDashboard';
import RuleEngineSimulator from './components/RuleEngineSimulator';
import TelegramSimulatorModal from './components/TelegramSimulatorModal';
import RegisterModal from './components/RegisterModal';
import LoginModal from './components/LoginModal';
import ImpactStatsBar from './components/ImpactStatsBar';
import { 
  Camera, ShieldCheck, Flame, CheckCircle, Sparkles, MapPin, ArrowRight
} from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState('PUBLIC'); // 'PUBLIC' | 'RT_LEADER' | 'NGO' | 'SIMULATOR'
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

  // Modals & Auth State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false); // Default: Mode Publik Bersih (Produksi)
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
      showToast(`Selamat datang di Dasbor RT, ${user.full_name}!`);
    } else if (user.role === 'NGO') {
      setCurrentRole('NGO');
      showToast(`Selamat datang di Dasbor Evakuasi, ${user.full_name}!`);
    } else if (user.role === 'Admin') {
      setCurrentRole('SIMULATOR');
      showToast(`Selamat datang di Pusdalops Command Center!`);
    }
    fetchData(token, user.role);
  };

  const handleLogout = () => {
    localStorage.removeItem('nexa_auth_token');
    localStorage.removeItem('nexa_user');
    setLoggedInUser(null);
    setCurrentRole('PUBLIC');
    showToast("Anda telah keluar ke Halaman Publik.");
    fetchData(null, 'PUBLIC');
  };

  // Restore authenticated session on initial mount
  useEffect(() => {
    const token = localStorage.getItem('nexa_auth_token');
    const savedUserStr = localStorage.getItem('nexa_user');
    if (token && savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        setLoggedInUser(savedUser);
        if (savedUser.role === 'RT_Leader') setCurrentRole('RT_LEADER');
        else if (savedUser.role === 'NGO') setCurrentRole('NGO');
        else if (savedUser.role === 'Admin') setCurrentRole('SIMULATOR');
      } catch (e) {
        localStorage.removeItem('nexa_auth_token');
        localStorage.removeItem('nexa_user');
      }
    }
  }, []);

  // Fetch all core system data with UU PDP token protection
  const fetchData = async (overrideToken, overrideRole) => {
    try {
      const token = overrideToken !== undefined ? overrideToken : localStorage.getItem('nexa_auth_token');
      const role = overrideRole !== undefined ? overrideRole : currentRole;
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

      const shouldFetchVerified = Boolean(token && (role === 'RT_LEADER' || role === 'NGO' || role === 'SIMULATOR'));

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
        fetch('/api/telegram/messages').then(r => r.json()),
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
    const interval = setInterval(fetchData, 10000); // Polling every 10 seconds for real-time responsiveness
    return () => clearInterval(interval);
  }, [currentRole]);

  // Actions (Protected with Stakeholder Auth Headers)
  const getAuthHeaders = () => {
    const token = localStorage.getItem('nexa_auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const handleVerifyReport = async (reportId, status) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/verify`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memverifikasi laporan");
      showToast(status === 'Verified' ? "✓ Laporan warga berhasil diverifikasi!" : "Laporan ditolak.");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateTask = async (taskPayload) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(taskPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat tugas gotong royong");
      showToast("🚀 Tugas Gotong Royong diterbitkan & notifikasi Telegram terkirim!");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCompleteTask = async ({ taskId, after_photo_url }) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ after_photo_url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyelesaikan tugas");
      showToast("🎉 Hebat! Saluran berhasil dibersihkan sebelum hujan!");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleHandleEvacuation = async ({ id, handled_by_ngo_id, dispatch_notes }) => {
    try {
      const res = await fetch(`/api/evacuations/${id}/handle`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ handled_by_ngo_id, dispatch_notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengerahkan armada SAR");
      showToast("🚨 Armada Relawan & SAR berhasil dikerahkan ke lokasi!");
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
        showToast("✓ Situasi banjir darurat dicatat dan diprioritaskan!");
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
        showToast("⚡ Simulasi berhasil dievaluasi oleh Rule-Engine!");
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
        showToast("✓ Webhook Telegram berhasil disinkronkan ke RT!");
        fetchData();
      } else {
        alert(data.message || data.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const activeTasksList = tasks.filter(t => t.status === 'In_Progress');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-slate-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Bar */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        bpbdAlert="Siaga 3"
        bmkgForecast={bmkgForecast}
        onOpenTelegram={() => setIsTelegramModalOpen(true)}
        onOpenRegister={() => setIsRegisterModalOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        loggedInUser={loggedInUser}
        onLogout={handleLogout}
        isDemoMode={isDemoMode}
        onToggleDemoMode={() => setIsDemoMode(!isDemoMode)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        
        {/* VIEW 1: PUBLIC / CITIZEN VIEW */}
        {currentRole === 'PUBLIC' && (
          <div className="space-y-6 animate-fade-in">
            {/* Hero / Action Bar */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-900/60 via-slate-900 to-indigo-950/70 border border-sky-500/30 p-6 md:p-8 shadow-2xl">
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>Sistem Gotong Royong Terukur Sebelum Hujan (Phase 1)</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Cegah Banjir Jakarta Bersama: Laporkan Saluran Mampet & Gotong Royong
                </h2>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                  Platform manajemen risiko banjir berbasis komunitas dengan verifikasi AI Google Gemini dan validasi Ketua RT/RW. Laporan warga otomatis diubah menjadi tugas pengerukan sedimen terukur sebelum hujan deras turun.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs md:text-sm shadow-xl shadow-sky-500/30 transition-all transform hover:-translate-y-0.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Lapor Bahaya / Saluran Tersumbat</span>
                  </button>

                  <button
                    onClick={() => setCurrentRole('RT_LEADER')}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs md:text-sm transition-all"
                  >
                    <span>Masuk Dasbor Ketua RT</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* UU PDP Compliance Pill */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 text-sky-300">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span className="font-semibold">Perlindungan Data Pribadi (UU No. 27/2022):</span>
                  <span className="text-slate-300">Titik presisi rumah dan wajah pada foto warga disamarkan untuk akses publik.</span>
                </div>
              </div>
            </div>

            {/* Impact Stats */}
            <ImpactStatsBar metrics={stats} />

            {/* Interactive Jakarta Map Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-sky-400" />
                    <span>Peta Agregat Risiko Banjir Lingkungan RT Jakarta</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Menampilkan batas agregat RT/RW Ciliwung dan akumulasi laporan bahaya.
                  </p>
                </div>
              </div>

              <PublicMap
                areas={areas}
                reports={reports}
                currentRole={currentRole}
              />
            </div>

            {/* Active Community Cleanup Tasks (Phase 1) */}
            {activeTasksList.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-sky-400" />
                    <h3 className="font-bold text-white text-base">Aksi Gotong Royong Berjalan (Phase 1 Pre-Rain)</h3>
                  </div>
                  <span className="text-xs text-amber-400 font-bold">
                    ⏱ Deadline BMKG Berjalan
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeTasksList.map(task => (
                    <div key={task.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <strong className="text-white block text-sm">{task.title}</strong>
                          <span className="text-xs text-slate-400">{task.kelurahan}</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                          {task.rain_forecast_note}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 font-sans whitespace-pre-line">
                        {task.sop_action_plan}
                      </p>
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                        <span>Diverifikasi oleh: <strong>{task.verified_by_name}</strong></span>
                        <span className="text-sky-300 font-semibold">{task.volunteers_count} Warga Terlibat</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: RT LEADER DASHBOARD */}
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
              onSimulateWebhook={handleSimulateTelegramWebhook}
            />
          </div>
        )}

        {/* VIEW 3: NGO EVACUATION DASHBOARD (PHASE 2) */}
        {currentRole === 'NGO' && (
          <div className="animate-fade-in">
            <NgoDashboard
              evacuations={evacuations}
              areas={areas}
              onHandleEvacuation={handleHandleEvacuation}
              onCreateEvacuation={handleCreateEvacuation}
            />
          </div>
        )}

        {/* VIEW 4: RULE ENGINE 2-OF-3 SIMULATOR */}
        {currentRole === 'SIMULATOR' && (
          <div className="animate-fade-in">
            <RuleEngineSimulator
              ruleStatus={ruleStatus}
              bpbdPosts={bpbdPosts}
              bmkgForecast={bmkgForecast}
              onSimulate={handleSimulateRuleEngine}
              onRefresh={fetchData}
            />
          </div>
        )}

      </main>

      {/* Citizen Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        areas={areas}
        onReportSubmitted={() => {
          showToast("Laporan berhasil dikirim dan dianalisis Gemini AI!");
          fetchData();
        }}
      />

      {/* Telegram Bot Phone Simulator Modal */}
      <TelegramSimulatorModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        messages={telegramMessages}
        onSimulateWebhook={handleSimulateTelegramWebhook}
        token={activeTelegramToken}
        botUsername={botUsername}
      />

      {/* Registration Modal for New RT & Volunteers */}
      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        areas={areas}
        onRegistered={(newUser) => {
          showToast(`✓ Berhasil mendaftar: ${newUser.full_name}!`);
          fetchData();
        }}
      />

      {/* Stakeholder Login Portal Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-900/60 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">NEXA (SiagaRT)</span>
            <span>• Neighborhood Emergency eXchange and Action</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>BMKG & BPBD DKI Ingestion</span>
            <span>UU PDP Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
