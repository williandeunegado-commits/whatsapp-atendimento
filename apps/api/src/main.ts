import 'dotenv/config';
import { buildApp } from './app.js';
import { config } from './config.js';
import { logger } from './lib/logger.js';

const app = await buildApp();

try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  logger.info(`API rodando na porta ${config.PORT}`);
} catch (err) {
  logger.error(err);
  process.exit(1);
}
