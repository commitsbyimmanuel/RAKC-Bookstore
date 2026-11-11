import { createHash, randomUUID } from 'node:crypto';

export const IDLE_TIMEOUT_MS = 3 * 60 * 60 * 1000;

// This workstation runs one backend process. Losing this in-memory state requires
// a fresh sign-in; an old authority credential cannot recreate an idle session.
export function createIdleSessions({ now = Date.now, timeoutMs = IDLE_TIMEOUT_MS } = {}) {
  const sessions = new Map();
  const keyFor = token => createHash('sha256').update(token).digest('hex');
  const deadline = session => Math.min(session.lastActivityAt + timeoutMs, session.expiresAt);

  function start(token, expiresAt) {
    for (const [key, session] of sessions) if (deadline(session) <= now()) sessions.delete(key);
    const session = { id: randomUUID(), lastActivityAt: now(), expiresAt: Date.parse(expiresAt) };
    sessions.set(keyFor(token), session);
    return session;
  }

  function read(token) {
    const key = keyFor(token);
    const session = sessions.get(key);
    if (!session) return { reason: 'missing' };
    if (now() >= deadline(session)) {
      sessions.delete(key);
      return { reason: now() - session.lastActivityAt >= timeoutMs ? 'idle' : 'expired' };
    }
    return { session };
  }

  function update(token, expiresAt, activity = false, idleForMs = 0) {
    const session = sessions.get(keyFor(token));
    if (!session) return null;
    session.expiresAt = Date.parse(expiresAt);
    if (activity) session.lastActivityAt = Math.max(session.lastActivityAt, now() - idleForMs);
    return session;
  }

  function describe(token) {
    const session = sessions.get(keyFor(token));
    return session && {
      id: session.id,
      lastActivityAt: session.lastActivityAt,
      expiresAt: deadline(session),
      timeoutMs,
    };
  }

  return { start, read, update, describe, remove: token => sessions.delete(keyFor(token)) };
}
