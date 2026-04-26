import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UsersService } from './users.service.js';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'supervisor', 'attendant']).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'supervisor', 'attendant']).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  newPassword: z.string().min(6),
});

const departmentSchema = z.object({
  departmentId: z.string().uuid(),
  role: z.enum(['supervisor', 'attendant']).optional(),
});

export async function usersRoutes(fastify: FastifyInstance) {
  const service = new UsersService(fastify.prisma);

  // GET /api/users — list all (admin only)
  fastify.get('/', { onRequest: [fastify.authorizeAdmin] }, async (_req, reply) => {
    const users = await service.findAll();
    return reply.send(users);
  });

  // GET /api/users/:id — get by id (authenticated)
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const user = await service.findById(req.params.id);
      return reply.send(user);
    },
  );

  // POST /api/users — create (admin only)
  fastify.post('/', { onRequest: [fastify.authorizeAdmin] }, async (req, reply) => {
    const input = createUserSchema.parse(req.body);
    const user = await service.create(input);
    return reply.status(201).send(user);
  });

  // PATCH /api/users/:id — update (admin only)
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authorizeAdmin] },
    async (req, reply) => {
      const input = updateUserSchema.parse(req.body);
      const user = await service.update(req.params.id, input as any);
      return reply.send(user);
    },
  );

  // PATCH /api/users/:id/password — change password (admin or self)
  fastify.patch<{ Params: { id: string } }>(
    '/:id/password',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      // Allow self or admin
      if (req.user.sub !== req.params.id && req.user.role !== 'admin') {
        return reply.status(403).send({ error: 'Forbidden' });
      }
      const { newPassword } = changePasswordSchema.parse(req.body);
      await service.changePassword(req.params.id, newPassword);
      return reply.send({ success: true });
    },
  );

  // DELETE /api/users/:id — deactivate (admin only, soft delete via isActive)
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authorizeAdmin] },
    async (req, reply) => {
      await service.update(req.params.id, { isActive: false });
      return reply.status(204).send();
    },
  );

  // POST /api/users/:id/departments — add to department (admin only)
  fastify.post<{ Params: { id: string } }>(
    '/:id/departments',
    { onRequest: [fastify.authorizeAdmin] },
    async (req, reply) => {
      const { departmentId, role } = departmentSchema.parse(req.body);
      const result = await service.addToDepartment(req.params.id, departmentId, role);
      return reply.status(201).send(result);
    },
  );

  // DELETE /api/users/:id/departments/:departmentId — remove from department (admin only)
  fastify.delete<{ Params: { id: string; departmentId: string } }>(
    '/:id/departments/:departmentId',
    { onRequest: [fastify.authorizeAdmin] },
    async (req, reply) => {
      await service.removeFromDepartment(req.params.id, req.params.departmentId);
      return reply.status(204).send();
    },
  );
}
