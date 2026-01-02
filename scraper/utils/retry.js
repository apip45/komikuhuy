/**
 * ===========================================
 * AF-Komik Scraper - Retry Utility
 * ===========================================
 * 
 * Retry logic for handling failed requests.
 * Implements exponential backoff and configurable retry attempts.
 */

const config = require('../config/scraper.config');
const logger = require('../config/logger');
const { exponentialBackoff } = require('./delay');

/**
 * Error types that should trigger a retry
 */
const RETRYABLE_ERRORS = [
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNABORTED',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'EAI_AGAIN'
];

/**
 * HTTP status codes that should trigger a retry
 */
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Check if an error is retryable
 * 
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error should trigger a retry
 */
const isRetryableError = (error) => {
  // Network errors
  if (error.code && RETRYABLE_ERRORS.includes(error.code)) {
    return true;
  }
  
  // HTTP status errors
  if (error.response && RETRYABLE_STATUS_CODES.includes(error.response.status)) {
    return true;
  }
  
  // Timeout errors
  if (error.message && error.message.toLowerCase().includes('timeout')) {
    return true;
  }
  
  return false;
};

/**
 * Execute a function with retry logic
 * 
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum retry attempts (default from config)
 * @param {string} options.operation - Operation name for logging
 * @param {boolean} options.throwOnFail - Whether to throw error after all attempts fail
 * @param {Function} options.onRetry - Callback called on each retry
 * @returns {Promise<any>} Result of the function or null if all attempts fail
 */
const withRetry = async (fn, options = {}) => {
  const {
    maxAttempts = config.retry.maxAttempts,
    operation = 'operation',
    throwOnFail = true,
    onRetry = null
  } = options;
  
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Log the error
      logger.warn(`Attempt ${attempt}/${maxAttempts} failed for ${operation}: ${error.message}`);
      
      // Check if we should retry
      if (attempt < maxAttempts && isRetryableError(error)) {
        // Call retry callback if provided
        if (onRetry) {
          onRetry(attempt, error);
        }
        
        // Wait before retrying with exponential backoff
        logger.info(`Retrying ${operation} in ${Math.pow(2, attempt - 1) * config.retry.initialDelay}ms...`);
        await exponentialBackoff(attempt);
      } else if (attempt >= maxAttempts) {
        logger.error(`All ${maxAttempts} attempts failed for ${operation}: ${error.message}`);
      } else {
        // Non-retryable error
        logger.error(`Non-retryable error for ${operation}: ${error.message}`);
        break;
      }
    }
  }
  
  // All attempts failed
  if (throwOnFail) {
    throw lastError;
  }
  
  return null;
};

/**
 * Retry with custom backoff strategy
 * 
 * @param {Function} fn - Async function to execute
 * @param {number[]} delays - Array of delay times in ms for each retry
 * @param {string} operation - Operation name for logging
 * @returns {Promise<any>} Result of the function
 */
const withCustomRetry = async (fn, delays = [1000, 2000, 5000], operation = 'operation') => {
  let lastError = null;
  
  // First attempt (no delay)
  try {
    return await fn();
  } catch (error) {
    lastError = error;
    logger.warn(`Initial attempt failed for ${operation}: ${error.message}`);
    
    if (!isRetryableError(error)) {
      throw error;
    }
  }
  
  // Retry attempts with specified delays
  for (let i = 0; i < delays.length; i++) {
    await new Promise(resolve => setTimeout(resolve, delays[i]));
    
    try {
      logger.info(`Retry attempt ${i + 1}/${delays.length} for ${operation}`);
      return await fn();
    } catch (error) {
      lastError = error;
      logger.warn(`Retry ${i + 1} failed for ${operation}: ${error.message}`);
      
      if (!isRetryableError(error)) {
        throw error;
      }
    }
  }
  
  throw lastError;
};

/**
 * Create a retriable version of an async function
 * 
 * @param {Function} fn - Async function to wrap
 * @param {Object} defaultOptions - Default retry options
 * @returns {Function} Wrapped function with retry logic
 */
const makeRetriable = (fn, defaultOptions = {}) => {
  return async (...args) => {
    return withRetry(() => fn(...args), defaultOptions);
  };
};

module.exports = {
  withRetry,
  withCustomRetry,
  makeRetriable,
  isRetryableError,
  RETRYABLE_ERRORS,
  RETRYABLE_STATUS_CODES
};
