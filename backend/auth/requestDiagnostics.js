import { randomUUID } from 'node:crypto';

export const SLOW_REQUEST_MS = 3500;

export function errorDetails(error) {
  const errorName = ['Error', 'TypeError', 'SyntaxError', 'AbortError', 'TimeoutError'].includes(error?.name) ? error.name : 'Error';
  const code = error?.cause?.code || error?.code;
  return { errorName, ...(typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(code) ? { networkErrorCode: code } : {}) };
}

export function logRequest(logger, record) {
  if (!record.failed && record.durationMs <= SLOW_REQUEST_MS) return;
  const level = record.failed && (!record.statusCode || record.statusCode < 400 || record.statusCode >= 500) ? 'error' : 'warn';
  logger[level](JSON.stringify({ timestamp: new Date().toISOString(), ...record }));
}

export function createRequestDiagnostics({ logger = console, measureNow = () => performance.now() } = {}) {
  return (req, res, next) => {
    const startedAt = measureNow();
    req.requestId = randomUUID();
    res.set('X-Request-Id', req.requestId);
    let logged = false;
    const finish = aborted => {
      if (logged) return;
      logged = true;
      logRequest(logger, {
        event: 'bookstore_http_request', requestId: req.requestId,
        method: req.method, route: req.route ? `${req.baseUrl || ''}${req.route.path}` : req.baseUrl || '<unmatched>',
        statusCode: aborted ? 499 : res.statusCode,
        durationMs: Math.round(measureNow() - startedAt),
        failed: aborted || res.statusCode >= 400,
        ...(aborted ? { failureKind: 'client_disconnected' } : {}),
        ...(res.locals.failureCode ? { code: res.locals.failureCode } : {}),
      });
    };
    res.once('finish', () => finish(false));
    res.once('close', () => { if (!res.writableFinished) finish(true); });
    next();
  };
}
