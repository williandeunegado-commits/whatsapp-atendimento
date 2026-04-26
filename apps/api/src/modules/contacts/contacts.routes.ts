import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ContactsService } from './contacts.service.js';

const createContactSchema = z.object({
  phone: z.string().min(10).max(20),
  name: z.string().min(1).max(150),
  avatarUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

const updateContactSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  notes: z.string().optional(),
});

const findAllQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isBlocked: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  labelId: z.string().uuid().optional(),
});

const labelSchema = z.object({
  labelId: z.string().uuid(),
});

export async function contactsRoutes(fastify: FastifyInstance) {
  const service = new ContactsService(fastify.prisma);

  // GET /api/contacts
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const query = findAllQuerySchema.parse(req.query);
    const result = await service.findAll(query);
    return reply.send(result);
  });

  // GET /api/contacts/:id
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const contact = await service.findById(req.params.id);
      return reply.send(contact);
    },
  );

  // POST /api/contacts
  fastify.post('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const input = createContactSchema.parse(req.body);
    const contact = await service.create(input);
    return reply.status(201).send(contact);
  });

  // PATCH /api/contacts/:id
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const input = updateContactSchema.parse(req.body);
      const contact = await service.update(req.params.id, input as any);
      return reply.send(contact);
    },
  );

  // POST /api/contacts/:id/block
  fastify.post<{ Params: { id: string } }>(
    '/:id/block',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const contact = await service.block(req.params.id);
      return reply.send(contact);
    },
  );

  // POST /api/contacts/:id/unblock
  fastify.post<{ Params: { id: string } }>(
    '/:id/unblock',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const contact = await service.unblock(req.params.id);
      return reply.send(contact);
    },
  );

  // POST /api/contacts/:id/labels — add label
  fastify.post<{ Params: { id: string } }>(
    '/:id/labels',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const { labelId } = labelSchema.parse(req.body);
      const result = await service.addLabel(req.params.id, labelId);
      return reply.status(201).send(result);
    },
  );

  // DELETE /api/contacts/:id/labels/:labelId — remove label
  fastify.delete<{ Params: { id: string; labelId: string } }>(
    '/:id/labels/:labelId',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      await service.removeLabel(req.params.id, req.params.labelId);
      return reply.status(204).send();
    },
  );
}
