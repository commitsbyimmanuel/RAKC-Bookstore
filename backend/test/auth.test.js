import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createApp } from '../app.js';
import Book from '../models/Book.js';
import Sale from '../models/Sale.js';

let server;
let url;
let access;
let upstreamStatus;
let outage;
let calls;
let clock;
const token = 'signed-session.signature';
const browserHeaders = { Origin: 'http://localhost:5173', 'X-Bookstore-Request': '1', 'Content-Type': 'application/json' };
const sessionCookie = `bookstore-session=${encodeURIComponent(token)}`;

async function authorityFetch(input, options) {
  calls.push({ url: input, options });
  if (outage) throw new Error('Network unavailable');
  if (input.endsWith('/api/auth/sign-in/email')) {
    return new Response('{}', { status: upstreamStatus, headers: upstreamStatus === 200 ? { 'set-auth-token': token } : {} });
  }
  assert.equal(options.headers.Authorization, `Bearer ${token}`);
  if (input.endsWith('/api/bookstore/access')) return Response.json(access, { status: upstreamStatus });
  if (input.endsWith('/api/account/change-temporary-password')) access.mustChangePassword = false;
  return Response.json({ success: true });
}

before(async () => {
  const app = createApp({ authURL: 'https://admin.example.com', publicURL: browserHeaders.Origin,
    production: false, fetchImpl: authorityFetch, now: () => clock });
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  url = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));
beforeEach(() => {
  clock = (clock || Date.now()) + 61000;
  access = { user: { id: 'user-123', name: 'Bookstore volunteer', email: 'pos@example.com' },
    expiresAt: new Date(clock + 86400000).toISOString(), hasAccess: true, mustChangePassword: false };
  upstreamStatus = 200;
  outage = false;
  calls = [];
});

function post(path, body, cookie = undefined, headers = browserHeaders) {
  return fetch(`${url}${path}`, { method: 'POST', headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
}

test('all business routes reject anonymous direct requests before database access', async () => {
  for (const path of ['/books', '/sales', '/bookRequests', '/directory', '/directory/search?query=a']) {
    assert.equal((await fetch(`${url}${path}`)).status, 401);
  }
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.equal((await fetch(`${url}/sales`, { method, headers: browserHeaders, body: '{}' })).status, 401);
  }
  assert.equal(calls.length, 0);
});

test('login stores only an HttpOnly session cookie and returns no credential', async () => {
  const response = await post('/auth/login', { email: 'pos@example.com', password: 'example-password' });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(response.headers.get('set-cookie'), /SameSite=Lax/);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const body = await response.json();
  assert.equal(body.user.id, access.user.id);
  assert.equal(JSON.stringify(body).includes(token), false);
  assert.equal(calls[0].options.headers.Origin, 'https://admin.example.com');
  assert.equal(calls[0].options.redirect, 'error');
});

test('denied login is rejected and its newly created issuer session is revoked', async () => {
  access.hasAccess = false;
  const response = await post('/auth/login', { email: 'pos@example.com', password: 'example-password' });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'BOOKSTORE_ACCESS_DENIED');
  assert.ok(calls.some(call => call.url.endsWith('/api/auth/sign-out')));
  assert.match(response.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
});

test('grant revocation blocks the very next request in an existing session', async t => {
  const find = t.mock.method(Book, 'find', () => ({ select: async () => [] }));
  const options = { headers: { Cookie: sessionCookie } };
  assert.equal((await fetch(`${url}/books`, options)).status, 200);
  access.hasAccess = false;
  assert.equal((await fetch(`${url}/books`, options)).status, 403);
  assert.equal(find.mock.callCount(), 1);
  assert.equal(calls.filter(call => call.url.endsWith('/api/bookstore/access')).length, 2);
});

test('sale attribution comes from the verified account instead of client fields', async t => {
  let saved;
  t.mock.method(Sale.prototype, 'save', async function () { saved = this.toObject(); return this; });
  t.mock.method(Sale, 'findOne', () => ({ select: async () => saved }));
  const response = await post('/sales', {
    items: [], customerName: 'Fixture customer', totalAmount: 0,
    purchaseDate: new Date(clock).toISOString(), soldAt: new Date(clock).toISOString(),
    createdBy: { userId: 'forged-user' }, updatedBy: { userId: 'forged-user' },
  }, sessionCookie);
  assert.equal(response.status, 201);
  const sale = await response.json();
  assert.equal(sale.createdBy.userId, access.user.id);
  assert.equal(sale.updatedBy.userId, access.user.id);
});

test('stock adjustment history records the verified account', async t => {
  t.mock.method(Book, 'findOne', async () => ({ stock: 3 }));
  t.mock.method(Book, 'findOneAndUpdate', (filter, changes) => ({
    select: async () => ({ stock: changes.$set.stock, stockAdjustments: [changes.$push.stockAdjustments] }),
  }));
  const response = await post('/books/fixture/adjust-stock', {
    stock: 2, comment: 'Corrected after physical count', adjustedBy: { userId: 'forged-user' },
  }, sessionCookie);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).stockAdjustments[0].adjustedBy.userId, access.user.id);
});

