import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { outboundQueue } from '../../lib/queue.js';
import { logger } from '../../lib/logger.js';

// Schemas de validação

const sendTextBodySchema = z.object({
  conversationId: z.string().uuid(),
  type: z.literal('text'),
  content: z.object({
    text: z.string().min(1).max(4096),
  }),
  quotedMessageId: z.string().uuid().optional(),
});

const sendMediaBodySchema = z.object({
  conversationId: z.string().uuid(),
  type: z.enum(['image', 'audio', 'video', 'document']),
  content: z.object({
    url: z.string().url(), // URL do arquivo já armazenado no MinIO
    mimetype: z.string(),
    caption: z.string().max(1024).optional(),
    filename: z.string().optional(),
  }),
  quotedMessageId: z.string().uuid().optional(),
});

const sendMessageBodySchema = z.discriminatedUnion('type', [
  sendTextBodySchema,
  sendMediaBodySchema,
]);

const internalNoteBodySchema = z.object({
  conversationId: z.string().uuid(),
  content: z.object({
    text: z.string().min(1).max(4096),
  }),
});

export async function messagesRoutes(fastify: FastifyInstance) {
  // POST /api/messages — enviar mensagem (text ou media)
  fastify.post(
    '/',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const input = sendMessageBodySchema.parse(req.body);

      // Verifica se a conversa existe e está acessível
      const conversation = await fastify.prisma.conversation.findUniqueOrThrow({
        where: { id: input.conversationId },
        include: {
          contact: { select: { id: true, phone: true } },
        },
      });

      if (conversation.status === 'resolved') {
        return reply.status(400).send({
          error: 'Não é possível enviar mensagens para conversas resolvidas',
        });
      }

      // Cria a mensagem no banco com status "pending"
      const message = await fastify.prisma.message.create({
        data: {
          conversationId: input.conversationId,
          senderUserId: req.user.sub,
          direction: 'outbound',
          type: input.type,
          content: input.content as any,
          status: 'pending',
          quotedMessageId: input.quotedMessageId ?? null,
          isInternalNote: false,
        },
      });

      // Enfileira para envio assíncrono pelo WhatsApp
      await outboundQueue.add(
        'send-message',
        {
          messageId: message.id,
          conversationId: input.conversationId,
          phone: conversation.contact.phone,
          type: input.type,
          content: input.content,
          quotedMessageId: input.quotedMessageId,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );

      // Atualiza lastMessageAt na conversa
      await fastify.prisma.conversation.update({
        where: { id: input.conversationId },
        data: { lastMessageAt: new Date() },
      });

      logger.info(
        { messageId: message.id, conversationId: input.conversationId },
        'Mensagem enfileirada para envio',
      );

      return reply.status(201).send(message);
    },
  );

  // POST /api/messages/note — adicionar nota interna (não enviada ao WhatsApp)
  fastify.post(
    '/note',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const input = internalNoteBodySchema.parse(req.body);

      // Verifica se a conversa existe
      await fastify.prisma.conversation.findUniqueOrThrow({
        where: { id: input.conversationId },
      });

      // Notas internas são salvas direto — sem passar pelo WhatsApp
      const note = await fastify.prisma.message.create({
        data: {
          conversationId: input.conversationId,
          senderUserId: req.user.sub,
          direction: 'outbound',
          type: 'text',
          content: input.content as any,
          status: 'sent',
          isInternalNote: true,
        },
        include: {
          senderUser: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      // Atualiza lastMessageAt na conversa
      await fastify.prisma.conversation.update({
        where: { id: input.conversationId },
        data: { lastMessageAt: new Date() },
      });

      logger.info(
        { noteId: note.id, conversationId: input.conversationId, userId: req.user.sub },
        'Nota interna adicionada',
      );

      return reply.status(201).send(note);
    },
  );
}
