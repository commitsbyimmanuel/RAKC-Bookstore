import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from './auth-context';
import { authRequest } from '../services/apiClient';
import { createIdleMonitor, IDLE_MESSAGE, IDLE_STORAGE_KEY } from './idleSession';

export default function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState({ status: 'loading', user: null, message: '' });
  const pending = useRef(false);
  const queued = useRef(false);
  const generation = useRef(0);
  const idleMonitor = useRef(null);
  const refreshRef = useRef(null);
  const serverIdleDeadline = useRef(0);
  const urgentActivityAt = useRef(0);

  const stopIdle = useCallback((broadcast = false, reason = '') => {
    if (broadcast) idleMonitor.current?.signOut(reason);
    else idleMonitor.current?.stop();
    idleMonitor.current = null;
    serverIdleDeadline.current = 0;
  }, []);

  const signOut = useCallback(async (reason = '', remote = false) => {
    const message = typeof reason === 'string' ? reason : '';
    generation.current += 1;
    const requestGeneration = generation.current;
    stopIdle(!remote, message);
    queryClient.clear();
    setSession({ status: remote ? 'anonymous' : 'signing-out', user: null, message });
    if (remote) return;
    try {
      await authRequest('logout', {});
      if (requestGeneration === generation.current) setSession({ status: 'anonymous', user: null, message });
    } catch (error) {
      if (requestGeneration === generation.current) setSession({ status: 'anonymous', user: null, message: message || error.message });
    }
  }, [queryClient, stopIdle]);

  const acceptSession = useCallback((result) => {
    if (!result.idle?.id || !Number.isFinite(result.idle.lastActivityAt) || !Number.isFinite(result.idle.expiresAt) || !(result.idle.timeoutMs > 0)) {
      throw new Error('Unable to verify your session. Please retry.');
    }
    if (idleMonitor.current?.sessionId !== result.idle.id) {
      stopIdle();
      queryClient.clear();
      const monitor = createIdleMonitor({
        sessionId: result.idle.id, lastActivityAt: result.idle.lastActivityAt, timeoutMs: result.idle.timeoutMs,
        onExpire: () => { void signOut(IDLE_MESSAGE); },
        onRemoteSignOut: reason => { void signOut(reason, true); },
        onActivity: () => {
          const now = Date.now();
          if (serverIdleDeadline.current - now <= 60000 && now - urgentActivityAt.current >= 30000) {
            urgentActivityAt.current = now;
            void refreshRef.current?.();
          }
        },
        onSessionChanged: () => {
          generation.current += 1;
          stopIdle();
          queryClient.clear();
          setSession({ status: 'loading', user: null, message: '' });
          void refreshRef.current?.();
        },
      });
      idleMonitor.current = monitor;
      if (!monitor.start()) return;
    }
    serverIdleDeadline.current = result.idle.expiresAt;
    setSession({ status: result.mustChangePassword ? 'password-required' : 'authenticated', user: result.user, message: '' });
  }, [queryClient, signOut, stopIdle]);

  const rejectSession = useCallback((error) => {
    // Keep the local idle deadline running during a temporary authority outage.
    if (error.status === 401 || error.code === 'BOOKSTORE_ACCESS_DENIED') stopIdle(true, error.code === 'SESSION_IDLE_EXPIRED' ? IDLE_MESSAGE : '');
    queryClient.clear();
    setSession({
      status: error.status === 401 ? 'anonymous' : error.code === 'BOOKSTORE_ACCESS_DENIED' ? 'denied' : 'unavailable',
      user: null,
      message: error.status === 401 && error.code !== 'SESSION_IDLE_EXPIRED' ? '' : error.message,
    });
  }, [queryClient, stopIdle]);

  const refresh = useCallback(async () => {
    if (pending.current) { queued.current = true; return; }
    if (idleMonitor.current && !idleMonitor.current.check()) return;
    pending.current = true;
    const requestGeneration = generation.current;
    const activity = idleMonitor.current?.pendingActivity() ?? null;
    try {
      // Only a real interaction changes this to an activity request. Polls alone
      // verify access without extending the three-hour idle deadline.
      const result = await authRequest(activity === null ? 'session' : 'activity', activity === null ? undefined : { idleForMs: Math.max(0, Date.now() - activity) });
      if (requestGeneration === generation.current) {
        acceptSession(result);
        idleMonitor.current?.acknowledgeActivity(activity);
      }
    } catch (error) {
      if (requestGeneration === generation.current) rejectSession(error);
    } finally {
      pending.current = false;
      if (queued.current) { queued.current = false; queueMicrotask(() => { void refreshRef.current?.(); }); }
    }
  }, [acceptSession, rejectSession]);

  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60000);
    const onFocus = () => { void refresh(); };
    const onAuthError = (event) => {
      generation.current += 1;
      queryClient.clear();
      const problem = event.detail;
      if (problem.code === 'PASSWORD_CHANGE_REQUIRED') {
        setSession(current => ({ ...current, status: 'password-required', message: '' }));
      } else {
        stopIdle(true, problem.code === 'SESSION_IDLE_EXPIRED' ? IDLE_MESSAGE : '');
        setSession({ status: problem.code === 'BOOKSTORE_ACCESS_DENIED' ? 'denied' : 'anonymous', user: null, message: problem.error });
      }
    };
    const onStorage = event => {
      if (event.key === IDLE_STORAGE_KEY && !idleMonitor.current) void refresh();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    window.addEventListener('bookstore:auth-error', onAuthError);
    return () => {
      clearInterval(interval);
      stopIdle();
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('bookstore:auth-error', onAuthError);
    };
  }, [queryClient, refresh, stopIdle]);

  async function signIn(email, password) {
    generation.current += 1;
    const requestGeneration = generation.current;
    stopIdle();
    queryClient.clear();
    const result = await authRequest('login', { email, password });
    if (requestGeneration === generation.current) acceptSession(result);
  }

  async function changePassword(currentPassword, newPassword) {
    generation.current += 1;
    const requestGeneration = generation.current;
    const result = await authRequest('change-password', { currentPassword, newPassword });
    if (requestGeneration === generation.current) acceptSession(result);
  }

  return <AuthContext.Provider value={{ ...session, signIn, signOut, changePassword, refresh }}>{children}</AuthContext.Provider>;
}
