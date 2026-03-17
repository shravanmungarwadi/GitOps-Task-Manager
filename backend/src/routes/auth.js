// ============================================================
// routes/auth.js
// Handles user registration and login.
//
// POST /api/auth/register  → Create new account
// POST /api/auth/login     → Login and get JWT token
// GET  /api/auth/me        → Get current logged-in user info
// ============================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const { pool } = require('../db');
const config = require('../config');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── Helper: generate a JWT token for a user ───────────────────
const generateToken = (user) => {
  return jwt.sign(
    // Payload stored inside the token
    { id: user.id, email: user.email, name: user.name },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
};

// ── POST /api/auth/register ───────────────────────────────────
// Validation rules run BEFORE the route handler
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req, res, next) => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, email, password } = req.body;

      // Check if email is already registered
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Email is already registered',
        });
      }

      // Hash the password before saving (NEVER store plain text passwords!)
      // bcrypt adds a "salt" automatically — salt = random data to prevent
      // two users with the same password having the same hash
      const hashedPassword = await bcrypt.hash(password, 12);

      // Insert new user into database
      const result = await pool.query(
        `INSERT INTO users (name, email, password)
         VALUES ($1, $2, $3)
         RETURNING id, name, email, created_at`,
        [name, email, hashedPassword]
      );

      const newUser = result.rows[0];

      // Create default categories for this new user
      const defaultCategories = ['Work', 'Personal', 'Health', 'Learning'];
      const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b'];

      for (let i = 0; i < defaultCategories.length; i++) {
        await pool.query(
          'INSERT INTO categories (name, color, user_id) VALUES ($1, $2, $3)',
          [defaultCategories[i], colors[i], newUser.id]
        );
      }

      // Generate token and return it
      const token = generateToken(newUser);

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
      });
    } catch (err) {
      next(err); // Pass to global error handler
    }
  }
);

// ── POST /api/auth/login ──────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user by email
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      const user = result.rows[0];

      // If user not found OR password doesn't match → same generic error
      // (Don't tell attacker which one failed — security best practice!)
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      const token = generateToken(user);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/auth/me ──────────────────────────────────────────
// Protected route — requires valid JWT token
router.get('/me', protect, async (req, res, next) => {
  try {
    // req.user was set by the protect middleware
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;