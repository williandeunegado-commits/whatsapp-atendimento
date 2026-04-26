// Tipos de eventos Socket.IO
export const SocketEvents = {
  CONVERSATION_NEW: 'conversation:new',
  CONVERSATION_ASSIGNED: 'conversation:assigned',
  CONVERSATION_RESOLVED: 'conversation:resolved',
  CONVERSATION_REOPENED: 'conversation:reopened',
  CONVERSATION_TRANSFERRED: 'conversation:transferred',
  MESSAGE_NEW: 'message:new',
  MESSAGE_STATUS: 'message:status',
  WHATSAPP_STATUS: 'whatsapp:status',
  WHATSAPP_QR: 'whatsapp:qr',
} as const;

export type SocketEvent = typeof SocketEvents[keyof typeof SocketEvents];
