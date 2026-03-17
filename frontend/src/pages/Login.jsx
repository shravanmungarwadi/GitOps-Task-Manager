// ============================================================
// pages/Login.jsx
// Login form — sends email + password to POST /api/auth/login.
// On success → saves token and user to localStorage → redirects to dashboard.
// ============================================================

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import api from '../api/axios';

export default function Login() {
  const navigate = useNavigate();

  // Form field values
  const [form, setForm] = useState({ email: '', password: '' });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update form state when user types
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent page reload
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/login', form);

      // Save token and user info in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Go to dashboard
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <LogIn size={40} color="#6366f1" />
          <h1 style={styles.title}>Welcome back</h1>
          <p style={styles.subtitle}>Sign in to your account</p>
        </div>

        {/* Error message */}
        {error && (
          <div style={styles.error}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrapper}>
              <Mail size={16} color="#64748b" style={styles.inputIcon} />
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} color="#64748b" style={styles.inputIcon} />
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={styles.switchText}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>Create one</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: '#0f172a', padding: '1rem',
  },
  card: {
    background: '#1e293b', borderRadius: '16px',
    padding: '2.5rem', width: '100%', maxWidth: '420px',
    border: '1px solid #334155',
  },
  header: { textAlign: 'center', marginBottom: '2rem' },
  title: { fontSize: '1.75rem', fontWeight: 700, color: '#f1f5f9', marginTop: '0.75rem' },
  subtitle: { color: '#64748b', marginTop: '0.25rem' },
  error: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    background: '#450a0a', color: '#fca5a5', padding: '0.75rem 1rem',
    borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1' },
  inputWrapper: { position: 'relative' },
  inputIcon: { position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' },
  input: {
    width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.25rem',
    background: '#0f172a', border: '1px solid #334155',
    borderRadius: '8px', color: '#f1f5f9', fontSize: '0.95rem',
    outline: 'none', boxSizing: 'border-box',
  },
  button: {
    padding: '0.75rem', background: '#6366f1', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '1rem',
    fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem',
  },
  switchText: { textAlign: 'center', marginTop: '1.5rem', color: '#64748b', fontSize: '0.875rem' },
  link: { color: '#6366f1', textDecoration: 'none', fontWeight: 500 },
};