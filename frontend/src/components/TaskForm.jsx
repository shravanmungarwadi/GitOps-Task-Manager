// ============================================================
// components/TaskForm.jsx
// Reusable form for both CREATING and EDITING tasks.
// Receives:
//   - onSubmit(taskData) — called when form is submitted
//   - onCancel()         — called when user clicks cancel
//   - initialData        — if editing, prefills the form
//   - categories         — list of categories for the dropdown
// ============================================================

import { useState } from 'react';
import { X } from 'lucide-react';

export default function TaskForm({ onSubmit, onCancel, initialData = {}, categories = [] }) {
  // If editing, prefill from initialData; if creating, use defaults
  const [form, setForm] = useState({
    title:       initialData.title       || '',
    description: initialData.description || '',
    priority:    initialData.priority    || 'medium',
    due_date:    initialData.due_date    ? initialData.due_date.slice(0, 10) : '',
    category_id: initialData.category_id || '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Clean up empty strings to null before sending to API
      await onSubmit({
        ...form,
        due_date:    form.due_date    || null,
        category_id: form.category_id || null,
        description: form.description || null,
      });
    } finally {
      setLoading(false);
    }
  };

  // Color badge for each priority level
  const priorityColors = {
    low: '#10b981', medium: '#f59e0b', high: '#ef4444',
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Modal Header */}
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>
            {initialData.id ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onCancel} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Title */}
          <div style={styles.field}>
            <label style={styles.label}>Title *</label>
            <input
              type="text" name="title" value={form.title}
              onChange={handleChange} required
              placeholder="What needs to be done?"
              style={styles.input}
            />
          </div>

          {/* Description */}
          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <textarea
              name="description" value={form.description}
              onChange={handleChange} rows={3}
              placeholder="Add details (optional)"
              style={{ ...styles.input, resize: 'vertical' }}
            />
          </div>

          {/* Priority + Category side by side */}
          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Priority</label>
              <select
                name="priority" value={form.priority}
                onChange={handleChange} style={styles.select}
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>

            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Category</label>
              <select
                name="category_id" value={form.category_id}
                onChange={handleChange} style={styles.select}
              >
                <option value="">No Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div style={styles.field}>
            <label style={styles.label}>Due Date</label>
            <input
              type="date" name="due_date" value={form.due_date}
              onChange={handleChange} style={styles.input}
            />
          </div>

          {/* Action buttons */}
          <div style={styles.actions}>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? 'Saving...' : initialData.id ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: '1rem',
  },
  modal: {
    background: '#1e293b', borderRadius: '16px', width: '100%',
    maxWidth: '500px', border: '1px solid #334155',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.25rem 1.5rem', borderBottom: '1px solid #334155',
  },
  modalTitle: { fontSize: '1.1rem', fontWeight: 600, color: '#f1f5f9' },
  closeBtn: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' },
  form: { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  label: { fontSize: '0.8rem', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: {
    padding: '0.6rem 0.75rem', background: '#0f172a',
    border: '1px solid #334155', borderRadius: '8px',
    color: '#f1f5f9', fontSize: '0.95rem', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  },
  select: {
    padding: '0.6rem 0.75rem', background: '#0f172a',
    border: '1px solid #334155', borderRadius: '8px',
    color: '#f1f5f9', fontSize: '0.95rem', outline: 'none', width: '100%',
  },
  row: { display: 'flex', gap: '1rem' },
  actions: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' },
  cancelBtn: {
    padding: '0.6rem 1.25rem', background: 'transparent',
    border: '1px solid #334155', color: '#94a3b8',
    borderRadius: '8px', cursor: 'pointer',
  },
  submitBtn: {
    padding: '0.6rem 1.25rem', background: '#6366f1',
    border: 'none', color: '#fff', borderRadius: '8px',
    cursor: 'pointer', fontWeight: 600,
  },
};