import fp from 'fastify-plugin';
import { Redis } from 'ioredis';
import { config } from '../config.js';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

export default fp(async (fastify) => {
  const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  redis.on('error', (err) => fastify.log.error({ err }, 'Redis error'));
  fastify.decorate('redis', redis);
  fastify.addHook('onClose', async () => redis.quit());
}, { name: 'redis' });
