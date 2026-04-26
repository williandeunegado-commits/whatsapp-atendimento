import React from 'react';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/Badge';

interface Conversation {
  id: string;
  status: 'pending' | 'open' | 'resolved';
  contact: { name: string; phone: string; avatarUrl?: string | null };
  lastMessage?: { text?: string; type: string; createdAt: string };
  unreadCount: number;
  assignedAgent?: { name: string } | null;
  department?: { name: string; color: string } | null;
  labels?: Array<{ name: string; color: string }>;
}

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}

function formatRelativeTime(iso: string) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffH < 24) return `${diffH}h`;
  if (diffD < 7) return `${diffD}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function messagePreview(msg?: { text?: string; type: string }) {
  if (!msg) return '';
  if (msg.type === 'text') return msg.text ?? '';
  if (msg.type === 'image') return '📷 Imagem';
  if (msg.type === 'audio') return '🎙️ Áudio';
  if (msg.type === 'document') return '📄 Documento';
  if (msg.type === 'internal_note') return '📝 Nota interna';
  return '';
}

function SkeletonItem() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 animate-pulse">
      <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="h-3.5 w-32 rounded bg-gray-200" />
          <div className="h-3 w-8 rounded bg-gray-200" />
        </div>
        <div className="h-3 w-48 rounded bg-gray-200" />
      </div>
    </div>
  );
}

export function ConversationList({ conversations, selectedId, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonItem key={i} />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg className="h-12 w-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-sm">Nenhuma conversa</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {conversations.map((conv) => (
        <li key={conv.id}>
          <button
            className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
              selectedId === conv.id ? 'bg-brand-50 border-r-2 border-brand-600' : ''
            }`}
            onClick={() => onSelect(conv.id)}
          >
            <div className="relative flex-shrink-0">
              <Avatar name={conv.contact.name} avatarUrl={conv.contact.avatarUrl} size="md" />
              {conv.status === 'pending' && (
                <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-yellow-400 ring-2 ring-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`truncate text-sm font-semibold ${
                    selectedId === conv.id ? 'text-brand-700' : 'text-gray-900'
                  }`}
                >
                  {conv.contact.name}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {conv.lastMessage && (
                    <span className="text-[11px] text-gray-400">
                      {formatRelativeTime(conv.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 mt-0.5">
                <p className="truncate text-xs text-gray-500">
                  {messagePreview(conv.lastMessage)}
                </p>
                {conv.unreadCount > 0 && (
                  <span className="flex-shrink-0 min-w-[18px] rounded-full bg-brand-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                    {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap gap-1">
                <StatusBadge status={conv.status} />
                {conv.department && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: conv.department.color }}
                  >
                    {conv.department.name}
                  </span>
                )}
                {conv.labels?.map((label) => (
                  <span
                    key={label.name}
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
