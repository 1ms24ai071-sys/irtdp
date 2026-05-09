import { getToken, clearToken } from './auth';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5173/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
  }
}

function dispatchUnauthorized() {
  clearToken();
  window.dispatchEvent(new Event('auth:unauthorized'));
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);

  if (!skipAuth) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  // Only set Content-Type for JSON bodies — let FormData set its own boundary
  if (
    fetchOptions.body &&
    typeof fetchOptions.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers });

  if (res.status === 401 || res.status === 403) {
    dispatchUnauthorized();
    throw new ApiError(res.status, 'Session expired. Please sign in again.');
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
    } catch { /* ignore parse errors */ }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
