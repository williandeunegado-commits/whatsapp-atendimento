import React, { useState } from 'react';
import {
  useLabels,
  useCreateLabel,
  useUpdateLabel,
  useDeleteLabel,
  type LabelPayload,
} from '../../hooks/useAdmin';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

const PRESET_COLORS = [
  '#25D366', '#128C7E', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#6366f1',
  '#8b5cf6', '#ec4899', '#64748b', '#0f172a',
];

const emptyForm: LabelPayload & { id?: string } = { name: '', color: '#6366f1' };

export default function LabelsPage() {
  const { data: labels = [], isLoading } = useLabels();
  const createLabel = useCreateLabel();
  const updateLabel = useUpdateLabel();
  const deleteLabel = useDeleteLabel();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<LabelPayload & { id?: string }>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  const openCreate = () => {
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (label: any) => {
    setForm({ id: label.id, name: label.name, color: label.color });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (form.id) {
        await updateLabel.mutateAsync(form as any);
      } else {
        await createLabel.mutateAsync(form);
      }
      setModalOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao salvar etiqueta');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLabel.mutateAsync(id);
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Etiquetas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Classifique as conversas com etiquetas coloridas</p>
        </div>
        <Button onClick={openCreate}>Nova etiqueta</Button>
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
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Etiqueta</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden sm:table-cell">Cor</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden md:table-cell">Conversas</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(labels as any[]).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                    Nenhuma etiqueta cadastrada
                  </td>
                </tr>
              ) : (
                (labels as any[]).map((label: any) => (
                  <tr key={label.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-5 w-5 rounded-full border border-gray-200"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="text-xs text-gray-500 font-mono">{label.color}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {label._count?.conversations ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(label)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(label.id)}
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
        title={form.id ? 'Editar etiqueta' : 'Nova etiqueta'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-400"
              placeholder="Ex: Urgente"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cor</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                    form.color === c ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-7 w-7 rounded-full flex-shrink-0 border border-gray-300"
                style={{ backgroundColor: form.color }}
              />
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="h-7 w-14 rounded border border-gray-300 cursor-pointer"
              />
              <span className="text-xs text-gray-500 font-mono">{form.color}</span>
            </div>
          </div>

          {/* Preview */}
          {form.name && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Preview:</p>
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: form.color }}
              >
                {form.name}
              </span>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createLabel.isPending || updateLabel.isPending}>
              {form.id ? 'Salvar' : 'Criar etiqueta'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Excluir etiqueta"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          Tem certeza que deseja excluir esta etiqueta?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button
            variant="danger"
            loading={deleteLabel.isPending}
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  );
}
