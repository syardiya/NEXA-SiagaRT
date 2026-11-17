import React, { useState } from 'react';
import { 
  Cpu, AlertTriangle, CheckCircle, Gauge, CloudRain
} from 'lucide-react';

export default function RuleEngineSimulator({ 
  ruleStatus, 
  bpbdPosts = [], 
  bmkgForecast = {}, 
  onSimulate, 
  onRefresh 
}) {
  const [selectedAreaId, setSelectedAreaId] = useState('area-km-04-02');
  const [isSimulating, setIsSimulating] = useState(false);

  const areaEvaluation = ruleStatus?.areas?.find(a => a.area_id === selectedAreaId) || ruleStatus?.areas?.[0];

  const handleToggleBpbd = async (val) => {
    setIsSimulating(true);
    await onSimulate({ toggle_bpbd_siaga: val, area_id: selectedAreaId });
    setIsSimulating(false);
  };

  const handleToggleBmkg = async (val) => {
    setIsSimulating(true);
    await onSimulate({ toggle_bmkg_warning: val, area_id: selectedAreaId });
    setIsSimulating(false);
  };

  const handleInjectReports = async () => {
    setIsSimulating(true);
    await onSimulate({ inject_verified_reports: true, area_id: selectedAreaId });
    setIsSimulating(false);
  };

  const cond1 = areaEvaluation?.conditions?.condition_1_bpbd;
  const cond2 = areaEvaluation?.conditions?.condition_2_bmkg;
  const cond3 = areaEvaluation?.conditions?.condition_3_internal;
  const trueCount = areaEvaluation?.true_conditions_count ?? 0;
  const isTriggered = areaEvaluation?.is_triggered ?? false;

  return (
    <div className="space-y-6 text-slate-900">
      {/* Top Banner */}
      <div className="bg-white border-2 border-purple-400/40 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-purple-100 text-purple-800 border border-purple-300">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-extrabold text-slate-900">
                  Sistem Peringatan Banjir 2-dari-3 (Rule Engine)
                </h2>
                <span className="text-xs bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-md font-bold border border-purple-300">
                  Responsible AI
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-600 mt-1">
                Keputusan bahaya banjir ditetapkan secara terukur apabila minimal <strong>2 dari 3 indikator</strong> (BPBD, BMKG, Laporan Warga) terpenuhi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700">Wilayah Pantauan:</label>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
            >
              {ruleStatus?.areas?.map(a => (
                <option key={a.area_id} value={a.area_id}>
                  {a.kelurahan} ({a.rt_code} {a.rw_code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2-of-3 Condition Visualizer Card */}
      <div className={`p-6 rounded-2xl border-2 transition-all bg-white shadow-sm ${
        isTriggered ? 'border-red-500' : 'border-slate-200'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-extrabold text-slate-600">Status Wilayah:</span>
              <strong className="text-slate-900 text-base">{areaEvaluation?.kelurahan} ({areaEvaluation?.rt_code} {areaEvaluation?.rw_code})</strong>
            </div>
            <p className="text-xs md:text-sm text-slate-700 mt-1 font-medium">{areaEvaluation?.notification_message}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-slate-600 block">Indikator Aktif:</span>
              <span className={`text-xl font-black ${
                isTriggered ? 'text-red-600' : 'text-slate-800'
              }`}>
                {trueCount} / 3 Kondisi
              </span>
            </div>

            <div className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 border ${
              isTriggered 
                ? 'bg-red-600 text-white border-red-700' 
                : 'bg-emerald-50 text-emerald-900 border-emerald-300'
            }`}>
              {isTriggered ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-600" />}
              <span>{isTriggered ? 'SIAGA BANJIR AKTIF' : 'KONDISI AMAN'}</span>
            </div>
          </div>
        </div>

        {/* The 3 Conditions Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          
          {/* Condition 1: BPBD Pos Pantau */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            cond1?.satisfied 
              ? 'bg-amber-50 border-amber-400 text-slate-900' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Indikator 1: BPBD</span>
              <span className={`px-2 py-0.5 rounded text-xs font-extrabold ${
                cond1?.satisfied ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {cond1?.satisfied ? 'TERPENUHI' : 'NORMAL'}
              </span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 mb-1">Pintu Air Siaga 3, 2, atau 1</h4>
            <p className="text-xs leading-relaxed mb-3">{cond1?.explanation}</p>
            
            <div className="pt-2 border-t border-slate-200 flex gap-2">
              <button
                disabled={isSimulating}
                onClick={() => handleToggleBpbd(true)}
                className="flex-1 py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
              >
                Uji Siaga 2
              </button>
              <button
                disabled={isSimulating}
                onClick={() => handleToggleBpbd(false)}
                className="flex-1 py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300"
              >
                Reset Normal
              </button>
            </div>
          </div>

          {/* Condition 2: BMKG CAP API */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            cond2?.satisfied 
              ? 'bg-blue-50 border-blue-400 text-slate-900' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Indikator 2: BMKG</span>
              <span className={`px-2 py-0.5 rounded text-xs font-extrabold ${
                cond2?.satisfied ? 'bg-blue-200 text-blue-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {cond2?.satisfied ? 'TERPENUHI' : 'NORMAL'}
              </span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 mb-1">Peringatan Hujan Ekstrem</h4>
            <p className="text-xs leading-relaxed mb-3">{cond2?.explanation}</p>
            
            <div className="pt-2 border-t border-slate-200 flex gap-2">
              <button
                disabled={isSimulating}
                onClick={() => handleToggleBmkg(true)}
                className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                Aktifkan Warning
              </button>
              <button
                disabled={isSimulating}
                onClick={() => handleToggleBmkg(false)}
                className="flex-1 py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300"
              >
                Matikan
              </button>
            </div>
          </div>

          {/* Condition 3: Internal Verified Reports */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            cond3?.satisfied 
              ? 'bg-red-50 border-red-400 text-slate-900' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Indikator 3: Warga</span>
              <span className={`px-2 py-0.5 rounded text-xs font-extrabold ${
                cond3?.satisfied ? 'bg-red-200 text-red-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {cond3?.satisfied ? 'TERPENUHI' : 'NORMAL'}
              </span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 mb-1">&ge; 3 Laporan Banjir Terverifikasi</h4>
            <p className="text-xs leading-relaxed mb-3">{cond3?.explanation}</p>
            
            <div className="pt-2 border-t border-slate-200">
              <button
                disabled={isSimulating}
                onClick={handleInjectReports}
                className="w-full py-1.5 px-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                + Tambah 3 Laporan Simulasi
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* BPBD Pos Pantau Live Board */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-slate-900 text-base">Pantauan Tinggi Muka Air (Pintu Air BPBD DKI)</h3>
          </div>
          <span className="text-xs font-semibold text-slate-600">Data Real-Time</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {bpbdPosts.map(post => {
            const isSiaga = post.siaga_level <= 3;
            return (
              <div 
                key={post.id}
                className={`p-3.5 rounded-xl border ${
                  isSiaga ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-slate-900 font-extrabold block">{post.name}</strong>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold shrink-0 ${
                    post.siaga_level === 1 ? 'bg-red-600 text-white' :
                    post.siaga_level === 2 ? 'bg-orange-600 text-white' :
                    post.siaga_level === 3 ? 'bg-amber-200 text-amber-950' :
                    'bg-emerald-100 text-emerald-900'
                  }`}>
                    {post.status}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-slate-600 font-semibold">Tinggi Air:</span>
                  <span className="text-base font-black text-slate-900">{post.water_level_cm} cm</span>
                </div>

                <p className="text-xs text-slate-600 mt-1 truncate">
                  Aliran: {post.flow_destination}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* BMKG Weather Forecast Intervals */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-slate-900 text-base">Prakiraan Cuaca BMKG Per 3 Jam</h3>
          </div>
          <span className="text-xs font-semibold text-slate-600">{bmkgForecast.station || "Kemayoran"}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {bmkgForecast.intervals?.map((slot, idx) => (
            <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-800">{slot.time_slot}</span>
                <span className="text-slate-900 font-extrabold text-sm">{slot.temperature}</span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">{slot.weather}</h4>
              <div className="flex items-center justify-between text-xs text-slate-700 pt-1 border-t border-slate-200">
                <span>Peluang Hujan: <strong className="text-amber-800">{slot.rain_probability}</strong></span>
                <span>Angin: {slot.wind_speed}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
