import { create } from 'zustand'

interface SidebarState {
  collapsed: boolean
  toggleCollapsed: () => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: false,
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
}))
