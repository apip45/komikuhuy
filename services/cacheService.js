/**
 * ===========================================
 * AF-Komik V2 - Cache Service
 * ===========================================
 * 
 * High-level cache service for application data.
 * Provides convenient methods for caching common data types.
 * 
 * Features:
 * - Automatic key generation
 * - Cache invalidation helpers
 * - Error handling and fallback
 * - Cache statistics
 * 
 * Usage:
 * const { cacheService } = require('./services/cacheService');
 * 
 * // Get with auto-fetch
 * const data = await cacheService.getOrFetch(
 *   'comic:123', 
 *   () => fetchFromDB(123),
 *   'warm',
 *   1800
 * );
 */

const { cacheManager } = require('../config/cache');
const logger = require('../utils/smartLogger');

class CacheService {
    constructor() {
        this.enabled = process.env.CACHE_ENABLED !== 'false';
        
        if (!this.enabled) {
            logger.warn('Cache is DISABLED via CACHE_ENABLED env variable');
        } else {
            logger.info('Cache Service initialized');
        }
    }

    /**
     * Get value from cache or fetch and cache it
     * 
     * @param {string} key - Cache key
     * @param {Function} fetchFn - Async function to fetch data if cache miss
     * @param {string} tier - Cache tier (default: 'warm')
     * @param {number} ttl - TTL in seconds (default: null = use tier default)
     * @returns {Promise<*>} Cached or fetched data
     */
    async getOrFetch(key, fetchFn, tier = 'warm', ttl = null) {
        if (!this.enabled) {
            return await fetchFn();
        }

        try {
            // Try to get from cache
            const cached = cacheManager.get(key, tier);
            
            if (cached !== undefined) {
                logger.debug(`Cache HIT: ${key}`);
                return cached;
            }

            // Cache miss - fetch data
            logger.debug(`Cache MISS: ${key}`);
            const data = await fetchFn();

            // Cache the result if data is valid
            if (data !== null && data !== undefined) {
                cacheManager.set(key, data, tier, ttl);
            }

            return data;
        } catch (error) {
            logger.error(`Cache getOrFetch error [${key}]:`, error);
            // On error, still try to fetch the data
            return await fetchFn();
        }
    }

    /**
     * Get value from cache
     * 
     * @param {string} key - Cache key
     * @param {string} tier - Cache tier (default: 'warm')
     * @returns {*} Cached value or undefined
     */
    get(key, tier = 'warm') {
        if (!this.enabled) return undefined;
        return cacheManager.get(key, tier);
    }

    /**
     * Set value in cache
     * 
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {string} tier - Cache tier (default: 'warm')
     * @param {number} ttl - TTL in seconds (optional)
     * @returns {boolean} Success status
     */
    set(key, value, tier = 'warm', ttl = null) {
        if (!this.enabled) return false;
        return cacheManager.set(key, value, tier, ttl);
    }

    /**
     * Delete cache entry
     * 
     * @param {string} key - Cache key
     * @returns {number} Number of deleted entries
     */
    delete(key) {
        if (!this.enabled) return 0;
        return cacheManager.delete(key);
    }

    /**
     * Clear cache entries by pattern
     * 
     * @param {string} pattern - Pattern to match
     * @returns {number} Number of cleared entries
     */
    clearPattern(pattern) {
        if (!this.enabled) return 0;
        return cacheManager.clearByPattern(pattern);
    }

    /**
     * Generate cache key for comic
     * 
     * @param {string|number} identifier - Comic param or ID
     * @returns {string} Cache key
     */
    comicKey(identifier) {
        return `comic:${identifier}`;
    }

    /**
     * Generate cache key for comic detail with chapters
     * 
     * @param {string|number} comicId - Comic ID or param
     * @param {number} chapterLimit - Chapter limit
     * @param {number} chapterOffset - Chapter offset
     * @returns {string} Cache key
     */
    comicDetailKey(comicId, chapterLimit = 50, chapterOffset = 0) {
        return `comic:detail:${comicId}:l${chapterLimit}:o${chapterOffset}`;
    }

    /**
     * Generate cache key for chapter
     * 
     * @param {string} comicParam - Comic URL param
     * @param {string} chapterParam - Chapter URL param
     * @returns {string} Cache key
     */
    chapterKey(comicParam, chapterParam) {
        return `chapter:${comicParam}:${chapterParam}`;
    }

    /**
     * Generate cache key for chapter images
     * 
     * @param {number} chapterId - Chapter ID
     * @returns {string} Cache key
     */
    chapterImagesKey(chapterId) {
        return `chapter:images:${chapterId}`;
    }

    /**
     * Generate cache key for comic list
     * 
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @param {Object} filters - Filter options
     * @returns {string} Cache key
     */
    comicListKey(page = 1, limit = 20, filters = {}) {
        const filterStr = Object.keys(filters).length > 0 
            ? ':' + JSON.stringify(filters) 
            : '';
        return `comics:list:p${page}:l${limit}${filterStr}`;
    }

