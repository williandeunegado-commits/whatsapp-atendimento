import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ConversationsService } from './conversations.service.js';

const listQuerySchema = z.object({
  status: z.enum(['pending', 'open', 'resolved']).optional(),
  departmentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  labelId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const messagesQuerySchema = z.object({
  cursor: z.string().optional(), // ISO date string of last fetched message
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const assignBodySchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
});

const transferBodySchema = z.object({
  toUserId: z.string().uuid().optional(),
  toDepartmentId: z.string().uuid().optional(),
  note: z.string().max(500).optional(),
});

export async function conversationsRoutes(fastify: FastifyInstance) {
  const service = new ConversationsService(fastify.prisma);

  // GET /api/conversations
  fastify.get(
    '/',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const query = listQuerySchema.parse(req.query);
      const result = await service.list(query);
      return reply.send(result);
    },
  );

  // GET /api/conversations/:id
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const conversation = await service.findById(req.params.id);
      return reply.send(conversation);
    },
  );

  // GET /api/conversations/:id/messages
  fastify.get<{ Params: { id: string } }>(
    '/:id/messages',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const { cursor, limit } = messagesQuerySchema.parse(req.query);
      const result = await service.getMessages(req.params.id, cursor, limit);
      return reply.send(result);
    },
  );

  // GET /api/conversations/:id/events
  fastify.get<{ Params: { id: string } }>(
    '/:id/events',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const events = await service.getEvents(req.params.id);
      return reply.send(events);
    },
  );

  // POST /api/conversations/:id/assign
  // userId vem do JWT; expectedVersion vem do body para lock otimista
  fastify.post<{ Params: { id: string } }>(
    '/:id/assign',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const { expectedVersion } = assignBodySchema.parse(req.body);
      const result = await service.assign({
        conversationId: req.params.id,
        userId: req.user.sub,
        expectedVersion,
      });
      return reply.send(result);
    },
  );

  // POST /api/conversations/:id/transfer
  fastify.post<{ Params: { id: string } }>(
    '/:id/transfer',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const input = transferBodySchema.parse(req.body);
      if (!input.toUserId && !input.toDepartmentId) {
        return reply
          .status(400)
          .send({ error: 'toUserId ou toDepartmentId é obrigatório' });
      }
      const result = await service.transfer({
        conversationId: req.params.id,
        fromUserId: req.user.sub,
        ...input,
      });
      return reply.send(result);
    },
  );

  // POST /api/conversations/:id/resolve
  fastify.post<{ Params: { id: string } }>(
    '/:id/resolve',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const result = await service.resolve(req.params.id, req.user.sub);
      return reply.send(result);
    },
  );

  // POST /api/conversations/:id/labels/:labelId
  fastify.post<{ Params: { id: string; labelId: string } }>(
    '/:id/labels/:labelId',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      await service.addLabel(req.params.id, req.params.labelId);
      return reply.status(204).send();
    },
  );

  // DELETE /api/conversations/:id/labels/:labelId
  fastify.delete<{ Params: { id: string; labelId: string } }>(
    '/:id/labels/:labelId',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      await service.removeLabel(req.params.id, req.params.labelId);
      return reply.status(204).send();
    },
  );
}
