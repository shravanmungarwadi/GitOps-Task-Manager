// ============================================================
// pages/Register.jsx
// Registration form — sends name + email + password to
// POST /api/auth/register → auto-login on success.
// ============================================================

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, AlertCircle } from 'lucide-react';
import api from '../api/axios';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/register', form);

      // Auto-login after successful registration
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <UserPlus size={40} color="#6366f1" />
          <h1 style={styles.title}>Create account</h1>
          <p style={styles.subtitle}>Start managing your tasks today</p>
        </div>

        {error && (
          <div style={styles.error}>
            <AlertCircle size={16} /><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Name field */}
          <div style={styles.field}>
            <label style={styles.label}>Full Name</label>
            <div style={styles.inputWrapper}>
              <User size={16} color="#64748b" style={styles.inputIcon} />
              <input
                type="text" name="name" placeholder="John Doe"
                value={form.name} onChange={handleChange}
                required style={styles.input}
              />
            </div>
          </div>

          {/* Email field */}
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrapper}>
              <Mail size={16} color="#64748b" style={styles.inputIcon} />
              <input
                type="email" name="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange}
                required style={styles.input}
              />
            </div>
          </div>

          {/* Password field */}
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} color="#64748b" style={styles.inputIcon} />
              <input
                type="password" name="password" placeholder="Min. 6 characters"
                value={form.password} onChange={handleChange}
                required minLength={6} style={styles.input}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={styles.switchText}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
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
    background: '#1e293b', borderRadius: '16px', padding: '2.5rem',
    width: '100%', maxWidth: '420px', border: '1px solid #334155',
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