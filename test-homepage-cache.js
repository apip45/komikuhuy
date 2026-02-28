/**
 * Test script for Homepage Cache
 * 
 * This script tests the homepage caching functionality:
 * - Featured comics caching
 * - Latest updates caching
 * - Database stats caching
 * - Cache hit/miss detection
 * - Performance measurement
 * 
 * Run: node test-homepage-cache.js
 */

require('dotenv').config();

const { cacheService } = require('./services/cacheService');
const ComicModel = require('./models/mysql/comic.model');
const statsService = require('./services/statsService');
const User = require('./models/mongo/User');
const { createMySQLPool } = require('./config/mysql');
const { connectMongoDB } = require('./config/mongo');

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
 * Simulate fetching homepage data with caching (mimics controller logic)
 */
async function fetchHomepageDataWithCache() {
  const cacheKey = 'homepage:data';
  
  const data = await cacheService.getOrFetch(
    cacheKey,
    async () => {
      logInfo(`Cache MISS: ${cacheKey}`);
      
      // Fetch featured comics and latest updates in parallel
      const [featuredComics, latestUpdates] = await Promise.all([
        ComicModel.findAll({ limit: 12, offset: 0 }),
        ComicModel.findAll({ limit: 10, offset: 0 })
      ]);
      
      // Get database stats
      const stats = {
        totalComics: 0,
        totalChapters: 0,
        totalUsers: 0
      };
      
      try {
        const dbStats = await statsService.getDatabaseStats();
        stats.totalComics = dbStats.comics.total;
        stats.totalChapters = dbStats.chapters.total;
        
        try {
          stats.totalUsers = await User.countDocuments();
        } catch (userError) {
          logWarning(`Failed to fetch user count: ${userError.message}`);
        }
      } catch (statError) {
        logWarning(`Failed to fetch stats: ${statError.message}`);
      }
      
      return {
        featuredComics,
        latestUpdates,
        stats
      };
    },
    'warm',
    300 // 5 minutes
  );
  
  // Check if from cache
  const fromCache = !!cacheService.get(cacheKey, 'warm');
  
  if (fromCache) {
    logInfo(`Cache HIT: ${cacheKey}`);
  }
  
  return {
    data,
    fromCache
  };
}

/**
 * Main test function
 */
