import React, { useState } from 'react';
import { Lock, X, KeyRound, CheckCircle2, ArrowRight, Phone, Sparkles } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [selectedRole, setSelectedRole] = useState('RT_LEADER'); // 'RT_LEADER' | 'NGO' | 'ADMIN'
  const [identifier, setIdentifier] = useState('0812-9843-1102'); // Pak Bambang default
  const [pinCode, setPinCode] = useState('1234');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Preset demo accounts for quick one-click testing
  const presetAccounts = [
    { role: 'RT_LEADER', label: 'Pak Bambang (Ketua RT 04 Kampung Melayu)', id: '0812-9843-1102' },
    { role: 'RT_LEADER', label: 'Ibu Nuraini (Ketua RT 03 Bidara Cina)', id: '0813-8821-4491' },
    { role: 'NGO', label: 'PMI Jakarta Timur (Tim TRC Evakuasi)', id: '021-8192411' },
    { role: 'NGO', label: 'Tagana DKI Unit SAR', id: '021-3901122' },
    { role: 'ADMIN', label: 'Pusdalops BPBD DKI Jakarta', id: '112' }
  ];

  const handleSelectPreset = (acc) => {
    setSelectedRole(acc.role);
    setIdentifier(acc.id);
    setPinCode('1234');
    setErrorMsg('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          pin: pinCode.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal masuk. Periksa nomor HP dan PIN.");
      }

      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Portal Pengurus & Stakeholder</h3>
              <p className="text-xs text-slate-400">Akses terbatas untuk Ketua RT, Tim NGO, dan BPBD</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Fill Preset Pills */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Pilih Cepat Akun Terdaftar:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presetAccounts.map((acc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(acc)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                  identifier === acc.id
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-750'
                }`}
              >
                {acc.label.split('(')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3.5 text-xs pt-1">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Nomor HP Terdaftar / ID Akun:
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Contoh: 0812-9843-1102 atau 112"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs pl-8 focus:outline-none focus:border-sky-500"
              />
              <Phone className="w-4 h-4 text-slate-500 absolute left-2.5 top-3" />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Kode PIN / Password Akses:</label>
            <div className="relative">
              <input
                type="password"
                required
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="Masukkan PIN"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs pl-8 font-mono tracking-widest focus:outline-none focus:border-sky-500"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-2.5 top-3" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              * PIN inisialisasi default seluruh pengurus adalah: <strong className="text-sky-300">1234</strong>
            </span>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/40 animate-shake">
              {errorMsg}
            </p>
          )}

          {/* UU PDP Notice */}
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Kepatuhan Keamanan & UU PDP No. 27/2022</span>
            </div>
            <p className="text-slate-400">
              Sistem memverifikasi identitas stakeholder secara aman di server. Data kontak pelapor dan koordinat presisi hanya dibuka setelah login diverifikasi.
            </p>
          </div>

          {/* Footer Submit */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <span>Memverifikasi...</span>
              ) : (
                <>
                  <span>Masuk ke Dasbor</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
