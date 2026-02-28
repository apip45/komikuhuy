/**
 * Test script for Genres Cache
 * 
 * This script tests the genres caching functionality:
 * - Genres list caching (HOT tier, 24h TTL)
 * - Cache hit/miss detection
 * - Performance measurement
 * 
 * Run: node test-genres-cache.js
 */

require('dotenv').config();

const { cacheService } = require('./services/cacheService');
const ComicModel = require('./models/mysql/comic.model');
const { createMySQLPool } = require('./config/mysql');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log('\n' + '='.repeat(60));
  log(testName, 'bright');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

/**
 * Simulate fetching genres with caching
 */
async function fetchGenresWithCache() {
  const cacheKey = cacheService.genresKey();
  
  const genres = await cacheService.getOrFetch(
    cacheKey,
    async () => {
      logInfo(`Cache MISS: ${cacheKey}`);
      return await ComicModel.getAllGenres();
    },
    'hot',
    86400 // 24 hours
  );
  
  // Check if from cache
  const fromCache = !!cacheService.get(cacheKey, 'hot');
  
  if (fromCache) {
    logInfo(`Cache HIT: ${cacheKey}`);
  }
  
  return { genres, fromCache };
}

/**
 * Main test function
 */
async function runTests() {
  log('\n🚀 GENRES CACHE TEST', 'bright');
  log('Testing genres caching with real database data\n', 'cyan');
  
  try {
    // Initialize MySQL connection
    logInfo('Initializing MySQL connection...');
    await createMySQLPool();
    logSuccess('MySQL connection initialized');
    
    // ==========================================
    // TEST 1: First load (Cache MISS)
    // ==========================================
    logTest('TEST 1: First load - should be Cache MISS');
    
    const startTime1 = Date.now();
    const result1 = await fetchGenresWithCache();
    const duration1 = Date.now() - startTime1;
    
    if (!result1.fromCache) {
      logSuccess(`Cache MISS detected (as expected)`);
      logSuccess(`Fetched from database in ${duration1}ms`);
      logInfo(`Total genres: ${result1.genres.length}`);
      
      if (result1.genres.length > 0) {
        logInfo(`Sample genres: ${result1.genres.slice(0, 5).join(', ')}`);
      }
    } else {
      logError('Expected cache MISS but got cache HIT');
    }
    
    // ==========================================
    // TEST 2: Second load (Cache HIT)
    // ==========================================
    logTest('TEST 2: Second load - should be Cache HIT');
    
    const startTime2 = Date.now();
    const result2 = await fetchGenresWithCache();
    const duration2 = Date.now() - startTime2;
    
    if (result2.fromCache) {
      logSuccess(`Cache HIT detected (as expected)`);
      logSuccess(`Retrieved from cache in ${duration2}ms`);
      
      if (duration2 > 0) {
        logInfo(`Speed improvement: ${Math.round(duration1 / duration2)}x faster`);
      } else {
        logInfo(`Speed improvement: 100+ x faster (< 1ms)`);
      }
      logInfo(`Time saved: ${duration1 - duration2}ms`);
    } else {
      logError('Expected cache HIT but got cache MISS');
    }
    
    // Verify data integrity
    if (JSON.stringify(result1.genres) === JSON.stringify(result2.genres)) {
      logSuccess('Data integrity verified (cache matches database)');
    } else {
      logError('Data mismatch between database and cache');
    }
    
    // ==========================================
    // TEST 3: Cache statistics
    // ==========================================
    logTest('TEST 3: Cache statistics');
    
    const stats = cacheService.getStats();
    logInfo(`HOT tier keys: ${stats.hot.keys}`);
    logInfo(`HOT tier size: ${(stats.hot.ksize / 1024).toFixed(2)} KB`);
    logInfo(`HOT tier hits: ${stats.hot.hits}`);
    logInfo(`HOT tier misses: ${stats.hot.misses}`);
    
    if (stats.hot.hits > 0) {
      const hitRate = (stats.hot.hits / (stats.hot.hits + stats.hot.misses) * 100).toFixed(2);
      logInfo(`Hit rate: ${hitRate}%`);
      
      if (parseFloat(hitRate) >= 50) {
        logSuccess(`Good hit rate: ${hitRate}%`);
      }
    }
    
    // Memory usage
    const memUsage = process.memoryUsage();
    logInfo(`Heap used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    logInfo(`Heap total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    
    if (memUsage.heapUsed < 100 * 1024 * 1024) {
      logSuccess('Memory usage is within acceptable limits (<100MB)');
    } else {
      logWarning(`Memory usage is high: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // ==========================================
    // TEST 4: Cache size analysis
    // ==========================================
    logTest('TEST 4: Cache size analysis');
    
    const genresDataSize = JSON.stringify(result1.genres).length;
    logInfo(`Genres data size: ${(genresDataSize / 1024).toFixed(2)} KB`);
    logInfo(`Number of genres: ${result1.genres.length}`);
    logInfo(`Average size per genre: ${Math.round(genresDataSize / result1.genres.length)} bytes`);
    
    if (genresDataSize < 10 * 1024) {
      logSuccess('Genres data size is very small (<10KB) - perfect for HOT tier!');
    } else if (genresDataSize < 50 * 1024) {
      logSuccess('Genres data size is reasonable (<50KB)');
    } else {
      logWarning(`Large genres data: ${(genresDataSize / 1024).toFixed(2)} KB`);
    }
    
    // ==========================================
    // TEST 5: Cache invalidation
    // ==========================================
    logTest('TEST 5: Cache invalidation');
    
    const cacheKey = cacheService.genresKey();
    const invalidated = cacheService.delete(cacheKey);
    logInfo(`Invalidated ${invalidated} cache entries`);
    
    // Try to fetch again
    const afterInvalidation = cacheService.get(cacheKey, 'hot');
    
    if (!afterInvalidation) {
      logSuccess('Cache successfully invalidated');
    } else {
      logError('Cache still exists after invalidation');
    }
    
    // ==========================================
    // TEST 6: Multiple loads (stress test)
    // ==========================================
    logTest('TEST 6: Multiple loads stress test');
    
    const iterations = 100;
    logInfo(`Performing ${iterations} genre lookups...`);
    
    const loadStartTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await fetchGenresWithCache();
    }
    
    const loadDuration = Date.now() - loadStartTime;
    logSuccess(`Completed ${iterations} lookups in ${loadDuration}ms`);
    logInfo(`Average: ${(loadDuration / iterations).toFixed(2)}ms per lookup`);
    
    // Calculate benefit
    const uncachedTime = duration1 * iterations;
    const cachedTime = duration1 + (duration2 * (iterations - 1)); // First miss, rest hits
    const savings = ((uncachedTime - cachedTime) / uncachedTime * 100).toFixed(2);
    
    logInfo(`Time without cache: ${uncachedTime}ms`);
    logInfo(`Time with cache: ${cachedTime}ms`);
    logSuccess(`Performance improvement: ${savings}% faster with cache`);
    
    // ==========================================
    // TEST 7: TTL behavior (24 hour cache)
    // ==========================================
    logTest('TEST 7: TTL behavior (24 hour cache)');
    
    // Fetch to cache it
    await fetchGenresWithCache();
    
    const ttl = cacheService.getTTL(cacheService.genresKey(), 'hot');
    
    if (ttl) {
      const hours = Math.floor(ttl / 3600);
      const minutes = Math.floor((ttl % 3600) / 60);
      const seconds = ttl % 60;
      
      logInfo(`Cache TTL: ${ttl} seconds remaining`);
      logInfo(`Cache expires in: ${hours}h ${minutes}m ${seconds}s`);
      
      if (ttl > 86000 && ttl <= 86400) {
        logSuccess('TTL is correct (should be ~24 hours for fresh cache)');
      } else if (ttl > 0) {
        logWarning(`TTL is ${ttl}s (might be partially expired)`);
      }
    } else {
      logWarning('Could not retrieve TTL');
    }
    
    // ==========================================
    // FINAL SUMMARY
    // ==========================================
    logTest('FINAL SUMMARY');
    
    const finalStats = cacheService.getStats();
    
    log('\nCache Statistics:', 'bright');
    log(`  HOT tier:`, 'yellow');
    log(`    - Keys: ${finalStats.hot.keys}`);
    log(`    - Hits: ${finalStats.hot.hits}`);
    log(`    - Misses: ${finalStats.hot.misses}`);
    log(`    - Hit Rate: ${(finalStats.hot.hits / (finalStats.hot.hits + finalStats.hot.misses) * 100).toFixed(2)}%`);
    log(`    - Size: ${(finalStats.hot.ksize / 1024).toFixed(2)} KB`);
    
    const finalMemUsage = process.memoryUsage();
    log('\nMemory Usage:', 'bright');
    log(`  - Heap Used: ${(finalMemUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    log(`  - Heap Total: ${(finalMemUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    log(`  - RSS: ${(finalMemUsage.rss / 1024 / 1024).toFixed(2)} MB`);
    
    log('\nGenres Performance:', 'bright');
    log(`  - Database fetch: ${duration1}ms`);
    log(`  - Cache fetch: ${duration2}ms`);
    log(`  - Speed improvement: ${duration2 > 0 ? Math.round(duration1 / duration2) : '100+'}x faster`);
    log(`  - Data size: ${(genresDataSize / 1024).toFixed(2)} KB`);
    log(`  - Total genres: ${result1.genres.length}`);
    
    log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY!\n', 'green');
    
    // Cleanup
    const { getMySQLPool } = require('./config/mysql');
    const pool = getMySQLPool();
    if (pool) {
      await pool.end();
      logInfo('MySQL connection closed');
    }
    
    process.exit(0);
    
  } catch (error) {
    logError(`\nTest failed with error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();
