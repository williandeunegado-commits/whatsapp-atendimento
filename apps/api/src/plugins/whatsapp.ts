import fp from 'fastify-plugin';
import { createWhatsAppProvider } from '../providers/WhatsAppProvider.js';
import { IngestWorker } from '../modules/messages/ingest.worker.js';
import { ingestQueue } from '../lib/queue.js';
import type { WhatsAppProvider } from '@wa/shared';
import { logger } from '../lib/logger.js';

declare module 'fastify' {
  interface FastifyInstance {
    whatsapp: WhatsAppProvider;
  }
}

export default fp(async (fastify) => {
  const provider = createWhatsAppProvider(fastify.prisma);

  // Recebe mensagens do WhatsApp → enfileira para processamento
  provider.onMessage(async (msg) => {
    await ingestQueue.add('ingest', {
      message: { ...msg, timestamp: msg.timestamp.toISOString() },
    }, {
      jobId: msg.whatsappMessageId, // idempotência no nível da fila também
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  });

  // Atualização de status de mensagens → emite via Socket.IO
  provider.onMessageStatusUpdate((update) => {
    fastify.io.emit('message:status', update);
  });

  // Mudança de status de conexão → emite para todos
  provider.onStatusChange((status) => {
    fastify.io.emit('whatsapp:status', { status });
    logger.info({ status }, 'WhatsApp status changed');
  });

  // QR Code → emite para admins
  provider.onQRCode((qr) => {
    fastify.io.emit('whatsapp:qr', { qr });
  });

  // Inicia o worker de ingestão
  const worker = new IngestWorker(fastify.prisma);

  fastify.decorate('whatsapp', provider);

  fastify.addHook('onReady', async () => {
    // Tenta reconectar sessão existente
    const session = await fastify.prisma.whatsAppSession.findFirst({
      where: { provider: 'baileys', status: 'connected' },
    });
    if (session) {
      logger.info('Reconectando sessão WhatsApp existente...');
      provider.connect().catch((err: Error) => logger.error({ err }, 'Falha ao reconectar'));
    }
  });

  fastify.addHook('onClose', async () => {
    await worker.close();
    await provider.disconnect();
  });
}, { name: 'whatsapp', dependencies: ['prisma', 'socket'] });
