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

    // 1. Render RT/RW Areas Boundaries (Hanya tampilkan poligon wilayah jika ada laporan aktif di wilayah tersebut)
    areas.forEach(area => {
      const areaHasReports = reports.some(r => r.rt_rw_id === area.id);
      if (areaHasReports && area.geom_polygon && area.geom_polygon.length > 0) {
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

        // Hanya tampilkan titik marker di peta jika benar-benar ada laporan di wilayah RT tersebut
        if (filtered.length === 0) return;

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
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden border border-slate-300 shadow-md bg-white">
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Overlay: PDP Privacy Badge */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 max-w-md">
        {currentRole === 'PUBLIC' || currentRole === 'NGO' ? (
          <div className="bg-white/95 backdrop-blur-xs px-3 py-2 rounded-xl border border-slate-300 text-xs shadow-md flex items-center gap-2 text-slate-800">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-900">Peta Wilayah RT (Aman UU PDP):</span>{' '}
              <span className="text-slate-600">Titik rumah warga disamarkan demi privasi.</span>
            </div>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-xs px-3 py-2 rounded-xl border border-emerald-400 text-xs shadow-md flex items-center gap-2 text-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-emerald-900">Mode Pengurus RT:</span>{' '}
              <span className="text-slate-700">Menampilkan titik lokasi presisi untuk gotong royong.</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Chips Overlay - Clean White High Contrast */}
      <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-xs p-1.5 rounded-xl border border-slate-300 shadow-md flex items-center gap-1 text-xs">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
            filterType === 'ALL' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setFilterType('Clogged_Drain')}
          className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
            filterType === 'Clogged_Drain' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white"></span>
          Saluran
        </button>
        <button
          onClick={() => setFilterType('Trash')}
          className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
            filterType === 'Trash' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600 border border-white"></span>
          Sampah
        </button>
        <button
          onClick={() => setFilterType('Flood')}
          className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
            filterType === 'Flood' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white"></span>
          Banjir
        </button>
      </div>

      {/* Info jika belum ada laporan sama sekali */}
      {reports.length === 0 && !selectedItem && (
        <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/95 backdrop-blur-xs px-4 py-3 rounded-xl border border-slate-300 shadow-md max-w-lg text-xs text-slate-700 flex items-center justify-between gap-3">
          <div>
            <strong className="text-slate-900 block">Peta Bersih (0 Laporan Aktif)</strong>
            <span>Titik lokasi akan otomatis muncul di peta begitu ada warga yang mengirim laporan bahaya/banjir.</span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold shrink-0">
            Siaga Real-Time
          </span>
        </div>
      )}

      {/* Bottom Floating Legend / Selected Item Card */}
      {selectedItem && (
        <div className="absolute bottom-4 left-4 right-4 z-10 bg-white p-4 rounded-xl border-2 border-blue-500 shadow-2xl animate-fade-in max-w-lg text-slate-900">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  {selectedItem.type === 'AREA_AGGREGATE' ? 'Data Wilayah RT' : 'Detail Laporan Warga'}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {selectedItem.type === 'AREA_AGGREGATE' ? selectedItem.area.kota : selectedItem.report.kelurahan}
                </span>
              </div>

              <h4 className="text-base font-extrabold text-slate-900 mt-1">
                {selectedItem.type === 'AREA_AGGREGATE'
                  ? `${selectedItem.area.kelurahan} (${selectedItem.area.rt_code} ${selectedItem.area.rw_code})`
                  : selectedItem.report.hazard_type_label}
              </h4>
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="text-slate-700 hover:text-red-600 font-bold text-xs px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300"
            >
              ✕ Tutup
            </button>
          </div>

          {selectedItem.type === 'AREA_AGGREGATE' ? (
            <div className="mt-3 text-xs text-slate-700 space-y-1.5">
              <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                <span className="font-semibold">Total Laporan di Wilayah Ini:</span>
                <strong className="text-blue-700 text-sm">{selectedItem.reports.length} laporan</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Pos Pantau Terkait:</span>
                <span className="font-bold text-slate-900">{selectedItem.area.monitoring_post}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Daya Resapan Air:</span>
                <span className="font-bold text-amber-800">{selectedItem.area.water_retention_capacity}</span>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-700 space-y-1.5">
              <p className="text-slate-900 font-medium">{selectedItem.report.description}</p>
              <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                <span className="text-slate-700 font-semibold">Alamat Presisi:</span>
                <span className="font-bold text-emerald-900">{selectedItem.report.exact_location?.address}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Pelapor:</span>
                <span className="font-bold text-slate-900">{selectedItem.report.reporter_name} ({selectedItem.report.reporter_phone})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Tingkat Keparahan AI:</span>
                <span className="text-amber-800 font-bold">{selectedItem.report.ai_suggested_severity}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
