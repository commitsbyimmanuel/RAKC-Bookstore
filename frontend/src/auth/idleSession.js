export const IDLE_STORAGE_KEY = 'bookstore:idle-session';
export const IDLE_MESSAGE = 'You were signed out after 3 hours of inactivity. Please sign in again.';
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];

export function createIdleMonitor({
  sessionId, lastActivityAt, timeoutMs, onExpire, onRemoteSignOut, onSessionChanged, onActivity = () => {},
  windowTarget = window, documentTarget = document, now = Date.now,
  setTimer = setTimeout, clearTimer = clearTimeout,
}) {
  let storage;
  try { storage = windowTarget.localStorage; } catch { /* In-tab expiry still works when storage is unavailable. */ }
  let lastActivity = lastActivityAt;
  let reportedActivity = lastActivityAt;
  let timer;
  let persistTimer;
  let lastPersistedAt = -Infinity;
  let active = false;

  function stored() {
    try { return JSON.parse(storage?.getItem(IDLE_STORAGE_KEY) || 'null'); } catch { return null; }
  }

  function persist(signedOut = false, reason = '') {
    clearTimer(persistTimer);
    persistTimer = undefined;
    try { storage?.setItem(IDLE_STORAGE_KEY, JSON.stringify({ sessionId, lastActivityAt: lastActivity, signedOut, reason })); } catch { /* Storage is optional. */ }
    lastPersistedAt = now();
  }

  function stop() {
    active = false;
    clearTimer(timer);
    clearTimer(persistTimer);
    for (const name of ACTIVITY_EVENTS) windowTarget.removeEventListener(name, activity);
    windowTarget.removeEventListener('storage', onStorage);
    windowTarget.removeEventListener('focus', check);
    windowTarget.removeEventListener('pagehide', onPageHide);
    documentTarget.removeEventListener('visibilitychange', check);
  }

  function check() {
    if (!active) return false;
    const other = stored();
    if (other?.sessionId === sessionId) {
      if (other.signedOut) {
        stop();
        onRemoteSignOut(other.reason === 'idle' ? IDLE_MESSAGE : '');
        return false;
      }
      if (Number.isFinite(other.lastActivityAt) && other.lastActivityAt <= now()) lastActivity = Math.max(lastActivity, other.lastActivityAt);
    } else if (other?.sessionId) {
      stop();
      onSessionChanged();
      return false;
    }
    if (now() - lastActivity >= timeoutMs) {
      persist(true, 'idle');
      stop();
      onExpire();
      return false;
    }
    return true;
  }

  function schedule() {
    if (!check()) return;
    clearTimer(timer);
    timer = setTimer(schedule, Math.max(1, lastActivity + timeoutMs - now()));
  }

  function activity(event) {
    if (event.isTrusted === false || !check()) return;
    lastActivity = now();
    if (now() - lastPersistedAt >= 1000) persist();
    else if (!persistTimer) persistTimer = setTimer(() => persist(), 1000 - (now() - lastPersistedAt));
    onActivity();
  }

  function onStorage(event) { if (event.key === IDLE_STORAGE_KEY) check(); }
  function onPageHide() { if (check()) persist(); }

  return {
    sessionId,
    start() {
      const other = stored();
      if (other?.sessionId === sessionId && !other.signedOut && Number.isFinite(other.lastActivityAt) && other.lastActivityAt <= now()) {
        lastActivity = Math.max(lastActivity, other.lastActivityAt);
      } else if (other?.sessionId === sessionId && other.signedOut) {
        onRemoteSignOut(other.reason === 'idle' ? IDLE_MESSAGE : '');
        return false;
      }
      active = true;
      if (now() - lastActivity >= timeoutMs) { schedule(); return false; }
      persist();
      for (const name of ACTIVITY_EVENTS) windowTarget.addEventListener(name, activity, { passive: true });
      windowTarget.addEventListener('storage', onStorage);
      windowTarget.addEventListener('focus', check);
      windowTarget.addEventListener('pagehide', onPageHide);
      documentTarget.addEventListener('visibilitychange', check);
      schedule();
      return active;
    },
    stop,
    check,
    pendingActivity() { return check() && lastActivity > reportedActivity ? lastActivity : null; },
    acknowledgeActivity(timestamp) { if (timestamp !== null) reportedActivity = Math.max(reportedActivity, timestamp); },
    signOut(reason = '') { persist(true, reason === IDLE_MESSAGE ? 'idle' : ''); stop(); },
  };
}
