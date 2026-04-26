import React, { useEffect, useRef, useCallback } from 'react';
import { useMessages, useSendMessage, useAssignConversation, useResolveConversation } from '../../hooks/useConversations';
import { MessageBubble } from '../messages/MessageBubble';
import { MessageInput } from '../messages/MessageInput';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useMe } from '../../hooks/useAuth';
import { api } from '../../lib/api';

interface Conversation {
  id: string;
  status: 'pending' | 'open' | 'resolved';
  version: number;
  contact: { name: string; phone: string; avatarUrl?: string | null };
  assignedAgent?: { id: string; name: string } | null;
  department?: { name: string; color: string } | null;
}

interface Props {
  conversation: Conversation;
}

export function ConversationView({ conversation }: Props) {
  const me = useMe();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useMessages(conversation.id);

  const sendMessage = useSendMessage();
  const assignConv = useAssignConversation();
  const resolveConv = useResolveConversation();

  // Flatten pages (oldest first: reverse page order, messages within each page are oldest→newest)
  const allMessages = data
    ? [...data.pages].reverse().flatMap((page: any) =>
        [...(page.messages ?? [])].reverse()
      )
    : [];

  // Scroll to bottom on first load and new messages
  useEffect(() => {
    if (!isFetchingNextPage) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages.length, isFetchingNextPage]);

  // Infinite scroll: load older messages when scrolling to top
  const setupObserver = useCallback(() => {
    if (observer.current) observer.current.disconnect();
    if (!topRef.current || !hasNextPage) return;
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.current.observe(topRef.current);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    setupObserver();
    return () => observer.current?.disconnect();
  }, [setupObserver]);

  const handleSend = (text: string, type: 'text') => {
    sendMessage.mutate({ conversationId: conversation.id, text, type });
  };

  const handleSendFile = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('conversationId', conversation.id);
    const type = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('audio/')
      ? 'audio'
      : 'document';
    form.append('type', type);
    try {
      await api.post('/messages/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  const handleAssign = () => {
    assignConv.mutate({
      conversationId: conversation.id,
      expectedVersion: conversation.version,
    });
  };

  const handleResolve = () => {
    resolveConv.mutate(conversation.id);
  };

  const isAssignedToMe = conversation.assignedAgent?.id === me?.id;
  const canSend = conversation.status === 'open' && isAssignedToMe;

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={conversation.contact.name} avatarUrl={conversation.contact.avatarUrl} size="md" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{conversation.contact.name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-gray-500">{conversation.contact.phone}</p>
              <StatusBadge status={conversation.status} />
              {conversation.department && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: conversation.department.color }}
                >
                  {conversation.department.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {conversation.assignedAgent && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {conversation.assignedAgent.name}
            </span>
          )}

          {conversation.status === 'pending' && (
            <Button
              size="sm"
              variant="primary"
              loading={assignConv.isPending}
              onClick={handleAssign}
            >
              Atender
            </Button>
          )}

          {conversation.status === 'open' && (
            <Button
              size="sm"
              variant="secondary"
              loading={resolveConv.isPending}
              onClick={handleResolve}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Resolver
            </Button>
          )}

          {conversation.status === 'resolved' && (
            <span className="text-xs text-gray-400 italic">Resolvida</span>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Load more trigger */}
        <div ref={topRef} className="h-1" />

        {isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="h-12 w-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          allMessages.map((msg: any) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput
        conversationId={conversation.id}
        onSend={handleSend}
        onSendFile={handleSendFile}
        disabled={!canSend}
      />
    </div>
  );
}
