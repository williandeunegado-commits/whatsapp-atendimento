// @ts-nocheck — Baileys usa CommonJS/ESM híbrido; tipos gerenciados via any
import baileysModule from '@whiskeysockets/baileys';
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, proto } = baileysModule as any ?? baileysModule;
import { Boom } from '@hapi/boom';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type {
  WhatsAppProvider,
  InboundMessage,
  MessageResult,
  MessageStatusUpdate,
  OutboundMediaPayload,
  ConnectionStatus,
} from '@wa/shared';
import type { PrismaClient } from '@prisma/client';
import { encrypt } from '../lib/crypto.js';
import { logger } from '../lib/logger.js';

// Pasta temporária para auth state
const AUTH_DIR = join(tmpdir(), 'wa-baileys-auth');
mkdirSync(AUTH_DIR, { recursive: true });

export class BaileysProvider implements WhatsAppProvider {
  private sock: any = null;
  private status: ConnectionStatus = 'disconnected';
  private messageHandlers: Array<(msg: InboundMessage) => Promise<void>> = [];
  private statusHandlers: Array<(status: ConnectionStatus) => void> = [];
  private qrHandlers: Array<(qr: string) => void> = [];
  private statusUpdateHandlers: Array<(update: MessageStatusUpdate) => void> = [];

  constructor(private prisma: PrismaClient) {}

