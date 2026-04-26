import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { QuickRepliesService } from './quick-replies.service.js';

const createQuickReplySchema = z.object({
  trigger: z.string().min(1).max(50).regex(/^\S+$/, 'Trigger cannot contain spaces'),
  content: z.string().min(1).max(2000),
  departmentId: z.string().uuid().optional(),
});

const updateQuickReplySchema = z.object({
  trigger: z.string().min(1).max(50).regex(/^\S+$/, 'Trigger cannot contain spaces').optional(),
  content: z.string().min(1).max(2000).optional(),
  departmentId: z.string().uuid().nullable().optional(),
});

const findAllQuerySchema = z.object({
  departmentId: z.string().uuid().optional(),
});

const searchQuerySchema = z.object({
  prefix: z.string().min(1),
  departmentId: z.string().uuid().optional(),
});

export async function quickRepliesRoutes(fastify: FastifyInstance) {
  const service = new QuickRepliesService(fastify.prisma);

  // GET /api/quick-replies
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { departmentId } = findAllQuerySchema.parse(req.query);
    const replies = await service.findAll(departmentId);
    return reply.send(replies);
  });

  // GET /api/quick-replies/search?prefix=...&departmentId=...
  fastify.get('/search', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { prefix, departmentId } = searchQuerySchema.parse(req.query);
    const results = await service.searchByTriggerPrefix(prefix, departmentId);
    return reply.send(results);
  });

  // GET /api/quick-replies/:id
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const qr = await service.findById(req.params.id);
      return reply.send(qr);
    },
  );

  // POST /api/quick-replies
  fastify.post('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const input = createQuickReplySchema.parse(req.body);
    const qr = await service.create(input);
    return reply.status(201).send(qr);
  });

  // PATCH /api/quick-replies/:id
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const input = updateQuickReplySchema.parse(req.body);
      const qr = await service.update(req.params.id, input as any);
      return reply.send(qr);
    },
  );

  // DELETE /api/quick-replies/:id
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authorizeAdmin] },
    async (req, reply) => {
      await service.remove(req.params.id);
      return reply.status(204).send();
    },
  );
}
