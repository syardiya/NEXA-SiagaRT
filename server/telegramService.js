import { db } from './db.js';

let cachedBotUsername = null;

export async function resolveBotUsername() {
  if (cachedBotUsername) return cachedBotUsername;
  
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (token) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await res.json();
      if (data.ok && data.result?.username) {
        cachedBotUsername = data.result.username;
        return cachedBotUsername;
      }
    } catch (e) {
      // offline / fallback
    }
  }

  return process.env.TELEGRAM_BOT_USERNAME || "NexaSiagaBot";
}

export async function generateTelegramToken(rt_code, user_id) {
  const cleanCode = (rt_code || 'RT01').replace(/\s+/g, '').toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  const token = `TOKEN_${cleanCode}_${rand}`;
  
  // Save token to user profile
  db.update('users', user_id, {
    telegram_subscribe_token: token,
    is_telegram_synced: false
  });

  const botUsername = await resolveBotUsername();

  return {
    token,
    bot_username: botUsername,
    deep_link: `https://t.me/${botUsername}?start=${token}`
  };
}

export async function sendTelegramDirect(chatId, text, parseMode = 'Markdown') {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: parseMode
      })
    });
    const data = await res.json();
    if (!data.ok && parseMode) {
      // Retry without markdown formatting if parsing entities failed
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.replace(/[*_`\[\]]/g, '')
        })
      });
    }
    return true;
  } catch (err) {
    console.warn("Direct Telegram message failed:", err.message);
    return false;
  }
}

export async function processIncomingTelegramMessage({ chatId, text, senderName, from }) {
  const cleanText = (text || '').trim();
  const lowerText = cleanText.toLowerCase();
  const users = db.get('users');
  const user = users.find(u => String(u.telegram_chat_id) === String(chatId));

  // 1. Check if token link: /start TOKEN_...
  if (cleanText.startsWith('/start TOKEN_') || cleanText.startsWith('TOKEN_')) {
    const token = cleanText.replace('/start ', '').trim();
    const targetUser = users.find(u => u.telegram_subscribe_token === token);

    if (!targetUser) {
      const errMsg = `⚠️ *Token Verifikasi Tidak Dikenali*\n\nToken \`${token}\` tidak terdaftar atau telah kadaluarsa. Silakan klik ulang tombol *Hubungkan Bot Telegram* di Dashboard RT web NEXA SiagaRT.`;
      await sendTelegramDirect(chatId, errMsg);
      return { success: false, message: `Token ${token} tidak valid atau kadaluarsa.` };
    }

    db.update('users', targetUser.id, {
      telegram_chat_id: String(chatId),
      is_telegram_synced: true
    });

    const welcomeMsg = `✅ *BERHASIL TERHUBUNG DENGAN NEXA SIAGART!*\n\nHalo *${targetUser.full_name}*,\nAkun Telegram Anda resmi terverifikasi untuk wilayah *${targetUser.area_label}*.\n\n🔔 *Notifikasi Otomatis yang Akan Anda Terima:*\n1. Peringatan dini jika ada warga RT mengirim laporan gorong-gorong tersumbat.\n2. Hitung mundur waktu pengerukan sebelum hujan lebat BMKG tiba.\n3. Sinyal bahaya banjir 2-of-3 Rule Engine.\n\n💬 *Perintah Cepat yang Bisa Anda Ketik:*\n• \`/status\` atau *cek* — Pantau cuaca BMKG & tinggi pintu air live\n• \`/tugas\` — Pantau tugas gotong royong aktif\n• \`/link\` — Buka link dashboard web\n• \`/help\` — Bantuan perintah bot\n\n_Salam Tanggap Bencana Jakarta!_`;

    sendTelegramNotification({
      toUser: targetUser,
      message: welcomeMsg,
      type: "WELCOME"
    });

    return {
      success: true,
      user_id: targetUser.id,
      user_name: targetUser.full_name,
      area_label: targetUser.area_label,
      chat_id: chatId,
      message: "Telegram bot berhasil disinkronisasi!"
    };
  }

  // 2. /start biasa (tanpa token)
  if (lowerText === '/start') {
    let reply = '';
    if (user) {
      reply = `👋 *Halo ${user.full_name}!*\n\nAkun Anda sudah terhubung untuk wilayah *${user.area_label}*.\n\nKetik \`/status\` untuk memantau kondisi terkini wilayah Anda, atau \`/help\` untuk melihat menu perintah.`;
    } else {
      reply = `👋 *Halo ${senderName || 'Bapak/Ibu'}!*\n\nSelamat datang di Bot *NEXA SiagaRT*.\n\nUntuk menyambungkan bot ini dengan wilayah RT Anda:\n1. Buka aplikasi web *NEXA SiagaRT*\n2. Masuk ke *Dashboard RT*\n3. Klik tombol *Hubungkan Bot Telegram*\n4. Klik tautan otomatis yang tersedia.\n\nKetik \`/help\` untuk melihat daftar bantuan.`;
    }
    await sendTelegramDirect(chatId, reply);
    return { success: true, message: "Start greeted" };
  }

  // 3. /status, cek, cuaca, banjir, kondisi
  if (lowerText === '/status' || lowerText === '/cek' || lowerText.includes('status') || lowerText.includes('cuaca') || lowerText.includes('pintu air') || lowerText.includes('banjir') || lowerText.includes('cek')) {
    const bpbdPosts = db.get('bpbd_posts') || [];
    const katulampa = bpbdPosts.find(p => p.id === 'pos-katulampa') || bpbdPosts[0] || { status: 'Siaga 4 (Normal)', water_level_cm: 60 };
    const manggarai = bpbdPosts.find(p => p.id === 'pos-manggarai') || bpbdPosts[1] || { status: 'Siaga 4 (Normal)', water_level_cm: 650 };
    
    const forecast = db.data?.bmkg_forecast || {};
    const warning = forecast.active_warning || {};
    const curInterval = forecast.intervals?.[0] || {};

    const reports = db.get('reports') || [];
    const pendingReports = reports.filter(r => r.status === 'Pending').length;

    const tasks = db.get('cleanup_tasks') || [];
    const activeTasks = tasks.filter(t => t.status === 'In_Progress').length;

    const areaTitle = user ? user.area_label : "DKI Jakarta (Pusat)";

    const statusMsg = `📊 *STATUS KONDISI WILAYAH (LIVE)*\n📍 *Wilayah:* ${areaTitle}\n\n🌦️ *Prakiraan Cuaca BMKG:*\n• Cuaca: *${curInterval.weather || 'Berawan Tebal'}* (${curInterval.temperature || '28°C'})\n• Peluang Hujan: *${curInterval.rain_probability || '75%'}*\n• Status Peringatan: ${warning.is_active ? '⚠️ *Waspada Hujan Lebat*' : '✅ Kondusif'}\n\n🌊 *Pantauan Pintu Air Utama (BPBD):*\n• Katulampa: *${katulampa.status}* (${katulampa.water_level_cm} cm)\n• Manggarai: *${manggarai.status}* (${manggarai.water_level_cm} cm)\n\n📋 *Laporan & Gotong Royong:*\n• Laporan Warga Menunggu Verifikasi: *${pendingReports} laporan*\n• Tugas Gotong Royong Aktif: *${activeTasks} aksi*\n\n_Ketik /tugas untuk rincian gotong royong, atau /link untuk membuka dasbor web._`;

    await sendTelegramDirect(chatId, statusMsg);
    return { success: true, message: "Status sent", data: { areaTitle, pendingReports, activeTasks } };
  }

  // 4. /tugas, gotong royong, relawan
  if (lowerText === '/tugas' || lowerText.includes('tugas') || lowerText.includes('gotong royong') || lowerText.includes('relawan')) {
    const tasks = db.get('cleanup_tasks') || [];
    const activeTasks = tasks.filter(t => t.status === 'In_Progress');

    let taskMsg = '';
    if (activeTasks.length === 0) {
      taskMsg = `✅ *TIDAK ADA TUGAS AKTIF SAAT INI*\n\nSeluruh saluran drainase dan got di wilayah terpantau bersih dan tidak ada pengerukan yang mendesak.\n\nKetik \`/status\` untuk cek cuaca BMKG.`;
    } else {
      taskMsg = `🧹 *DAFTAR AKSI GOTONG ROYONG AKTIF (${activeTasks.length}):*\n\n` +
        activeTasks.slice(0, 3).map((t, idx) => {
          return `*${idx + 1}. ${t.title}*\n📍 Lokasi: ${t.exact_address || t.kelurahan || 'Wilayah RT'}\n⏱️ ${t.rain_forecast_note || 'Tenggat BMKG aktif'}\n👥 Kebutuhan: ${t.volunteers_count || 6} Relawan Warga`;
        }).join('\n\n') +
        `\n\n_Buka dasbor web NEXA SiagaRT untuk melihat foto lokasi atau menyelesaikan tugas._`;
    }

    await sendTelegramDirect(chatId, taskMsg);
    return { success: true, message: "Tasks sent" };
  }

  // 5. /link, web, dashboard
  if (lowerText === '/link' || lowerText.includes('link') || lowerText.includes('web') || lowerText.includes('dashboard') || lowerText.includes('buka')) {
    const linkMsg = `🌐 *APLIKASI WEB NEXA SIAGART*\n\nSilakan akses dashboard melalui peramban:\n🔗 https://nexa-siagart.onrender.com\n\n_Masuk dengan Nomor HP & PIN untuk verifikasi laporan dan kelola relawan warga._`;
    await sendTelegramDirect(chatId, linkMsg);
    return { success: true, message: "Link sent" };
  }

  // 6. Default Fallback & /help
  const helpMsg = `🤖 *Halo ${user ? user.full_name : (senderName || 'Bapak/Ibu')}!*\n\nSaya adalah Asisten Bot *NEXA SiagaRT* untuk koordinasi mitigasi banjir & gotong royong warga.\n\n*Pilihan Perintah yang Dapat Digunakan:*\n🔹 \`/status\` atau *cek* — Cek cuaca BMKG, tinggi pintu air, dan status laporan\n🔹 \`/tugas\` — Pantau aksi gotong royong & relawan aktif\n🔹 \`/link\` — Link menuju aplikasi web dasbor\n🔹 \`/help\` — Menampilkan panduan bantuan ini\n\n🔔 *Pengingat:* Bot ini akan *otomatis membunyikan notifikasi* jika ada warga melapor sumbatan got atau jika terdeteksi ancaman banjir mendadak!`;

  await sendTelegramDirect(chatId, helpMsg);
  return { success: true, message: "Help sent" };
}

