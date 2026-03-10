/**
 * ===========================================
 * AF-Komik V2 - Main Application Entry Point
 * ===========================================
 * 
 * Express application setup and configuration.
 * This is the main entry point for the server application.
 * 
 * Features:
 * - EJS view engine for server-side rendering
 * - Body parsing (JSON & URL-encoded)
 * - Static file serving from /public
 * - Session management with MongoDB storage
 * - Global error handling
 * - Graceful shutdown on SIGTERM/SIGINT
 * 
 * Database Architecture:
 * - MongoDB: Users, sessions, bookmarks, reading history
 * - MySQL: Comics (komik), chapters, images (pages)
*/

// ===========================================
// Load Environment Variables
// ===========================================
// Must be loaded first before any other imports
require('dotenv').config();

const logger = require('./utils/smartLogger');

logger.info('========================================');
logger.info('   AF-KOMIK V2 - Server Starting...    ');
logger.info('========================================');
logger.info('[ENV] Environment variables loaded');
logger.info(`[ENV] NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
logger.info(`[ENV] PORT: ${process.env.PORT || 3000}`);

// ===========================================
// Module Imports
// ===========================================
const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

logger.info('[APP] Express module loaded');

// Import configuration modules
const { connectMongoDB } = require('./config/mongo');
const { createMySQLPool, closeMySQLPool } = require('./config/mysql');
const { createSessionMiddleware } = require('./config/session');

logger.info('[APP] Configuration modules loaded');

// Import routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth.routes');
const authApiRoutes = require('./routes/api/auth.api.routes');
const comicRoutes = require('./routes/comic.routes');
const comicApiRoutes = require('./routes/api/comic.api.routes');
const userRoutes = require('./routes/user.routes');
const userApiRoutes = require('./routes/api/user.api.routes');
const readChapterApiRoutes = require('./routes/api/readChapter.api.routes');
const adminRoutes = require('./routes/admin.routes');
const adminApiRoutes = require('./routes/api/admin.api.routes');
const healthApiRoutes = require('./routes/api/health.api.routes');

logger.info('[APP] Route modules loaded');

// ===========================================
// Create Express Application
// ===========================================
const app = express();

logger.info('[APP] Express application created');

// ===========================================
// View Engine Configuration
// ===========================================
// Using EJS as the template engine for server-side rendering
// Views are stored in /views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use express-ejs-layouts for layout support
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

logger.info('[APP] View engine configured: EJS with express-ejs-layouts');
logger.info(`[APP] Views directory: ${path.join(__dirname, 'views')}`);

// ===========================================
// Middleware Configuration
// ===========================================

// Parse JSON request bodies
// Limit set to 10mb to handle larger payloads if needed
app.use(express.json({ limit: '10mb' }));
logger.info('[MIDDLEWARE] JSON body parser configured (limit: 10mb)');

// Parse URL-encoded request bodies
// Extended: true allows for rich objects and arrays
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
logger.info('[MIDDLEWARE] URL-encoded body parser configured (limit: 10mb)');

// Serve static files from public directory
// Files in /public are accessible via root URL (e.g., /css/style.css)
app.use(express.static(path.join(__dirname, 'public')));
logger.info(`[MIDDLEWARE] Static files served from: ${path.join(__dirname, 'public')}`);

// Request logging middleware
// Logs every incoming request with method and path
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  logger.info(`[REQUEST] ${timestamp} - ${req.method} ${req.path}`);
  logger.info(`${req.method} ${req.path}`);
  next();
});
logger.info('[MIDDLEWARE] Request logging middleware configured');

// ===========================================
// Application Initialization
// ===========================================

/**
 * Initialize application services and start server
 * This function:
 * 1. Connects to MongoDB (for users, sessions, bookmarks, history)
 * 2. Connects to MySQL (for comics, chapters, pages)
 * 3. Sets up session middleware
 * 4. Registers routes
 * 5. Sets up error handlers
 * 6. Starts the HTTP server
 */
const initializeApp = async () => {
  try {
    logger.info('\n[INIT] Starting application initialization...\n');

    // ===========================================
    // Database Connections
    // ===========================================
    
    // Connect to MongoDB (for users, sessions, bookmarks, history)
    logger.info('[INIT] Step 1: Connecting to MongoDB...');
    await connectMongoDB();

    // Connect to MySQL (for comics, chapters, pages)
    logger.info('\n[INIT] Step 2: Connecting to MySQL...');
    await createMySQLPool();

    // ===========================================
    // Session Middleware Setup
    // ===========================================
    // Session middleware must be set up after MongoDB connection
    // because sessions are stored in MongoDB
    logger.info('\n[INIT] Step 3: Setting up session middleware...');
    app.use(createSessionMiddleware());

    // ===========================================
    // Routes Configuration
    // ===========================================
    logger.info('\n[INIT] Step 4: Registering routes...');
    
    // Web routes
    app.use('/', indexRoutes);
    logger.info('[ROUTES] ✓ Index routes registered at /');
    
    app.use('/', authRoutes);
    logger.info('[ROUTES] ✓ Auth routes registered at /');
    
    // Comic web routes
    app.use('/comics', comicRoutes);
    logger.info('[ROUTES] ✓ Comic routes registered at /comics');
    
    // User web routes (bookmarks, history, resume)
    app.use('/', userRoutes);
    logger.info('[ROUTES] ✓ User routes registered at / (bookmarks, history, resume)');
    
    // API routes
    app.use('/api/auth', authApiRoutes);
    logger.info('[ROUTES] ✓ Auth API routes registered at /api/auth');
    
    app.use('/api/health', healthApiRoutes);
    logger.info('[ROUTES] ✓ Health API routes registered at /api/health');
    
    app.use('/api/comics', comicApiRoutes);
    logger.info('[ROUTES] ✓ Comic API routes registered at /api/comics');
    
    // User API routes (bookmarks, history, resume)
    app.use('/api', userApiRoutes);
    logger.info('[ROUTES] ✓ User API routes registered at /api (bookmarks, history, resume)');
    
    // Read chapter API routes
    app.use('/api/read-chapters', readChapterApiRoutes);
    logger.info('[ROUTES] ✓ Read chapter API routes registered at /api/read-chapters');

    // Admin routes (requires authentication + admin role)
    app.use('/admin', adminRoutes);
    logger.info('[ROUTES] ✓ Admin routes registered at /admin');
    
    app.use('/api/admin', adminApiRoutes);
    logger.info('[ROUTES] ✓ Admin API routes registered at /api/admin');

    // ===========================================
    // 404 Handler
    // ===========================================
    // This catches all requests that don't match any route
    app.use((req, res) => {
      logger.info(`[404] Page not found: ${req.method} ${req.path}`);
      logger.warn(`404 - Page not found: ${req.method} ${req.path}`);
      res.status(404).render('errors/404', {
        title: 'Page Not Found'
      });
    });
    logger.info('[ROUTES] ✓ 404 handler registered');

    // ===========================================
    // Global Error Handler
    // ===========================================
    // This catches all errors thrown in the application
    // Must be defined last after all other middleware and routes
    app.use((err, req, res, next) => {
      // Log the error with full details
      logger.error(`[ERROR] ${err.message}`);
      logger.error(`[ERROR] Stack: ${err.stack}`);
      logger.error(`Error: ${err.message}`, { stack: err.stack });

      // Determine error status code
      const statusCode = err.statusCode || 500;
      const isDevelopment = process.env.NODE_ENV !== 'production';

      // Render error page
      res.status(statusCode).render('errors/500', {
        title: 'Server Error',
        error: isDevelopment ? err : null,
        message: isDevelopment ? err.message : 'An unexpected error occurred'
      });
    });
    logger.info('[ROUTES] ✓ Global error handler registered');

    // ===========================================
    // Start Server
    // ===========================================
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      logger.info('\n========================================');
      logger.info('   AF-KOMIK V2 - Server Started!       ');
      logger.info('========================================');
      logger.info(`[SERVER] ✓ Server running on port ${PORT}`);
      logger.info(`[SERVER] ✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`[SERVER] ✓ URL: http://localhost:${PORT}`);
      logger.info('========================================\n');
      
      logger.info(`🚀 AF-Komik V2 server running on port ${PORT}`);
      logger.info(`📖 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 URL: http://localhost:${PORT}`);
      
      // Warmup stats cache in background
      const statsService = require('./services/statsService');
      statsService.warmupCache().catch(err => {
        logger.warn(`Stats cache warmup failed: ${err.message}`);
      });
    });

  } catch (error) {
    logger.error('\n========================================');
    logger.error('   AF-KOMIK V2 - Initialization Failed  ');
    logger.error('========================================');
    logger.error(`[ERROR] ${error.message}`);
    logger.error(`[ERROR] Stack: ${error.stack}`);
    logger.error(`Failed to initialize application: ${error.message}`);
    process.exit(1);
  }
};

