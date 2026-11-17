import React, { useState, useRef } from 'react';
import { Camera, Sparkles, CheckCircle2, X, EyeOff, Image as ImageIcon, Loader2 } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

export default function ReportModal({ isOpen, onClose, areas = [], onReportSubmitted }) {
  const [hazardType, setHazardType] = useState('Clogged_Drain');
  const [description, setDescription] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState(areas[0]?.id || 'area-km-04-02');
  const [exactAddress, setExactAddress] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [blurredPhotoPreview, setBlurredPhotoPreview] = useState('');
  const [previewPrivacyBlur, setPreviewPrivacyBlur] = useState(true);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [photoStats, setPhotoStats] = useState(null);
  const [aiResult, setAiResult] = useState(null);

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const result = await compressImage(file);
      if (result.dataUrl) {
        setPhotoPreview(result.dataUrl);
        setBlurredPhotoPreview(result.blurredDataUrl || result.dataUrl);
        setPhotoStats(result);
      }
    } catch (err) {
      console.warn("Gagal memproses foto:", err);
    } finally {
      setCompressing(false);
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
        exact_address: exactAddress || `Area ${area?.rt_code} ${area?.rw_code}`,
        reporter_name: reporterName || "Warga (Dilindungi UU PDP)",
        reporter_phone: reporterPhone || "0812-3344-xxxx",
        photo_url_external: photoPreview,
        blurred_photo_url: previewPrivacyBlur ? (blurredPhotoPreview || photoPreview) : photoPreview
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

  const handleClose = () => {
    setAiResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white border border-slate-300 rounded-2xl shadow-2xl p-6 text-slate-900 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 border border-blue-200">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-extrabold text-slate-900">Formulir Laporan Warga</h3>
              <p className="text-xs md:text-sm text-slate-600">
                Laporan langsung dianalisis AI dan diteruskan ke RT (Pencegahan) serta NGO/Relawan (Penanganan)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-slate-700 hover:text-red-600 rounded-xl bg-slate-100 hover:bg-red-50 border border-slate-300 font-bold text-xs transition-colors"
          >
            ✕ Tutup
          </button>
        </div>

        {aiResult ? (
          /* Hasil Analisis AI Gemini */
          <div className="py-5 space-y-4">
            <div className={`p-4 rounded-xl border-2 ${
              aiResult.ai_flag === 'Valid' 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span className="font-extrabold text-slate-900 text-base">Hasil Analisis AI Google Gemini:</span>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold uppercase border ${
                  aiResult.ai_flag === 'Valid' ? 'bg-emerald-200 text-emerald-900 border-emerald-400' : 'bg-amber-200 text-amber-900 border-amber-400'
                }`}>
                  {aiResult.ai_flag} ({Math.round(aiResult.ai_confidence * 100)}%)
                </span>
              </div>
              <p className="text-xs md:text-sm leading-relaxed text-slate-800 font-medium">{aiResult.ai_reasoning}</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-xs md:text-sm text-slate-800">
              <strong className="text-blue-900 block mb-1">Status Diteruskan Otomatis:</strong>
              {hazardType === 'Flood' ? (
                <span>
                  Laporan banjir ini telah <strong>langsung masuk ke Dasbor Relawan & NGO</strong> beserta rekomendasi AI untuk konfirmasi dan evakuasi segera.
                </span>
              ) : (
                <span>
                  Laporan telah masuk ke <strong>Dasbor Ketua RT</strong> (untuk verifikasi pencegahan sebelum hujan) dan juga tampil di <strong>Dasbor Relawan & NGO</strong>.
                </span>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs md:text-sm font-bold text-slate-800">
                <div className="flex items-center gap-2">
                  <span>Klasifikasi Tingkat Bahaya AI:</span>
                  <span className="bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md text-amber-900 uppercase font-extrabold">
                    {aiResult.ai_suggested_severity}
                  </span>
                </div>
                {aiResult.flood_type_label && (
                  <span className="bg-blue-100 border border-blue-300 px-2.5 py-0.5 rounded-md text-blue-900 text-xs font-extrabold">
                    Tipe: {aiResult.flood_type_label}
                  </span>
                )}
              </div>
              {aiResult.learned_from_samples !== undefined && (
                <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  ✓ Kalibrasi AI Aktif: Belajar otomatis dari {aiResult.learned_from_samples} riwayat keputusan verifikasi RT & NGO.
                </div>
              )}
              <h5 className="text-xs font-extrabold text-slate-900 mt-2">Rekomendasi Tindakan AI:</h5>
              <pre className="text-xs text-slate-800 font-sans whitespace-pre-line mt-1 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                {aiResult.ai_suggested_action}
              </pre>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleClose}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all"
              >
                Selesai & Kembali ke Halaman Utama
              </button>
            </div>
          </div>
        ) : (
          /* Formulir Laporan Warga */
          <form onSubmit={handleSubmit} className="py-4 space-y-4">
            {/* Langkah 1: Pilih Jenis Masalah */}
            <div>
              <label className="text-xs md:text-sm font-extrabold text-slate-900 block mb-1.5">
                1. Pilih Jenis Masalah yang Dilaporkan:
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setHazardType('Clogged_Drain')}
                  className={`p-3 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    hazardType === 'Clogged_Drain'
                      ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm">🚧 Saluran Mampet</span>
                  <span className="text-[11px] text-slate-600 font-medium">Pencegahan RT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHazardType('Trash')}
                  className={`p-3 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    hazardType === 'Trash'
                      ? 'bg-purple-50 border-purple-500 text-purple-950 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm">🗑️ Tumpukan Sampah</span>
                  <span className="text-[11px] text-slate-600 font-medium">Pencegahan RT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHazardType('Flood')}
                  className={`p-3 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    hazardType === 'Flood'
                      ? 'bg-red-50 border-red-500 text-red-950 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm">🌊 Banjir / Darurat</span>
                  <span className="text-[11px] text-red-700 font-bold">Langsung ke NGO</span>
                </button>
              </div>
            </div>

            {/* Langkah 2: Pilih Lokasi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs md:text-sm font-extrabold text-slate-900 block mb-1">
                  2. Pilih Wilayah RT / Kelurahan:
                </label>
                <select
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs md:text-sm text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                >
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.kelurahan} ({a.rt_code} {a.rw_code}) - {a.kecamatan}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs md:text-sm font-extrabold text-slate-900 block mb-1">
                  Patokan Lokasi (Jalan / Gang):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Depan Musholla Gang 3"
                  value={exactAddress}
                  onChange={(e) => setExactAddress(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs md:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Langkah 3: Keterangan */}
            <div>
              <label className="text-xs md:text-sm font-extrabold text-slate-900 block mb-1">
                3. Ceritakan Kondisi Singkat:
              </label>
              <textarea
                rows={2}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Got mampet tertutup lumpur hitam, atau air mulai naik setinggi lutut..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs md:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Langkah 4: Foto */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs md:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-600" />
                  4. Ambil Foto Kondisi:
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={previewPrivacyBlur}
                    onChange={(e) => setPreviewPrivacyBlur(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Samarkan Wajah/Privasi (UU PDP)</span>
                </label>
              </div>

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
                <div className="relative w-32 h-24 rounded-xl overflow-hidden border border-slate-300 bg-slate-100 shrink-0 flex items-center justify-center">
                  {photoPreview ? (
                    <img
                      src={previewPrivacyBlur ? (blurredPhotoPreview || photoPreview) : photoPreview}
                      alt="Foto Laporan"
                      className="w-full h-full object-cover transition-all"
                    />
                  ) : (
                    <div className="text-center p-2 text-[11px] font-semibold text-slate-500">
                      Belum ada foto dipilih
                    </div>
                  )}
                  {compressing && (
                    <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-1 text-[11px] font-bold text-blue-800">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      <span>Memproses...</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={compressing}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Buka Kamera HP</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={compressing}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-slate-700" />
                      <span>Pilih dari Galeri</span>
                    </button>
                  </div>

                  {photoStats && (
                    <div className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Foto siap dikirim ({photoStats.compressedSizeKb || photoStats.originalSizeKb} KB).</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Identitas Opsional */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs md:text-sm">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Nama Anda (Boleh Dikosongkan):</label>
                <input
                  type="text"
                  placeholder="Contoh: Pak Budi"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-slate-700 font-bold block mb-1">Nomor HP / WhatsApp (Opsional):</label>
                <input
                  type="text"
                  placeholder="0812-xxxx-xxxx"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Footer Submit */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Identitas aman dilindungi UU PDP
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs md:text-sm font-extrabold bg-red-600 hover:bg-red-700 text-white shadow-md disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-white" />
                      <span>Memproses dengan AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Kirim Laporan Sekarang</span>
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
