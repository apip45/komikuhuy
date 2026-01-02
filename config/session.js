/**
 * ===========================================
 * AF-Komik V2 - Session Configuration
 * ===========================================
 * 
 * Express session configuration using connect-mongo for MongoDB storage.
 * Sessions are stored in MongoDB Atlas for persistence and scalability.
 * 
 * Security features:
 * - httpOnly cookies (prevents XSS attacks)
 * - sameSite protection (prevents CSRF attacks)
 * - Secure cookies in production (HTTPS only)
 */

const session = require('express-session');
const MongoStore = require('connect-mongo');
const logger = require('./logger');

/**
 * Create and configure session middleware
 * @returns {Function} Express session middleware
 */
const createSessionMiddleware = () => {
  console.log('[SESSION] Configuring session middleware...');

  // Validate required environment variables
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not defined in environment variables');
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  // Determine if running in production
  const isProduction = process.env.NODE_ENV === 'production';

  console.log(`[SESSION] Environment: ${isProduction ? 'production' : 'development'}`);

  // Session configuration options
  const sessionConfig = {
    // Secret key for signing session ID cookie
    secret: process.env.SESSION_SECRET,

    // Don't save session if unmodified
    resave: false,

    // Don't create session until something is stored
    saveUninitialized: false,

    // MongoDB session store configuration
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: parseInt(process.env.SESSION_MAX_AGE) / 1000 || 86400, // 24 hours in seconds
      autoRemove: 'native',
      crypto: {
        secret: process.env.SESSION_SECRET
      },
      touchAfter: 24 * 3600 // Only update session once per 24 hours unless data changes
    }),

    // Cookie configuration
    cookie: {
      // Prevent client-side JavaScript from accessing the cookie
      // This is a security measure to prevent XSS attacks from stealing session cookies
      httpOnly: true,

      // CSRF protection - controls when cookies are sent with cross-site requests
      // 'lax' allows cookies on top-level navigations and GET requests from other sites
      // 'strict' only sends cookies on same-site requests (more secure but less convenient)
      sameSite: isProduction ? 'strict' : 'lax',

      // Only send cookie over HTTPS in production
      // In development, cookies work over HTTP for easier testing
      secure: isProduction || process.env.COOKIE_SECURE === 'true',

      // Cookie expiration time in milliseconds
      // Default: 24 hours (86400000ms = 24 * 60 * 60 * 1000)
      // After this time, the session expires and user must login again
      maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000,

      // Cookie path - '/' means cookie is valid for all routes
      path: '/'
    },

    // Session name (avoid default 'connect.sid' to prevent fingerprinting)
    name: 'af.sid'
  };

  // Trust first proxy if behind a reverse proxy (e.g., nginx)
  if (isProduction) {
    sessionConfig.proxy = true;
  }

  console.log('[SESSION] ✓ Session middleware configured successfully');
  console.log(`[SESSION] Cookie httpOnly: ${sessionConfig.cookie.httpOnly}`);
  console.log(`[SESSION] Cookie sameSite: ${sessionConfig.cookie.sameSite}`);
  console.log(`[SESSION] Cookie secure: ${sessionConfig.cookie.secure}`);
  console.log(`[SESSION] Cookie maxAge: ${sessionConfig.cookie.maxAge}ms (${sessionConfig.cookie.maxAge / 1000 / 60 / 60} hours)`);
  console.log('[SESSION] Session store: MongoDB (connect-mongo)');
  
  logger.info('Session middleware configured successfully');

  return session(sessionConfig);
};

module.exports = {
  createSessionMiddleware
};
