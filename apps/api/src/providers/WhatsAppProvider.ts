// Apenas re-exporta a interface — a implementação fica em BaileysProvider.ts
export type {
  WhatsAppProvider,
  InboundMessage,
  MessageResult,
  MessageStatusUpdate,
  OutboundMediaPayload,
  ConnectionStatus,
  MessageContent,
  MessageType,
} from '@wa/shared';

export { BaileysProvider } from './BaileysProvider.js';

// Factory — troque aqui para usar MetaCloudProvider no futuro
import { BaileysProvider } from './BaileysProvider.js';
import type { WhatsAppProvider } from '@wa/shared';
import type { PrismaClient } from '@prisma/client';

export function createWhatsAppProvider(prisma: PrismaClient): WhatsAppProvider {
  return new BaileysProvider(prisma);
}
