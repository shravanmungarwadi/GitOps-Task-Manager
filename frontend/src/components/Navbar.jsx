// ============================================================
// components/Navbar.jsx
// Top navigation bar shown on the Dashboard.
// Shows the logged-in user's name and a logout button.
// ============================================================

import { useNavigate } from 'react-router-dom';
import { CheckSquare, LogOut, User } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();

  // Read user info from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    // Clear all stored auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      {/* Left side — App logo + name */}
      <div style={styles.brand}>
        <CheckSquare size={24} color="#6366f1" />
        <span style={styles.brandName}>TaskManager</span>
      </div>

      {/* Right side — User info + logout */}
      <div style={styles.right}>
        <div style={styles.userInfo}>
          <User size={16} color="#94a3b8" />
          <span style={styles.userName}>{user.name || 'User'}</span>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn} title="Logout">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 2rem', height: '60px',
    background: '#1e293b', borderBottom: '1px solid #334155',
    position: 'sticky', top: 0, zIndex: 100,
  },
  brand: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  brandName: { fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' },
  right: { display: 'flex', alignItems: 'center', gap: '1rem' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '0.4rem' },
  userName: { color: '#94a3b8', fontSize: '0.875rem' },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    background: 'transparent', border: '1px solid #334155',
    color: '#94a3b8', padding: '0.4rem 0.75rem',
    borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem',
  },
};