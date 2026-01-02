/**
 * ===========================================
 * AF-Komik Scraper - Delay Utility
 * ===========================================
 * 
 * Utilities for adding delays between requests.
 * Helps prevent rate limiting and reduces server load.
 */

const config = require('../config/scraper.config');

/**
 * Sleep for a specified duration
 * 
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Sleep with random extra delay
 * Adds randomness to make requests look more natural
 * 
 * @param {number} baseMs - Base milliseconds to sleep
 * @param {number} randomMaxMs - Maximum random extra delay (default from config)
 * @returns {Promise<void>}
 */
const sleepRandom = async (baseMs, randomMaxMs = config.delay.randomExtra) => {
  const extra = Math.floor(Math.random() * randomMaxMs);
  await sleep(baseMs + extra);
};

/**
 * Delay between comic list page requests
 * @returns {Promise<void>}
 */
const delayBetweenPages = async () => {
  await sleepRandom(config.delay.betweenPages);
};

/**
 * Delay between comic detail requests
 * @returns {Promise<void>}
 */
const delayBetweenComics = async () => {
  await sleepRandom(config.delay.betweenComics);
};

/**
 * Delay between chapter requests
 * @returns {Promise<void>}
 */
const delayBetweenChapters = async () => {
  await sleepRandom(config.delay.betweenChapters);
};

/**
 * Create a rate limiter that ensures minimum time between calls
 * 
 * @param {number} minInterval - Minimum milliseconds between calls
 * @returns {Function} Rate limited function wrapper
 */
const createRateLimiter = (minInterval) => {
  let lastCallTime = 0;
  
  return async (fn) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    
    if (timeSinceLastCall < minInterval) {
      await sleep(minInterval - timeSinceLastCall);
    }
    
    lastCallTime = Date.now();
    return fn();
  };
};

/**
 * Execute a function with exponential backoff delay
 * Useful after errors to give the server time to recover
 * 
 * @param {number} attempt - Current attempt number (1-based)
 * @param {number} initialDelay - Initial delay (default from config)
 * @param {number} maxDelay - Maximum delay (default from config)
 * @returns {Promise<void>}
 */
const exponentialBackoff = async (
  attempt, 
  initialDelay = config.retry.initialDelay, 
  maxDelay = config.retry.maxDelay
) => {
  const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
  await sleep(delay);
};

module.exports = {
  sleep,
  sleepRandom,
  delayBetweenPages,
  delayBetweenComics,
  delayBetweenChapters,
  createRateLimiter,
  exponentialBackoff
};
