import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversations, useConversation } from '../hooks/useConversations';
import { useUiStore } from '../store/ui.store';
import { useMe, useLogout } from '../hooks/useAuth';
import { ConversationList } from '../components/conversations/ConversationList';
import { ConversationView } from '../components/conversations/ConversationView';
import { Avatar } from '../components/ui/Avatar';

type StatusFilter = 'pending' | 'open' | 'resolved';

const statusTabs: Array<{ value: StatusFilter; label: string }> = [
  { value: 'pending', label: 'Pendentes' },
  { value: 'open', label: 'Abertos' },
  { value: 'resolved', label: 'Resolvidos' },
];

export default function ChatPage() {
  const me = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  const { selectedConversationId, setSelectedConversation, sidebarOpen, setSidebarOpen } =
    useUiStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [search, setSearch] = useState('');

  const filters: Record<string, string> = { status: statusFilter };
  if (search) filters.search = search;

  const { data: conversationsList, isLoading: loadingList } = useConversations(filters);
  const { data: selectedConv } = useConversation(selectedConversationId);

  const conversations = (conversationsList?.conversations ?? conversationsList ?? []) as any[];

  // On mobile, close sidebar when a conversation is selected
  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'flex' : 'hidden'
        } md:flex flex-col w-full md:w-[360px] lg:w-[400px] flex-shrink-0 bg-white border-r border-gray-200 z-30 absolute md:relative inset-0 md:inset-auto`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <span className="font-semibold text-sm">WA Atendimento</span>
          </div>
          <div className="flex items-center gap-1">
            {me?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                title="Painel admin"
                className="rounded-lg p-1.5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            <button
              onClick={logout}
              title="Sair"
              className="rounded-lg p-1.5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            {me && <Avatar name={me.name} avatarUrl={me.avatarUrl} size="sm" className="ml-1" />}
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="relative">
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
              placeholder="Buscar conversa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl bg-gray-100 py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:bg-white focus:ring-1 focus:ring-brand-400 placeholder:text-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex border-b border-gray-100">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors ${
                statusFilter === tab.value
                  ? 'text-brand-600 border-b-2 border-brand-600'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={handleSelectConversation}
            loading={loadingList}
          />
        </div>
      </aside>

      {/* Conversation area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile back button */}
        {!sidebarOpen && selectedConv && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-3 z-10 rounded-lg bg-white/80 p-1.5 text-gray-600 shadow md:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}

        {selectedConv ? (
          <ConversationView conversation={selectedConv} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-[#f0f2f5] text-gray-400">
            <div className="rounded-full bg-gray-200 p-8 mb-6">
              <svg className="h-16 w-16 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-500">WA Atendimento</h2>
            <p className="mt-2 text-sm text-gray-400 text-center max-w-xs">
              Selecione uma conversa na lista ao lado para começar o atendimento.
            </p>
            <button
              className="mt-4 text-sm text-brand-600 hover:text-brand-700 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              Ver conversas
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
