import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserPayload {
  name: string;
  email: string;
  role: 'agent' | 'admin';
  password?: string;
  departmentId?: string | null;
}

export function useUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data } = await api.get('/admin/users');
      return data as any[];
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UserPayload) => {
      const { data } = await api.post('/admin/users', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UserPayload & { id: string }) => {
      const { data } = await api.put(`/admin/users/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

// ─── Departments ──────────────────────────────────────────────────────────────

export interface DepartmentPayload {
  name: string;
  color: string;
  description?: string;
}

export function useDepartments() {
  return useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: async () => {
      const { data } = await api.get('/admin/departments');
      return data as any[];
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DepartmentPayload) => {
      const { data } = await api.post('/admin/departments', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'departments'] }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: DepartmentPayload & { id: string }) => {
      const { data } = await api.put(`/admin/departments/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'departments'] }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/departments/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'departments'] }),
  });
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export interface LabelPayload {
  name: string;
  color: string;
}

export function useLabels() {
  return useQuery({
    queryKey: ['admin', 'labels'],
    queryFn: async () => {
      const { data } = await api.get('/admin/labels');
      return data as any[];
    },
  });
}

export function useCreateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LabelPayload) => {
      const { data } = await api.post('/admin/labels', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'labels'] }),
  });
}

export function useUpdateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: LabelPayload & { id: string }) => {
      const { data } = await api.put(`/admin/labels/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'labels'] }),
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/labels/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'labels'] }),
  });
}

// ─── Quick Replies ─────────────────────────────────────────────────────────────

export interface QuickReplyPayload {
  shortcut: string;
  text: string;
  departmentId?: string | null;
}

export function useAdminQuickReplies() {
  return useQuery({
    queryKey: ['admin', 'quick-replies'],
    queryFn: async () => {
      const { data } = await api.get('/admin/quick-replies');
      return data as any[];
    },
  });
}

export function useCreateQuickReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: QuickReplyPayload) => {
      const { data } = await api.post('/admin/quick-replies', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'quick-replies'] }),
  });
}

export function useUpdateQuickReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: QuickReplyPayload & { id: string }) => {
      const { data } = await api.put(`/admin/quick-replies/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'quick-replies'] }),
  });
}

export function useDeleteQuickReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/quick-replies/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'quick-replies'] }),
  });
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

export function useWhatsAppStatus() {
  return useQuery({
    queryKey: ['whatsapp', 'status'],
    queryFn: async () => {
      const { data } = await api.get('/whatsapp/status');
      return data as { status: 'connected' | 'disconnected' | 'awaiting_qr'; qrCode?: string };
    },
    refetchInterval: 3_000,
  });
}

export function useWhatsAppConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/whatsapp/connect');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp', 'status'] }),
  });
}

export function useWhatsAppDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/whatsapp/disconnect');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp', 'status'] }),
  });
}
