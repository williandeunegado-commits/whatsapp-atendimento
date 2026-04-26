import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { LabelsService } from './labels.service.js';

const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const updateLabelSchema = createLabelSchema.partial();

export async function labelsRoutes(fastify: FastifyInstance) {
  const service = new LabelsService(fastify.prisma);

  // GET /api/labels
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (_req, reply) => {
    const labels = await service.findAll();
    return reply.send(labels);
  });

  // GET /api/labels/:id
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const label = await service.findById(req.params.id);
      return reply.send(label);
    },
  );

  // POST /api/labels
  fastify.post('/', { onRequest: [fastify.authorizeAdmin] }, async (req, reply) => {
    const input = createLabelSchema.parse(req.body);
    const label = await service.create(input);
    return reply.status(201).send(label);
  });

  // PATCH /api/labels/:id
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authorizeAdmin] },
    async (req, reply) => {
      const input = updateLabelSchema.parse(req.body);
      const label = await service.update(req.params.id, input);
      return reply.send(label);
    },
  );

  // DELETE /api/labels/:id
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authorizeAdmin] },
    async (req, reply) => {
      await service.remove(req.params.id);
      return reply.status(204).send();
    },
  );
}
