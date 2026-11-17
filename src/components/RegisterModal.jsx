import React, { useState } from 'react';
import { UserPlus, Shield, HeartHandshake, X, CheckCircle2, ArrowRight } from 'lucide-react';

export default function RegisterModal({ isOpen, onClose, areas = [], onRegistered }) {
  const [activeTab, setActiveTab] = useState('VOLUNTEER'); // Default ke Relawan agar warga mudah bergabung
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // RT Form
  const [rtName, setRtName] = useState('');
  const [rtPhone, setRtPhone] = useState('');
  const [rtPin, setRtPin] = useState('1234');
  const [kelurahan, setKelurahan] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [kota, setKota] = useState('Jakarta Timur');
  const [rwCode, setRwCode] = useState('');
  const [rtCode, setRtCode] = useState('');

  // Volunteer Form
  const [volName, setVolName] = useState('');
  const [volPhone, setVolPhone] = useState('');
  const [volPin, setVolPin] = useState('1234');
  const [volRole, setVolRole] = useState('Resident'); // 'Resident' (Relawan Warga) | 'NGO' (Relawan Organisasi)
  const [volOrg, setVolOrg] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState(areas[0]?.id || 'area-km-04-02');

  if (!isOpen) return null;

  const handleRegisterRT = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-rt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: rtName,
          phone_number: rtPhone,
          pin: rtPin,
          kelurahan,
          kecamatan,
          kota,
          rw_code: rwCode,
          rt_code: rtCode
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessData({
          type: 'RT',
          user: data.user,
          authToken: data.token,
          title: `Ketua ${data.area.rt_code} ${data.area.rw_code} ${data.area.kelurahan} Berhasil Terdaftar!`,
          token: data.user.telegram_subscribe_token,
          message: "Akun dan wilayah RT Anda sudah aktif. Klik tombol di bawah untuk langsung masuk ke Pusat Komando RT/RW."
        });
      } else {
        alert(data.error || "Gagal mendaftarkan RT.");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVolunteer = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: volName,
          phone_number: volPhone,
          pin: volPin,
          role: volRole,
          organization_name: volOrg,
          rt_rw_id: selectedAreaId
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessData({
          type: 'VOLUNTEER',
          user: data.user,
          authToken: data.token,
          title: `Selamat Bergabung sebagai Relawan, ${data.user.full_name}!`,
          token: null,
          message: "Akun Relawan Anda sudah aktif dan tersimpan di database. Klik tombol di bawah untuk langsung membuka Halaman Portal Relawan (melihat tugas RT & menindaklanjuti bantuan banjir)."
        });
      } else {
        alert(data.error || "Gagal mendaftar.");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnterPortal = () => {
    if (successData && onRegistered) {
      onRegistered(successData.user, successData.authToken);
    }
    setSuccessData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-300 rounded-2xl shadow-2xl p-6 text-slate-900 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Pendaftaran Relawan & Pengurus RT</h3>
              <p className="text-xs text-slate-600">Daftar untuk ikut membantu tindakan lapangan & membuka halaman Relawan</p>
            </div>
          </div>
          <button onClick={onClose} className="px-2.5 py-1 text-slate-600 hover:text-red-600 rounded-lg bg-slate-100 border border-slate-300 font-bold text-xs">
            ✕
          </button>
        </div>

        {successData ? (
          <div className="py-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-extrabold text-slate-900">{successData.title}</h4>
            <p className="text-xs md:text-sm text-slate-700 max-w-md mx-auto leading-relaxed">{successData.message}</p>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-left space-y-1">
              <span className="text-slate-600 font-bold block">Informasi Login Anda (Untuk Masuk Kembali Nanti):</span>
              <div>Nomor HP: <strong className="text-slate-900">{successData.user?.phone_number}</strong></div>
              <div>PIN Akses: <strong className="text-blue-700 font-mono">{volPin || rtPin || '1234'}</strong></div>
            </div>

            {successData.token && (
              <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 text-xs text-left space-y-1">
                <span className="text-slate-600 font-bold block">Token NEXA Bot RT Anda:</span>
                <span className="font-mono font-extrabold text-blue-900 text-sm block">{successData.token}</span>
              </div>
            )}

            <button
              onClick={handleEnterPortal}
              className="mt-4 w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {successData.type === 'VOLUNTEER'
                  ? 'Langsung Masuk ke Halaman Portal Relawan'
                  : 'Langsung Masuk ke Pusat Komando RT/RW'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {/* Tab Selection */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('VOLUNTEER')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'VOLUNTEER'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <HeartHandshake className="w-4 h-4" />
                <span>Daftar Jadi Relawan</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('RT')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'RT'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Daftar Ketua RT Baru</span>
              </button>
            </div>

            {/* TAB 1: DAFTAR RELAWAN / NGO */}
            {activeTab === 'VOLUNTEER' && (
              <form onSubmit={handleRegisterVolunteer} className="space-y-3 text-xs md:text-sm">
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs text-rose-950 font-medium">
                  Setelah mendaftar, Anda akan <strong>langsung masuk ke Halaman Portal Relawan</strong> untuk melihat tugas pembersihan dari RT/RW (Fase PREVENT) serta membantu warga terdampak banjir (Fase RESPOND).
                </div>

                <div>
                  <label className="text-slate-800 font-bold block mb-1">Peran Relawan:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVolRole('Resident')}
                      className={`p-2.5 rounded-xl border-2 text-xs font-bold ${
                        volRole === 'Resident'
                          ? 'bg-blue-50 border-blue-600 text-blue-950'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      Relawan Warga Lingkungan
                    </button>
                    <button
                      type="button"
                      onClick={() => setVolRole('NGO')}
                      className={`p-2.5 rounded-xl border-2 text-xs font-bold ${
                        volRole === 'NGO'
                          ? 'bg-rose-50 border-rose-600 text-rose-950'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      Relawan Komunitas / NGO
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Nama Lengkap:</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Andi Saputra"
                      value={volName}
                      onChange={(e) => setVolName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-rose-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Nomor WhatsApp / HP (Untuk Login):</label>
                    <input
                      type="text"
                      required
                      placeholder="0857-xxxx-xxxx"
                      value={volPhone}
                      onChange={(e) => setVolPhone(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-rose-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {volRole === 'NGO' ? (
                    <div>
                      <label className="text-slate-800 font-bold block mb-1">Nama Komunitas / NGO:</label>
                      <input
                        type="text"
                        placeholder="Contoh: Karang Taruna / Tagana"
                        value={volOrg}
                        onChange={(e) => setVolOrg(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-rose-600"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-slate-800 font-bold block mb-1">Pilih Wilayah RT Terdekat:</label>
                      <select
                        value={selectedAreaId}
                        onChange={(e) => setSelectedAreaId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-rose-600"
                      >
                        {areas.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.kelurahan} ({a.rt_code} {a.rw_code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Buat PIN Login (4 Digit):</label>
                    <input
                      type="text"
                      required
                      value={volPin}
                      onChange={(e) => setVolPin(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-rose-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm transition-all cursor-pointer"
                  >
                    {loading ? "Menyimpan..." : "Daftar & Buka Halaman Relawan"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: DAFTAR RT BARU */}
            {activeTab === 'RT' && (
              <form onSubmit={handleRegisterRT} className="space-y-3 text-xs md:text-sm">
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-950 font-medium">
                  Pendaftaran untuk <strong>Ketua RT yang wilayahnya belum terdaftar</strong>. Sistem otomatis membuat titik wilayah dan token NEXA Bot Anda.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Nama Lengkap Ketua RT:</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Pak H. Suryono"
                      value={rtName}
                      onChange={(e) => setRtName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Nomor WhatsApp / HP:</label>
                    <input
                      type="text"
                      required
                      placeholder="0812-xxxx-xxxx"
                      value={rtPhone}
                      onChange={(e) => setRtPhone(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Nomor RT:</label>
                    <input
                      type="text"
                      required
                      placeholder="RT 06"
                      value={rtCode}
                      onChange={(e) => setRtCode(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Nomor RW:</label>
                    <input
                      type="text"
                      required
                      placeholder="RW 04"
                      value={rwCode}
                      onChange={(e) => setRwCode(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-800 font-bold block mb-1">PIN Login:</label>
                    <input
                      type="text"
                      required
                      value={rtPin}
                      onChange={(e) => setRtPin(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Kelurahan:</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Cipinang"
                      value={kelurahan}
                      onChange={(e) => setKelurahan(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Kecamatan:</label>
                    <input
                      type="text"
                      placeholder="Contoh: Pulogadung"
                      value={kecamatan}
                      onChange={(e) => setKecamatan(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Kota:</label>
                    <select
                      value={kota}
                      onChange={(e) => setKota(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="Jakarta Timur">Jakarta Timur</option>
                      <option value="Jakarta Selatan">Jakarta Selatan</option>
                      <option value="Jakarta Pusat">Jakarta Pusat</option>
                      <option value="Jakarta Barat">Jakarta Barat</option>
                      <option value="Jakarta Utara">Jakarta Utara</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-all cursor-pointer"
                  >
                    {loading ? "Mendaftarkan..." : "Daftarkan RT & Buka Komando"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
