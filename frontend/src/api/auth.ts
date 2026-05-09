import { apiFetch } from './client';

export function login(credentials: any) {
  return apiFetch('/login', { 
    method: 'POST', 
    body: JSON.stringify(credentials) 
  }).then((res: any) => { 
    if (res.accessToken) localStorage.setItem('token', res.accessToken); 
    return res; 
  });
}

export function logout() { localStorage.removeItem('token'); }
export function getToken() { return localStorage.getItem('token'); }
export function clearToken() { localStorage.removeItem('token'); }
export function isAuthenticated() { return !!getToken(); }
