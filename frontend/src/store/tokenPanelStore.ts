import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GeneratedToken {
  code: string;
  expiresAt: string;
  studentId: string;
  studentName: string;
  class: string;
}

interface TokenPanelState {
  current: GeneratedToken | null;
  revealed: boolean;
  setCurrent: (token: GeneratedToken) => void;
  setRevealed: (revealed: boolean) => void;
  clear: () => void;
}

export const useTokenPanelStore = create<TokenPanelState>()(
  persist(
    (set) => ({
      current: null,
      revealed: false,
      setCurrent: (token) => set({ current: token, revealed: false }),
      setRevealed: (revealed) => set({ revealed }),
      clear: () => set({ current: null, revealed: false }),
    }),
    {
      name: 'school-election-token-panel',
    }
  )
);
