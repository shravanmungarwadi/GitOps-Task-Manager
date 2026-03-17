// pages/Dashboard.jsx
import { useState, useEffect, useCallback, useRef } from 'react';  // ADD useRef
import { Plus, Search, CheckCircle, Circle, ListTodo } from 'lucide-react';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import api from '../api/axios';

export default function Dashboard() {
  const [tasks, setTasks]             = useState([]);
  const [categories, setCategories]   = useState([]);
  const [stats, setStats]             = useState({ total: 0, completed: 0, pending: 0 });
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // FIX: Separate search text (what user types) from the actual filter applied
  // searchText updates on every keystroke — but API only fires after 400ms pause
  const [searchText, setSearchText]   = useState('');
  const [filters, setFilters]         = useState({
    search: '', priority: '', category_id: '', completed: '',
  });

  // ── FIX: Debounce search ─────────────────────────────────────
  // useRef stores the timer ID so we can cancel it on next keystroke
  const debounceRef = useRef(null);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value); // Update input immediately (feels responsive)

    // Cancel previous timer
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Only fire API call after user stops typing for 400ms
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value }));
    }, 400);
  };

  // ── Fetch Tasks ──────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v !== '') params.append(k, v); });
      const { data } = await api.get(`/tasks?${params.toString()}`);
      setTasks(data.tasks);
      setStats(data.stats);
    } catch (err) {
      setError('Failed to load tasks. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/tasks/categories');
      setCategories(data.categories);
    } catch (err) {
      console.error('Could not load categories');
    }
  };

  useEffect(() => { fetchTasks(); },    [fetchTasks]);
  useEffect(() => { fetchCategories(); }, []);

  // ── Task Handlers ────────────────────────────────────────────

  const handleCreate = async (taskData) => {
    await api.post('/tasks', taskData);
    setShowForm(false);
    fetchTasks();        // Refresh list + stats
    fetchCategories();   // Refresh category task counts
  };

  const handleUpdate = async (taskData) => {
    await api.put(`/tasks/${editingTask.id}`, taskData);
    setEditingTask(null);
    fetchTasks();
  };

  // FIX: Removed broken optimistic update.
  // Just call fetchTasks() so stats + list both update correctly.
  const handleToggle = async (id) => {
    try {
      await api.patch(`/tasks/${id}/toggle`);
      fetchTasks(); // Re-fetch so stats (completed/pending count) also update
    } catch (err) {
      setError('Failed to update task. Try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      fetchTasks(); // Refresh list + stats
    } catch (err) {
      setError('Failed to delete task. Try again.');
    }
  };

  return (
    <div style={styles.page}>
      <Navbar />
      <main style={styles.main}>

        {/* Stats */}
        <div style={styles.statsRow}>
          {[
            { icon: <ListTodo   size={20}/>, label: 'Total',     value: stats.total,     color: '#6366f1' },
            { icon: <Circle     size={20}/>, label: 'Pending',   value: stats.pending,   color: '#f59e0b' },
            { icon: <CheckCircle size={20}/>,label: 'Completed', value: stats.completed, color: '#10b981' },
          ].map((s) => (
            <div key={s.label} style={styles.statCard}>
              <div style={{ color: s.color }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9' }}>{s.value}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.searchWrapper}>
            <Search size={16} color="#64748b" style={styles.searchIcon} />
            {/* FIX: use searchText (not filters.search) so input feels instant */}
            <input
              placeholder="Search tasks..."
              value={searchText}
              onChange={handleSearchChange}
              style={styles.searchInput}
            />
          </div>

          <select value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            style={styles.select}>
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select value={filters.category_id}
            onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
            style={styles.select}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select value={filters.completed}
            onChange={(e) => setFilters({ ...filters, completed: e.target.value })}
            style={styles.select}>
            <option value="">All Status</option>
            <option value="false">Pending</option>
            <option value="true">Completed</option>
          </select>

          <button onClick={() => setShowForm(true)} style={styles.addBtn}>
            <Plus size={16} /> New Task
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {loading ? (
          <div style={styles.center}>Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div style={styles.empty}>
            <ListTodo size={48} color="#334155" />
            <p>No tasks found. Create your first task!</p>
          </div>
        ) : (
          <div style={styles.taskList}>
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task}
                onToggle={handleToggle}
                onEdit={(t) => setEditingTask(t)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <TaskForm categories={categories} onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}
      {editingTask && (
        <TaskForm initialData={editingTask} categories={categories} onSubmit={handleUpdate} onCancel={() => setEditingTask(null)} />
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#0f172a' },
  main: { maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' },
  statCard: { background: '#1e293b', borderRadius: '12px', padding: '1.25rem', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '1rem' },
  toolbar: { display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  searchWrapper: { position: 'relative', flex: 1, minWidth: '180px' },
  searchIcon: { position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' },
  searchInput: { width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' },
  select: { padding: '0.6rem 0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', background: '#6366f1', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' },
  taskList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  error: { background: '#450a0a', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem', color: '#475569', textAlign: 'center' },
  center: { textAlign: 'center', padding: '3rem', color: '#64748b' },
};