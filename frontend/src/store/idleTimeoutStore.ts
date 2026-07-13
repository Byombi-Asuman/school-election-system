import { create } from 'zustand';

interface IdleTimeoutState {
  paused: boolean;
  setPaused: (paused: boolean) => void;
}

// Not persisted — this is purely a live, in-memory signal for "don't idle-log-out
// right now" while a student is on the actual voting page. It resets naturally
// on every page load, which is correct: there's nothing to restore across sessions.
export const useIdleTimeoutStore = create<IdleTimeoutState>((set) => ({
  paused: false,
  setPaused: (paused) => set({ paused }),
}));