    /**
     * Generate cache key for genres
     * 
     * @returns {string} Cache key
     */
    genresKey() {
        return 'genres:all';
    }

    /**
     * Generate cache key for homepage
     * 
     * @returns {string} Cache key
     */
    homepageKey() {
        return 'homepage:data';
    }

    /**
     * Invalidate all cache for a specific comic
     * 
     * @param {string|number} comicId - Comic ID or param
     */
    invalidateComic(comicId) {
        const patterns = [
            `comic:${comicId}`,
            `comic:detail:${comicId}`,
            `chapter:${comicId}`,
            'comics:list'  // Also clear list cache
        ];

        let totalCleared = 0;
        patterns.forEach(pattern => {
            totalCleared += this.clearPattern(pattern);
        });

        logger.info(`Invalidated cache for comic ${comicId} (${totalCleared} entries)`);
        return totalCleared;
    }

    /**
     * Invalidate cache for a specific chapter
     * 
     * @param {string} comicParam - Comic URL param
     * @param {string} chapterParam - Chapter URL param
     */
    invalidateChapter(comicParam, chapterParam) {
        const key = this.chapterKey(comicParam, chapterParam);
        const deleted = this.delete(key);
        
        // Also clear comic detail cache
        this.clearPattern(`comic:detail:${comicParam}`);
        
        logger.info(`Invalidated cache for chapter ${comicParam}/${chapterParam}`);
        return deleted;
    }

    /**
     * Invalidate homepage cache
     */
    invalidateHomepage() {
        const deleted = this.delete(this.homepageKey());
        logger.info('Invalidated homepage cache');
        return deleted;
    }

    /**
     * Invalidate comic list cache
     */
    invalidateComicList() {
        const cleared = this.clearPattern('comics:list');
        logger.info(`Invalidated comic list cache (${cleared} entries)`);
        return cleared;
    }

    /**
     * Get cache statistics
     * 
     * @returns {Object} Cache statistics
     */
    getStats() {
        if (!this.enabled) {
            return { enabled: false };
        }

        const stats = cacheManager.getStats();
        
        // Calculate overall hit rate
        const totalHits = stats.hot.hits + stats.warm.hits + stats.cold.hits;
        const totalMisses = stats.hot.misses + stats.warm.misses + stats.cold.misses;
        const hitRate = totalHits + totalMisses > 0
            ? ((totalHits / (totalHits + totalMisses)) * 100).toFixed(2)
            : 0;

        return {
            enabled: true,
            tiers: {
                hot: {
                    keys: stats.hot.keys,
                    hits: stats.hot.hits,
                    misses: stats.hot.misses
                },
                warm: {
                    keys: stats.warm.keys,
                    hits: stats.warm.hits,
                    misses: stats.warm.misses
                },
                cold: {
                    keys: stats.cold.keys,
                    hits: stats.cold.hits,
                    misses: stats.cold.misses
                }
            },
            overall: {
                totalKeys: stats.hot.keys + stats.warm.keys + stats.cold.keys,
                totalHits,
                totalMisses,
                hitRate: `${hitRate}%`
            },
            memory: stats.memory
        };
    }

    /**
     * Check if cache is healthy
     * 
     * @returns {Object} Health status
     */
    healthCheck() {
        if (!this.enabled) {
            return { status: 'disabled' };
        }

        const stats = this.getStats();
        const heapUsed = stats.memory.heapUsed;

        // Determine status based on memory usage and hit rate
        let status = 'healthy';
        const warnings = [];

        if (heapUsed > 400) {
            status = 'warning';
            warnings.push(`High memory usage: ${heapUsed}MB`);
        }

        if (heapUsed > 500) {
            status = 'critical';
            warnings.push(`Critical memory usage: ${heapUsed}MB`);
        }

        const hitRate = parseFloat(stats.overall.hitRate);
        if (hitRate < 60 && stats.overall.totalHits > 10) {
            warnings.push(`Low hit rate: ${stats.overall.hitRate}`);
            if (status === 'healthy') status = 'warning';
        }

        return {
            status,
            warnings,
            stats
        };
    }

    /**
     * Flush all caches
     */
    flushAll() {
        if (!this.enabled) return;
        cacheManager.flushAll();
        logger.info('All caches flushed via CacheService');
    }

    /**
     * Get TTL (time to live) for a cache key
     * 
     * @param {string} key - Cache key
     * @param {string} tier - Cache tier (default: 'warm')
     * @returns {number|undefined} TTL in seconds, or undefined if not found
     */
    getTTL(key, tier = 'warm') {
        if (!this.enabled) return undefined;
        return cacheManager.getTTL(key, tier);
    }

    /**
     * Clear cache entries by pattern (alias for clearPattern)
     * 
     * @param {string} pattern - Pattern to match
     * @returns {number} Number of cleared entries
     */
    clearByPattern(pattern) {
        return this.clearPattern(pattern);
    }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = { cacheService };
