import React, { useState } from 'react';
import { 
  Shield, CloudRain, Users, Eye, AlertTriangle, Send, 
  UserPlus, LogOut, Lock, SlidersHorizontal, Menu, X, 
  Bell, MapPin, HelpCircle, Info, Camera, CheckCircle2
} from 'lucide-react';

export default function Navbar({ 
  currentRole, 
  onRoleChange, 
  bpbdAlert, 
  bmkgForecast, 
  onOpenTelegram, 
  onOpenRegister, 
  onOpenLogin,
  onOpenHistory,
  onOpenHowToReport,
  onOpenAbout,
  onOpenReportModal,
  historyCount = 0,
  loggedInUser,
  onLogout,
  isDemoMode,
  onToggleDemoMode
}) {
  const [countdownText, setCountdownText] = useState('Memuat...');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  React.useEffect(() => {
    const update = () => {
      const targetTimeStr = bmkgForecast?.active_warning?.expected_heavy_rain;
      if (!targetTimeStr) {
        setCountdownText(bmkgForecast?.active_warning?.is_active ? 'Siaga Cuaca' : 'Kondusif');
        return;
      }
      const targetMs = new Date(targetTimeStr).getTime();
      const diffSec = Math.floor((targetMs - Date.now()) / 1000);

      if (diffSec <= 0) {
        setCountdownText('Hujan Berlangsung');
        return;
      }

      const h = Math.floor(diffSec / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      if (h > 0) {
        setCountdownText(`${h} jam ${m} mnt`);
      } else {
        setCountdownText(`${m} menit`);
      }
    };

    update();
    const timer = setInterval(update, 10000);
    return () => clearInterval(timer);
  }, [bmkgForecast]);

  const activeWarning = bmkgForecast?.active_warning;
  const headline = activeWarning?.headline || "Waspada Potensi Hujan Sedang-Lebat di Wilayah DKI Jakarta";

  const handleMenuAction = (fn) => {
    setIsDrawerOpen(false);
    if (fn) fn();
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        {/* Pita Info Cuaca BMKG - Warna Terang & Kontras Tinggi untuk Orang Tua */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs md:text-sm text-slate-800">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-600 shrink-0"></span>
              <span className="font-bold text-amber-900 shrink-0">Info Cuaca BMKG:</span>
              <span className="text-slate-800 truncate font-medium">
                {headline}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-amber-300 shadow-sm text-slate-900">
                <CloudRain className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-semibold">Estimasi Hujan: <strong className="text-amber-800 font-bold">{countdownText}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Bar Navigasi Utama - Bersih, Hanya Logo, Lonceng Riwayat, & Garis 3 */}
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          {/* Brand Logo (Klik untuk kembali ke Peta & Laporan Utama) */}
          <button
            onClick={() => onRoleChange('PUBLIC')}
            className="flex items-center gap-3 text-left focus:outline-none group"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-md text-white font-black text-xl group-hover:bg-blue-700 transition-colors">
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900">
                  NEXA <span className="text-blue-600">SiagaRT</span>
                </h1>
                <span className="hidden sm:inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  Siaga Banjir Warga
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Sistem Laporan Warga, Pencegahan RT & Evakuasi Relawan
              </p>
            </div>
          </button>

          {/* Indikator Peran Aktif (Jika bukan di halaman Publik) */}
          {currentRole !== 'PUBLIC' && (
            <div className="hidden md:flex items-center gap-2 bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span className="text-xs font-bold text-blue-900">
                Mode Tampilan: {currentRole === 'RT_LEADER' ? 'Pusat Komando RT/RW' : 'Portal Relawan (Volunteers)'}
              </span>
              <button
                onClick={() => onRoleChange('PUBLIC')}
                className="ml-2 text-xs font-bold text-blue-700 underline hover:text-blue-900"
              >
                Kembali ke Peta Utama
              </button>
            </div>
          )}

          {/* Kanan: Tombol Lonceng (Riwayat Bencana) & Tombol Garis 3 (Menu) */}
          <div className="flex items-center gap-2.5">
            {/* Fitur Lonceng: Riwayat Bencana */}
            <button
              onClick={onOpenHistory}
              className="relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-700 border border-slate-300 font-bold text-xs md:text-sm transition-all"
              title="Lihat Riwayat Bencana & Aktivitas"
            >
              <Bell className="w-5 h-5 text-blue-600" />
              <span className="hidden sm:inline">Riwayat Bencana</span>
              {historyCount > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] font-extrabold rounded-full bg-red-600 text-white leading-none">
                  {historyCount}
                </span>
              )}
            </button>

            {/* Tombol Garis 3 (Hamburger Menu) */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs md:text-sm shadow-sm transition-all"
              aria-label="Buka Menu Navigasi"
            >
              <Menu className="w-5 h-5" />
              <span>Menu</span>
            </button>
          </div>
        </div>

        {/* Bar Pintas Mode Demo Juri (Hanya tampil jika Mode Demo diaktifkan dari dalam Menu Garis 3) */}
        {isDemoMode && (
          <div className="bg-slate-100 border-t border-slate-200 px-4 py-2">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                <span>Pintas Peran (Mode Demo Presentasi):</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => onRoleChange('PUBLIC')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currentRole === 'PUBLIC'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  1. Peta & Laporan Warga
                </button>
                <button
                  onClick={() => onRoleChange('RT_LEADER')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currentRole === 'RT_LEADER'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  2. Pusat Komando RT/RW
                </button>
                <button
                  onClick={() => onRoleChange('NGO')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currentRole === 'NGO'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  3. Portal Relawan (Volunteers)
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* PANEL MENU GARIS 3 (SLIDE-OVER DRAWER BISA MUNCUL & DI-CLOSE) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-y-auto">
            
            {/* Header Menu Garis 3 */}
            <div>
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Menu Utama NEXA SiagaRT</h2>
                  <p className="text-xs text-slate-600">Pilih halaman atau panduan di bawah ini</p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-300 font-bold text-xs transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Tutup</span>
                </button>
              </div>

              {/* Bagian 1: Menu Informasi & Panduan Warga */}
              <div className="p-5 space-y-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Navigasi Warga & Informasi
                </p>

                <button
                  onClick={() => handleMenuAction(() => onRoleChange('PUBLIC'))}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all ${
                    currentRole === 'PUBLIC'
                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold'
                  }`}
                >
                  <div className="p-2.5 rounded-lg bg-blue-600 text-white shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Peta Bencana & Laporan</div>
                    <div className="text-xs text-slate-600">Lihat peta titik rawan & daftar laporan warga</div>
                  </div>
                </button>

                <button
                  onClick={() => handleMenuAction(onOpenReportModal)}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100/80 text-left transition-all"
                >
                  <div className="p-2.5 rounded-lg bg-red-600 text-white shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-red-950">Kirim Laporan Bahaya / Banjir</div>
                    <div className="text-xs text-red-800">Foto saluran mampet, sampah, atau banjir</div>
                  </div>
                </button>

                <button
                  onClick={() => handleMenuAction(onOpenHowToReport)}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left transition-all"
                >
                  <div className="p-2.5 rounded-lg bg-emerald-600 text-white shrink-0">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Cara Mengirim Laporan</div>
                    <div className="text-xs text-slate-600">Panduan mudah 3 langkah untuk warga</div>
                  </div>
                </button>

                <button
                  onClick={() => handleMenuAction(onOpenHistory)}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left transition-all"
                >
                  <div className="p-2.5 rounded-lg bg-amber-500 text-white shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-900 flex items-center justify-between">
                      <span>Riwayat Bencana & Aktivitas</span>
                      {historyCount > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-900 font-extrabold">
                          {historyCount}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600">Catatan laporan, peringatan BMKG & evakuasi</div>
                  </div>
                </button>

                <button
                  onClick={() => handleMenuAction(onOpenAbout)}
                  className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left transition-all"
                >
                  <div className="p-2.5 rounded-lg bg-indigo-600 text-white shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Tentang Web NEXA SiagaRT</div>
                    <div className="text-xs text-slate-600">Penjelasan alur RT, Relawan NGO & AI</div>
                  </div>
                </button>
              </div>

              {/* Bagian 2: Akses Pengurus (RT, Relawan NGO, Telegram) */}
              <div className="p-5 border-t border-slate-200 space-y-3 bg-slate-50/60">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Akses Pengurus RT & Relawan NGO
                </p>

                {loggedInUser ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="text-xs">
                        <span className="text-slate-600 block">Sedang Login Sebagai:</span>
                        <strong className="text-slate-900 text-sm">{loggedInUser.full_name}</strong>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMenuAction(() => {
                          if (loggedInUser.role === 'RT_Leader') onRoleChange('RT_LEADER');
                          else if (loggedInUser.role === 'NGO' || loggedInUser.role === 'Resident') onRoleChange('NGO');
                          else onRoleChange('SIMULATOR');
                        })}
                        className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs text-center"
                      >
                        Buka Portal Saya
                      </button>
                      <button
                        onClick={() => handleMenuAction(onLogout)}
                        className="py-2 px-3 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold text-xs flex items-center gap-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleMenuAction(onOpenLogin)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all"
                  >
                    <Lock className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Login Pengurus (RT/RW & Relawan)</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleMenuAction(onOpenRegister)}
                    className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Daftar RT / Relawan</span>
                  </button>

                  <button
                    onClick={() => handleMenuAction(onOpenTelegram)}
                    className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs transition-colors"
                  >
                    <Send className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>NEXA Bot</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Drawer: Sakelar Mode Demo Juri */}
            <div className="p-4 border-t border-slate-200 bg-slate-100 flex items-center justify-between">
              <div className="text-xs">
                <strong className="text-slate-800 block">Mode Presentasi / Demo</strong>
                <span className="text-slate-600">Tampilkan tab pintas semua peran</span>
              </div>
              <button
                onClick={onToggleDemoMode}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  isDemoMode
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
              >
                {isDemoMode ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
