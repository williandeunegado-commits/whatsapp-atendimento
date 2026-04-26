import type {
  UserRole,
  ConversationStatus,
  MessageDirection,
  MessageType,
  MessageStatus,
  MessageContent,
} from './provider.js';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface DepartmentDto {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

export interface LabelDto {
  id: string;
  name: string;
  color: string;
}

export interface ContactDto {
  id: string;
  phone: string;
  name: string | null;
  avatarUrl: string | null;
  notes: string | null;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationDto {
  id: string;
  contactId: string;
  departmentId: string | null;
  assignedUserId: string | null;
  status: ConversationStatus;
  /** Versão para controle de concorrência optimistic locking */
  version: number;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  lastMessageAt: Date | null;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  whatsappMessageId: string | null;
  direction: MessageDirection;
  type: MessageType;
  content: MessageContent;
  status: MessageStatus;
  isInternalNote: boolean;
  senderUserId: string | null;
  quotedMessageId: string | null;
  /** Chave de armazenamento no MinIO (apenas para mensagens de mídia) */
  mediaKey: string | null;
  createdAt: Date;
}

export interface QuickReplyDto {
  id: string;
  /** Atalho de texto para acionar a resposta rápida (ex: /saudacao) */
  trigger: string;
  content: string;
  departmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
