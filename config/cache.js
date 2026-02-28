/**
 * ===========================================
 * AF-Komik V2 - Cache Manager
 * ===========================================
 * 
 * Multi-tier caching system optimized for 1GB RAM VPS.
 * 
 * Cache Tiers:
 * - HOT:  30 min TTL, 30 keys max  - Trending data (genres, stats)
 * - WARM: 30 min TTL, 100 keys max - Comic details, chapter lists
 * - COLD: 24 hour TTL, 100 keys max - Published chapters (immutable)
 * 
 * Memory Target: < 200MB total cache usage
 * 
 * Features:
 * - Automatic memory monitoring
 * - Auto-cleanup on high memory
 * - Statistics tracking
 * - Pattern-based invalidation
 */

const NodeCache = require('node-cache');
const EventEmitter = require('events');
const logger = require('./logger');

class CacheManager extends EventEmitter {
    constructor() {
        super();
        
        // Cache tiers with different TTL and size limits
        this.hotCache = new NodeCache({
            stdTTL: 1800,           // 30 minutes
            checkperiod: 120,       // Check expired keys every 2 min
            maxKeys: 30,            // Limit to 30 keys
            useClones: false,       // Better performance, save memory
            deleteOnExpire: true
        });

        this.warmCache = new NodeCache({
            stdTTL: 1800,           // 30 minutes
            checkperiod: 180,       // Check every 3 min
            maxKeys: 100,           // Limit to 100 keys
            useClones: false,
            deleteOnExpire: true
        });

        this.coldCache = new NodeCache({
            stdTTL: 86400,          // 24 hours
            checkperiod: 600,       // Check every 10 min
            maxKeys: 100,           // Limit to 100 keys
            useClones: false,
            deleteOnExpire: true
        });

        // Setup event listeners for monitoring
        this.setupEventListeners();
        
        // Start health monitoring
        this.startHealthMonitoring();
        
        logger.info('Cache Manager initialized with 3 tiers (HOT/WARM/COLD)');
    }

    setupEventListeners() {
        // Log cache operations in debug mode
        const logEvent = (tier, event, key) => {
            if (process.env.NODE_ENV === 'development') {
                logger.debug(`Cache [${tier}] ${event}: ${key}`);
            }
            this.emit('cache-event', { tier, event, key });
        };

        ['set', 'del', 'expired'].forEach(event => {
            this.hotCache.on(event, (key) => logEvent('HOT', event, key));
            this.warmCache.on(event, (key) => logEvent('WARM', event, key));
            this.coldCache.on(event, (key) => logEvent('COLD', event, key));
        });

        // Handle errors gracefully
        [this.hotCache, this.warmCache, this.coldCache].forEach(cache => {
            cache.on('error', (err) => {
                logger.error('Cache error:', err);
                this.emit('cache-error', err);
            });
        });
    }

    /**
     * Get value from cache
     * 
     * @param {string} key - Cache key
     * @param {string} tier - Cache tier: 'hot', 'warm', 'cold' (default: 'warm')
     * @returns {*} Cached value or undefined
     */
    get(key, tier = 'warm') {
        const cacheMap = {
            hot: this.hotCache,
            warm: this.warmCache,
            cold: this.coldCache
        };

        try {
            const cache = cacheMap[tier];
            if (!cache) {
                logger.warn(`Invalid cache tier: ${tier}`);
                return undefined;
            }

            const value = cache.get(key);
            
            if (value !== undefined) {
                this.emit('cache-hit', { tier, key });
            } else {
                this.emit('cache-miss', { tier, key });
            }
            
            return value;
        } catch (error) {
            logger.error(`Cache get error [${tier}/${key}]:`, error);
            return undefined;
        }
    }

    /**
     * Set value in cache
     * 
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {string} tier - Cache tier: 'hot', 'warm', 'cold' (default: 'warm')
     * @param {number} ttl - Optional custom TTL in seconds
     * @returns {boolean} Success status
     */
    set(key, value, tier = 'warm', ttl = null) {
        const cacheMap = {
            hot: this.hotCache,
            warm: this.warmCache,
            cold: this.coldCache
        };

        try {
            const cache = cacheMap[tier];
            if (!cache) {
                logger.warn(`Invalid cache tier: ${tier}`);
                return false;
            }

            // Check if value is too large (> 500KB)
            const size = this.estimateSize(value);
            if (size > 500000) {
                logger.warn(`Cache value too large (${Math.round(size/1024)}KB), skipping: ${key}`);
                return false;
            }

            const success = ttl ? cache.set(key, value, ttl) : cache.set(key, value);
            
            if (success) {
                this.emit('cache-set', { tier, key, size });
            }
            
            return success;
        } catch (error) {
            logger.error(`Cache set error [${tier}/${key}]:`, error);
            return false;
        }
    }

