import React, { useState, useRef } from 'react';
import { Camera, Sparkles, CheckCircle2, X, UploadCloud, EyeOff, Image as ImageIcon, Loader2 } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

export default function ReportModal({ isOpen, onClose, areas = [], onReportSubmitted }) {
  const [hazardType, setHazardType] = useState('Clogged_Drain');
  const [description, setDescription] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState(areas[0]?.id || 'area-km-04-02');
  const [exactAddress, setExactAddress] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [photoPreview, setPhotoPreview] = useState('https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=800&q=80');
  const [previewPrivacyBlur, setPreviewPrivacyBlur] = useState(true);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [photoStats, setPhotoStats] = useState(null);
  const [aiResult, setAiResult] = useState(null);

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  if (!isOpen) return null;

  const samplePhotos = [
    {
      label: "Saluran Penuh Sedimen Lumpur (Valid)",
      url: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=800&q=80",
      type: "Clogged_Drain",
      desc: "Saluran gorong-gorong tersumbat lumpur padat dan sampah botol plastik."
    },
    {
      label: "Sampah Menumpuk di Mulut Air (Valid)",
      url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
      type: "Trash",
      desc: "Tumpukan kantong kresek dan ranting menyumbat pintu saringan air."
    },
    {
      label: "Foto Jalanan Kering (Uji AI Mismatch)",
      url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80",
      type: "Flood",
      desc: "Klaim banjir parah setinggi 1 meter padahal jalanan kering."
    }
  ];

  const handleSelectSample = (sample) => {
    setPhotoPreview(sample.url);
    setHazardType(sample.type);
    setDescription(sample.desc);
    setPhotoStats(null);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const result = await compressImage(file);
      if (result.dataUrl) {
        setPhotoPreview(result.dataUrl);
        setPhotoStats(result);
      }
    } catch (err) {
      console.warn("Gagal memproses foto:", err);
    } finally {
      setCompressing(false);
      // Reset input agar bisa pilih/jepret ulang berkas dengan nama yang sama
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAiResult(null);

    try {
      const area = areas.find(a => a.id === selectedAreaId) || areas[0];
      const payload = {
        hazard_type: hazardType,
        description,
        rt_rw_id: area?.id,
        kelurahan: area?.kelurahan,
        rw_code: area?.rw_code,
        rt_code: area?.rt_code,
        exact_address: exactAddress || `Depan Pos Ronda ${area?.rt_code} ${area?.rw_code}`,
        reporter_name: reporterName || "Warga Anonim (UU PDP)",
        reporter_phone: reporterPhone || "0812-3344-xxxx",
        photo_url_external: photoPreview
      };

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setAiResult(data.ai_analysis);
        if (onReportSubmitted) onReportSubmitted(data.report);
      } else {
        alert("Gagal mengirim laporan: " + data.error);
      }
    } catch (err) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Kirim Laporan Bahaya Drainase</h3>
              <p className="text-xs text-slate-400">Pencegahan dini banjir Jakarta berbasis komunitas (Phase 1)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {aiResult ? (
          /* AI Pipeline Result Showcase */
          <div className="py-6 space-y-4">
            <div className={`p-4 rounded-xl border ${
              aiResult.ai_flag === 'Valid' 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                : (aiResult.ai_flag === 'Mismatch' ? 'bg-amber-950/40 border-amber-500/40 text-amber-200' : 'bg-rose-950/40 border-rose-500/40 text-rose-200')
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                <span className="font-bold text-white text-base">Hasil Analisis Google Gemini AI:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                  aiResult.ai_flag === 'Valid' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {aiResult.ai_flag} ({Math.round(aiResult.ai_confidence * 100)}% Confidence)
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-300">{aiResult.ai_reasoning}</p>
            </div>

            {/* Task 2: Privacy Masking Preview */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <EyeOff className="w-4 h-4 text-sky-400" />
                  <span>UU PDP Privacy Masking (Sensor Wajah & Pelat Kendaraan)</span>
                </div>
                <span className="text-[10px] bg-sky-950 text-sky-300 px-2 py-0.5 rounded border border-sky-600/30">Otomatis Aktif</span>
              </div>
              <p className="text-xs text-slate-400">
                Sistem mendeteksi elemen privasi pada foto dan otomatis menyamarkan tampilan untuk publik. Foto asli hanya dapat dilihat Ketua RT terverifikasi.
              </p>
            </div>

            {/* Task 3: SOP Drafting */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
                <span>Rekomendasi Tingkat Bahaya:</span>
                <span className="bg-amber-500/20 px-2 py-0.5 rounded text-amber-300 uppercase font-bold">{aiResult.ai_suggested_severity}</span>
              </div>
              <h5 className="text-xs font-bold text-white mt-2">Draf Rencana Aksi (SOP Gotong Royong):</h5>
              <pre className="text-xs text-slate-300 font-sans whitespace-pre-line mt-1 bg-slate-900/80 p-3 rounded-lg border border-slate-800 leading-relaxed">
                {aiResult.ai_suggested_action}
              </pre>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-lg shadow-sky-500/30 transition-all"
              >
                Selesai & Lihat di Peta
              </button>
            </div>
          </div>
        ) : (
          /* Report Submission Form */
          <form onSubmit={handleSubmit} className="py-4 space-y-4">
            {/* Quick Sample Selector */}
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Pilih Sampel Uji Cepat (Demo):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {samplePhotos.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSample(s)}
                    className="text-left text-[11px] p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-700 hover:border-sky-500/50 text-slate-300 transition-all"
                  >
                    <span className="font-semibold block text-white truncate">{s.label}</span>
                    <span className="text-slate-400 text-[10px]">{s.type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Kategori Bahaya:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setHazardType('Clogged_Drain')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                    hazardType === 'Clogged_Drain'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🚧 Saluran Tersumbat</span>
                  <span className="text-[10px] text-slate-400 font-normal">Lumpur / Sedimen</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHazardType('Trash')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                    hazardType === 'Trash'
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-md'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🗑️ Tumpukan Sampah</span>
                  <span className="text-[10px] text-slate-400 font-normal">Mulut Saringan Air</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHazardType('Flood')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                    hazardType === 'Flood'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🌊 Genangan Air</span>
                  <span className="text-[10px] text-slate-400 font-normal">Rembesan / Luapan</span>
                </button>
              </div>
            </div>

            {/* Location & RT Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Pilih Wilayah RT / Kelurahan:</label>
                <select
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.kelurahan} ({a.rt_code} {a.rw_code}) - {a.kecamatan}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Detail Alamat / Patokan:</label>
                <input
                  type="text"
                  placeholder="Contoh: Gang Sawo III depan Musholla"
                  value={exactAddress}
                  onChange={(e) => setExactAddress(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Deskripsi Kondisi:</label>
              <textarea
                rows={2}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ceritakan tingkat keparahan, panjang saluran yang mampet, atau bahaya..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Photo & Privacy Preview */}
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-sky-400" />
                  Foto Bukti Kondisi Lapangan:
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-400">
                  <input
                    type="checkbox"
                    checked={previewPrivacyBlur}
                    onChange={(e) => setPreviewPrivacyBlur(e.target.checked)}
                    className="rounded text-sky-500 focus:ring-0"
                  />
                  <span>Simulasi Sensor UU PDP</span>
                </label>
              </div>

              {/* Hidden file inputs for cross-device compatibility */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Photo Preview Thumbnail */}
                <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shrink-0">
                  <img
                    src={photoPreview}
                    alt="Hazard"
                    className={`w-full h-full object-cover transition-all ${
                      previewPrivacyBlur ? 'filter blur-[3px]' : ''
                    }`}
                  />
                  {compressing && (
                    <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-1 text-[10px] text-sky-300">
                      <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                      <span>Mengoptimalkan...</span>
                    </div>
                  )}
                  {previewPrivacyBlur && !compressing && (
                    <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center">
                      <span className="text-[9px] bg-slate-900/80 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/30 font-bold">
                        PDP MASKED
                      </span>
                    </div>
                  )}
                </div>

                {/* Upload Action Buttons */}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={compressing}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Foto Langsung (Kamera HP)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={compressing}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-medium transition-all cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-slate-300" />
                      <span>Pilih dari Galeri</span>
                    </button>
                  </div>

                  {/* Photo Optimization Status */}
                  {photoStats && (
                    <div className="text-[11px] px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/80 text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {photoStats.isCompressed ? (
                        <span>
                          Foto dioptimalkan otomatis: <strong className="text-emerald-300">{photoStats.compressedSizeKb} KB</strong> (dari {photoStats.originalSizeKb} KB, kualitas tajam).
                        </span>
                      ) : (
                        <span>
                          Ukuran foto aman: <strong className="text-sky-300">{photoStats.originalSizeKb} KB</strong> (resolusi asli dipertahankan).
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400">
                    Kamera HP jadul otomatis dipertahankan kejernihannya. Kamera resolusi tinggi otomatis dikompres agar hemat kuota dan cepat terkirim.
                  </p>
                </div>
              </div>
            </div>

            {/* Reporter details (Protected by UU PDP) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nama Pelapor (Opsional):</label>
                <input
                  type="text"
                  placeholder="Budi Santoso"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">No. WhatsApp / HP:</label>
                <input
                  type="text"
                  placeholder="0812-xxxx-xxxx"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Data dienkripsi & sesuai UU PDP
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/25 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-white" />
                      <span>Gemini AI Menganalisis...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Kirim & Analisis AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
