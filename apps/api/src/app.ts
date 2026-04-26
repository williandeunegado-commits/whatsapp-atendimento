import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { config } from './config.js';
import { logger } from './lib/logger.js';

// Plugins
import prismaPlugin from './plugins/prisma.js';
import redisPlugin from './plugins/redis.js';
import authPlugin from './plugins/auth.js';
import minioPlugin from './plugins/minio.js';
import socketPlugin from './plugins/socket.js';
import whatsappPlugin from './plugins/whatsapp.js';

// Rotas
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { departmentsRoutes } from './modules/departments/departments.routes.js';
import { labelsRoutes } from './modules/labels/labels.routes.js';
import { contactsRoutes } from './modules/contacts/contacts.routes.js';
import { quickRepliesRoutes } from './modules/quick-replies/quick-replies.routes.js';
import { conversationsRoutes } from './modules/conversations/conversations.routes.js';
import { messagesRoutes } from './modules/messages/messages.routes.js';
import { whatsappAdminRoutes } from './modules/admin/whatsapp.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: logger as any,
    ajv: { customOptions: { coerceTypes: 'array', useDefaults: true } },
  });

  // Core plugins
  await app.register(cors, { origin: config.FRONTEND_URL, credentials: true });
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

  // Infraestrutura
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(authPlugin);
  await app.register(minioPlugin);
  await app.register(socketPlugin);
  await app.register(whatsappPlugin);

  // Error handler global
  app.setErrorHandler((error: any, _req, reply) => {
    const status = error.statusCode ?? (error.code === 'P2025' ? 404 : 500);
    if (status >= 500) app.log.error(error);
    else app.log.warn({ error: error.message, statusCode: status });

    // Handle Prisma not found errors
    if (error.code === 'P2025') {
      return reply.status(404).send({ error: 'Resource not found' });
    }

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return reply.status(400).send({ error: 'Validation error', details: error.errors });
    }

    return reply.status(status).send({
      error: error.message ?? 'Internal Server Error',
      ...(config.NODE_ENV === 'development' && { stack: error.stack }),
    });
  });

  // Rotas
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(departmentsRoutes, { prefix: '/api/departments' });
  await app.register(labelsRoutes, { prefix: '/api/labels' });
  await app.register(contactsRoutes, { prefix: '/api/contacts' });
  await app.register(quickRepliesRoutes, { prefix: '/api/quick-replies' });
  await app.register(conversationsRoutes, { prefix: '/api/conversations' });
  await app.register(messagesRoutes, { prefix: '/api/messages' });
  await app.register(whatsappAdminRoutes, { prefix: '/api/admin/whatsapp' });

  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    whatsapp: app.whatsapp?.getStatus() ?? 'unknown',
  }));

  return app;
}
