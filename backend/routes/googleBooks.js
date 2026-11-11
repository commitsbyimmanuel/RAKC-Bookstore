import express from 'express';

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';

export function createGoogleBooksRouter({
  apiKey = process.env.GOOGLE_BOOKS_API_KEY || process.env.GOOGLE_BOOKS_API,
  fetchImpl = fetch,
  timeoutMs = 10000,
} = {}) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const maxResults = req.query.maxResults ?? '8';
    const printType = req.query.printType;
    if (!query || query.length > 500 || typeof maxResults !== 'string' ||
        !/^\d{1,2}$/.test(maxResults) || Number(maxResults) < 1 || Number(maxResults) > 40 ||
        (printType !== undefined && !['all', 'books', 'magazines'].includes(printType))) {
      return res.status(400).json({ error: 'Enter a valid book search.', code: 'INVALID_BOOK_SEARCH' });
    }
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
      return res.status(503).json({ error: 'Google Books search is not configured.', code: 'GOOGLE_BOOKS_NOT_CONFIGURED' });
    }
    // Authentication may finish after the browser has already cancelled a search.
    if (req.aborted || res.destroyed) return;

    const disconnected = new AbortController();
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = AbortSignal.any([disconnected.signal, timeout]);
    const onClose = () => { if (!res.writableEnded) disconnected.abort(); };
    res.on('close', onClose);

    try {
      const url = new URL(GOOGLE_BOOKS_URL);
      url.searchParams.set('q', query);
      url.searchParams.set('maxResults', maxResults);
      if (printType !== undefined) url.searchParams.set('printType', printType);
      const response = await fetchImpl(url.href, {
        headers: { Accept: 'application/json', 'X-Goog-Api-Key': apiKey.trim() },
        signal,
        redirect: 'error',
      });
      signal.throwIfAborted();
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          if (retryAfter && /^\d{1,6}$/.test(retryAfter)) res.set('Retry-After', retryAfter);
          return res.status(429).json({ error: 'Google Books search quota is currently exhausted.', code: 'GOOGLE_BOOKS_RATE_LIMITED' });
        }
        return res.status(502).json({ error: 'Google Books search is unavailable.', code: 'GOOGLE_BOOKS_UNAVAILABLE' });
      }
      const data = await response.json();
      signal.throwIfAborted();
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid Google Books response');
      return res.json(data);
    } catch {
      if (disconnected.signal.aborted || res.destroyed) return;
      // Upstream error messages can contain credentials; never return or log them.
      return res.status(timeout.aborted ? 504 : 502).json({
        error: timeout.aborted ? 'Google Books search timed out.' : 'Google Books search is unavailable.',
        code: timeout.aborted ? 'GOOGLE_BOOKS_TIMEOUT' : 'GOOGLE_BOOKS_UNAVAILABLE',
      });
    } finally {
      res.off('close', onClose);
    }
  });

  return router;
}
