import React from 'react';

export default function ImpactStatsBar({ metrics = {} }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
            <span>Ringkasan Data & Dampak Lingkungan</span>
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Rekap penanganan sumbatan saluran oleh RT dan bantuan pasca-bencana oleh Relawan/NGO.
          </p>
        </div>

        <span className="text-xs bg-blue-50 px-3 py-1 rounded-lg text-blue-800 border border-blue-200 font-bold">
          Wilayah Terpantau: {metrics.active_monitoring_areas || 6} Titik RT/RW
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-600 block mb-1">Saluran Dibersihkan:</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-700">
              {metrics.completed_mitigations ?? 0}
            </span>
            <span className="text-xs text-slate-700 font-bold">Titik</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">Pencegahan sebelum hujan</span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-600 block mb-1">Warga Terbantu:</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-blue-700">
              {(metrics.estimated_residents_protected ?? 0).toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-slate-700 font-bold">Warga</span>
          </div>
          <span className="text-[11px] text-blue-700 font-medium mt-1 block">Perlindungan lingkungan</span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-600 block mb-1">Total Laporan Masuk:</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-700">
              {metrics.total_reports ?? 0}
            </span>
            <span className="text-xs text-slate-700 font-bold">Laporan</span>
          </div>
          <span className="text-[11px] text-amber-800 font-medium mt-1 block">Terhubung ke RT & NGO</span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-600 block mb-1">Relawan & Warga Aktif:</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-700">
              {metrics.total_volunteers_mobilized ?? 0}
            </span>
            <span className="text-xs text-slate-700 font-bold">Orang</span>
          </div>
          <span className="text-[11px] text-indigo-700 font-medium mt-1 block">Gotong royong & evakuasi</span>
        </div>
      </div>
    </div>
  );
}
