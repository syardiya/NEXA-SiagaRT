import React, { useState } from 'react';
import { 
  Users, HeartHandshake, Anchor, Ambulance, 
  ShieldCheck, CheckCircle2, Droplets, Baby, Plus
} from 'lucide-react';

export default function NgoDashboard({ 
  evacuations = [], 
  areas = [], 
  onHandleEvacuation, 
  onCreateEvacuation 
}) {
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedEvac, setSelectedEvac] = useState(null);
  const [dispatchNotes, setDispatchNotes] = useState('Dikerahkan 2 Perahu Karet Motorik & 6 Personel SAR ke Posko RT.');
  
  // New Evac Form State
  const [selectedAreaId, setSelectedAreaId] = useState(areas[0]?.id || 'area-km-04-02');
  const [waterDepth, setWaterDepth] = useState(75);
  const [hasVulnerable, setHasVulnerable] = useState(true);
  const [vulnerableDetails, setVulnerableDetails] = useState('2 Lansia dan 1 Bayi butuh perahu karet evakuasi');
  const [isNight, setIsNight] = useState(false);

  const handleConfirmDispatch = (e) => {
    e.preventDefault();
    if (!selectedEvac) return;
    onHandleEvacuation({
      id: selectedEvac.id,
      handled_by_ngo_id: 'user-ngo-tagana',
      dispatch_notes: dispatchNotes
    });
    setSelectedEvac(null);
  };

  const handleCreateNewEvac = (e) => {
    e.preventDefault();
    onCreateEvacuation({
      rt_rw_id: selectedAreaId,
      water_depth_cm: waterDepth,
      has_vulnerable_people: hasVulnerable,
      vulnerable_details: vulnerableDetails,
      is_night: isNight
    });
    setShowNewModal(false);
  };

  const pendingEvacs = evacuations.filter(e => e.status !== 'Dispatched');
  const dispatchedEvacs = evacuations.filter(e => e.status === 'Dispatched');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-indigo-950/80 border border-rose-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Dasbor Koordinasi Relawan & NGO (Phase 2)</h2>
                <span className="text-xs bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-semibold border border-rose-500/30">
                  Prioritas Evakuasi Banjir
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Restricted View (UU PDP): Menampilkan prioritas agregat per RT tanpa membocorkan identitas pribadi warga.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Input Situasi Evakuasi Baru</span>
          </button>
        </div>
      </div>

      {/* Main Evacuation Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Priority Queue Sorted by Transparent Formula */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Anchor className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-white text-base">Antrean Prioritas Evakuasi Berdasarkan Skor</h3>
            </div>
            <span className="text-xs text-slate-400">Formula Logika Transparan</span>
          </div>

          <div className="space-y-4">
            {evacuations.map(evac => {
              const isDispatched = evac.status === 'Dispatched';
              const isCritical = evac.priority_score >= 80;

              return (
                <div 
                  key={evac.id}
                  className={`bg-slate-900 border rounded-2xl p-5 shadow-xl transition-all ${
                    isCritical 
                      ? 'border-rose-500/60 shadow-rose-950/20' 
                      : 'border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                          isCritical 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          Skor Prioritas: {evac.priority_score} / 100
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          {evac.priority_level}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white">
                        {evac.kelurahan} ({evac.rt_code} {evac.rw_code})
                      </h4>
                    </div>

                    {isDispatched ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Relawan Ditugaskan ({evac.handled_by_name})
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedEvac(evac)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all"
                      >
                        <HeartHandshake className="w-4 h-4" />
                        <span>Tangani & Kerahkan Armada</span>
                      </button>
                    )}
                  </div>

                  {/* Conditions Breakdown: Depth & Vulnerable Group */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                        <Droplets className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Kedalaman Air Saat Ini:</span>
                        <span className="text-base font-extrabold text-white">{evac.water_depth_cm} cm</span>
                        <span className="text-[10px] text-slate-400 block">
                          ({Math.round(evac.water_depth_cm * 0.45)} poin formula dasar)
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        evac.has_vulnerable_people ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        <Baby className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Kelompok Rentan:</span>
                        <span className="font-bold text-white block">
                          {evac.has_vulnerable_people ? 'ADA (Lansia / Balita)' : 'Tidak Ada'}
                        </span>
                        <span className="text-[10px] text-rose-300">
                          {evac.has_vulnerable_people ? '+40 poin bobot prioritas evakuasi' : '+0 poin'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Details & Dispatched notes */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300">
                    <div className="flex items-center gap-2 mb-1">
                      <strong className="text-white">Situasi Lapangan:</strong>
                      <span>{evac.vulnerable_details}</span>
                    </div>
                    {isDispatched && evac.dispatch_notes && (
                      <div className="mt-2 pt-2 border-t border-slate-700 text-emerald-300">
                        <strong>Catatan Dispatch NGO:</strong> {evac.dispatch_notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: NGO Assets & Guidelines */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Ambulance className="w-4 h-4 text-rose-400" />
              <span>Status Kesiapan Armada NGO</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
                <div>
                  <strong className="text-white block">Perahu Karet Motorik (SAR)</strong>
                  <span className="text-slate-400 text-[11px]">Posko Kalibata & Jatinegara</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  8 Unit Siap
                </span>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
                <div>
                  <strong className="text-white block">Ambulans Gawat Darurat (PMI)</strong>
                  <span className="text-slate-400 text-[11px]">Siaga Medik & Tabung Oksigen</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  3 Armada
                </span>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
                <div>
                  <strong className="text-white block">Relawan Terlatih Evakuasi Air</strong>
                  <span className="text-slate-400 text-[11px]">Tagana DKI & TRC Gabungan</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
                  28 Personel
                </span>
              </div>
            </div>

            {/* PDP Notice */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-400 leading-relaxed">
              <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Kepatuhan UU PDP No 27/2022</span>
              </div>
              NGO menerima lokasi agregat dan berkoordinasi langsung dengan Ketua RT di titik kumpul posko terpadu untuk melindungi privasi keluarga pelapor.
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch Confirmation Modal */}
      {selectedEvac && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-base">Konfirmasi Kerahkan Bantuan Relawan</h3>
              </div>
              <button onClick={() => setSelectedEvac(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Target Wilayah Evakuasi:</span>
                <p className="font-bold text-white text-sm bg-slate-800 p-2 rounded-lg">
                  {selectedEvac.kelurahan} ({selectedEvac.rt_code} {selectedEvac.rw_code}) - Kedalaman {selectedEvac.water_depth_cm} cm
                </p>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Rincian Armada & Catatan Dispatch:</label>
                <textarea
                  rows={3}
                  required
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-sans leading-relaxed text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedEvac(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 font-bold text-white shadow-lg shadow-rose-600/25"
                >
                  Kerahkan Bantuan Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Input New Emergency Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Anchor className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-base">Input Situasi Banjir Darurat</h3>
              </div>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateNewEvac} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Wilayah RT / RW:</label>
                <select
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                >
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.kelurahan} ({a.rt_code} {a.rw_code}) - {a.kecamatan}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Kedalaman Air (cm):</label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={waterDepth}
                  onChange={(e) => setWaterDepth(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-bold text-amber-300"
                />
              </div>

              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-200 font-semibold">
                  <input
                    type="checkbox"
                    checked={hasVulnerable}
                    onChange={(e) => setHasVulnerable(e.target.checked)}
                    className="rounded text-rose-500 focus:ring-0"
                  />
                  <span>Terdapat Warga Rentan (Lansia / Balita / Sakit)</span>
                </label>
                {hasVulnerable && (
                  <input
                    type="text"
                    value={vulnerableDetails}
                    onChange={(e) => setVulnerableDetails(e.target.value)}
                    placeholder="Contoh: 1 lansia stroke butuh tandu, 2 balita"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 font-bold text-white shadow-lg shadow-rose-600/25"
                >
                  Hitung Skor & Tambahkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
