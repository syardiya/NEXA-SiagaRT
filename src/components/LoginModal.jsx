import React, { useState } from 'react';
import { Lock, X, KeyRound, CheckCircle2, ArrowRight, Phone, Sparkles } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [selectedRole, setSelectedRole] = useState('RT_LEADER');
  const [identifier, setIdentifier] = useState('0812-9843-1102');
  const [pinCode, setPinCode] = useState('1234');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const presetAccounts = [
    { role: 'RT_LEADER', label: 'Pak Bambang (Ketua RT 04 - Pencegahan)', id: '0812-9843-1102' },
    { role: 'RT_LEADER', label: 'Ibu Nuraini (Ketua RT 03 Bidara Cina)', id: '0813-8821-4491' },
    { role: 'NGO', label: 'PMI Jakarta Timur (NGO Pasca-Bencana)', id: '021-8192411' },
    { role: 'NGO', label: 'Tagana DKI Unit SAR (Relawan Evakuasi)', id: '021-3901122' }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-2xl p-6 text-slate-900 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 border border-blue-200">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Login Pengurus RT & Relawan NGO</h3>
              <p className="text-xs text-slate-600">Masuk ke Dasbor Pencegahan RT atau Dasbor Pasca-Bencana NGO</p>
            </div>
          </div>
          <button onClick={onClose} className="px-2.5 py-1 text-slate-600 hover:text-red-600 rounded-lg bg-slate-100 border border-slate-300 font-bold text-xs">
            ✕
          </button>
        </div>

        {/* Quick Fill Preset Pills */}
        <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Pilih Cepat Akun Pengurus (Klik salah satu):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presetAccounts.map((acc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(acc)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  identifier === acc.id
                    ? 'bg-blue-600 border-blue-700 text-white font-bold shadow-2xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold'
                }`}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3.5 text-xs md:text-sm pt-1">
          <div>
            <label className="text-slate-800 font-bold block mb-1">
              Nomor HP Terdaftar / ID Akun:
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Contoh: 0812-9843-1102"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-semibold pl-9 focus:outline-none focus:border-blue-600"
              />
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="text-slate-800 font-bold block mb-1">Kode PIN Akses:</label>
            <div className="relative">
              <input
                type="password"
                required
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="Masukkan PIN"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono tracking-widest pl-9 focus:outline-none focus:border-blue-600"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
            <span className="text-xs text-slate-600 mt-1 block">
              * PIN standar pengurus untuk uji coba adalah: <strong className="text-blue-700">1234</strong>
            </span>
          </div>

          {errorMsg && (
            <p className="text-xs font-bold text-red-800 bg-red-50 p-3 rounded-xl border border-red-200">
              {errorMsg}
            </p>
          )}

          {/* Footer Submit */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold text-xs md:text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs md:text-sm shadow-sm transition-all disabled:opacity-50"
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