export async function handleTelegramWebhook(payload) {
  // Telegram sends { message: { chat: { id }, text: "..." } }
  const message = payload?.message || payload;
  const text = (message.text || "").trim();
  const chatId = String(message.chat?.id || message.chat_id || Math.floor(10000000 + Math.random() * 90000000));
  const senderName = message.from?.first_name || message.from?.name || "RT Leader";

  return await processIncomingTelegramMessage({
    chatId,
    text,
    senderName,
    from: message.from
  });
}

export function sendTelegramNotification({ toUser, message, type = "ALERT" }) {
  const telegramMessages = db.get('telegram_messages');
  const record = {
    id: `tg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    to: toUser.full_name || "Ketua RT",
    chat_id: toUser.telegram_chat_id || "Unsynced",
    area_label: toUser.area_label || "DKI Jakarta",
    type,
    message,
    timestamp: new Date().toISOString()
  };

  db.insert('telegram_messages', record);

  // If live telegram token is provided in process.env.TELEGRAM_BOT_TOKEN and toUser.telegram_chat_id:
  if (process.env.TELEGRAM_BOT_TOKEN && toUser.telegram_chat_id) {
    fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: toUser.telegram_chat_id,
        text: message,
        parse_mode: 'Markdown'
      })
    }).catch(err => console.warn("Live telegram message dispatch failed:", err.message));
  }

  return record;
}

let isPolling = false;
let lastUpdateOffset = 0;

export function startTelegramPolling() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || isPolling) return;
  isPolling = true;

  console.log("🤖 Memulai Telegram Bot Long-Polling untuk mendengarkan pesan warga/RT...");

  async function poll() {
    if (!isPolling) return;
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateOffset + 1}&timeout=15`, {
        signal: AbortSignal.timeout(20000)
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          lastUpdateOffset = Math.max(lastUpdateOffset, update.update_id);
          if (update.message) {
            const msg = update.message;
            const text = (msg.text || '').trim();
            const chatId = msg.chat?.id;
            const senderName = msg.from?.first_name || msg.from?.name || "Pengguna Telegram";

            if (chatId) {
              await processIncomingTelegramMessage({
                chatId,
                text,
                senderName,
                from: msg.from
              });
            }
          }
        }
      }
    } catch (err) {
      // transient network timeout or error, continue loop
    }
    if (isPolling) {
      setTimeout(poll, 1500);
    }
  }

  poll();
}
