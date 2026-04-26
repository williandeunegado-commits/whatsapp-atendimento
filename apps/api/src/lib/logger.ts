import pino, { type LoggerOptions } from 'pino';
import { config } from '../config.js';

const opts: LoggerOptions = { level: config.LOG_LEVEL };
if (config.NODE_ENV === 'development') {
  opts.transport = { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } };
}

export const logger = pino(opts);
