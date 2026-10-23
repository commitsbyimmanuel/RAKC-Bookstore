import express from 'express';

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
    return res.status(error.status || 503).json({
      error: error.status ? error.message : 'Authentication service unavailable. Please retry.',
      code: error.code || 'AUTH_UNAVAILABLE',
    });
  }

  async function callAuthority(path, { token, body } = {}) {
    try {
      return await fetchImpl(`${authority}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body !== undefined ? { 'Content-Type': 'application/json', Origin: authority } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(8000),
        redirect: 'error',
        cache: 'no-store',
      });
    } catch { throw new AuthError(503, 'AUTH_UNAVAILABLE', 'Authentication service unavailable. Please retry.'); }
  }

  async function accessFor(token) {
    if (!token) throw new AuthError(401, 'AUTHENTICATION_REQUIRED', 'Please sign in to the bookstore.');
    const response = await callAuthority('/api/bookstore/access', { token });
    if (response.status === 401) throw new AuthError(401, 'AUTHENTICATION_REQUIRED', 'Your session has expired. Please sign in again.');
    if (!response.ok) throw new AuthError(503, 'AUTH_UNAVAILABLE', 'Unable to verify bookstore access. Please retry.');
    const access = await response.json();
    if (typeof access.user?.id !== 'string' || !access.user.id || typeof access.hasAccess !== 'boolean' ||
        typeof access.mustChangePassword !== 'boolean' || !Number.isFinite(Date.parse(access.expiresAt))) {
      throw new AuthError(503, 'AUTH_UNAVAILABLE', 'Unable to verify bookstore access. Please retry.');
    }
    if (Date.parse(access.expiresAt) <= now()) throw new AuthError(401, 'AUTHENTICATION_REQUIRED', 'Your session has expired. Please sign in again.');
    return access;
  }

  function assertGrant(access) {
    if (!access.hasAccess) throw new AuthError(403, 'BOOKSTORE_ACCESS_DENIED', 'Your account does not have Bookstore POS access. Contact an administrator.');
  }

  function publicSession(access) {
    return { user: access.user, mustChangePassword: access.mustChangePassword };
  }

  function checkOrigin(req, res, next) {
    if (!MUTATING_METHODS.has(req.method)) return next();
    if (req.get('Origin') !== publicOrigin || req.get('X-Bookstore-Request') !== '1') {
      return res.status(403).json({ error: 'Request origin is not allowed.', code: 'INVALID_ORIGIN' });
    }
    next();
  }

  async function revoke(token) {
    if (!token) return;
    const response = await callAuthority('/api/auth/sign-out', { token, body: {} });
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
      res.set('Retry-After', '60');
      return res.status(429).json({ error: 'Too many sign-in attempts. Please wait a minute.', code: 'RATE_LIMITED' });
    }
    attempt.count += 1;
    loginAttempts.set(key, attempt);
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email.trim()) ||
        typeof password !== 'string' || !password || password.length > 1024) {
      return res.status(400).json({ error: 'Enter your email and password.', code: 'INVALID_CREDENTIALS' });
    }
    let token;
    try {
      const response = await callAuthority('/api/auth/sign-in/email', { body: { email: email.trim(), password } });
      if (response.status === 429) {
        res.set('Retry-After', '60');
        throw new AuthError(429, 'RATE_LIMITED', 'Too many sign-in attempts. Please wait a minute.');
      }
      if ([400, 401, 403, 422].includes(response.status)) throw new AuthError(401, 'INVALID_CREDENTIALS', 'Unable to sign in. Check your credentials or contact an administrator.');
      if (!response.ok) throw new AuthError(503, 'AUTH_UNAVAILABLE', 'Authentication service unavailable. Please retry.');
      token = response.headers.get('set-auth-token');
      if (!token || token.length > 4096) throw new AuthError(503, 'AUTH_UNAVAILABLE', 'The authentication service did not return a valid session.');
      const access = await accessFor(token);
      assertGrant(access);
      res.cookie(cookieName, token, { ...cookieOptions, expires: new Date(access.expiresAt) });
      return res.json(publicSession(access));
    } catch (error) {
      // Do not leave a newly created, denied session active at the issuer.
      if (token) await revoke(token).catch(() => {});
      clearSession(res);
      return fail(res, error);
    }
  });

  router.get('/session', async (req, res) => {
    try {
      const access = await accessFor(credential(req));
      assertGrant(access);
      return res.json(publicSession(access));
    } catch (error) { return fail(res, error); }
  });

  router.post('/change-password', async (req, res) => {
    try {
      const token = credential(req);
      const access = await accessFor(token);
      assertGrant(access);
      const { currentPassword, newPassword } = req.body || {};
      if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' ||
          !currentPassword || currentPassword.length > 1024 || newPassword.length < 8 || newPassword.length > 128) {
        throw new AuthError(400, 'INVALID_PASSWORD', 'Enter your current password and a new password of 8 to 128 characters.');
      }
      const response = await callAuthority('/api/account/change-temporary-password', { token, body: { currentPassword, newPassword } });
      if (!response.ok) throw new AuthError(response.status >= 500 ? 503 : 400, 'PASSWORD_CHANGE_FAILED', 'The password could not be changed. Check your current password and retry.');
      const refreshed = await accessFor(token);
      assertGrant(refreshed);
      return res.json(publicSession(refreshed));
    } catch (error) { return fail(res, error); }
  });

  router.post('/logout', async (req, res) => {
    clearSession(res);
    try {
      await revoke(credential(req));
      return res.json({ success: true });
    } catch (error) { return fail(res, error); }
  });

  async function requireAccess(req, res, next) {
    res.set('Cache-Control', 'private, no-store');
    try {
      const access = await accessFor(credential(req));
      assertGrant(access);
      if (access.mustChangePassword) throw new AuthError(403, 'PASSWORD_CHANGE_REQUIRED', 'Change your temporary password before continuing.');
      req.auth = { user: access.user };
      return checkOrigin(req, res, next);
    } catch (error) { return fail(res, error); }
  }

  return { router, requireAccess };
}
