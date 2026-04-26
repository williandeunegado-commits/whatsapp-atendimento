import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuickReplies } from '../../hooks/useConversations';

interface Props {
  conversationId: string;
  onSend: (text: string, type: 'text') => void;
  onSendFile: (file: File) => void;
  disabled?: boolean;
}

export function MessageInput({ conversationId: _cid, onSend, onSendFile, disabled }: Props) {
  const [text, setText] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: quickReplies = [] } = useQuickReplies(quickSearch);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Detecta / no início para autocomplete de respostas rápidas
    const slashMatch = val.match(/^\/(\w*)$/);
    if (slashMatch) {
      setQuickSearch(slashMatch[1]);
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
      setQuickSearch('');
    }

    // Auto-resize textarea
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setShowQuickReplies(false);
    }
  };

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, 'text');
    setText('');
    setShowQuickReplies(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, disabled, onSend]);

  const applyQuickReply = (replyText: string) => {
    setText(replyText);
    setShowQuickReplies(false);
    textareaRef.current?.focus();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendFile(file);
      e.target.value = '';
    }
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, [_cid]);

  return (
    <div className="relative border-t border-gray-200 bg-white px-4 py-3">
      {/* Quick replies dropdown */}
      {showQuickReplies && (
        <div className="absolute bottom-full left-4 right-4 mb-1 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-10">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50">
            Respostas rápidas
          </div>
          {quickReplies.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-400">Nenhuma resposta encontrada</p>
          ) : (
            <ul className="max-h-48 overflow-y-auto">
              {quickReplies.map((qr) => (
                <li key={qr.id}>
                  <button
                    onClick={() => applyQuickReply(qr.text)}
                    className="w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-xs font-semibold text-brand-600">/{qr.shortcut}</span>
                    <p className="mt-0.5 text-sm text-gray-700 truncate">{qr.text}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* File upload */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          title="Anexar arquivo"
          className="flex-shrink-0 rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-600 transition-colors disabled:opacity-40"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? 'Atenda a conversa para enviar mensagens' : 'Digite uma mensagem... (/ para respostas rápidas)'}
          rows={1}
          className="flex-1 resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-400 disabled:opacity-50 placeholder:text-gray-400"
          style={{ maxHeight: '150px', overflowY: 'auto' }}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          title="Enviar mensagem"
          className="flex-shrink-0 rounded-full bg-brand-600 p-2.5 text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95 disabled:opacity-40 disabled:hover:bg-brand-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      <p className="mt-1.5 text-center text-[10px] text-gray-400">
        Enter para enviar · Shift+Enter para nova linha · / para respostas rápidas
      </p>
    </div>
  );
}