  async connect(): Promise<void> {
    logger.info('BaileysProvider: conectando...');
    this.setStatus('connecting');

    // Carrega auth state persistido no banco (criptografado)
    const sessionRecord = await this.prisma.whatsAppSession.findFirst({
      where: { provider: 'baileys' },
    });

    // Usa multiFileAuthState em pasta tmp (mais simples e compatível com Baileys)
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    // Se tínhamos sessão criptografada no banco, restaura para o tmp
    // (simplificado: em produção você persistiria apenas as credenciais)

    const { version } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger as any),
      },
      printQRInTerminal: false,
      logger: logger.child({ name: 'baileys' }) as any,
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
    });

    this.sock.ev.on('creds.update', async () => {
      await saveCreds();
      // Persiste no banco criptografado
      const sessionData = encrypt(JSON.stringify(state.creds));
      await this.prisma.whatsAppSession.upsert({
        where: { id: sessionRecord?.id ?? '00000000-0000-0000-0000-000000000000' },
        create: { provider: 'baileys', sessionData, status: 'connected' },
        update: { sessionData, status: 'connected', updatedAt: new Date() },
      });
    });

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info('QR Code gerado');
        this.setStatus('qr_ready');
        this.qrHandlers.forEach((h) => h(qr));
      }

      if (connection === 'open') {
        logger.info('WhatsApp conectado!');
        this.setStatus('connected');
      }

      if (connection === 'close') {
        const boom = lastDisconnect?.error as Boom | undefined;
        const reason = boom?.output?.statusCode;
        const shouldReconnect = reason !== DisconnectReason.loggedOut;

        logger.warn({ reason }, 'Conexão encerrada');
        this.setStatus('disconnected');

        if (shouldReconnect) {
          logger.info('Reconectando em 5s...');
          setTimeout(() => this.connect(), 5000);
        }
      }
    });

    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const rawMsg of messages) {
        if (!rawMsg.message || rawMsg.key.fromMe) continue;

        const inbound = this.parseInboundMessage(rawMsg);
        if (!inbound) continue;

        for (const handler of this.messageHandlers) {
          try {
            await handler(inbound);
          } catch (err) {
            logger.error({ err }, 'Erro no handler de mensagem');
          }
        }
      }
    });

    this.sock.ev.on('messages.update', (updates) => {
      for (const update of updates) {
        if (!update.update.status || !update.key.id) continue;
        const statusMap: Record<number, MessageStatusUpdate['status']> = {
          1: 'sent',
          2: 'delivered',
          3: 'read',
          4: 'read',
        };
        const status = statusMap[update.update.status as number];
        if (!status) continue;

        this.statusUpdateHandlers.forEach((h) =>
          h({
            whatsappMessageId: update.key.id!,
            status,
            timestamp: new Date(),
          }),
        );
      }
    });
  }

  async disconnect(): Promise<void> {
    await this.sock?.logout();
    this.sock = null;
    this.setStatus('disconnected');
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  async sendText(to: string, text: string, quotedId?: string): Promise<MessageResult> {
    if (!this.sock) throw new Error('WhatsApp não conectado');
    const jid = this.formatJid(to);

    let quoted: proto.IWebMessageInfo | undefined;
    if (quotedId) {
      // Em produção, buscaria a mensagem original para quote
    }

    const result = await this.sock.sendMessage(jid, { text }, { quoted });
    return { id: result?.key.id ?? '' };
  }

  async sendMedia(to: string, payload: OutboundMediaPayload): Promise<MessageResult> {
    if (!this.sock) throw new Error('WhatsApp não conectado');
    const jid = this.formatJid(to);

    // Converte stream para buffer (necessário para alguns tipos de mídia no Baileys)
    const chunks: Buffer[] = [];
    for await (const chunk of payload.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    let result: proto.IWebMessageInfo | undefined;

    switch (payload.type) {
      case 'image':
        result = await this.sock.sendMessage(jid, {
          image: buffer,
          caption: payload.caption,
          mimetype: payload.mimetype,
        });
        break;
      case 'audio':
        result = await this.sock.sendMessage(jid, {
          audio: buffer,
          mimetype: payload.mimetype,
          ptt: payload.mimetype === 'audio/ogg; codecs=opus',
        });
        break;
      case 'video':
        result = await this.sock.sendMessage(jid, {
          video: buffer,
          caption: payload.caption,
          mimetype: payload.mimetype,
        });
        break;
      case 'document':
        result = await this.sock.sendMessage(jid, {
          document: buffer,
          mimetype: payload.mimetype,
          fileName: payload.filename,
        });
        break;
    }

    return { id: result?.key.id ?? '' };
  }

  async downloadMedia(message: InboundMessage): Promise<NodeJS.ReadableStream> {
    if (!this.sock) throw new Error('WhatsApp não conectado');
    // Em produção, usaria downloadMediaMessage do Baileys
    throw new Error('Not implemented');
  }

  onMessage(handler: (msg: InboundMessage) => Promise<void>): void {
    this.messageHandlers.push(handler);
  }

  onStatusChange(handler: (status: ConnectionStatus) => void): void {
    this.statusHandlers.push(handler);
  }

  onQRCode(handler: (qr: string) => void): void {
    this.qrHandlers.push(handler);
  }

  onMessageStatusUpdate(handler: (update: MessageStatusUpdate) => void): void {
    this.statusUpdateHandlers.push(handler);
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.statusHandlers.forEach((h) => h(status));
    // Persiste status no banco
    this.prisma.whatsAppSession
      .updateMany({
        where: { provider: 'baileys' },
        data: {
          status:
            status === 'connected'
              ? 'connected'
              : status === 'connecting'
                ? 'connecting'
                : 'disconnected',
        },
      })
      .catch(() => {});
  }

  private formatJid(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return `${digits}@s.whatsapp.net`;
  }

  private parseInboundMessage(raw: proto.IWebMessageInfo): InboundMessage | null {
    const msg = raw.message;
    if (!msg) return null;

    const from = raw.key.remoteJid?.replace('@s.whatsapp.net', '') ?? '';
    const timestamp = new Date((raw.messageTimestamp as number) * 1000);
    const whatsappMessageId = raw.key.id ?? '';
    const quotedMessageId =
      raw.message?.extendedTextMessage?.contextInfo?.stanzaId ?? undefined;

    // Texto simples
    const text = msg.conversation ?? msg.extendedTextMessage?.text;
    if (text) {
      return {
        whatsappMessageId,
        from,
        type: 'text',
        content: { text },
        timestamp,
        quotedMessageId,
      };
    }

    // Imagem
    if (msg.imageMessage) {
      return {
        whatsappMessageId,
        from,
        type: 'image',
        content: {
          caption: msg.imageMessage.caption ?? undefined,
          mimetype: msg.imageMessage.mimetype ?? undefined,
        },
        timestamp,
      };
    }

    // Áudio
    if (msg.audioMessage) {
      return {
        whatsappMessageId,
        from,
        type: 'audio',
        content: { mimetype: msg.audioMessage.mimetype ?? undefined },
        timestamp,
      };
    }

    // Vídeo
    if (msg.videoMessage) {
      return {
        whatsappMessageId,
        from,
        type: 'video',
        content: {
          caption: msg.videoMessage.caption ?? undefined,
          mimetype: msg.videoMessage.mimetype ?? undefined,
        },
        timestamp,
      };
    }

    // Documento
    if (msg.documentMessage) {
      return {
        whatsappMessageId,
        from,
        type: 'document',
        content: { mimetype: msg.documentMessage.mimetype ?? undefined },
        timestamp,
      };
    }

    // Localização
    if (msg.locationMessage) {
      return {
        whatsappMessageId,
        from,
        type: 'location',
        content: {
          latitude: msg.locationMessage.degreesLatitude ?? undefined,
          longitude: msg.locationMessage.degreesLongitude ?? undefined,
        },
        timestamp,
      };
    }

    // Sticker
    if (msg.stickerMessage) {
      return {
        whatsappMessageId,
        from,
        type: 'sticker',
        content: {},
        timestamp,
      };
    }

    return null;
  }
}
