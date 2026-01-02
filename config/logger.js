/**
 * ===========================================
 * AF-Komik V2 - Logger Configuration
 * ===========================================
 * 
 * Winston logger setup for application-wide logging.
 * Provides structured logging with different levels:
 * - info: General information messages
 * - warn: Warning messages for potential issues
 * - error: Error messages for failures
 * 
 * Logs are output to both console and file system.
 */

const winston = require('winston');
const path = require('path');

// Define log format with timestamp and structured output
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    // Include stack trace for errors if available
    if (stack) {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`;
    }
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

// Console format with colors for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `[${timestamp}] ${level}: ${message}\n${stack}`;
    }
    return `[${timestamp}] ${level}: ${message}`;
  })
);

// Create logs directory path
const logsDir = path.join(__dirname, '..', 'logs');

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'af-komik-v2' },
  transports: [
    // Write all logs with level 'error' to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log')
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log')
    })
  ]
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Log that logger has been initialized
console.log('[LOGGER] Winston logger initialized successfully');
console.log(`[LOGGER] Log level: ${process.env.NODE_ENV === 'production' ? 'info' : 'debug'}`);
console.log(`[LOGGER] Log files directory: ${logsDir}`);

// Export logger for use across the application
module.exports = logger;
