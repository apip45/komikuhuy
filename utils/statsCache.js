/**
 * Statistics Cache Utility
 * 
 * Provides caching for expensive database statistics queries
 * Uses approximate counts for large tables (image table)
 */

const logger = require('../config/logger');

class StatsCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
    this.refreshing = new Set(); // Track ongoing refreshes
  }

  /**
   * Get cached value or fetch new one
   */
  async get(key, fetchFn, ttl = this.defaultTTL) {
    const cached = this.cache.get(key);
    
    // Return cached value if still valid
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value;
    }
    
    // If currently refreshing, return stale cache
    if (this.refreshing.has(key)) {
      return cached ? cached.value : null;
    }
    
    // Fetch new value
    try {
      this.refreshing.add(key);
      const value = await fetchFn();
      
      this.cache.set(key, {
        value,
        timestamp: Date.now()
      });
      
      return value;
    } catch (error) {
      logger.error(`StatsCache fetch error for ${key}: ${error.message}`);
      // Return stale cache on error
      return cached ? cached.value : null;
    } finally {
      this.refreshing.delete(key);
    }
  }

  /**
   * Invalidate specific cache key
   */
  invalidate(key) {
    this.cache.delete(key);
    logger.debug(`Cache invalidated: ${key}`);
  }

  /**
   * Invalidate all cache
   */
  invalidateAll() {
    this.cache.clear();
    logger.debug('All cache invalidated');
  }

  /**
   * Get cache size
   */
  size() {
    return this.cache.size;
  }

  /**
   * Schedule background refresh
   */
  scheduleRefresh(key, fetchFn, interval) {
    // Initial fetch
    this.get(key, fetchFn);
    
    // Schedule periodic refresh
    const timer = setInterval(async () => {
      try {
        const value = await fetchFn();
        this.cache.set(key, {
          value,
          timestamp: Date.now()
        });
        logger.debug(`Background refresh completed: ${key}`);
      } catch (error) {
        logger.error(`Background refresh failed for ${key}: ${error.message}`);
      }
    }, interval);
    
    return timer;
  }
}

// Singleton instance
const statsCache = new StatsCache();

module.exports = statsCache;
