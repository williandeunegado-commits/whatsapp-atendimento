import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (fastify) => {
  const prisma = new PrismaClient({
    log: [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'error' }],
  });

  if (process.env.NODE_ENV === 'development') {
    (prisma as any).$on('query', (e: any) => {
      logger.debug({ query: e.query, duration: e.duration }, 'prisma query');
    });
  }

  await prisma.$connect();
  fastify.decorate('prisma', prisma);
  fastify.addHook('onClose', async () => prisma.$disconnect());
}, { name: 'prisma' });
