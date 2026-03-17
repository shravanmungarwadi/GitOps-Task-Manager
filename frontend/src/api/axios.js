// ============================================================
// api/axios.js
// Creates a pre-configured Axios instance that:
//   1. Always points to the correct backend URL
//   2. Automatically attaches the JWT token to every request
//   3. Handles 401 errors globally (auto logout if token expires)
// All API calls in the app import this instead of plain axios.
// ============================================================

import axios from 'axios';

// In development → Vite proxy forwards /api to localhost:5000
// In production  → Nginx forwards /api to backend container
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor ────────────────────────────────────────
// Runs BEFORE every request is sent
api.interceptors.request.use(
  (config) => {
    // Read token from localStorage
    const token = localStorage.getItem('token');

    // If token exists, attach it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ───────────────────────────────────────
// Runs AFTER every response comes back
api.interceptors.response.use(
  (response) => response, // Success — just return the response

  (error) => {
    // If we get 401 Unauthorized, the token expired → force logout
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;