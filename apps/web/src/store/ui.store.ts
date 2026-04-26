import { create } from 'zustand';

interface UiStore {
  sidebarOpen: boolean;
  selectedConversationId: string | null;
  setSidebarOpen: (open: boolean) => void;
  setSelectedConversation: (id: string | null) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  selectedConversationId: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedConversation: (id) => set({ selectedConversationId: id }),
}));
