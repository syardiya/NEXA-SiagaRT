import React from 'react';
import { 
  Shield, CloudRain, Users, Eye, AlertTriangle, Send, 
  UserPlus, LogOut, Lock, SlidersHorizontal
} from 'lucide-react';

export default function Navbar({ 
  currentRole, 
  onRoleChange, 
  bpbdAlert, 
  bmkgForecast, 
  onOpenTelegram, 
  onOpenRegister, 
  onOpenLogin,
  loggedInUser,
  onLogout,
  isDemoMode,
  onToggleDemoMode
}) {
  const [countdownText, setCountdownText] = React.useState('Memuat...');

  React.useEffect(() => {
    const update = () => {
      const targetTimeStr = bmkgForecast?.active_warning?.expected_heavy_rain;
      if (!targetTimeStr) {
        setCountdownText('60 mnt');
        return;
      }
      const targetMs = new Date(targetTimeStr).getTime();
      const diffSec = Math.floor((targetMs - Date.now()) / 1000);

      if (diffSec <= 0) {
        setCountdownText('Hujan Sedang Berlangsung');
        return;
      }

      const h = Math.floor(diffSec / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      const s = diffSec % 60;
      const pad = (n) => String(n).padStart(2, '0');

      if (h > 0) {
        setCountdownText(`${pad(h)}j ${pad(m)}m ${pad(s)}d`);
      } else {
        setCountdownText(`${pad(m)}m ${pad(s)}d`);
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [bmkgForecast]);

  const activeWarning = bmkgForecast?.active_warning;
  const headline = activeWarning?.headline || "Waspada Potensi Hujan Sedang-Lebat di Wilayah DKI Jakarta";

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      {/* Top emergency ribbon */}
      <div className="bg-gradient-to-r from-sky-950 via-sky-900 to-indigo-950 border-b border-sky-800/40 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="font-semibold text-amber-300 shrink-0">Peringatan Dini BMKG:</span>
            <span className="text-slate-200 truncate font-medium">
              {headline}
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-300 shrink-0">
            <div className="flex items-center gap-1.5 bg-sky-900/70 px-2.5 py-0.5 rounded-lg border border-sky-700/60 shadow-inner">
              <CloudRain className="w-3.5 h-3.5 text-sky-400 shrink-0 animate-pulse" />
              <span>Tenggat Hujan: <strong className="text-amber-300 font-mono font-bold tracking-wider">{countdownText}</strong></span>
            </div>
            
            {/* Demo vs Production Mode Toggle */}
            <button
              onClick={onToggleDemoMode}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                isDemoMode 
                  ? 'bg-purple-950 text-purple-300 border-purple-600/50' 
                  : 'bg-emerald-950 text-emerald-300 border-emerald-600/50'
              }`}
              title="Ganti antara Mode Publik (Produksi) dan Mode Showcase Pengembang"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>{isDemoMode ? 'Mode Showcase / Demo' : 'Mode Publik / Produksi'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white font-black text-xl">
            N
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                NEXA <span className="text-sky-400 font-semibold text-sm">SiagaRT</span>
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                Jakarta Flood Shield
              </span>
            </div>
            <p className="text-xs text-slate-400">Neighborhood Emergency eXchange & Action</p>
          </div>
        </div>

        {/* IN DEMO MODE: Show all 4 Role Selector Tabs */}
        {isDemoMode && (
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 shadow-inner">
            <button
              onClick={() => onRoleChange('PUBLIC')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRole === 'PUBLIC'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Warga / Publik</span>
              <span className="text-[9px] bg-slate-900/50 px-1 py-0.2 rounded text-slate-300">PDP</span>
            </button>

            <button
              onClick={() => onRoleChange('RT_LEADER')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRole === 'RT_LEADER'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Ketua RT/RW</span>
              <span className="text-[9px] bg-emerald-950 px-1 py-0.2 rounded text-emerald-300 border border-emerald-600/40">Verified</span>
            </button>

            <button
              onClick={() => onRoleChange('NGO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRole === 'NGO'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>NGO & Relawan</span>
              <span className="text-[9px] bg-rose-950 px-1 py-0.2 rounded text-rose-300 border border-rose-600/40">Phase 2</span>
            </button>

            <button
              onClick={() => onRoleChange('SIMULATOR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRole === 'SIMULATOR'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Rule Engine 2-of-3</span>
            </button>
          </div>
        )}

        {/* IN PRODUCTION MODE: Show Logged In Badge or Clean Navigation */}
        {!isDemoMode && loggedInUser && (
          <div className="flex items-center gap-3 bg-slate-800/90 py-1.5 px-3 rounded-xl border border-emerald-500/40 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <span className="text-slate-400 block text-[10px]">Akses Masuk:</span>
              <span className="font-bold text-white">{loggedInUser.full_name}</span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-rose-900 text-slate-200 hover:text-white text-xs transition-colors ml-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        )}

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2">
          {/* In Production: Show Login Button for Stakeholders */}
          {!loggedInUser && (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 rounded-xl transition-all shadow-md shadow-sky-500/20"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Login Pengurus (RT / NGO)</span>
            </button>
          )}

          <button
            onClick={onOpenRegister}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 rounded-xl transition-colors shadow-sm"
            title="Daftarkan RT Baru atau Bergabung sebagai Relawan"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Daftar RT / Relawan</span>
          </button>

          <button
            onClick={onOpenTelegram}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-300 bg-sky-950/60 hover:bg-sky-900 border border-sky-700/50 rounded-xl transition-colors"
            title="Buka Bot Telegram"
          >
            <Send className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Telegram Bot</span>
          </button>
        </div>
      </div>
    </header>
  );
}
