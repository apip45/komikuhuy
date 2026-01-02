/**
 * ===========================================
 * AF-Komik V2 - Middlewares Index
 * ===========================================
 * 
 * Central export point for all middleware modules.
 * Import all middlewares from this file for convenience.
 * 
 * Usage:
 * const { isAuthenticated, isAdmin } = require('./middlewares');
 */

// Authentication middlewares - check if user is logged in
const { isAuthenticated, isAuthenticatedAPI } = require('./auth.middleware');

// Role/Authorization middlewares - check if user has required role
const { isAdmin, isAdminAPI, hasRole } = require('./role.middleware');

module.exports = {
  // Authentication middlewares
  isAuthenticated,
  isAuthenticatedAPI,
  
  // Authorization middlewares
  isAdmin,
  isAdminAPI,
  hasRole
};
