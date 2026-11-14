import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ShieldCheck, Filter, Layers } from 'lucide-react';

export default function PublicMap({ areas = [], reports = [], currentRole = 'PUBLIC', onSelectArea, onSelectReport }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const polygonsLayerRef = useRef(null);

  const [filterType, setFilterType] = useState('ALL');
  const [selectedItem, setSelectedItem] = useState(null);

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Centered around Jakarta Timur / Selatan (Ciliwung basin: Kampung Melayu, Bidara Cina, Tebet)
    const map = L.map(mapContainerRef.current, {
      center: [-6.2300, 106.8650],
      zoom: 13,
      zoomControl: true,
    });

    // OpenStreetMap standard tile layer (100% Free, No API key required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    polygonsLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Layers when areas, reports, or filter changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !polygonsLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    polygonsLayerRef.current.clearLayers();

    const isPublic = currentRole === 'PUBLIC' || currentRole === 'NGO';

    // 1. Render RT/RW Areas Boundaries
    areas.forEach(area => {
      if (area.geom_polygon && area.geom_polygon.length > 0) {
        const polygon = L.polygon(area.geom_polygon, {
          color: '#0284c7',
          weight: 2,
          opacity: 0.8,
          fillColor: '#38bdf8',
          fillOpacity: 0.12,
          dashArray: '4, 4'
        }).addTo(polygonsLayerRef.current);

        polygon.bindTooltip(
          `<strong>${area.kelurahan}</strong><br/>${area.rt_code} ${area.rw_code}<br/><span style="font-size:11px;color:#0284c7;">Pusat Wilayah RT Agregat</span>`,
          { sticky: true }
        );
      }
    });

    // 2. Render Markers
    if (isPublic) {
      // Sesuai UU PDP: Render ONLY RT Aggregated Center points
      areas.forEach(area => {
        const areaReports = reports.filter(r => r.rt_rw_id === area.id);
        const filtered = filterType === 'ALL' 
          ? areaReports 
          : areaReports.filter(r => r.hazard_type === filterType);

        if (filtered.length === 0 && filterType !== 'ALL') return;

        const count = filtered.length;
        const hasFlood = filtered.some(r => r.hazard_type === 'Flood');
        const hasClogged = filtered.some(r => r.hazard_type === 'Clogged_Drain');

        let bgColor = '#0284c7';
        if (hasFlood) bgColor = '#ef4444';
        else if (hasClogged) bgColor = '#f59e0b';

        // Custom HTML marker badge
        const icon = L.divIcon({
          className: 'custom-rt-marker',
          html: `
            <div style="
              background: ${bgColor};
              color: white;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 13px;
              border: 3px solid rgba(255,255,255,0.9);
              box-shadow: 0 4px 14px rgba(0,0,0,0.4);
              cursor: pointer;
            ">
              ${count > 0 ? count : 'RT'}
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([area.geom_center.lat, area.geom_center.lng], { icon })
          .addTo(markersLayerRef.current);

        marker.on('click', () => {
          setSelectedItem({
            type: 'AREA_AGGREGATE',
            area,
            reports: filtered
          });
          if (onSelectArea) onSelectArea(area);
        });
      });
    } else {
      // VERIFIED RT LEADER VIEW: Exact GPS locations visible
      reports.forEach(report => {
        if (filterType !== 'ALL' && report.hazard_type !== filterType) return;

        const loc = report.exact_location || { lat: -6.2285, lng: 106.8650 };
        let iconColor = '#0284c7';
        let symbol = '💧';

        if (report.hazard_type === 'Clogged_Drain') {
          iconColor = '#f59e0b';
          symbol = '🚧';
        } else if (report.hazard_type === 'Trash') {
          iconColor = '#8b5cf6';
          symbol = '🗑️';
        } else if (report.hazard_type === 'Flood') {
          iconColor = '#ef4444';
          symbol = '🌊';
        }

        const icon = L.divIcon({
          className: 'verified-exact-marker',
          html: `
            <div style="
              background: ${iconColor};
              color: white;
              padding: 4px 8px;
              border-radius: 9999px;
              font-weight: 700;
              font-size: 11px;
              display: flex;
              align-items: center;
              gap: 4px;
              border: 2px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.35);
              white-space: nowrap;
            ">
              <span>${symbol}</span>
              <span>${report.hazard_type_label || report.hazard_type}</span>
            </div>
          `,
          iconSize: [120, 30],
          iconAnchor: [60, 15]
        });

        const marker = L.marker([loc.lat, loc.lng], { icon })
          .addTo(markersLayerRef.current);

        marker.on('click', () => {
          setSelectedItem({
            type: 'REPORT_EXACT',
            report
          });
          if (onSelectReport) onSelectReport(report);
        });
      });
    }
  }, [areas, reports, currentRole, filterType]);

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-900">
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Overlay: PDP Privacy Badge & Filters */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        {currentRole === 'PUBLIC' || currentRole === 'NGO' ? (
          <div className="bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-sky-500/30 text-xs shadow-lg flex items-center gap-2 text-sky-200">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <span className="font-bold text-white">Peta Agregat Publik (UU PDP Aktif):</span>{' '}
              <span className="text-slate-300">Hanya menampilkan pusat agregat RT. Titik koordinat rumah disamarkan.</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/40 text-xs shadow-lg flex items-center gap-2 text-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-white">Mode Terverifikasi (Ketua RT):</span>{' '}
              <span className="text-emerald-300">Menampilkan titik lokasi presisi & alamat pelapor untuk aksi gotong royong.</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Chips Overlay */}
      <div className="absolute top-4 right-4 z-10 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg flex items-center gap-1 text-xs">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            filterType === 'ALL' ? 'bg-sky-500 text-white shadow' : 'text-slate-300 hover:text-white'
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setFilterType('Clogged_Drain')}
          className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-all ${
            filterType === 'Clogged_Drain' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          Saluran
        </button>
        <button
          onClick={() => setFilterType('Trash')}
          className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-all ${
            filterType === 'Trash' ? 'bg-purple-600 text-white shadow' : 'text-slate-300 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-300"></span>
          Sampah
        </button>
        <button
          onClick={() => setFilterType('Flood')}
          className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-all ${
            filterType === 'Flood' ? 'bg-rose-600 text-white shadow' : 'text-slate-300 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-300"></span>
          Genangan
        </button>
      </div>

      {/* Bottom Floating Legend / Selected Item Card */}
      {selectedItem && (
        <div className="absolute bottom-4 left-4 right-4 z-10 bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-sky-500/40 shadow-2xl animate-fade-in max-w-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {selectedItem.type === 'AREA_AGGREGATE' ? 'Data Agregat Wilayah' : 'Detail Laporan Presisi'}
                </span>
                <span className="text-xs text-slate-400">
                  {selectedItem.type === 'AREA_AGGREGATE' ? selectedItem.area.kota : selectedItem.report.kelurahan}
                </span>
              </div>

              <h4 className="text-base font-bold text-white mt-1">
                {selectedItem.type === 'AREA_AGGREGATE'
                  ? `${selectedItem.area.kelurahan} (${selectedItem.area.rt_code} ${selectedItem.area.rw_code})`
                  : selectedItem.report.hazard_type_label}
              </h4>
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
            >
              ✕ Tutup
            </button>
          </div>

          {selectedItem.type === 'AREA_AGGREGATE' ? (
            <div className="mt-3 text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center justify-between bg-slate-800/60 p-2 rounded-lg">
                <span>Total Laporan di RT Ini:</span>
                <strong className="text-sky-300 text-sm">{selectedItem.reports.length} laporan</strong>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Pos Pantau Terkait:</span>
                <span className="text-slate-200">{selectedItem.area.monitoring_post}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Karakteristik Resapan:</span>
                <span className="text-amber-300">{selectedItem.area.water_retention_capacity}</span>
              </div>
              <p className="text-[11px] text-slate-400 italic mt-2 border-t border-slate-800 pt-2">
                🔒 Sesuai UU PDP: Warga hanya dapat melihat statistik lingkungan dan berpartisipasi gotong royong.
              </p>
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-300 space-y-1.5">
              <p className="text-slate-200">{selectedItem.report.description}</p>
              <div className="flex items-center justify-between bg-slate-800/80 p-2 rounded-lg">
                <span className="text-slate-400">Alamat Presisi:</span>
                <span className="font-semibold text-emerald-400">{selectedItem.report.exact_location?.address}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Pelapor:</span>
                <span className="text-slate-200">{selectedItem.report.reporter_name} ({selectedItem.report.reporter_phone})</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>AI Rekomendasi:</span>
                <span className="text-amber-300 font-medium">{selectedItem.report.ai_suggested_severity}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