// ===========================================
// Graceful Shutdown Handling
// ===========================================

/**
 * Handle graceful shutdown when server receives termination signal
 * This ensures all connections are properly closed before exit
 * 
 * @param {string} signal - The signal received (SIGTERM or SIGINT)
 */
const gracefulShutdown = async (signal) => {
  logger.info(`\n[SHUTDOWN] ${signal} received. Starting graceful shutdown...`);
  logger.info(`${signal} received. Starting graceful shutdown...`);

  try {
    // Close MySQL connection pool
    logger.info('[SHUTDOWN] Closing MySQL connection pool...');
    await closeMySQLPool();

    logger.info('[SHUTDOWN] ✓ Graceful shutdown completed');
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error(`[SHUTDOWN] ✗ Error during shutdown: ${error.message}`);
    logger.error(`Error during shutdown: ${error.message}`);
    process.exit(1);
  }
};

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('[ERROR] Unhandled Promise Rejection');
  logger.error('[ERROR] Reason:', reason);
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('[ERROR] Uncaught Exception');
  logger.error(`[ERROR] ${error.message}`);
  logger.error(`[ERROR] Stack: ${error.stack}`);
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

logger.info('[APP] Event handlers registered (SIGTERM, SIGINT, uncaughtException, unhandledRejection)');

// ===========================================
// Start Application
// ===========================================
logger.info('\n[APP] Starting application initialization...\n');
initializeApp();

// Export app for testing purposes
module.exports = app;
