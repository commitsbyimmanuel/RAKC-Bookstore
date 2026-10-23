import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from './auth-context';
import { authRequest } from '../services/apiClient';

export default function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState({ status: 'loading', user: null, message: '' });
  const pending = useRef(false);
  const generation = useRef(0);

  const acceptSession = useCallback((result) => {
    setSession({ status: result.mustChangePassword ? 'password-required' : 'authenticated', user: result.user, message: '' });
  }, []);

  const rejectSession = useCallback((error) => {
    queryClient.clear();
    setSession({
      status: error.status === 401 ? 'anonymous' : error.code === 'BOOKSTORE_ACCESS_DENIED' ? 'denied' : 'unavailable',
      user: null,
      message: error.status === 401 ? '' : error.message,
    });
  }, [queryClient]);

  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    const requestGeneration = generation.current;
    try {
      const result = await authRequest('session');
      if (requestGeneration === generation.current) acceptSession(result);
    } catch (error) {
      if (requestGeneration === generation.current) rejectSession(error);
    } finally { pending.current = false; }
  }, [acceptSession, rejectSession]);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 60000);
    const onFocus = () => refresh();
    const onAuthError = (event) => {
      generation.current += 1;
      queryClient.clear();
      const problem = event.detail;
      if (problem.code === 'PASSWORD_CHANGE_REQUIRED') {
        setSession(current => ({ ...current, status: 'password-required', message: '' }));
      } else {
        setSession({ status: problem.code === 'BOOKSTORE_ACCESS_DENIED' ? 'denied' : 'anonymous', user: null, message: problem.error });
      }
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('bookstore:auth-error', onAuthError);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('bookstore:auth-error', onAuthError);
    };
  }, [queryClient, refresh]);

  async function signIn(email, password) {
    generation.current += 1;
    const requestGeneration = generation.current;
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

  async function signOut() {
    generation.current += 1;
    queryClient.clear();
    // Hide protected views immediately, including while the issuer is unavailable.
    setSession({ status: 'signing-out', user: null, message: '' });
    try {
      await authRequest('logout', {});
      setSession({ status: 'anonymous', user: null, message: '' });
    }
    catch (error) { setSession({ status: 'anonymous', user: null, message: error.message }); }
  }

  return <AuthContext.Provider value={{ ...session, signIn, signOut, changePassword, refresh }}>{children}</AuthContext.Provider>;
}