    /**
     * Delete key from cache
     * 
     * @param {string} key - Cache key
     * @returns {number} Number of deleted entries
     */
    delete(key) {
        let deleted = 0;
        [this.hotCache, this.warmCache, this.coldCache].forEach(cache => {
            if (cache.del(key)) deleted++;
        });
        
        if (deleted > 0) {
            this.emit('cache-delete', { key, count: deleted });
        }
        
        return deleted;
    }

    /**
     * Clear cache entries matching pattern
     * 
     * @param {string} pattern - Pattern to match (substring)
     * @returns {number} Number of cleared entries
     */
    clearByPattern(pattern) {
        let cleared = 0;
        
        [this.hotCache, this.warmCache, this.coldCache].forEach(cache => {
            const keys = cache.keys();
            keys.forEach(key => {
                if (key.includes(pattern)) {
                    cache.del(key);
                    cleared++;
                }
            });
        });

        if (cleared > 0) {
            logger.info(`Cleared ${cleared} cache entries matching pattern: ${pattern}`);
            this.emit('cache-clear-pattern', { pattern, count: cleared });
        }

        return cleared;
    }

    /**
     * Flush all caches
     */
    flushAll() {
        this.hotCache.flushAll();
        this.warmCache.flushAll();
        this.coldCache.flushAll();
        
        logger.info('All caches flushed');
        this.emit('cache-flush');
    }

    /**
     * Get cache statistics
     * 
     * @returns {Object} Statistics for all tiers
     */
    getStats() {
        return {
            hot: this.hotCache.getStats(),
            warm: this.warmCache.getStats(),
            cold: this.coldCache.getStats(),
            memory: this.getMemoryUsage()
        };
    }

    /**
     * Get memory usage
     * 
     * @returns {Object} Memory usage info
     */
    getMemoryUsage() {
        const used = process.memoryUsage();
        return {
            rss: Math.round(used.rss / 1024 / 1024),
            heapTotal: Math.round(used.heapTotal / 1024 / 1024),
            heapUsed: Math.round(used.heapUsed / 1024 / 1024),
            external: Math.round(used.external / 1024 / 1024)
        };
    }

    /**
     * Estimate size of value in bytes
     * 
     * @param {*} value - Value to estimate
     * @returns {number} Estimated size in bytes
     */
    estimateSize(value) {
        try {
            return JSON.stringify(value).length;
        } catch {
            return 0;
        }
    }

    /**
     * Start health monitoring
     * Checks memory every 5 minutes and cleans up if needed
     */
    startHealthMonitoring() {
        setInterval(() => {
            const memory = this.getMemoryUsage();
            const stats = this.getStats();

            // Log statistics
            logger.debug('Cache Health:', {
                hotKeys: stats.hot.keys,
                warmKeys: stats.warm.keys,
                coldKeys: stats.cold.keys,
                heapUsed: `${memory.heapUsed}MB`
            });

            // Auto-cleanup if memory usage is high (> 400MB)
            if (memory.heapUsed > 400) {
                logger.warn(`High memory usage (${memory.heapUsed}MB), clearing COLD cache...`);
                this.coldCache.flushAll();
                this.emit('memory-warning', { heapUsed: memory.heapUsed });
            }

            // Alert if memory is critical (> 450MB)
            if (memory.heapUsed > 450) {
                logger.error(`CRITICAL memory usage (${memory.heapUsed}MB), clearing WARM+COLD cache...`);
                this.warmCache.flushAll();
                this.coldCache.flushAll();
                this.emit('memory-critical', { heapUsed: memory.heapUsed });
            }
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        logger.info('Shutting down cache manager...');
        this.flushAll();
        this.removeAllListeners();
    }
}

// Singleton instance
const cacheManager = new CacheManager();

module.exports = { cacheManager };
