// filepath: src/api/client.ts
/**
 * Global API Client
 * Centralizes all API calls with auth headers and error handling
 */

const API_BASE = 'http://localhost:8080/api';

// Get token from localStorage
function getToken(): string {
  return localStorage.getItem('token') || '';
}

// Get auth headers
function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

// API Response type
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// API Error class
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Main fetch wrapper
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...authHeaders(),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  
  // Handle 401/403 - token expired
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
    window.location.reload();
    throw new ApiError(response.status, 'Session expired');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'Request failed');
  }

  return data as T;
}

// Convenience methods
export const api = {
  get: <T = unknown>(endpoint: string) =>
    apiFetch<T>(endpoint, { method: 'GET' }),

  post: <T = unknown>(endpoint: string, body: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T = unknown>(endpoint: string, body: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T = unknown>(endpoint: string) =>
    apiFetch<T>(endpoint, { method: 'DELETE' }),
};

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return !!getToken();
}

// Logout helper
export function logout(): void {
  localStorage.removeItem('token');
}