import React, { useState } from 'react';
import { Send, X, Bot, CheckCheck, ExternalLink, ShieldCheck, Play } from 'lucide-react';

export default function TelegramSimulatorModal({ 
  isOpen, 
  onClose, 
  messages = [], 
  onSimulateWebhook,
  token = 'TOKEN_RT04_KM89',
  botUsername = 'NexaSiagaBot'
}) {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const realDeepLink = `https://t.me/${botUsername}?start=${token}`;

  const handleStartBot = async () => {
    setLoading(true);
    await onSimulateWebhook({
      message: {
        text: `/start ${token}`,
        chat: { id: "87123984" },
        from: { first_name: "Ketua RT" }
      }
    });
    setLoading(false);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    setLoading(true);

    await onSimulateWebhook({
      message: {
        text: inputText,
        chat: { id: "87123984" },
        from: { first_name: "Ketua RT" }
      }
    });

    setInputText('');
    setLoading(false);
  };

  const handleQuickCommand = async (cmd) => {
    setLoading(true);
    await onSimulateWebhook({
      message: {
        text: cmd,
        chat: { id: "87123984" },
        from: { first_name: "Ketua RT" }
      }
    });
    setLoading(false);
  };

  const isConnected = messages.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[650px] text-slate-100">
        
        {/* Telegram App Header */}
        <div className="bg-[#242f3d] p-4 flex items-center justify-between border-b border-slate-700 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-white text-sm">NEXA Siaga Bot</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-[11px] text-sky-300">@{botUsername} • Siaga Banjir Jakarta</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={realDeepLink}
              target="_blank"
              rel="noopener noreferrer"
              title="Buka langsung di aplikasi Telegram HP"
              className="p-1.5 text-sky-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 text-[11px] bg-slate-800/80 px-2.5 py-1 border border-sky-500/30"
            >
              <span>Buka di Telegram</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Telegram Chat Message History */}
        <div className="flex-1 bg-[#0e1621] p-4 overflow-y-auto space-y-3">
          {/* Welcome Intro Banner */}
          <div className="text-center my-2">
            <span className="text-[11px] bg-[#182533] text-slate-300 px-3.5 py-1.5 rounded-full border border-slate-800 shadow-sm inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kanal Notifikasi Otomatis Pengurus RT & RW</span>
            </span>
          </div>

          {/* If Not Connected: Show Friendly Start Card */}
          {!isConnected && (
            <div className="p-5 rounded-2xl bg-[#182533] border border-sky-500/30 text-center space-y-3 my-8 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto border border-sky-500/30">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Hubungkan Notifikasi ke Akun Ini</h4>
                <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto leading-relaxed">
                  Tekan tombol di bawah untuk mengaktifkan notifikasi laporan warga dan jadwal gotong royong langsung ke bot ini.
                </p>
              </div>

              <button
                onClick={handleStartBot}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/30 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{loading ? "Menghubungkan..." : "Mulai Berlangganan (Start Bot)"}</span>
              </button>
            </div>
          )}

          {/* Chat Messages */}
          {messages.map((msg, idx) => (
            <div key={idx} className="flex flex-col items-start max-w-[92%] animate-fade-in">
              <div className="bg-[#182533] p-3.5 rounded-2xl rounded-tl-sm border border-slate-800/80 shadow-md space-y-1.5 text-xs text-slate-200">
                <div className="flex items-center justify-between text-[10px] text-sky-400 font-bold border-b border-slate-700/50 pb-1 gap-4">
                  <span>{msg.type || "NOTIFIKASI SIAGA"}</span>
                  <span className="text-slate-400 font-normal">
                    {new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <pre className="font-sans whitespace-pre-line text-xs text-slate-200 leading-relaxed">
                  {msg.message}
                </pre>

                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-1">
                  <span>Terkirim</span>
                  <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chat Input & Friendly Quick Actions */}
        <div className="bg-[#17212b] p-3 border-t border-slate-800 space-y-2">
          {/* Quick Preset Buttons (User Friendly, No confusing tokens!) */}
          <div className="flex gap-2 overflow-x-auto pb-1 text-[11px]">
            <button
              onClick={() => handleQuickCommand('Tes Notifikasi Laporan Warga')}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-[#242f3d] hover:bg-[#2b394a] text-sky-300 shrink-0 border border-slate-700 font-medium transition-colors"
            >
              📢 Tes Notifikasi Masuk
            </button>
            <button
              onClick={() => handleQuickCommand('Cek Status Cuaca & Pos Pantau')}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-[#242f3d] hover:bg-[#2b394a] text-slate-300 shrink-0 border border-slate-700 transition-colors"
            >
              ⏱ Cek Pintu Air BPBD
            </button>
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik pesan untuk bot..."
              className="flex-1 bg-[#242f3d] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 disabled:opacity-40 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
