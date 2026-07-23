import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActivityState {
  lastActivityAt: number | null;
  recordActivity: () => void;
  clear: () => void;
}

// Deliberately separate from idleTimeoutStore (which is in-memory only, for
// the "paused while voting" signal). This one IS persisted to localStorage,
// specifically so it survives a closed browser/tab — idle-timeout's in-memory
// timer only protects a session that stays open; this store is what lets the
// app detect "this session has been inactive for a day" even after the
// browser was fully closed and reopened, before any API call has a chance to
// silently use the still-valid refresh token to restore it.
export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      lastActivityAt: null,
      recordActivity: () => set({ lastActivityAt: Date.now() }),
      clear: () => set({ lastActivityAt: null }),
    }),
    {
      name: 'school-election-last-activity',
    }
  )
);
