const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const fetchAuth = async (endpoint, options = {}) => {
  const res = await fetch(`${API_URL}/auth${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include' // required for cookies
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP error ${res.status}`);
  }
  return res.json();
};

export const register = (data) => fetchAuth('/register', { method: 'POST', body: JSON.stringify(data) });
export const login = (data) => fetchAuth('/login', { method: 'POST', body: JSON.stringify(data) });
export const logout = () => fetchAuth('/logout', { method: 'POST' });
export const fetchMe = () => fetchAuth('/me', { method: 'GET' });
export const updateProfile = (data) => fetchAuth('/profile', { method: 'PATCH', body: JSON.stringify(data) });
