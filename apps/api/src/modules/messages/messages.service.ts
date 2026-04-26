import { PrismaClient } from '@prisma/client';
import type { Client as MinioClient } from 'minio';
import type { WhatsAppProvider } from '@wa/shared';
import { config } from '../../config.js';
import { logger } from '../../lib/logger.js';
import { randomUUID } from 'node:crypto';

export class MessagesService {
  constructor(
    private prisma: PrismaClient,
    private minio: MinioClient,
    private whatsapp: WhatsAppProvider,
  ) {}

  async sendText(conversationId: string, text: string, userId: string, quotedMessageId?: string) {
    const conv = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: { contact: { select: { phone: true } } },
    });

    if (conv.status === 'resolved') {
      throw Object.assign(new Error('Conversa encerrada'), { statusCode: 400 });
    }

    // Persiste primeiro, envia depois
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        direction: 'outbound',
        type: 'text',
        content: { text },
        status: 'pending',
        senderUserId: userId,
        quotedMessageId: quotedMessageId ?? null,
      },
    });

    // Atualiza lastMessageAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Envia via WhatsApp (assíncrono, não bloqueia response)
    this.whatsapp.sendText(conv.contact.phone, text).then(async (result) => {
      await this.prisma.message.update({
        where: { id: message.id },
        data: { whatsappMessageId: result.id, status: 'sent' },
      });
    }).catch(async (err: Error) => {
      logger.error({ err, messageId: message.id }, 'Falha ao enviar mensagem');
      await this.prisma.message.update({
        where: { id: message.id },
        data: { status: 'failed' },
      });
    });

    return message;
  }

  async uploadMedia(
    conversationId: string,
    userId: string,
    stream: NodeJS.ReadableStream,
    mimetype: string,
    filename: string,
    mediaType: 'image' | 'audio' | 'video' | 'document',
  ) {
    const conv = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: { contact: { select: { phone: true } } },
    });

    const ext = filename.split('.').pop() ?? 'bin';
    const mediaKey = `${conversationId}/${randomUUID()}.${ext}`;

    // Upload streaming para MinIO — nunca carrega o arquivo inteiro em memória
    await this.minio.putObject(config.MINIO_BUCKET, mediaKey, stream as any, undefined, {
      'Content-Type': mimetype,
      'x-original-filename': filename,
    });

    // Persiste mensagem com referência à mídia
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        direction: 'outbound',
        type: mediaType,
        content: { caption: undefined, mimetype, filename },
        status: 'pending',
        senderUserId: userId,
        mediaKey,
      },
    });

    // Envia via WhatsApp em background
    this.minio.getObject(config.MINIO_BUCKET, mediaKey).then(async (mediaStream) => {
      const result = await this.whatsapp.sendMedia(conv.contact.phone, {
        type: mediaType,
        stream: mediaStream,
        mimetype,
        filename,
      });
      await this.prisma.message.update({
        where: { id: message.id },
        data: { whatsappMessageId: result.id, status: 'sent' },
      });
    }).catch(async (err: Error) => {
      logger.error({ err, messageId: message.id }, 'Falha ao enviar mídia');
      await this.prisma.message.update({
        where: { id: message.id },
        data: { status: 'failed' },
      });
    });

    return message;
  }

  async addInternalNote(conversationId: string, userId: string, text: string) {
    return this.prisma.message.create({
      data: {
        conversationId,
        direction: 'outbound',
        type: 'text',
        content: { text },
        status: 'sent',
        isInternalNote: true,
        senderUserId: userId,
      },
    });
  }

  async getMediaStream(mediaKey: string) {
    return this.minio.getObject(config.MINIO_BUCKET, mediaKey);
  }
}