test('temporary passwords cannot access data and can be changed with the same account', async () => {
  access.mustChangePassword = true;
  const options = { headers: { Cookie: sessionCookie } };
  const blocked = await fetch(`${url}/books`, options);
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).code, 'PASSWORD_CHANGE_REQUIRED');
  const response = await post('/auth/change-password', { currentPassword: 'temporary', newPassword: 'changed-password' }, sessionCookie);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).mustChangePassword, false);
});

test('invalid, expired and revoked sessions are rejected', async () => {
  const options = { headers: { Cookie: sessionCookie } };
  upstreamStatus = 401;
  assert.equal((await fetch(`${url}/auth/session`, options)).status, 401);
  upstreamStatus = 200;
  access.expiresAt = new Date(clock - 1).toISOString();
  assert.equal((await fetch(`${url}/sales`, options)).status, 401);
  assert.equal((await fetch(`${url}/sales`, { headers: { Cookie: 'bookstore-session=%ZZ' } })).status, 401);
});

test('auth outages and malformed authority responses fail closed', async () => {
  outage = true;
  const options = { headers: { Cookie: sessionCookie } };
  assert.equal((await fetch(`${url}/sales`, options)).status, 503);
  outage = false;
  access = { hasAccess: true };
  assert.equal((await fetch(`${url}/sales`, options)).status, 503);
});

test('cross-site and missing custom-header mutations are rejected', async () => {
  for (const headers of [{ ...browserHeaders, Origin: 'https://attacker.example' }, { Origin: browserHeaders.Origin, 'Content-Type': 'application/json' }]) {
    assert.equal((await post('/auth/login', { email: 'pos@example.com', password: 'example-password' }, undefined, headers)).status, 403);
    assert.equal((await post('/sales', {}, sessionCookie, headers)).status, 403);
  }
});

test('logout clears the local cookie and revokes the issuer session', async () => {
  const response = await post('/auth/logout', {}, sessionCookie);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
  assert.ok(calls.some(call => call.url.endsWith('/api/auth/sign-out')));
});

test('logout still clears the local cookie during an issuer outage', async () => {
  outage = true;
  const response = await post('/auth/logout', {}, sessionCookie);
  assert.equal(response.status, 503);
  assert.match(response.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
});

test('repeated sign-in attempts are bounded before calling the issuer', async () => {
  for (let attempt = 0; attempt < 10; attempt++) assert.equal((await post('/auth/login', {})).status, 400);
  assert.equal((await post('/auth/login', {})).status, 429);
  assert.equal(calls.length, 0);
});

test('production requires HTTPS origins and uses a Secure host-only cookie', async () => {
  assert.throws(() => createApp({ authURL: 'http://admin.example.com', publicURL: 'https://pos.example.com', production: true }));
  assert.throws(() => createApp({ authURL: 'https://admin.example.com/path', publicURL: 'https://pos.example.com', production: true }));
  assert.throws(() => createApp({ authURL: 'https://admin.example.com', publicURL: 'http://192.168.7.140', production: true }));
  assert.doesNotThrow(() => createApp({ authURL: 'https://admin.example.com', publicURL: 'http://localhost', production: true }));
  assert.doesNotThrow(() => createApp({ authURL: 'https://admin.example.com', publicURL: 'http://bookstore.local', production: true }));
  const app = createApp({ authURL: 'https://admin.example.com', publicURL: 'https://pos.example.com', production: true,
    fetchImpl: authorityFetch, now: () => clock });
  const listener = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  try {
    const response = await fetch(`http://127.0.0.1:${listener.address().port}/auth/login`, {
      method: 'POST', headers: { ...browserHeaders, Origin: 'https://pos.example.com' },
      body: JSON.stringify({ email: 'pos@example.com', password: 'example-password' }),
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /^__Host-bookstore-session=/);
    assert.match(cookie, /; Secure/);
    assert.doesNotMatch(cookie, /Domain=/);
  } finally { await new Promise(resolve => listener.close(resolve)); }
});
