/**
 * ===========================================
 * AF-Komik V2 - Authentication API Routes
 * ===========================================
 * 
 * REST API routes for authentication.
 * All routes return JSON responses.
 * 
 * Base path: /api/auth
 * 
 * Endpoints:
 * - POST /api/auth/register  - Register new user
 * - POST /api/auth/login     - Login user
 * - POST /api/auth/logout    - Logout user
 * - GET  /api/auth/me        - Get current user
 * 
 * Response Format:
 * {
 *   "status": "success" | "error",
 *   "message": "Human readable message",
 *   "data": null | object
 * }
 */

const express = require('express');
const router = express.Router();

// Import controller
const authController = require('../../controllers/authController');

// Import middleware
const { isAuthenticatedAPI } = require('../../middlewares');

console.log('[ROUTES] Registering auth API routes...');

// ===========================================
// Public API Routes
// ===========================================

/**
 * POST /api/auth/register
 * 
 * Register a new user account.
 * 
 * Request Body:
 * {
 *   "username": "string (required, 3-20 chars)",
 *   "email": "string (required, valid email)",
 *   "password": "string (required, min 8 chars)"
 * }
 * 
 * Response (201 Created):
 * {
 *   "status": "success",
 *   "message": "User registered successfully",
 *   "data": {
 *     "user": { id, username, email, role, createdAt, ... }
 *   }
 * }
 * 
 * Error Responses:
 * - 400: Validation error (missing fields, invalid format)
 * - 409: Conflict (email or username already exists)
 * - 500: Server error
 */
router.post('/register', authController.registerAPI);
console.log('[ROUTES] Registered: POST /api/auth/register');

/**
 * POST /api/auth/login
 * 
 * Login with email/username and password.
 * Creates a session cookie on success.
 * 
 * Request Body:
 * {
 *   "email": "string (required, email or username)",
 *   "password": "string (required)"
 * }
 * 
 * Response (200 OK):
 * {
 *   "status": "success",
 *   "message": "Login successful",
 *   "data": {
 *     "user": { id, username, email, role, ... }
 *   }
 * }
 * 
 * Error Responses:
 * - 400: Missing credentials
 * - 401: Invalid email/password
 * - 500: Server error
 */
router.post('/login', authController.loginAPI);
console.log('[ROUTES] Registered: POST /api/auth/login');

// ===========================================
// Protected API Routes
// ===========================================

/**
 * POST /api/auth/logout
 * 
 * Logout the current user.
 * Destroys the session.
 * 
 * Headers:
 * - Cookie: connect.sid=<session_id>
 * 
 * Response (200 OK):
 * {
 *   "status": "success",
 *   "message": "Logged out successfully",
 *   "data": null
 * }
 * 
 * Error Responses:
 * - 401: Not authenticated
 * - 500: Server error
 */
router.post('/logout', isAuthenticatedAPI, authController.logoutAPI);
console.log('[ROUTES] Registered: POST /api/auth/logout');

/**
 * GET /api/auth/me
 * 
 * Get current authenticated user's data.
 * 
 * Headers:
 * - Cookie: connect.sid=<session_id>
 * 
 * Response (200 OK):
 * {
 *   "status": "success",
 *   "message": "User retrieved successfully",
 *   "data": {
 *     "user": { id, username, email, role, profile, ... }
 *   }
 * }
 * 
 * Error Responses:
 * - 401: Not authenticated
 * - 500: Server error
 */
router.get('/me', isAuthenticatedAPI, authController.getCurrentUser);
console.log('[ROUTES] Registered: GET /api/auth/me');

console.log('[ROUTES] Auth API routes registration complete');

module.exports = router;
