import React from 'react';

export default function ImpactStatsBar({ metrics = {} }) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>Dampak Terukur Mitigasi Banjir Jakarta (NEXA Metrics)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Gotong royong berbasis komunitas yang diselesaikan sebelum tenggat hujan lebat BMKG tiba.
          </p>
        </div>

        <span className="text-[11px] bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300 font-medium">
          Wilayah Aktif: {metrics.active_monitoring_areas || 6} Kelurahan Rentan
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60">
          <span className="text-xs text-slate-400 block mb-1">Aksi Mitigasi Selesai:</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400">
              {metrics.completed_mitigations || 15}
            </span>
            <span className="text-xs text-slate-300 font-semibold">Titik Saluran</span>
          </div>
          <span className="text-[10px] text-emerald-300/80 mt-1 block">✓ 100% sebelum hujan tiba</span>
        </div>

        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60">
          <span className="text-xs text-slate-400 block mb-1">Warga Terlindungi:</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-sky-400">
              {(metrics.estimated_residents_protected || 4800).toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-slate-300 font-semibold">Jiwa</span>
          </div>
          <span className="text-[10px] text-sky-300/80 mt-1 block">Dari luapan air sekunder</span>
        </div>

        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60">
          <span className="text-xs text-slate-400 block mb-1">Pengerukan Sedimen:</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-400">
              {metrics.sediment_cleared_meters || 330}
            </span>
            <span className="text-xs text-slate-300 font-semibold">Meter Drainase</span>
          </div>
          <span className="text-[10px] text-amber-300/80 mt-1 block">Lumpur & sumbatan plastik</span>
        </div>

        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60">
          <span className="text-xs text-slate-400 block mb-1">Relawan Dikerahkan:</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-400">
              {metrics.total_volunteers_mobilized || 93}
            </span>
            <span className="text-xs text-slate-300 font-semibold">Relawan RT & NGO</span>
          </div>
          <span className="text-[10px] text-indigo-300/80 mt-1 block">Kesiapsiagaan warga tangguh</span>
        </div>
      </div>
    </div>
  );
}
