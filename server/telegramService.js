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

export function handleTelegramWebhook(payload) {
  // Telegram sends { message: { chat: { id }, text: "/start TOKEN_RT..." } }
  const message = payload?.message || payload;
  const text = (message.text || "").trim();
  const chatId = String(message.chat?.id || message.chat_id || Math.floor(10000000 + Math.random() * 90000000));
  const senderName = message.from?.first_name || "RT Leader";

  if (!text.startsWith('/start ')) {
    return { success: false, message: "Perintah tidak dikenali. Gunakan /start <TOKEN>" };
  }

  const token = text.replace('/start ', '').trim();
  const users = db.get('users');
  const user = users.find(u => u.telegram_subscribe_token === token);

  if (!user) {
    return { success: false, message: `Token ${token} tidak valid atau kadaluarsa.` };
  }

  // Update user with telegram chat id
  db.update('users', user.id, {
    telegram_chat_id: chatId,
    is_telegram_synced: true
  });

  // Welcome response
  const welcomeText = `✅ *BERHASIL TERHUBUNG DENGAN NEXA SIAGART!*\n\nHalo ${user.full_name},\nAkun Telegram Anda kini terverifikasi untuk wilayah *${user.area_label}*.\n\nAnda akan otomatis menerima notifikasi real-time jika:\n1. Ada laporan warga yang butuh verifikasi.\n2. Muncul tenggat waktu pengerukan BMKG.\n3. Peringatan dini banjir 2-of-3 Rule Engine terpicu.\n\n_Salam Siaga Bencana Jakarta!_`;

  sendTelegramNotification({
    toUser: user,
    message: welcomeText,
    type: "WELCOME"
  });

  return {
    success: true,
    user_id: user.id,
    user_name: user.full_name,
    area_label: user.area_label,
    chat_id: chatId,
    message: "Telegram bot berhasil disinkronisasi!"
  };
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

            if (text.startsWith('/start TOKEN_')) {
              handleTelegramWebhook({
                chat_id: chatId,
                text: text,
                from: msg.from
              });
            } else if (text === '/start' || text.startsWith('/start')) {
              fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `👋 *Halo ${msg.from?.first_name || 'Bapak/Ibu'}!*\n\nSelamat datang di Bot *NEXA SiagaRT*.\nUntuk menyambungkan bot ini dengan akun RT Anda, silakan buka aplikasi web NEXA SiagaRT, masuk ke Dashboard RT, lalu klik tombol *Hubungkan Bot Telegram*.\n\nLink unik akan otomatis memverifikasi wilayah RT Anda.`,
                  parse_mode: 'Markdown'
                })
              }).catch(() => {});
            } else if (text === '/help' || text === '/status') {
              fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `ℹ️ *Status NEXA SiagaRT Bot*\nBot aktif dan siap menerima peringatan banjir darurat serta verifikasi gotong royong warga.`,
                  parse_mode: 'Markdown'
                })
              }).catch(() => {});
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
