// ============================================================
// components/TaskCard.jsx
// Displays a single task as a card.
// Shows: title, description, priority badge, due date, category.
// Actions: toggle complete, edit, delete.
// ============================================================

import { Trash2, Pencil, Calendar, Tag } from 'lucide-react';

// Priority display config
const PRIORITY = {
  low:    { label: 'Low',    color: '#10b981', bg: '#022c22' },
  medium: { label: 'Medium', color: '#f59e0b', bg: '#1c1400' },
  high:   { label: 'High',   color: '#ef4444', bg: '#2d0a0a' },
};

export default function TaskCard({ task, onToggle, onEdit, onDelete }) {
  const priority = PRIORITY[task.priority] || PRIORITY.medium;

  // Format due date nicely (e.g., "Jan 15, 2025")
  const dueDateStr = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null;

  // Check if task is overdue
  const isOverdue =
    task.due_date && !task.completed &&
    new Date(task.due_date) < new Date();

  return (
    <div style={{
      ...styles.card,
      opacity: task.completed ? 0.6 : 1,
      borderLeft: `3px solid ${priority.color}`,
    }}>
      {/* Top row: checkbox + title + actions */}
      <div style={styles.topRow}>
        {/* Checkbox to toggle complete */}
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          style={styles.checkbox}
        />

        {/* Title */}
        <span style={{
          ...styles.title,
          textDecoration: task.completed ? 'line-through' : 'none',
          color: task.completed ? '#475569' : '#f1f5f9',
        }}>
          {task.title}
        </span>

        {/* Edit + Delete buttons */}
        <div style={styles.actions}>
          <button onClick={() => onEdit(task)} style={styles.iconBtn} title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(task.id)} style={{ ...styles.iconBtn, color: '#ef4444' }} title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Description (if any) */}
      {task.description && (
        <p style={styles.description}>{task.description}</p>
      )}

      {/* Bottom row: metadata badges */}
      <div style={styles.meta}>
        {/* Priority badge */}
        <span style={{ ...styles.badge, color: priority.color, background: priority.bg }}>
          {priority.label}
        </span>

        {/* Category badge */}
        {task.category_name && (
          <span style={{ ...styles.badge, color: task.category_color || '#6366f1', background: '#1e1b4b' }}>
            <Tag size={10} /> {task.category_name}
          </span>
        )}

        {/* Due date */}
        {dueDateStr && (
          <span style={{ ...styles.badge, color: isOverdue ? '#ef4444' : '#64748b', background: 'transparent' }}>
            <Calendar size={10} /> {isOverdue ? '⚠ ' : ''}{dueDateStr}
          </span>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: '#1e293b', borderRadius: '10px',
    padding: '1rem 1.25rem', border: '1px solid #334155',
    display: 'flex', flexDirection: 'column', gap: '0.6rem',
  },
  topRow: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  checkbox: { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#6366f1' },
  title: { flex: 1, fontSize: '0.95rem', fontWeight: 500 },
  actions: { display: 'flex', gap: '0.25rem' },
  iconBtn: {
    background: 'none', border: 'none', color: '#64748b',
    cursor: 'pointer', padding: '0.25rem', borderRadius: '4px',
  },
  description: { fontSize: '0.85rem', color: '#64748b', marginLeft: '1.6rem' },
  meta: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginLeft: '1.6rem' },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    fontSize: '0.75rem', fontWeight: 500,
    padding: '0.2rem 0.5rem', borderRadius: '4px',
  },
};