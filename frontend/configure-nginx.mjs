import { readFileSync, writeFileSync } from 'node:fs';

// The browser always uses /api. An old absolute VITE_API_URL can still supply
// the server's upstream during the deployment transition.
const upstream = new URL(process.env.BOOKSTORE_API_UPSTREAM || process.env.VITE_API_URL || 'http://backend:3001');
if (!['http:', 'https:'].includes(upstream.protocol) || upstream.username || upstream.password ||
    upstream.pathname !== '/' || upstream.search || upstream.hash) {
  throw new Error('BOOKSTORE_API_UPSTREAM must be an HTTP(S) origin');
}
const port = process.env.PORT || '80';
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('PORT must be a valid TCP port');
const template = readFileSync('/app/nginx.conf', 'utf8');
writeFileSync('/etc/nginx/http.d/default.conf', template
  .replaceAll('__PORT__', port).replaceAll('__API_UPSTREAM__', upstream.origin)
  .replaceAll('__API_HOST__', upstream.host).replaceAll('__API_TLS_NAME__', upstream.hostname));
