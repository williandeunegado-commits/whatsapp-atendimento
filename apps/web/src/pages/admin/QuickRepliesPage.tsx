import React, { useState } from 'react';
import {
  useAdminQuickReplies,
  useCreateQuickReply,
  useUpdateQuickReply,
  useDeleteQuickReply,
  useDepartments,
  type QuickReplyPayload,
} from '../../hooks/useAdmin';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

const emptyForm: QuickReplyPayload & { id?: string } = {
  shortcut: '',
  text: '',
  departmentId: null,
};

export default function QuickRepliesPage() {
  const { data: replies = [], isLoading } = useAdminQuickReplies();
  const { data: departments = [] } = useDepartments();
  const createReply = useCreateQuickReply();
  const updateReply = useUpdateQuickReply();
  const deleteReply = useDeleteQuickReply();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<QuickReplyPayload & { id?: string }>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const filteredReplies = (replies as any[]).filter(
    (r: any) =>
      r.shortcut.toLowerCase().includes(search.toLowerCase()) ||
      r.text.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (reply: any) => {
    setForm({
      id: reply.id,
      shortcut: reply.shortcut,
      text: reply.text,
      departmentId: reply.departmentId ?? null,
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const sanitized = { ...form, shortcut: form.shortcut.replace(/^\/+/, '') };
    try {
      if (sanitized.id) {
        await updateReply.mutateAsync(sanitized as any);
      } else {
        await createReply.mutateAsync(sanitized);
      }
      setModalOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao salvar resposta rápida');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReply.mutateAsync(id);
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Respostas Rápidas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Atalhos de texto para agilizar o atendimento</p>
        </div>
        <Button onClick={openCreate}>Nova resposta</Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por atalho ou texto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-400"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Atalho</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Texto</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden md:table-cell">Setor</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReplies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                    {search ? 'Nenhuma resposta encontrada' : 'Nenhuma resposta rápida cadastrada'}
                  </td>
                </tr>
              ) : (
                filteredReplies.map((reply: any) => (
                  <tr key={reply.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <code className="rounded bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
                        /{reply.shortcut}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 line-clamp-2 text-xs leading-relaxed max-w-md">
                        {reply.text}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs">
                      {reply.department?.name ?? 'Global'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(reply)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(reply.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Editar resposta rápida' : 'Nova resposta rápida'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Atalho
              <span className="ml-1 text-xs text-gray-400">(sem barra, ex: saudacao)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-mono">/</span>
              <input
                required
                value={form.shortcut.replace(/^\/+/, '')}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shortcut: e.target.value.replace(/\s+/g, '_') }))
                }
                className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-400 font-mono"
                placeholder="saudacao"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texto da resposta</label>
            <textarea
              required
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-400 resize-y"
              placeholder="Olá! Seja bem-vindo ao nosso atendimento..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Setor <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <select
              value={form.departmentId ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, departmentId: e.target.value || null }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="">Global (todos os setores)</option>
              {(departments as any[]).map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createReply.isPending || updateReply.isPending}>
              {form.id ? 'Salvar' : 'Criar resposta'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Excluir resposta rápida"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          Tem certeza que deseja excluir esta resposta rápida?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button
            variant="danger"
            loading={deleteReply.isPending}
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  );
}
