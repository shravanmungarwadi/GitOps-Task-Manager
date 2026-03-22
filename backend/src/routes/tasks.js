// ============================================================
// routes/tasks.js
// All task and category CRUD operations.
// ALL routes here are protected (require login).
//
// CATEGORIES:
//   GET    /api/categories         → list all categories
//   POST   /api/categories         → create a category
//   DELETE /api/categories/:id     → delete a category
//
// TASKS:
//   GET    /api/tasks              → list all tasks (with filters)
//   GET    /api/tasks/:id          → get a single task
//   POST   /api/tasks              → create a task
//   PUT    /api/tasks/:id          → update a task
//   DELETE /api/tasks/:id          → delete a task
//   PATCH  /api/tasks/:id/toggle   → toggle complete/incomplete
// ============================================================

const express = require('express');
const { body, query, validationResult } = require('express-validator');

const { pool } = require('../db');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply protect middleware to ALL routes in this file
// So we don't have to write protect() on every single route
router.use(protect);

// ══════════════════════════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════════════════════════

// GET /api/categories — list all categories for this user
router.get('/categories', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(t.id) AS task_count
       FROM categories c
       LEFT JOIN tasks t ON t.category_id = c.id AND t.user_id = $1
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.created_at ASC`,
      [req.user.id]
    );

    res.json({ success: true, categories: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories — create a new category
router.post(
  '/categories',
  [
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('color').optional().isHexColor().withMessage('Invalid color format'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, color = '#6366f1' } = req.body;

      const result = await pool.query(
        `INSERT INTO categories (name, color, user_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, color, req.user.id]
      );

      res.status(201).json({ success: true, category: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/categories/:id — delete a category
router.delete('/categories/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════════════════════

// GET /api/tasks — list all tasks with optional filters
// Supports: ?completed=true  ?priority=high  ?category_id=2  ?search=keyword
router.get('/', async (req, res, next) => {
  try {
    const { completed, priority, category_id, search } = req.query;

    // Build query dynamically based on which filters are provided
    // $1 is always the user_id — we add more params as needed
    let queryStr = `
      SELECT t.*, c.name AS category_name, c.color AS category_color
      FROM tasks t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = $1
    `;
    const params = [req.user.id];

    // Add filters dynamically
    if (completed !== undefined) {
      params.push(completed === 'true');
      queryStr += ` AND t.completed = $${params.length}`;
    }

    if (priority) {
      params.push(priority);
      queryStr += ` AND t.priority = $${params.length}`;
    }

    if (category_id) {
      params.push(category_id);
      queryStr += ` AND t.category_id = $${params.length}`;
    }

    if (search) {
      // Search in both title and description using ILIKE (case-insensitive)
      params.push(`%${search}%`);
      queryStr += ` AND (t.title ILIKE $${params.length} OR t.description ILIKE $${params.length})`;
    }

    queryStr += ' ORDER BY t.created_at DESC';

    const result = await pool.query(queryStr, params);

    // Also return summary stats
    const statsResult = await pool.query(
      `SELECT
        COUNT(*)                              AS total,
        COUNT(*) FILTER (WHERE completed)     AS completed,
        COUNT(*) FILTER (WHERE NOT completed) AS pending
       FROM tasks WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      stats: statsResult.rows[0],
      tasks: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id — get a single task
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.name AS category_name, c.color AS category_color
       FROM tasks t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.id = $1 AND t.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    res.json({ success: true, task: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks — create a new task
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Priority must be low, medium or high'),
    body('due_date')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid date'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        title,
        description = null,
        priority = 'medium',
        due_date = null,
        category_id = null,
      } = req.body;

      const result = await pool.query(
        `INSERT INTO tasks (title, description, priority, due_date, category_id, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [title, description, priority, due_date, category_id, req.user.id]
      );

      res.status(201).json({ success: true, task: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/tasks/:id — update a task
router.put(
  '/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('due_date').optional().isISO8601(),
    body('completed').optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // First check the task belongs to this user
      const existing = await pool.query(
        'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
        [req.params.id, req.user.id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Task not found',
        });
      }

      const current = existing.rows[0];

      // Merge current values with new values (so partial updates work)
      const updated = {
        title:       req.body.title       ?? current.title,
        description: req.body.description ?? current.description,
        priority:    req.body.priority    ?? current.priority,
        due_date:    req.body.due_date    ?? current.due_date,
        completed:   req.body.completed   ?? current.completed,
        category_id: req.body.category_id ?? current.category_id,
      };

      const result = await pool.query(
        `UPDATE tasks
         SET title=$1, description=$2, priority=$3, due_date=$4,
             completed=$5, category_id=$6, updated_at=NOW()
         WHERE id=$7 AND user_id=$8
         RETURNING *`,
        [
          updated.title, updated.description, updated.priority,
          updated.due_date, updated.completed, updated.category_id,
          req.params.id, req.user.id,
        ]
      );

      res.json({ success: true, task: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/tasks/:id/toggle — quickly toggle completed status
router.patch('/:id/toggle', async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE tasks
       SET completed = NOT completed, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    res.json({ success: true, task: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id — delete a task
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;