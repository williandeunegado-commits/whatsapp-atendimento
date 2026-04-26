import fp from 'fastify-plugin';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import type { JwtPayload } from './auth.js';
import jwt from 'jsonwebtoken';

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

export default fp(async (fastify) => {
  const io = new SocketIOServer(fastify.server, {
    cors: { origin: config.FRONTEND_URL, credentials: true },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  });

  // Redis adapter para suporte multi-instância
  const pubClient = createClient({ url: config.REDIS_URL });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  // Autenticação via JWT no handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user as JwtPayload;
    logger.debug({ userId: user.sub, socketId: socket.id }, 'Socket conectado');

    // Entra na room pessoal
    socket.join(`user:${user.sub}`);

    socket.on('join:conversation', (convId: string) => {
      socket.join(`conv:${convId}`);
    });

    socket.on('leave:conversation', (convId: string) => {
      socket.leave(`conv:${convId}`);
    });

    socket.on('join:department', (deptId: string) => {
      socket.join(`dept:${deptId}`);
    });

    socket.on('disconnect', () => {
      logger.debug({ userId: user.sub }, 'Socket desconectado');
    });
  });

  fastify.decorate('io', io);
  fastify.addHook('onClose', async () => io.close());

  logger.info('Socket.IO iniciado com Redis adapter');
}, { name: 'socket' });
