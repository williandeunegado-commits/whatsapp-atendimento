import type { FastifyInstance } from 'fastify';
import type { WhatsAppProvider } from '../../providers/WhatsAppProvider.js';
import { logger } from '../../lib/logger.js';

/**
 * O provider WhatsApp é injetado via decorador fastify.whatsapp,
 * registrado no plugin whatsapp.ts (a ser criado em src/plugins/whatsapp.ts).
 *
 * declare module 'fastify' {
 *   interface FastifyInstance {
 *     whatsapp: WhatsAppProvider;
 *   }
 * }
 */

// Armazena o QR code mais recente em memória (substituído a cada geração)
let currentQR: string | null = null;
let qrGeneratedAt: Date | null = null;

export async function whatsappAdminRoutes(fastify: FastifyInstance) {
  // Captura QR codes emitidos pelo provider assim que as rotas são registradas
  const provider = (fastify as any).whatsapp as WhatsAppProvider | undefined;

  if (provider) {
    provider.onQRCode((qr) => {
      currentQR = qr;
      qrGeneratedAt = new Date();
      logger.info('QR Code atualizado nas rotas admin');
    });
  }

  // GET /api/admin/whatsapp/status
  // Retorna o status atual da conexão WhatsApp
  fastify.get(
    '/status',
    { onRequest: [fastify.authorizeAdmin] },
    async (_req, reply) => {
      const provider = (fastify as any).whatsapp as WhatsAppProvider | undefined;

      if (!provider) {
        return reply.status(503).send({
          status: 'unavailable',
          message: 'WhatsApp provider não inicializado',
        });
      }

      return reply.send({
        status: provider.getStatus(),
        timestamp: new Date().toISOString(),
      });
    },
  );

  // GET /api/admin/whatsapp/qr
  // Retorna o QR code atual para escaneamento.
  // Suporta polling simples (JSON) e SSE (Accept: text/event-stream).
  fastify.get(
    '/qr',
    { onRequest: [fastify.authorizeAdmin] },
    async (req, reply) => {
      const acceptSSE =
        req.headers.accept?.includes('text/event-stream') ?? false;

      const provider = (fastify as any).whatsapp as WhatsAppProvider | undefined;
      if (!provider) {
        return reply.status(503).send({ error: 'Provider não disponível' });
      }

      const status = provider.getStatus();

      // Se já está conectado, QR não é necessário
      if (status === 'connected') {
        return reply.send({ status: 'connected', qr: null });
      }

      // --- SSE ---
      if (acceptSSE) {
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });

        // Envia QR atual imediatamente se disponível
        if (currentQR) {
          reply.raw.write(`data: ${JSON.stringify({ qr: currentQR, generatedAt: qrGeneratedAt })}\n\n`);
        }

        // Envia novos QRs conforme gerados
        const handler = (qr: string) => {
          reply.raw.write(
            `data: ${JSON.stringify({ qr, generatedAt: new Date().toISOString() })}\n\n`,
          );
        };
        provider.onQRCode(handler);

        // Heartbeat a cada 25s para manter conexão viva
        const heartbeat = setInterval(() => {
          reply.raw.write(': ping\n\n');
        }, 25000);

        req.socket.on('close', () => {
          clearInterval(heartbeat);
          logger.debug('SSE cliente QR desconectado');
        });

        return;
      }

      // --- Polling simples (JSON) ---
      if (!currentQR) {
        return reply.status(202).send({
          status,
          qr: null,
          message: 'QR Code ainda não disponível — aguarde ou acione /connect',
        });
      }

      // QR expira após 60 segundos (Baileys gera um novo automaticamente)
      const ageMs = qrGeneratedAt ? Date.now() - qrGeneratedAt.getTime() : Infinity;
      if (ageMs > 60_000) {
        return reply.status(202).send({
          status,
          qr: null,
          message: 'QR Code expirado — aguarde a geração de um novo',
        });
      }

      return reply.send({
        status,
        qr: currentQR,
        generatedAt: qrGeneratedAt?.toISOString(),
        expiresInMs: Math.max(0, 60_000 - ageMs),
      });
    },
  );

  // POST /api/admin/whatsapp/connect
  // Inicia (ou reinicia) a conexão com o WhatsApp
  fastify.post(
    '/connect',
    { onRequest: [fastify.authorizeAdmin] },
    async (_req, reply) => {
      const provider = (fastify as any).whatsapp as WhatsAppProvider | undefined;

      if (!provider) {
        return reply.status(503).send({ error: 'Provider não disponível' });
      }

      const currentStatus = provider.getStatus();
      if (currentStatus === 'connected') {
        return reply.send({ status: 'connected', message: 'Já conectado' });
      }

      if (currentStatus === 'connecting') {
        return reply.send({
          status: 'connecting',
          message: 'Conexão já em andamento',
        });
      }

      // Reseta QR ao iniciar nova conexão
      currentQR = null;
      qrGeneratedAt = null;

      // Inicia conexão de forma assíncrona — não aguarda (connect pode demorar)
      provider.connect().catch((err: unknown) => {
        logger.error({ err }, 'Erro ao conectar WhatsApp');
      });

      logger.info('Conexão WhatsApp iniciada via API admin');

      return reply.status(202).send({
        status: 'connecting',
        message: 'Conexão iniciada — aguarde o QR Code em GET /qr',
      });
    },
  );

  // POST /api/admin/whatsapp/disconnect
  // Encerra a sessão WhatsApp (faz logout)
  fastify.post(
    '/disconnect',
    { onRequest: [fastify.authorizeAdmin] },
    async (_req, reply) => {
      const provider = (fastify as any).whatsapp as WhatsAppProvider | undefined;

      if (!provider) {
        return reply.status(503).send({ error: 'Provider não disponível' });
      }

      const currentStatus = provider.getStatus();
      if (currentStatus === 'disconnected') {
        return reply.send({
          status: 'disconnected',
          message: 'Já está desconectado',
        });
      }

      await provider.disconnect();

      // Limpa QR em memória
      currentQR = null;
      qrGeneratedAt = null;

      logger.info('WhatsApp desconectado via API admin');

      return reply.send({
        status: 'disconnected',
        message: 'Sessão encerrada com sucesso',
      });
    },
  );
}
