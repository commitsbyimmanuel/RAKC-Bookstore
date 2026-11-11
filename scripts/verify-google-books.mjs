// Run inside the deployed backend container:
// sudo docker exec -i -w /app rakc-backend node --input-type=module < /tmp/verify-google-books.mjs
// This makes one live Google request using the container's runtime key and the
// deployed Google Books router. It does not use production sessions or data.

const query = 'seeking allah finding jesus';
const rawKey = process.env.GOOGLE_BOOKS_API_KEY || process.env.GOOGLE_BOOKS_API || '';
const apiKey = rawKey.trim();
const report = {
  test: 'deployed Google Books API key',
  checkedAt: new Date().toISOString(),
  query,
  keyVariable: process.env.GOOGLE_BOOKS_API_KEY ? 'GOOGLE_BOOKS_API_KEY' : 'GOOGLE_BOOKS_API',
  keyConfigured: Boolean(apiKey),
  googleRequests: 0,
  result: 'FAIL',
};

function redact(value) {
  let text = String(value);
  for (const secret of new Set([rawKey, apiKey])) {
    if (secret) text = text.split(secret).join('[REDACTED]');
  }
  return text;
}

async function verify() {
  if (!apiKey) {
    report.nextStep = 'Set GOOGLE_BOOKS_API_KEY in the server Compose .env and recreate rakc-backend.';
    return;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(apiKey)) {
    report.nextStep = 'The container key contains unexpected characters. Check the Compose variable for an extra brace or quotes, then recreate rakc-backend.';
    return;
  }

  const { default: express } = await import('express');
  let createGoogleBooksRouter;
  try {
    ({ createGoogleBooksRouter } = await import('./routes/googleBooks.js'));
  } catch {
    report.nextStep = 'The keyed Google Books route is missing or cannot load. Verify the backend image was rebuilt and recreated.';
    return;
  }

  const app = express();
  app.use('/google-probe', createGoogleBooksRouter({
    fetchImpl: async (url, options) => {
      const target = new URL(url);
      if (target.origin + target.pathname !== 'https://www.googleapis.com/books/v1/volumes') {
        throw new Error('The deployed route targeted an unexpected upstream endpoint.');
      }
      report.usesConfiguredKey = new Headers(options.headers).get('X-Goog-Api-Key') === apiKey;
      if (!report.usesConfiguredKey || target.searchParams.has('key')) {
        throw new Error('The deployed route did not use the configured key in its request header.');
      }
      report.googleRequests += 1;
      let response;
      try {
        response = await fetch(url, options);
      } catch (error) {
        report.networkError = error.cause?.code || error.name;
        throw error;
      }
      report.googleStatus = response.status;
      const data = await response.clone().json().catch(() => null);
      if (!response.ok) {
        const detail = data?.error?.details?.find(item => item.metadata)?.metadata;
        report.googleError = {
          status: data?.error?.status,
          message: data?.error?.message || 'Google returned an unsuccessful response.',
          reasons: data?.error?.errors?.map(item => item.reason),
          ...(detail ? { quota: {
            consumer: detail.consumer,
            limit: detail.quota_limit,
            limitValue: detail.quota_limit_value,
            unit: detail.quota_unit,
          } } : {}),
        };
      }
      return response;
    },
  }));

  const server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const started = performance.now();
  try {
    const url = new URL(`http://127.0.0.1:${server.address().port}/google-probe`);
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', '3');
    url.searchParams.set('printType', 'books');
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    report.proxyStatus = response.status;
    const data = await response.json();
    report.elapsedMs = Math.round(performance.now() - started);
    if (report.googleStatus === 200 && response.status === 200 && report.usesConfiguredKey && report.googleRequests === 1) {
      const items = data.items ?? [];
      if (!Array.isArray(items)) throw new Error('Google returned an unexpected book list.');
      report.books = items.map(item => ({
        title: item?.volumeInfo?.title,
        isbn: item?.volumeInfo?.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier,
      }));
      report.result = 'PASS';
      report.message = 'Google accepted the deployed runtime key and returned HTTP 200. No 429 occurred in this request.';
      if (!report.books.length) report.note = 'Google accepted the request but returned no matches for this query.';
    } else {
      report.proxyError = data.error;
      report.nextStep = report.networkError
        ? 'The container could not reach Google. Check the network error shown above.'
        : report.googleStatus === 429
        ? 'Google still reports exhausted quota. Check Books API quotas for the consumer project shown above.'
        : 'Check that the Books API is enabled, the runtime key is correct, and its restrictions allow backend requests.';
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

try {
  await verify();
} catch (error) {
  report.error = error.message;
  if (error.cause?.code) report.networkError = error.cause.code;
} finally {
  // Redact the key even if an upstream error unexpectedly contains it.
  console.log(redact(JSON.stringify(report, null, 2)));
  process.exitCode = report.result === 'PASS' ? 0 : 1;
}
