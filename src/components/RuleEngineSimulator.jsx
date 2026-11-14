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

  // Find evaluated result for selected area
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Rule-Engine: "Possible Flood" Trigger (Section 6)</h2>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-semibold border border-purple-500/30">
                  Responsible AI (Hard-Coded)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Keputusan bahaya banjir <strong>TIDAK</strong> diserahkan ke AI black-box, melainkan dieksekusi oleh Rule-Engine jika minimal <strong>2 dari 3 kondisi</strong> terpenuhi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Pilih Wilayah Uji:</label>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
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
      <div className={`p-6 rounded-2xl border transition-all ${
        isTriggered 
          ? 'bg-rose-950/30 border-rose-500/60 shadow-2xl shadow-rose-950/30' 
          : 'bg-slate-900 border-slate-700 shadow-xl'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Status Trigger Wilayah:</span>
              <strong className="text-white text-base">{areaEvaluation?.kelurahan} ({areaEvaluation?.rt_code} {areaEvaluation?.rw_code})</strong>
            </div>
            <p className="text-xs text-slate-300 mt-1">{areaEvaluation?.notification_message}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Kondisi Terpenuhi:</span>
              <span className={`text-xl font-black ${
                isTriggered ? 'text-rose-400' : 'text-slate-300'
              }`}>
                {trueCount} / 3 Kondisi
              </span>
            </div>

            <div className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg ${
              isTriggered 
                ? 'bg-rose-600 text-white shadow-rose-600/30 animate-pulse' 
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              {isTriggered ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
              <span>{isTriggered ? 'TRIGGER AKTIF (KIRIM NOTIFIKASI RT)' : 'STATUS NORMAL'}</span>
            </div>
          </div>
        </div>

        {/* The 3 Conditions Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          
          {/* Condition 1: BPBD Pos Pantau */}
          <div className={`p-4 rounded-xl border transition-all ${
            cond1?.satisfied 
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-200' 
              : 'bg-slate-800/40 border-slate-700 text-slate-400'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Kondisi 1: BPBD</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                cond1?.satisfied ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-400'
              }`}>
                {cond1?.satisfied ? 'TRUE' : 'FALSE'}
              </span>
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Pos Pantau Siaga 3, 2, atau 1</h4>
            <p className="text-xs leading-relaxed mb-3">{cond1?.explanation}</p>
            
            <div className="pt-2 border-t border-slate-700/60 flex gap-2">
              <button
                disabled={isSimulating}
                onClick={() => handleToggleBpbd(true)}
                className="flex-1 py-1 px-2 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 font-semibold text-[11px] border border-amber-500/30"
              >
                Set Siaga 2 (Kritis)
              </button>
              <button
                disabled={isSimulating}
                onClick={() => handleToggleBpbd(false)}
                className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] border border-slate-700"
              >
                Set Normal
              </button>
            </div>
          </div>

          {/* Condition 2: BMKG CAP API */}
          <div className={`p-4 rounded-xl border transition-all ${
            cond2?.satisfied 
              ? 'bg-sky-950/40 border-sky-500/50 text-sky-200' 
              : 'bg-slate-800/40 border-slate-700 text-slate-400'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Kondisi 2: BMKG CAP</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                cond2?.satisfied ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-700 text-slate-400'
              }`}>
                {cond2?.satisfied ? 'TRUE' : 'FALSE'}
              </span>
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Heavy-Rain Warning di Kecamatan</h4>
            <p className="text-xs leading-relaxed mb-3">{cond2?.explanation}</p>
            
            <div className="pt-2 border-t border-slate-700/60 flex gap-2">
              <button
                disabled={isSimulating}
                onClick={() => handleToggleBmkg(true)}
                className="flex-1 py-1 px-2 rounded bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 font-semibold text-[11px] border border-sky-500/30"
              >
                Set Warning Aktif
              </button>
              <button
                disabled={isSimulating}
                onClick={() => handleToggleBmkg(false)}
                className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] border border-slate-700"
              >
                Matikan Warning
              </button>
            </div>
          </div>

          {/* Condition 3: Internal Verified Reports */}
          <div className={`p-4 rounded-xl border transition-all ${
            cond3?.satisfied 
              ? 'bg-rose-950/40 border-rose-500/50 text-rose-200' 
              : 'bg-slate-800/40 border-slate-700 text-slate-400'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Kondisi 3: Internal</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                cond3?.satisfied ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-700 text-slate-400'
              }`}>
                {cond3?.satisfied ? 'TRUE' : 'FALSE'}
              </span>
            </div>
            <h4 className="text-sm font-bold text-white mb-1">&ge; 3 Laporan Banjir Verified (2 Jam)</h4>
            <p className="text-xs leading-relaxed mb-3">{cond3?.explanation}</p>
            
            <div className="pt-2 border-t border-slate-700/60">
              <button
                disabled={isSimulating}
                onClick={handleInjectReports}
                className="w-full py-1 px-2 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 font-semibold text-[11px] border border-rose-500/30"
              >
                + Suntik 3 Laporan Verified Simulasi
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* BPBD Pos Pantau Live Board */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-white text-base">Status Pintu Air & Pos Pantau BPBD DKI Jakarta</h3>
          </div>
          <span className="text-xs text-slate-400">Update Real-Time Tiap 15 Menit</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {bpbdPosts.map(post => {
            const isSiaga = post.siaga_level <= 3;
            return (
              <div 
                key={post.id}
                className={`p-3 rounded-xl border ${
                  isSiaga ? 'bg-amber-950/30 border-amber-500/40' : 'bg-slate-800/40 border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <strong className="text-white font-bold block">{post.name}</strong>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    post.siaga_level === 1 ? 'bg-rose-600 text-white' :
                    post.siaga_level === 2 ? 'bg-orange-600 text-white' :
                    post.siaga_level === 3 ? 'bg-amber-500 text-slate-950 font-extrabold' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {post.status}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-slate-400 text-[11px]">Tinggi Muka Air (TMA):</span>
                  <span className="text-base font-extrabold text-white">{post.water_level_cm} cm</span>
                </div>

                <p className="text-[10px] text-slate-400 mt-1 truncate">
                  Aliran: {post.flow_destination}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* BMKG Weather Forecast Intervals */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-white text-base">Prakiraan Cuaca Per 3 Jam (BMKG API)</h3>
          </div>
          <span className="text-xs text-slate-400">{bmkgForecast.station || "Kemayoran"}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {bmkgForecast.intervals?.map((slot, idx) => (
            <div key={idx} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-semibold text-sky-300">{slot.time_slot}</span>
                <span className="text-white font-bold">{slot.temperature}</span>
              </div>
              <h4 className="text-sm font-bold text-white">{slot.weather}</h4>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/60">
                <span>Peluang Hujan: <strong className="text-amber-300">{slot.rain_probability}</strong></span>
                <span>Kecepatan Angin: {slot.wind_speed}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