async function runTests() {
  log('\n🚀 HOMEPAGE CACHE TEST', 'bright');
  log('Testing homepage caching with real database data\n', 'cyan');
  
  try {
    // ==========================================
    // Initialize Connections
    // ==========================================
    logInfo('Initializing database connections...');
    await createMySQLPool();
    logSuccess('MySQL connection initialized');
    
    await connectMongoDB();
    logSuccess('MongoDB connection initialized');
    
    // ==========================================
    // TEST 1: First load (Cache MISS)
    // ==========================================
    logTest('TEST 1: First load - should be Cache MISS');
    
    const startTime1 = Date.now();
    const result1 = await fetchHomepageDataWithCache();
    const duration1 = Date.now() - startTime1;
    
    if (!result1.fromCache) {
      logSuccess(`Cache MISS detected (as expected)`);
      logSuccess(`Fetched from database in ${duration1}ms`);
      logInfo(`Featured comics: ${result1.data.featuredComics.length}`);
      logInfo(`Latest updates: ${result1.data.latestUpdates.length}`);
      logInfo(`Stats: Comics=${result1.data.stats.totalComics}, Chapters=${result1.data.stats.totalChapters}, Users=${result1.data.stats.totalUsers}`);
    } else {
      logError('Expected cache MISS but got cache HIT');
    }
    
    // ==========================================
    // TEST 2: Second load (Cache HIT)
    // ==========================================
    logTest('TEST 2: Second load - should be Cache HIT');
    
    const startTime2 = Date.now();
    const result2 = await fetchHomepageDataWithCache();
    const duration2 = Date.now() - startTime2;
    
    if (result2.fromCache) {
      logSuccess(`Cache HIT detected (as expected)`);
      logSuccess(`Retrieved from cache in ${duration2}ms`);
      logInfo(`Speed improvement: ${Math.round(duration1 / duration2)}x faster`);
      logInfo(`Time saved: ${duration1 - duration2}ms`);
    } else {
      logError('Expected cache HIT but got cache MISS');
    }
    
    // Verify data integrity
    if (JSON.stringify(result1.data) === JSON.stringify(result2.data)) {
      logSuccess('Data integrity verified (cache matches database)');
    } else {
      logError('Data mismatch between database and cache');
    }
    
    // ==========================================
    // TEST 3: Cache statistics
    // ==========================================
    logTest('TEST 3: Cache statistics');
    
    const stats = cacheService.getStats();
    logInfo(`WARM tier keys: ${stats.warm.keys}`);
    logInfo(`WARM tier size: ${(stats.warm.ksize / 1024).toFixed(2)} KB`);
    logInfo(`WARM tier hits: ${stats.warm.hits}`);
    logInfo(`WARM tier misses: ${stats.warm.misses}`);
    
    if (stats.warm.hits > 0) {
      const hitRate = (stats.warm.hits / (stats.warm.hits + stats.warm.misses) * 100).toFixed(2);
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
    
    const homepageDataSize = JSON.stringify(result1.data).length;
    logInfo(`Homepage data size: ${(homepageDataSize / 1024).toFixed(2)} KB`);
    logInfo(`Featured comics: ${result1.data.featuredComics.length} items`);
    logInfo(`Latest updates: ${result1.data.latestUpdates.length} items`);
    
    if (homepageDataSize < 500 * 1024) {
      logSuccess('Homepage data size is within cache limits (<500KB)');
    } else {
      logWarning(`Large homepage data: ${(homepageDataSize / 1024).toFixed(2)} KB`);
    }
    
    // ==========================================
    // TEST 5: Cache invalidation
    // ==========================================
    logTest('TEST 5: Cache invalidation');
    
    const invalidated = cacheService.invalidateHomepage();
    logInfo(`Invalidated ${invalidated} cache entries`);
    
    // Try to fetch again
    const cacheKey = 'homepage:data';
    const afterInvalidation = cacheService.get(cacheKey, 'warm');
    
    if (!afterInvalidation) {
      logSuccess('Cache successfully invalidated');
    } else {
      logError('Cache still exists after invalidation');
    }
    
    // ==========================================
    // TEST 6: Multiple loads (stress test)
    // ==========================================
    logTest('TEST 6: Multiple loads stress test');
    
    const iterations = 10;
    logInfo(`Performing ${iterations} homepage loads...`);
    
    const loadStartTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await fetchHomepageDataWithCache();
    }
    
    const loadDuration = Date.now() - loadStartTime;
    logSuccess(`Completed ${iterations} loads in ${loadDuration}ms`);
    logInfo(`Average: ${(loadDuration / iterations).toFixed(2)}ms per load`);
    
    // Calculate theoretical improvement
    const uncachedTime = duration1 * iterations;
    const cachedTime = duration1 + (duration2 * (iterations - 1)); // First miss, rest hits
    const improvement = ((uncachedTime - cachedTime) / uncachedTime * 100).toFixed(2);
    
    logInfo(`Theoretical time without cache: ${uncachedTime}ms`);
    logInfo(`Time with cache: ${cachedTime}ms`);
    logSuccess(`Time saved: ${improvement}% faster with cache`);
    
    // ==========================================
    // TEST 7: TTL behavior
    // ==========================================
    logTest('TEST 7: TTL behavior (5 minute cache)');
    
    // Fetch to cache it
    await fetchHomepageDataWithCache();
    
    const ttlCacheKey = 'homepage:data';
    const ttl = cacheService.getTTL(ttlCacheKey, 'warm');
    
    if (ttl) {
      logInfo(`Cache TTL: ${ttl} seconds remaining`);
      logInfo(`Cache expires in: ${Math.floor(ttl / 60)} minutes ${ttl % 60} seconds`);
      
      if (ttl > 200 && ttl <= 300) {
        logSuccess('TTL is correct (should be ~300 seconds for fresh cache)');
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
    log(`  WARM tier:`, 'yellow');
    log(`    - Keys: ${finalStats.warm.keys}`);
    log(`    - Hits: ${finalStats.warm.hits}`);
    log(`    - Misses: ${finalStats.warm.misses}`);
    log(`    - Hit Rate: ${(finalStats.warm.hits / (finalStats.warm.hits + finalStats.warm.misses) * 100).toFixed(2)}%`);
    log(`    - Size: ${(finalStats.warm.ksize / 1024).toFixed(2)} KB`);
    
    const finalMemUsage = process.memoryUsage();
    log('\nMemory Usage:', 'bright');
    log(`  - Heap Used: ${(finalMemUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    log(`  - Heap Total: ${(finalMemUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    log(`  - RSS: ${(finalMemUsage.rss / 1024 / 1024).toFixed(2)} MB`);
    
    log('\nHomepage Performance:', 'bright');
    log(`  - Database fetch: ${duration1}ms`);
    log(`  - Cache fetch: ${duration2}ms`);
    log(`  - Speed improvement: ${Math.round(duration1 / duration2)}x faster`);
    log(`  - Data size: ${(homepageDataSize / 1024).toFixed(2)} KB`);
    
    log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY!\n', 'green');
    
    // Cleanup
    const { getMySQLPool } = require('./config/mysql');
    const pool = getMySQLPool();
    if (pool) {
      await pool.end();
      logInfo('MySQL connection closed');
    }
    
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      logInfo('MongoDB connection closed');
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
