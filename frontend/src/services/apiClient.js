// All browser requests use the bookstore's origin. Nginx/Vite proxies /api.
export const API_URL = '/api';

export async function apiFetch(url, options = {}, { notify = true } = {}) {
  const headers = new Headers(options.headers);
  headers.set('X-Bookstore-Request', '1');
  const response = await fetch(url, { ...options, headers, credentials: 'same-origin', cache: 'no-store' });
  if (notify && [401, 403].includes(response.status)) {
    const problem = await response.clone().json().catch(() => ({}));
    if (['AUTHENTICATION_REQUIRED', 'BOOKSTORE_ACCESS_DENIED', 'PASSWORD_CHANGE_REQUIRED'].includes(problem.code)) {
      window.dispatchEvent(new CustomEvent('bookstore:auth-error', { detail: problem }));
    }
  }
  return response;
}

export async function authRequest(path, body) {
  const response = await apiFetch(`${API_URL}/auth/${path}`, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }, { notify: false });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'Unable to connect. Please retry.');
    error.code = result.code;
    error.status = response.status;
    throw error;
  }
  return result;
}
