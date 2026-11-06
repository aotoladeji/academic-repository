import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  headers: { Accept: 'application/json' },
});

/** Two separate sessions: 'staff' and 'admin'. */
export const tokens = {
  get: (kind) => localStorage.getItem(`${kind}_token`),
  set: (kind, t) => localStorage.setItem(`${kind}_token`, t),
  clear: (kind) => localStorage.removeItem(`${kind}_token`),
};

// URLs starting with /admin use the admin token; everything else uses the staff token.
const kindOf = (url = '') => (url.startsWith('/admin') ? 'admin' : 'staff');

api.interceptors.request.use((config) => {
  const t = tokens.get(kindOf(config.url));
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url ?? '';
    if (err.response?.status === 401 && !url.endsWith('/login')) {
      const kind = kindOf(url);
      tokens.clear(kind);
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: kind }));
    }
    return Promise.reject(err);
  }
);

/** First validation message if there is one, otherwise the server message. */
export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  const d = err?.response?.data;
  const first = d?.errors ? Object.values(d.errors)[0]?.[0] : null;
  return first ?? d?.message ?? fallback;
};

export default api;
