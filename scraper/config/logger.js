/**
 * ===========================================
 * AF-Komik Scraper - Logger
 * ===========================================
 * 
 * Custom logger for the scraper.
 * Logs to both console and file with timestamps.
 * 
 * Log Levels:
 * - debug: Detailed debugging information
 * - info: General operational information
 * - warn: Warning messages
 * - error: Error messages
 */

const fs = require('fs');
const path = require('path');
const config = require('./scraper.config');

// Log levels with numeric priority
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// ANSI color codes for console output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

// Level-specific colors
const LEVEL_COLORS = {
  debug: COLORS.gray,
  info: COLORS.cyan,
  warn: COLORS.yellow,
  error: COLORS.red
};

// Current log level from config
const currentLevel = LOG_LEVELS[config.logging.level] || LOG_LEVELS.info;

// Log file path
const logFilePath = path.resolve(__dirname, config.logging.filePath);
const logDir = path.dirname(logFilePath);

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Write stream for log file
let writeStream = null;

/**
 * Get or create the write stream for log file
 * @returns {fs.WriteStream} Write stream
 */
const getWriteStream = () => {
  if (!writeStream) {
    writeStream = fs.createWriteStream(logFilePath, { flags: 'a' });
  }
  return writeStream;
};

/**
 * Check and rotate log file if needed
 */
const rotateLogIfNeeded = () => {
  try {
    if (fs.existsSync(logFilePath)) {
      const stats = fs.statSync(logFilePath);
      if (stats.size > config.logging.maxFileSize) {
        // Close current stream
        if (writeStream) {
          writeStream.end();
          writeStream = null;
        }
        
        // Rotate existing backups
        for (let i = config.logging.maxBackups - 1; i >= 1; i--) {
          const oldPath = `${logFilePath}.${i}`;
          const newPath = `${logFilePath}.${i + 1}`;
          if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
          }
        }
        
        // Move current log to .1
        fs.renameSync(logFilePath, `${logFilePath}.1`);
      }
    }
  } catch (error) {
    console.error(`[LOGGER] Failed to rotate log: ${error.message}`);
  }
};

/**
 * Format timestamp for log messages
 * @returns {string} Formatted timestamp
 */
const formatTimestamp = () => {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
};

/**
 * Format log message for console output (with colors)
 * 
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @returns {string} Formatted message
 */
const formatConsoleMessage = (level, message, meta = {}) => {
  const timestamp = formatTimestamp();
  const color = LEVEL_COLORS[level] || COLORS.white;
  const levelStr = level.toUpperCase().padEnd(5);
  
  let output = `${COLORS.dim}${timestamp}${COLORS.reset} ${color}[${levelStr}]${COLORS.reset} ${message}`;
  
  // Add metadata if present
  if (Object.keys(meta).length > 0) {
    const metaStr = JSON.stringify(meta);
    output += ` ${COLORS.dim}${metaStr}${COLORS.reset}`;
  }
  
  return output;
};

/**
 * Format log message for file output (no colors)
 * 
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @returns {string} Formatted message
 */
const formatFileMessage = (level, message, meta = {}) => {
  const timestamp = formatTimestamp();
  const levelStr = level.toUpperCase().padEnd(5);
  
  let output = `${timestamp} [${levelStr}] ${message}`;
  
  if (Object.keys(meta).length > 0) {
    output += ` ${JSON.stringify(meta)}`;
  }
  
  return output + '\n';
};

/**
 * Write log message to console and file
 * 
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
const log = (level, message, meta = {}) => {
  // Check if this level should be logged
  if (LOG_LEVELS[level] < currentLevel) {
    return;
  }
  
  // Console output
  const consoleMsg = formatConsoleMessage(level, message, meta);
  if (level === 'error') {
    console.error(consoleMsg);
  } else if (level === 'warn') {
    console.warn(consoleMsg);
  } else {
    console.log(consoleMsg);
  }
  
  // File output
  try {
    rotateLogIfNeeded();
    const fileMsg = formatFileMessage(level, message, meta);
    getWriteStream().write(fileMsg);
  } catch (error) {
    console.error(`[LOGGER] Failed to write to log file: ${error.message}`);
  }
};

/**
 * Logger instance with level-specific methods
 */
const logger = {
  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  debug: (message, meta = {}) => log('debug', message, meta),
  
  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  info: (message, meta = {}) => log('info', message, meta),
  
  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  warn: (message, meta = {}) => log('warn', message, meta),
  
  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  error: (message, meta = {}) => log('error', message, meta),
  
  /**
   * Log with custom level
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  log: (level, message, meta = {}) => log(level, message, meta),
  
  /**
   * Create a child logger with preset metadata
   * @param {Object} defaultMeta - Default metadata for all logs
   * @returns {Object} Child logger instance
   */
  child: (defaultMeta = {}) => ({
    debug: (message, meta = {}) => log('debug', message, { ...defaultMeta, ...meta }),
    info: (message, meta = {}) => log('info', message, { ...defaultMeta, ...meta }),
    warn: (message, meta = {}) => log('warn', message, { ...defaultMeta, ...meta }),
    error: (message, meta = {}) => log('error', message, { ...defaultMeta, ...meta })
  }),
  
  /**
   * Log a separator line (for visual clarity)
   * @param {string} title - Optional title for the separator
   */
  separator: (title = '') => {
    const line = '='.repeat(60);
    if (title) {
      const padding = Math.max(0, (60 - title.length - 2) / 2);
      const paddedTitle = ' '.repeat(Math.floor(padding)) + title + ' '.repeat(Math.ceil(padding));
      log('info', line);
      log('info', paddedTitle);
      log('info', line);
    } else {
      log('info', line);
    }
  },
  
  /**
   * Log progress (useful for scraping operations)
   * @param {string} operation - Operation name
   * @param {number} current - Current progress
   * @param {number} total - Total items
   * @param {string} item - Current item description
   */
  progress: (operation, current, total, item = '') => {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    const message = `[${operation}] Progress: ${current}/${total} (${percent}%)${item ? ` - ${item}` : ''}`;
    log('info', message);
  },
  
  /**
   * Close the logger (flush and close file stream)
   */
  close: () => {
    if (writeStream) {
      writeStream.end();
      writeStream = null;
    }
  }
};

module.exports = logger;
