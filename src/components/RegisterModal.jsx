import React, { useState } from 'react';
import { UserPlus, Shield, HeartHandshake, X, CheckCircle2 } from 'lucide-react';

export default function RegisterModal({ isOpen, onClose, areas = [], onRegistered }) {
  const [activeTab, setActiveTab] = useState('RT'); // 'RT' | 'VOLUNTEER'
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // RT Form
  const [rtName, setRtName] = useState('');
  const [rtPhone, setRtPhone] = useState('');
  const [kelurahan, setKelurahan] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [kota, setKota] = useState('Jakarta Timur');
  const [rwCode, setRwCode] = useState('');
  const [rtCode, setRtCode] = useState('');

  // Volunteer Form
  const [volName, setVolName] = useState('');
  const [volPhone, setVolPhone] = useState('');
  const [volRole, setVolRole] = useState('Resident'); // 'Resident' | 'NGO'
  const [volOrg, setVolOrg] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState(areas[0]?.id || '');

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
          title: `Ketua ${data.area.rt_code} ${data.area.rw_code} ${data.area.kelurahan} Berhasil Terdaftar!`,
          token: data.user.telegram_subscribe_token,
          message: "Wilayah Anda kini aktif di peta NEXA SiagaRT dan siap menerima laporan warga serta membuat tugas gotong royong."
        });
        if (onRegistered) onRegistered(data.user);
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
          role: volRole,
          organization_name: volOrg,
          rt_rw_id: selectedAreaId
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessData({
          type: 'VOLUNTEER',
          title: `Selamat Bergabung, ${data.user.full_name}!`,
          token: null,
          message: volRole === 'NGO'
            ? "Akun NGO / Tim Rescue Anda aktif untuk mengakses dasbor prioritas evakuasi banjir (Phase 2)."
            : "Anda terdaftar sebagai Relawan Warga Siaga RT untuk gotong royong mitigasi sebelum hujan tiba."
        });
        if (onRegistered) onRegistered(data.user);
      } else {
        alert(data.error || "Gagal mendaftar.");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 text-slate-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Pendaftaran NEXA SiagaRT</h3>
              <p className="text-xs text-slate-400">Bergabung dalam jaringan siaga banjir berbasis komunitas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {successData ? (
          /* Success Screen */
          <div className="py-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white">{successData.title}</h4>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">{successData.message}</p>

            {successData.token && (
              <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-sky-500/30 text-xs text-left space-y-1">
                <span className="text-slate-400 block text-[11px]">Token Deep-Link Telegram RT Anda:</span>
                <span className="font-mono font-bold text-sky-300 text-sm block">{successData.token}</span>
                <p className="text-[10px] text-slate-400 mt-1">
                  Buka tab Ketua RT dan klik <strong>Hubungkan ke Telegram</strong> untuk mengaktifkan notifikasi otomatis ke HP Anda.
                </p>
              </div>
            )}

            <button
              onClick={() => {
                setSuccessData(null);
                onClose();
              }}
              className="mt-4 px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition-all"
            >
              Selesai & Mulai Gunakan
            </button>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {/* Tab Selection */}
            <div className="grid grid-cols-2 gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('RT')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'RT'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Daftar Ketua RT Baru</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('VOLUNTEER')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'VOLUNTEER'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Daftar Relawan / NGO</span>
              </button>
            </div>

            {/* TAB 1: DAFTAR RT BARU */}
            {activeTab === 'RT' && (
              <form onSubmit={handleRegisterRT} className="space-y-3 text-xs">
                <div className="bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/30 text-[11px] text-emerald-300 flex items-start gap-2">
                  <Shield className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>
                    Fitur ini untuk <strong>Ketua RT yang wilayahnya belum terdaftar</strong> di peta NEXA SiagaRT. Setelah didaftarkan, sistem otomatis membuat batas wilayah dan token bot Telegram Anda.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Nama Lengkap Ketua RT:</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Pak H. Suryono"
                      value={rtName}
                      onChange={(e) => setRtName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Nomor WhatsApp / HP:</label>
                    <input
                      type="text"
                      required
                      placeholder="0812-xxxx-xxxx"
                      value={rtPhone}
                      onChange={(e) => setRtPhone(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Nomor RT:</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: RT 06 atau 06"
                      value={rtCode}
                      onChange={(e) => setRtCode(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Nomor RW:</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: RW 04 atau 04"
                      value={rwCode}
                      onChange={(e) => setRwCode(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Kelurahan:</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Cipinang"
                      value={kelurahan}
                      onChange={(e) => setKelurahan(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Kecamatan:</label>
                    <input
                      type="text"
                      placeholder="Contoh: Pulogadung"
                      value={kecamatan}
                      onChange={(e) => setKecamatan(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Kota Administrasi:</label>
                    <select
                      value={kota}
                      onChange={(e) => setKota(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Jakarta Timur">Jakarta Timur</option>
                      <option value="Jakarta Selatan">Jakarta Selatan</option>
                      <option value="Jakarta Pusat">Jakarta Pusat</option>
                      <option value="Jakarta Barat">Jakarta Barat</option>
                      <option value="Jakarta Utara">Jakarta Utara</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    {loading ? "Mendaftarkan..." : "Daftarkan RT & Buat Token Telegram"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: DAFTAR WARGA BIASA / NGO */}
            {activeTab === 'VOLUNTEER' && (
              <form onSubmit={handleRegisterVolunteer} className="space-y-3 text-xs">
                <div className="bg-rose-950/30 p-2.5 rounded-xl border border-rose-500/30 text-[11px] text-rose-300 flex items-start gap-2">
                  <HeartHandshake className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>
                    Terbuka untuk <strong>Warga Biasa, Mahasiswa, Karang Taruna, dan Organisasi Relawan (PMI, Tagana, SAR)</strong> yang siap membantu saat siaga gotong royong maupun evakuasi banjir.
                  </span>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Tipe Pendaftar:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVolRole('Resident')}
                      className={`p-2 rounded-xl border text-xs font-semibold ${
                        volRole === 'Resident'
                          ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      Warga Lingkungan (Gotong Royong)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVolRole('NGO')}
                      className={`p-2 rounded-xl border text-xs font-semibold ${
                        volRole === 'NGO'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      Organisasi / NGO (Tim Rescue)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Nama Lengkap:</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama Anda atau Koordinator"
                      value={volName}
                      onChange={(e) => setVolName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Nomor WhatsApp / HP:</label>
                    <input
                      type="text"
                      required
                      placeholder="0857-xxxx-xxxx"
                      value={volPhone}
                      onChange={(e) => setVolPhone(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {volRole === 'NGO' ? (
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Nama Organisasi / Komunitas:</label>
                    <input
                      type="text"
                      placeholder="Contoh: Tagana Rawajati / KSR PMI Unit 04"
                      value={volOrg}
                      onChange={(e) => setVolOrg(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Pilih Wilayah RT Domisili:</label>
                    <select
                      value={selectedAreaId}
                      onChange={(e) => setSelectedAreaId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-rose-500"
                    >
                      {areas.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.kelurahan} ({a.rt_code} {a.rw_code}) - {a.kecamatan}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all"
                  >
                    {loading ? "Menyimpan..." : "Daftar Jadi Relawan"}
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
