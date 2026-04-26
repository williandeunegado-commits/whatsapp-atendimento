import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DepartmentsService } from './departments.service.js';

const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const updateDepartmentSchema = createDepartmentSchema.partial();

export async function departmentsRoutes(fastify: FastifyInstance) {
  const service = new DepartmentsService(fastify.prisma);

  // GET /api/departments
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (_req, reply) => {
    const departments = await service.findAll();
    return reply.send(departments);
  });

  // GET /api/departments/:id
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const department = await service.findById(req.params.id);
      return reply.send(department);
    },
  );

  // POST /api/departments
  fastify.post('/', { onRequest: [fastify.authorizeAdmin] }, async (req, reply) => {
    const input = createDepartmentSchema.parse(req.body);
    const department = await service.create(input);
    return reply.status(201).send(department);
  });

  // PATCH /api/departments/:id
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authorizeAdmin] },
    async (req, reply) => {
      const input = updateDepartmentSchema.parse(req.body);
      const department = await service.update(req.params.id, input);
      return reply.send(department);
    },
  );

  // DELETE /api/departments/:id
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authorizeAdmin] },
    async (req, reply) => {
      await service.remove(req.params.id);
      return reply.status(204).send();
    },
  );
}
