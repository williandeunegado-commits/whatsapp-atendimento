import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redisConnection } from '../../lib/queue.js';
import { logger } from '../../lib/logger.js';
import type { InboundMessage } from '@wa/shared';

export interface IngestJobData {
  message: InboundMessage & { timestamp: string }; // JSON serialized
}

export class IngestWorker {
  private worker: Worker;

  constructor(private prisma: PrismaClient) {
    this.worker = new Worker<IngestJobData>(
      'message-ingest',
      async (job) => this.process(job),
      {
        connection: redisConnection,
        concurrency: 1, // evita corrida em duplas de mensagem
        limiter: { max: 50, duration: 1000 },
      },
    );

    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, 'IngestWorker job failed');
    });

    logger.info('IngestWorker iniciado');
  }

  private async process(job: Job<IngestJobData>): Promise<void> {
    const { message } = job.data;
    const timestamp = new Date(message.timestamp);

    logger.debug(
      { from: message.from, type: message.type, waId: message.whatsappMessageId },
      'Processando mensagem',
    );

    // 1. Upsert contato
    const contact = await this.prisma.contact.upsert({
      where: { phone: message.from },
      create: { phone: message.from, name: message.from }, // nome será atualizado depois
      update: {},
    });

    // 2. Busca conversa aberta ou pendente
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        contactId: contact.id,
        status: { in: ['pending', 'open'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Se não existe conversa ativa, cria uma nova (pending)
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { contactId: contact.id, status: 'pending' },
      });
      logger.info({ conversationId: conversation.id }, 'Nova conversa criada');
    }

    // 4. Insere mensagem com idempotência
    // Verifica duplicidade pelo whatsappMessageId antes de criar
    if (message.whatsappMessageId) {
      const existing = await this.prisma.message.findUnique({
        where: { whatsappMessageId: message.whatsappMessageId },
      });
      if (existing) {
        logger.debug({ waId: message.whatsappMessageId }, 'Mensagem duplicada ignorada');
        return; // idempotência
      }
    }

    const savedMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        whatsappMessageId: message.whatsappMessageId || null,
        direction: 'inbound',
        type: message.type,
        content: message.content as any,
        status: 'delivered',
        createdAt: timestamp,
      },
    });

    // 5. Atualiza lastMessageAt na conversa
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: timestamp, updatedAt: new Date() },
    });

    // 6. Se conversa estava resolved e chegou nova mensagem → reopen
    if (conversation.status === 'resolved') {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: 'pending', resolvedAt: null, assignedUserId: null },
      });
      await this.prisma.conversationEvent.create({
        data: { conversationId: conversation.id, type: 'reopened', data: {} },
      });
      logger.info({ conversationId: conversation.id }, 'Conversa reaberta');
    }

    logger.info(
      { messageId: savedMessage.id, conversationId: conversation.id },
      'Mensagem processada',
    );
  }

  async close() {
    await this.worker.close();
  }
}
