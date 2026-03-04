// ============================================================
// API Client — Centralized fetch with JWT auth + token refresh
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL || '/api';

let accessToken = localStorage.getItem('nb_access') || null;
let refreshToken = localStorage.getItem('nb_refresh') || null;
let refreshPromise = null;

export function setTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
  if (access) localStorage.setItem('nb_access', access);
  else localStorage.removeItem('nb_access');
  if (refresh) localStorage.setItem('nb_refresh', refresh);
  else localStorage.removeItem('nb_refresh');
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('nb_access');
  localStorage.removeItem('nb_refresh');
}

export function getAccessToken() { return accessToken; }

async function refreshAccessToken() {
  if (!refreshToken) throw new Error('No refresh token');
  if (refreshPromise) return refreshPromise;

  refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).then(async (res) => {
    refreshPromise = null;
    if (!res.ok) { clearTokens(); throw new Error('Refresh failed'); }
    const data = await res.json();
    setTokens(data.data.accessToken, data.data.refreshToken);
    return data.data.accessToken;
  }).catch((err) => {
    refreshPromise = null;
    clearTokens();
    throw err;
  });

  return refreshPromise;
}

export async function api(path, options = {}) {
  const { body, method = 'GET', auth = true, ...rest } = options;
  const headers = { 'Content-Type': 'application/json', ...rest.headers };

  if (auth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Token expired — try refresh
  if (res.status === 401 && auth && refreshToken) {
    try {
      const newToken = await refreshAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      clearTokens();
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Convenience methods
export const get = (path, opts) => api(path, { method: 'GET', ...opts });
export const post = (path, body, opts) => api(path, { method: 'POST', body, ...opts });
export const put = (path, body, opts) => api(path, { method: 'PUT', body, ...opts });
export const del = (path, opts) => api(path, { method: 'DELETE', ...opts });
export const patch = (path, body, opts) => api(path, { method: 'PATCH', body, ...opts });
