// Thin fetch wrapper. Adds base URL + Authorization header, normalizes errors.

import { getToken, clearAuth } from './auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  /** If true, do not attach Authorization header even if a token exists. */
  skipAuth?: boolean;
};

export async function apiRequest<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token && !opts.skipAuth) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body == null ? undefined : isFormData ? (opts.body as FormData) : JSON.stringify(opts.body),
    });
  } catch (err) {
    throw new ApiError(0, 'Network error — is the backend running?', err);
  }

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in payload && typeof (payload as { error: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : null) ?? `Request failed (${res.status})`;

    // 401 → token is invalid/expired. Clear it; UI can choose to bounce to /login.
    if (res.status === 401) clearAuth();

    throw new ApiError(res.status, message, payload);
  }

  return payload as T;
}

export const api = {
  get: <T = unknown>(path: string) => apiRequest<T>(path),
  post: <T = unknown>(path: string, body?: unknown, opts: Omit<Options, 'method' | 'body'> = {}) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body }),
  put: <T = unknown>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
  del: <T = unknown>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
