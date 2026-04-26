import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

export function useConversations(filters: Record<string, string> = {}) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['conversations', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const { data } = await api.get(`/conversations?${params}`);
      return data;
    },
  });

  // Socket.IO: atualiza lista em tempo real
  useEffect(() => {
    const socket = getSocket();
    const refresh = () => qc.invalidateQueries({ queryKey: ['conversations'] });
    socket.on('conversation:new', refresh);
    socket.on('conversation:assigned', refresh);
    socket.on('conversation:resolved', refresh);
    socket.on('conversation:reopened', refresh);
    return () => {
      socket.off('conversation:new', refresh);
      socket.off('conversation:assigned', refresh);
      socket.off('conversation:resolved', refresh);
      socket.off('conversation:reopened', refresh);
    };
  }, [qc]);

  return q;
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => {
      const { data } = await api.get(`/conversations/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useMessages(conversationId: string | null) {
  const qc = useQueryClient();

  const q = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const params = pageParam ? `?cursor=${pageParam}` : '';
      const { data } = await api.get(`/conversations/${conversationId}/messages${params}`);
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) =>
      lastPage.hasMore ? lastPage.messages[0]?.createdAt : undefined,
    enabled: !!conversationId,
  });

  // Socket.IO: nova mensagem na conversa aberta
  useEffect(() => {
    if (!conversationId) return;
    const socket = getSocket();
    socket.emit('join:conversation', conversationId);
    const handleNewMessage = (msg: any) => {
      if (msg.conversationId === conversationId) {
        qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      }
    };
    socket.on('message:new', handleNewMessage);
    return () => {
      socket.emit('leave:conversation', conversationId);
      socket.off('message:new', handleNewMessage);
    };
  }, [conversationId, qc]);

  return q;
}

export function useAssignConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      expectedVersion,
    }: {
      conversationId: string;
      expectedVersion: number;
    }) => {
      const { data } = await api.post(`/conversations/${conversationId}/assign`, {
        expectedVersion,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { conversationId: string; text?: string; type: string }) => {
      const { data } = await api.post('/messages', input);
      return data;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['messages', vars.conversationId] }),
  });
}

export function useResolveConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data } = await api.post(`/conversations/${conversationId}/resolve`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export function useQuickReplies(search: string = '') {
  return useQuery({
    queryKey: ['quick-replies', search],
    queryFn: async () => {
      const { data } = await api.get(`/quick-replies?search=${encodeURIComponent(search)}`);
      return data as Array<{ id: string; shortcut: string; text: string }>;
    },
    enabled: search.length > 0,
  });
}
