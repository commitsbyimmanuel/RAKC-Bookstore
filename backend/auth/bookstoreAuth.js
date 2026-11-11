import express from 'express';
import { createIdleSessions } from './idleSessions.js';
import { errorDetails, logRequest } from './requestDiagnostics.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

class AuthError extends Error {
  constructor(status, code, message) {
    super(message);
    Object.assign(this, { status, code });
  }
}

function configuredOrigin(value, name, production, allowLocal = false) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${name} must be an absolute URL`); }
  // bookstore.local is the workstation hosts-file alias for 127.0.0.1.
  // Compose binds its frontend to loopback and publishes no backend port.
  const local = allowLocal && ['localhost', '127.0.0.1', '[::1]', 'bookstore.local'].includes(url.hostname);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash || (production && url.protocol !== 'https:' && !local)) {
    throw new Error(`${name} must be ${production ? 'an HTTPS' : 'an HTTP(S)'} origin without a path${allowLocal ? ' (local HTTP is allowed for localhost or bookstore.local)' : ''}`);
  }
  return url.origin;
}

export function createBookstoreAuth({
  authURL = process.env.BOOKSTORE_AUTH_URL,
  publicURL = process.env.BOOKSTORE_PUBLIC_URL,
  production = process.env.NODE_ENV === 'production',
  fetchImpl = fetch,
  now = Date.now,
  measureNow = () => performance.now(),
  logger = console,
  idleSessions = createIdleSessions({ now }),
} = {}) {
  const authority = configuredOrigin(authURL, 'BOOKSTORE_AUTH_URL', production);
  const publicOrigin = configuredOrigin(publicURL, 'BOOKSTORE_PUBLIC_URL', production, true);
  const secure = new URL(publicOrigin).protocol === 'https:';
  const cookieName = secure ? '__Host-bookstore-session' : 'bookstore-session';
  const cookieOptions = { httpOnly: true, secure, sameSite: 'lax', path: '/' };
  const router = express.Router();
  const loginAttempts = new Map();

  function credential(req) {
    const raw = (req.headers.cookie || '').split(';').map(value => value.trim())
      .find(value => value.startsWith(`${cookieName}=`));
    if (!raw) return null;
    try {
      const token = decodeURIComponent(raw.slice(cookieName.length + 1));
      return token && token.length <= 4096 && !/[\r\n]/.test(token) ? token : null;
    } catch { return null; }
  }

  function clearSession(res) { res.clearCookie(cookieName, cookieOptions); }

  function fail(res, error) {
    if (error.status === 401) clearSession(res);
    res.locals.failureCode = error.code || 'AUTH_UNAVAILABLE';
    return res.status(error.status || 503).json({
      error: error.status ? error.message : 'Authentication service unavailable. Please retry.',
      code: error.code || 'AUTH_UNAVAILABLE',
    });
  }

  async function callAuthority(path, { token, body, requestId, parseJSON = false, validate } = {}) {
    const startedAt = measureNow();
    const method = body === undefined ? 'GET' : 'POST';
    const timeout = AbortSignal.timeout(8000);
    let response;
    let failure;
    let failureKind;
    try {
      response = await fetchImpl(`${authority}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(requestId ? { 'X-Bookstore-Request-Id': requestId } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body !== undefined ? { 'Content-Type': 'application/json', Origin: authority } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: timeout,
        redirect: 'error',
        cache: 'no-store',
      });
      let data;
      if (parseJSON && response.ok) data = await response.json();
      else await response.body?.cancel();
      if (response.ok && validate && !validate(data)) {
        failureKind = 'invalid_response';
        throw new AuthError(503, 'AUTH_UNAVAILABLE', 'Unable to verify bookstore access. Please retry.');
      }
      return { status: response.status, ok: response.ok, headers: response.headers, data };
    } catch (error) {
      failure = errorDetails(error);
      throw error instanceof AuthError ? error : new AuthError(503, 'AUTH_UNAVAILABLE', 'Authentication service unavailable. Please retry.');
    } finally {
      logRequest(logger, {
        event: 'bookstore_auth_authority_request', requestId, method, path,
        durationMs: Math.round(measureNow() - startedAt), statusCode: response?.status,
        failed: Boolean(failure) || !response?.ok,
        ...(failure ? { failureKind: failureKind || (timeout.aborted || failure.errorName === 'TimeoutError' ? 'timeout' : failure.errorName === 'SyntaxError' ? 'invalid_json' : 'transport'), ...failure } : {}),
      });
    }
  }

  function assertActive(token) {
    const { session, reason } = idleSessions.read(token);
    if (!session) throw new AuthError(401, reason === 'idle' ? 'SESSION_IDLE_EXPIRED' : 'AUTHENTICATION_REQUIRED',
      reason === 'idle' ? 'You were signed out after 3 hours of inactivity. Please sign in again.' : 'Your bookstore session has expired. Please sign in again.');
  }

  async function accessFor(token, requestId, newSession = false) {
    if (!token) throw new AuthError(401, 'AUTHENTICATION_REQUIRED', 'Please sign in to the bookstore.');
    if (!newSession) assertActive(token);
    const response = await callAuthority('/api/bookstore/access', {
      token, requestId, parseJSON: true,
      validate: access => typeof access?.user?.id === 'string' && Boolean(access.user.id) &&
        typeof access.hasAccess === 'boolean' && typeof access.mustChangePassword === 'boolean' &&
        Number.isFinite(Date.parse(access.expiresAt)),
    });
    if (response.status === 401) throw new AuthError(401, 'AUTHENTICATION_REQUIRED', 'Your session has expired. Please sign in again.');
    if (!response.ok) throw new AuthError(503, 'AUTH_UNAVAILABLE', 'Unable to verify bookstore access. Please retry.');
    const access = response.data;
    if (Date.parse(access.expiresAt) <= now()) throw new AuthError(401, 'AUTHENTICATION_REQUIRED', 'Your session has expired. Please sign in again.');
    if (!newSession && !idleSessions.update(token, access.expiresAt)) assertActive(token);
    return access;
  }

  function assertGrant(access) {
    if (!access.hasAccess) throw new AuthError(403, 'BOOKSTORE_ACCESS_DENIED', 'Your account does not have Bookstore POS access. Contact an administrator.');
  }

  function publicSession(access, token) {
    return { user: access.user, mustChangePassword: access.mustChangePassword, idle: idleSessions.describe(token) };
  }

  function setSessionCookie(res, token) {
    res.cookie(cookieName, token, { ...cookieOptions, expires: new Date(idleSessions.describe(token).expiresAt) });
  }

  function checkOrigin(req, res, next) {
    if (!MUTATING_METHODS.has(req.method)) return next();
    if (req.get('Origin') !== publicOrigin || req.get('X-Bookstore-Request') !== '1') {
      res.locals.failureCode = 'INVALID_ORIGIN';
      return res.status(403).json({ error: 'Request origin is not allowed.', code: 'INVALID_ORIGIN' });
    }
    next();
  }

  async function revoke(token, requestId) {
    if (!token) return;
    idleSessions.remove(token);
    const response = await callAuthority('/api/auth/sign-out', { token, body: {}, requestId });
    if (!response.ok && response.status !== 401) throw new AuthError(503, 'AUTH_UNAVAILABLE', 'Signed out locally, but the authentication service could not revoke the session.');
  }

  router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
  router.use(checkOrigin);

  router.post('/login', async (req, res) => {
    const time = now();
    for (const [key, attempt] of loginAttempts) if (attempt.resetAt <= time) loginAttempts.delete(key);
    const key = req.ip;
    const attempt = loginAttempts.get(key) || { count: 0, resetAt: time + 60000 };
    if (attempt.count >= 10 || (!loginAttempts.has(key) && loginAttempts.size >= 10000)) {
      res.locals.failureCode = 'RATE_LIMITED';
      res.set('Retry-After', '60');
      return res.status(429).json({ error: 'Too many sign-in attempts. Please wait a minute.', code: 'RATE_LIMITED' });
    }
    attempt.count += 1;
    loginAttempts.set(key, attempt);
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email.trim()) ||
        typeof password !== 'string' || !password || password.length > 1024) {
      res.locals.failureCode = 'INVALID_CREDENTIALS';
      return res.status(400).json({ error: 'Enter your email and password.', code: 'INVALID_CREDENTIALS' });
    }
    let token;
    try {
      const response = await callAuthority('/api/auth/sign-in/email', { body: { email: email.trim(), password }, requestId: req.requestId });
      if (response.status === 429) {
        res.set('Retry-After', '60');
        throw new AuthError(429, 'RATE_LIMITED', 'Too many sign-in attempts. Please wait a minute.');
      }
      if ([400, 401, 403, 422].includes(response.status)) throw new AuthError(401, 'INVALID_CREDENTIALS', 'Unable to sign in. Check your credentials or contact an administrator.');
      if (!response.ok) throw new AuthError(503, 'AUTH_UNAVAILABLE', 'Authentication service unavailable. Please retry.');
      token = response.headers.get('set-auth-token');
      if (!token || token.length > 4096) throw new AuthError(503, 'AUTH_UNAVAILABLE', 'The authentication service did not return a valid session.');
      const access = await accessFor(token, req.requestId, true);
      assertGrant(access);
      idleSessions.start(token, access.expiresAt);
      setSessionCookie(res, token);
      return res.json(publicSession(access, token));
    } catch (error) {
      // Do not leave a newly created, denied session active at the issuer.
      if (token) await revoke(token, req.requestId).catch(() => {});
      clearSession(res);
      return fail(res, error);
    }
  });

  router.get('/session', async (req, res) => {
    try {
      const token = credential(req);
      const access = await accessFor(token, req.requestId);
      assertGrant(access);
      return res.json(publicSession(access, token));
    } catch (error) { return fail(res, error); }
  });

  router.post('/activity', async (req, res) => {
    try {
      const token = credential(req);
      const idleForMs = req.body?.idleForMs ?? 0;
      if (!Number.isFinite(idleForMs) || idleForMs < 0) throw new AuthError(400, 'INVALID_ACTIVITY', 'Unable to update your session.');
      const access = await accessFor(token, req.requestId);
      assertGrant(access);
      if (idleForMs >= idleSessions.describe(token).timeoutMs) throw new AuthError(401, 'SESSION_IDLE_EXPIRED', 'You were signed out after 3 hours of inactivity. Please sign in again.');
      if (!idleSessions.update(token, access.expiresAt, true, idleForMs)) assertActive(token);
      setSessionCookie(res, token);
      return res.json(publicSession(access, token));
    } catch (error) { return fail(res, error); }
  });

  router.post('/change-password', async (req, res) => {
    try {
      const token = credential(req);
      const access = await accessFor(token, req.requestId);
      assertGrant(access);
      const { currentPassword, newPassword } = req.body || {};
      if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' ||
          !currentPassword || currentPassword.length > 1024 || newPassword.length < 8 || newPassword.length > 128) {
        throw new AuthError(400, 'INVALID_PASSWORD', 'Enter your current password and a new password of 8 to 128 characters.');
      }
      const response = await callAuthority('/api/account/change-temporary-password', { token, body: { currentPassword, newPassword }, requestId: req.requestId });
      if (!response.ok) throw new AuthError(response.status >= 500 ? 503 : 400, 'PASSWORD_CHANGE_FAILED', 'The password could not be changed. Check your current password and retry.');
      const refreshedToken = response.headers.get('set-auth-token');
      if (!refreshedToken || refreshedToken.length > 4096) throw new AuthError(503, 'AUTH_UNAVAILABLE', 'The authentication service did not return a valid session.');
      const refreshed = await accessFor(refreshedToken, req.requestId, true);
      assertGrant(refreshed);
      idleSessions.remove(token);
      idleSessions.start(refreshedToken, refreshed.expiresAt);
      setSessionCookie(res, refreshedToken);
      return res.json(publicSession(refreshed, refreshedToken));
    } catch (error) { return fail(res, error); }
  });

  router.post('/logout', async (req, res) => {
    clearSession(res);
    try {
      await revoke(credential(req), req.requestId);
      return res.json({ success: true });
    } catch (error) { return fail(res, error); }
  });

  async function requireAccess(req, res, next) {
    res.set('Cache-Control', 'private, no-store');
    try {
      const access = await accessFor(credential(req), req.requestId);
      assertGrant(access);
      if (access.mustChangePassword) throw new AuthError(403, 'PASSWORD_CHANGE_REQUIRED', 'Change your temporary password before continuing.');
      req.auth = { user: access.user };
      return checkOrigin(req, res, next);
    } catch (error) { return fail(res, error); }
  }

  return { router, requireAccess };
}
