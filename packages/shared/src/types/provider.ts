export type ConnectionStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected';
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type UserRole = 'admin' | 'supervisor' | 'attendant';
export type ConversationStatus = 'pending' | 'open' | 'resolved';
export type MessageDirection = 'inbound' | 'outbound';

export interface MessageContent {
  text?: string;
  caption?: string;
  /** Chave de armazenamento no MinIO */
  mediaKey?: string;
  mimetype?: string;
  latitude?: number;
  longitude?: number;
}

export interface InboundMessage {
  whatsappMessageId: string;
  from: string;
  type: MessageType;
  content: MessageContent;
  timestamp: Date;
  quotedMessageId?: string;
}

export interface MessageResult {
  id: string;
}

export interface MessageStatusUpdate {
  whatsappMessageId: string;
  status: MessageStatus;
  timestamp: Date;
}

export interface OutboundMediaPayload {
  type: 'image' | 'audio' | 'video' | 'document';
  stream: NodeJS.ReadableStream;
  mimetype: string;
  filename?: string;
  caption?: string;
}

export interface WhatsAppProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): ConnectionStatus;
  sendText(to: string, text: string, quotedId?: string): Promise<MessageResult>;
  sendMedia(to: string, payload: OutboundMediaPayload): Promise<MessageResult>;
  downloadMedia(message: InboundMessage): Promise<NodeJS.ReadableStream>;
  onMessage(handler: (msg: InboundMessage) => Promise<void>): void;
  onStatusChange(handler: (status: ConnectionStatus) => void): void;
  onQRCode(handler: (qr: string) => void): void;
  onMessageStatusUpdate(handler: (update: MessageStatusUpdate) => void): void;
}
