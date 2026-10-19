const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const pino = require('pino');

let reconnecting = false;

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState('./session');

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
      reconnecting = false;
      console.log('👁️ OBITO_UCHIHA conectado a WhatsApp');
    }

    if (connection === 'close' && !reconnecting) {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        console.log(
          '❌ Sesión cerrada. Debes volver a vincular WhatsApp.'
        );
        return;
      }

      reconnecting = true;
      console.log('🔄 Reconectando en 3 segundos...');

      setTimeout(() => {
        reconnecting = false;
        startBot().catch(console.error);
      }, 3000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        if (!msg.message || msg.key.fromMe) continue;
        if (msg.key.remoteJid === 'status@broadcast') continue;

        const jid = msg.key.remoteJid;

        const content =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          msg.message.videoMessage?.caption ||
          '';

        const text = content.trim().toLowerCase();

        if (text === 'hola') {
          await sock.sendMessage(jid, {
            text: '¡Hola! 👁️🫀 Soy OBITO_UCHIHA.'
          });
        }

        else if (text === '.menu') {
          await sock.sendMessage(jid, {
            text: `╭━━━〔 👁️ OBITO_UCHIHA 〕━━━╮
┃
┃ 🌀 .menu
┃    Muestra este menú.
┃
┃ ⚡ .ping
┃    Comprueba si estoy activo.
┃
┃ 💬 hola
┃    Salúdame.
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯
       🫀 ¡El mundo Shinobi te espera!`
          });
        }

        else if (text === '.ping') {
          await sock.sendMessage(jid, {
            text: '🏓 ¡Pong! OBITO_UCHIHA está activo. 👁️'
          });
        }

      } catch (error) {
        console.error('Error al procesar mensaje:', error);
      }
    }
  });
}

startBot().catch((error) => {
  console.error('Error al iniciar OBITO_UCHIHA:', error);
  process.exitCode = 1;
});
