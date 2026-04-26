import express from 'express';
import cors from 'cors';
import QRCode from 'qrcode';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = join(__dirname, '.wa-auth');
mkdirSync(AUTH_DIR, { recursive: true });

// Estado global
let status = 'disconnected'; // disconnected | connecting | qr_ready | connected
let currentQR = null;
let sock = null;
let sseClients = [];

// Carrega Baileys dinamicamente
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeCacheableSignalKeyStore,
} = await import('@whiskeysockets/baileys');

async function connect() {
  if (status === 'connected' || status === 'connecting') return;
  status = 'connecting';
  broadcast({ type: 'status', status });

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, { level: 'silent', child: () => ({ level: 'silent', child: () => ({}) }) }),
    },
    printQRInTerminal: true,
    logger: { level: 'silent', info: () => {}, error: () => {}, warn: () => {}, debug: () => {}, trace: () => {}, fatal: () => {}, child: () => ({ level: 'silent', info: () => {}, error: () => {}, warn: () => {}, debug: () => {}, trace: () => {}, fatal: () => {}, child: () => ({ level: 'silent', info: () => {}, error: () => {}, warn: () => {}, debug: () => {}, trace: () => {}, fatal: () => {} }) }) },
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    connectTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = await QRCode.toDataURL(qr);
      status = 'qr_ready';
      broadcast({ type: 'qr', qr: currentQR });
      broadcast({ type: 'status', status });
      console.log('📱 QR Code gerado — escaneie com o WhatsApp');
    }

    if (connection === 'open') {
      status = 'connected';
      currentQR = null;
      broadcast({ type: 'status', status });
      console.log('✅ WhatsApp conectado!');
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      status = 'disconnected';
      broadcast({ type: 'status', status });
      console.log(`❌ Desconectado (código: ${code})`);
      if (shouldReconnect) {
        console.log('🔄 Reconectando em 5s...');
        setTimeout(connect, 5000);
      }
    }
  });
}

async function disconnect() {
  await sock?.logout();
  sock = null;
  status = 'disconnected';
  currentQR = null;
  broadcast({ type: 'status', status });
}

function broadcast(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => res.write(msg));
}

// ─── Express ─────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());
app.use((_req, res, next) => { res.setHeader('Bypass-Tunnel-Reminder', 'true'); next(); });

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/status', (_req, res) => res.json({ status }));

app.get('/qr', (_req, res) => {
  if (!currentQR) return res.status(404).json({ error: 'Sem QR code disponível' });
  res.json({ qr: currentQR });
});

app.post('/connect', async (_req, res) => {
  await connect();
  res.json({ ok: true, status });
});

app.post('/disconnect', async (_req, res) => {
  await disconnect();
  res.json({ ok: true });
});

app.post('/send', async (req, res) => {
  const { to, text } = req.body;
  if (!to || !text) return res.status(400).json({ error: 'to e text são obrigatórios' });
  if (status !== 'connected') return res.status(503).json({ error: 'WhatsApp não conectado' });
  try {
    const jid = `${to.replace(/\D/g, '')}@s.whatsapp.net`;
    const result = await sock.sendMessage(jid, { text });
    res.json({ ok: true, id: result?.key?.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SSE — eventos em tempo real para o painel
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Envia estado atual imediatamente
  res.write(`data: ${JSON.stringify({ type: 'status', status })}\n\n`);
  if (currentQR) res.write(`data: ${JSON.stringify({ type: 'qr', qr: currentQR })}\n\n`);

  sseClients.push(res);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter(c => c !== res);
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 WA Bridge rodando em http://localhost:${PORT}`);
  console.log(`   GET  /status   → status da conexão`);
  console.log(`   GET  /qr       → QR code (base64)`);
  console.log(`   POST /connect  → inicia conexão`);
  console.log(`   GET  /events   → SSE em tempo real\n`);
});
