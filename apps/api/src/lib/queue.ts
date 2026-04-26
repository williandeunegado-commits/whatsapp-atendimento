import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config.js';

export const redisConnection = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const ingestQueue = new Queue('message-ingest', { connection: redisConnection });
export const outboundQueue = new Queue('message-outbound', { connection: redisConnection });

export const ingestQueueEvents = new QueueEvents('message-ingest', { connection: redisConnection });
