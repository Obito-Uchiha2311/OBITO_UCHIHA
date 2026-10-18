const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const pino = require('pino');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let reconnecting = false;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['OBITO_UCHIHA', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      console.log('✅ OBITO_UCHIHA está conectado.');
      reconnecting = false;
    }

    if (connection === 'close' && !reconnecting) {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('❌ Sesión cerrada. Debes vincular WhatsApp de nuevo.');
        return;
      }

      reconnecting = true;
      console.log('⚠️ Conexión perdida. Reconectando...');

      await sleep(3000);
      reconnecting = false;
      startBot().catch(console.error);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      if (msg.key.remoteJid === 'status@broadcast') continue;

      const from = msg.key.remoteJid;

      const messageContent =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        '';

      const text = messageContent.trim().toLowerCase();

      try {
        if (text === 'hola') {
          await sock.sendMessage(from, {
            text: '¡Hola! Soy OBITO_UCHIHA 👁️🫀'
          });
        } else if (text === '.menu') {
          await sock.sendMessage(from, {
            text:
              '╭━━━『 OBITO_UCHIHA 👁️🫀 』━━━╮\n' +
              '┃ .menu — Ver comandos\n' +
              '┃ .ping — Comprobar el bot\n' +
              '╰━━━━━━━━━━━━━━━━━━━━╯'
          });
        } else if (text === '.ping') {
          await sock.sendMessage(from, {
            text: 'Pong! 🌀 OBITO_UCHIHA está activo.'
          });
        }
      } catch (error) {
        console.error('Error al responder:', error);
      }
    }
  });
}

startBot().catch(error => {
  console.error('Error al iniciar OBITO_UCHIHA:', error);
  process.exitCode = 1;
});
