/**
 * ===========================================
 * AF-Komik V2 - API Response Helper
 * ===========================================
 * 
 * Utility functions for standardized API responses.
 * Ensures consistent response format across all API endpoints.
 * 
 * Standard Response Format:
 * {
 *   "status": "success" | "error",
 *   "message": "Human readable message",
 *   "data": null | object
 * }
 * 
 * Usage:
 * const { successResponse, errorResponse } = require('../utils/apiResponse');
 * 
 * // Success response
 * return successResponse(res, 200, 'User created successfully', { user });
 * 
 * // Error response
 * return errorResponse(res, 400, 'Invalid input', { field: 'email' });
 */

/**
 * Send a success response
 * 
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (200, 201, etc.)
 * @param {string} message - Human readable success message
 * @param {Object|null} data - Response data (optional)
 * @returns {Object} Express response
 * 
 * Example:
 * successResponse(res, 201, 'User registered successfully', { user: userData });
 * 
 * Output:
 * {
 *   "status": "success",
 *   "message": "User registered successfully",
 *   "data": { "user": { ... } }
 * }
 */
const successResponse = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({
    status: 'success',
    message: message,
    data: data
  });
};

/**
 * Send an error response
 * 
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (400, 401, 403, 404, 500, etc.)
 * @param {string} message - Human readable error message
 * @param {Object|null} errors - Additional error details (optional)
 * @returns {Object} Express response
 * 
 * Example:
 * errorResponse(res, 400, 'Validation failed', { email: 'Email already exists' });
 * 
 * Output:
 * {
 *   "status": "error",
 *   "message": "Validation failed",
 *   "data": null,
 *   "errors": { "email": "Email already exists" }
 * }
 */
const errorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    status: 'error',
    message: message,
    data: null
  };

  // Include errors object if provided
  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Common HTTP Status Codes Reference
 * 
 * Success:
 * - 200 OK: Request succeeded
 * - 201 Created: Resource created successfully
 * - 204 No Content: Success with no response body
 * 
 * Client Errors:
 * - 400 Bad Request: Invalid input/validation error
 * - 401 Unauthorized: Authentication required
 * - 403 Forbidden: Not enough permissions
 * - 404 Not Found: Resource not found
 * - 409 Conflict: Resource already exists
 * - 422 Unprocessable Entity: Semantic validation error
 * - 429 Too Many Requests: Rate limit exceeded
 * 
 * Server Errors:
 * - 500 Internal Server Error: Unexpected server error
 * - 503 Service Unavailable: Server temporarily unavailable
 */

/**
 * Pre-defined response functions for common scenarios
 */

// 200 OK
const ok = (res, message, data = null) => 
  successResponse(res, 200, message, data);

// 201 Created
const created = (res, message, data = null) => 
  successResponse(res, 201, message, data);

// 400 Bad Request
const badRequest = (res, message, errors = null) => 
  errorResponse(res, 400, message, errors);

// 401 Unauthorized
const unauthorized = (res, message = 'Authentication required') => 
  errorResponse(res, 401, message);

// 403 Forbidden
const forbidden = (res, message = 'Access denied') => 
  errorResponse(res, 403, message);

// 404 Not Found
const notFound = (res, message = 'Resource not found') => 
  errorResponse(res, 404, message);

// 409 Conflict
const conflict = (res, message, errors = null) => 
  errorResponse(res, 409, message, errors);

// 500 Internal Server Error
const serverError = (res, message = 'Internal server error') => 
  errorResponse(res, 500, message);

module.exports = {
  // Main functions
  successResponse,
  errorResponse,
  
  // Shorthand functions
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError
};
