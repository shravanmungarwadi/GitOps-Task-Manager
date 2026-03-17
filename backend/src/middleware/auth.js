// ============================================================
// middleware/auth.js
// Protects routes that require a logged-in user.
// How it works:
//   1. Client sends request with "Authorization: Bearer <token>"
//   2. We verify the token using our JWT secret
//   3. If valid → decode it and attach user info to req.user
//   4. If invalid → return 401 Unauthorized
// ============================================================

const jwt = require('jsonwebtoken');
const config = require('../config');

const protect = (req, res, next) => {
  // Get the "Authorization" header from the request
  const authHeader = req.headers.authorization;

  // Check if header exists and starts with "Bearer "
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. No token provided.',
    });
  }

  // Extract the actual token (remove the "Bearer " prefix)
  const token = authHeader.split(' ')[1];

  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // Attach the decoded user info to the request object
    // Now any route using this middleware can access req.user
    req.user = decoded;

    // Move on to the actual route handler
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Token is invalid or expired.',
    });
  }
};

module.exports = { protect };