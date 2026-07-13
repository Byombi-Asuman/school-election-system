import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useIdleTimeoutStore } from '../store/idleTimeoutStore';
import { authService } from '../services/authService';
import { Icons } from './ui/Icons';

// Students are far more likely to be on shared school-lab computers, and their
// whole session starts from a one-time token anyway — short idle window.
// Admins/staff are more likely on personal devices and doing longer work sessions.
const STUDENT_IDLE_MS = 5 * 60 * 1000; // 5 minutes
const STUDENT_WARNING_MS = 60 * 1000; // 60 second countdown
const STAFF_IDLE_MS = 30 * 60 * 1000; // 30 minutes
const STAFF_WARNING_MS = 120 * 1000; // 120 second countdown

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'click', 'keydown', 'scroll', 'touchstart'] as const;
const CHANNEL_NAME = 'school-election-idle-sync';

type SyncMessage = { type: 'activity' } | { type: 'logout' };

export const IdleTimeoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, refreshToken, clearAuth } = useAuthStore();
  const paused = useIdleTimeoutStore((s) => s.paused);

  const [warningVisible, setWarningVisible] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const idleMs = user?.role === 'STUDENT' ? STUDENT_IDLE_MS : STAFF_IDLE_MS;
  const warningMs = user?.role === 'STUDENT' ? STUDENT_WARNING_MS : STAFF_WARNING_MS;

  const clearAllTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
  }, []);

  const doLogout = useCallback(
    (broadcast: boolean) => {
      clearAllTimers();
      setWarningVisible(false);
      if (broadcast) channelRef.current?.postMessage({ type: 'logout' } as SyncMessage);
      authService.logout(refreshToken).catch(() => {});
      clearAuth();
      window.location.href = '/login';
    },
    [clearAllTimers, clearAuth, refreshToken]
  );

  const startWarningCountdown = useCallback(() => {
    setWarningVisible(true);
    setCountdown(Math.floor(warningMs / 1000));
    countdownInterval.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          doLogout(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [warningMs, doLogout]);

  const resetIdleTimer = useCallback(() => {
    if (!user) return;
    clearAllTimers();
    setWarningVisible(false);
    if (paused) return; // voting page has suspended the timer entirely
    idleTimer.current = setTimeout(startWarningCountdown, idleMs);
  }, [user, paused, idleMs, clearAllTimers, startWarningCountdown]);

  // Explicit "Stay logged in" confirmation — the only thing that dismisses the
  // warning once it's showing. Ambient mouse movement no longer silently extends it.
  const confirmPresence = useCallback(() => {
    channelRef.current?.postMessage({ type: 'activity' } as SyncMessage);
    resetIdleTimer();
  }, [resetIdleTimer]);

  // Phase 1: before the warning appears, any real activity resets the clock.
  useEffect(() => {
    if (!user) return;
    const handleActivity = () => {
      if (warningVisible) return; // phase 2 — only the explicit button counts now
      channelRef.current?.postMessage({ type: 'activity' } as SyncMessage);
      resetIdleTimer();
    };
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity));
    return () => ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
  }, [user, warningVisible, resetIdleTimer]);

  // Cross-tab sync: activity or logout in any tab resets/logs-out every tab.
  useEffect(() => {
    if (!user) return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = (e: MessageEvent<SyncMessage>) => {
      if (e.data.type === 'activity') resetIdleTimer();
      if (e.data.type === 'logout') doLogout(false);
    };
    return () => channel.close();
  }, [user, resetIdleTimer, doLogout]);

  // (Re)start the timer whenever the pause flag or user changes.
  useEffect(() => {
    resetIdleTimer();
    return clearAllTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, user?.id]);

  if (!user) return <>{children}</>;

  return (
    <>
      {children}
      {warningVisible && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <Icons.Info className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-900 text-lg">Still there?</h3>
            <p className="text-sm text-slate-500 mt-2">
              You've been inactive for a while. For security, you'll be logged out in{' '}
              <span className="font-mono font-semibold text-slate-800">{countdown}s</span> unless you confirm you're still here.
            </p>
            <div className="flex gap-2 mt-6">
              <button className="btn-secondary flex-1" onClick={() => doLogout(true)}>
                Log out now
              </button>
              <button className="btn-primary flex-1" onClick={confirmPresence}>
                Stay logged in
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
