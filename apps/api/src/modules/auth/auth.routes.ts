import type { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service.js';
import { loginSchema, refreshSchema } from './auth.schema.js';

export async function authRoutes(fastify: FastifyInstance) {
  const service = new AuthService(fastify.prisma);

  fastify.post('/login', async (req, reply) => {
    const input = loginSchema.parse(req.body);
    const result = await service.login(input.email, input.password);
    return reply.send(result);
  });

  fastify.post('/refresh', async (req, reply) => {
    const input = refreshSchema.parse(req.body);
    const result = await service.refresh(input.refreshToken);
    return reply.send(result);
  });

  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const user = await fastify.prisma.user.findUniqueOrThrow({
      where: { id: req.user.sub },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    });
    return reply.send(user);
  });
}
