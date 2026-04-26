import fp from 'fastify-plugin';
import { Client as MinioClient } from 'minio';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

declare module 'fastify' {
  interface FastifyInstance {
    minio: MinioClient;
  }
}

export default fp(async (fastify) => {
  const minio = new MinioClient({
    endPoint: config.MINIO_ENDPOINT,
    port: config.MINIO_PORT,
    useSSL: config.MINIO_USE_SSL,
    accessKey: config.MINIO_ACCESS_KEY,
    secretKey: config.MINIO_SECRET_KEY,
  });

  // Garante que o bucket existe
  const exists = await minio.bucketExists(config.MINIO_BUCKET);
  if (!exists) {
    await minio.makeBucket(config.MINIO_BUCKET, 'us-east-1');
    logger.info({ bucket: config.MINIO_BUCKET }, 'Bucket MinIO criado');
  }

  fastify.decorate('minio', minio);
  logger.info('MinIO conectado');
}, { name: 'minio' });
