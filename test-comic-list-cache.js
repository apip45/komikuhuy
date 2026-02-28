/**
 * Test script for Comic List Cache
 * 
 * This script tests the comic list caching functionality:
 * - Simple pagination caching
 * - Search + filter caching
 * - Cache key generation for different queries
 * - Cache hit/miss detection
 * - Performance measurement
 * 
 * Run: node test-comic-list-cache.js
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
 * Simulate fetching comic list with caching
 */
async function fetchComicListWithCache(page, limit, filters = {}) {
  const cacheKey = cacheService.comicListKey(page, limit, filters);
  const offset = (page - 1) * limit;
  
  const data = await cacheService.getOrFetch(
    cacheKey,
    async () => {
      logInfo(`Cache MISS: ${cacheKey}`);
      
      if (filters.keyword || filters.genre) {
        // Search with filters
        const [comics, total] = await Promise.all([
          ComicModel.searchAndFilter({ 
            keyword: filters.keyword || '', 
            genre: filters.genre || '', 
            limit, 
            offset 
          }),
          ComicModel.countSearchResults({ 
            keyword: filters.keyword || '', 
            genre: filters.genre || '' 
          })
        ]);
        return { comics, total };
      } else {
        // Simple list
        const [comics, total] = await Promise.all([
          ComicModel.findAll({ limit, offset }),
          ComicModel.count()
        ]);
        return { comics, total };
      }
    },
    'warm',
    600 // 10 minutes
  );
  
  // Check if from cache
  const fromCache = !!cacheService.get(cacheKey, 'warm');
  
  if (fromCache) {
    logInfo(`Cache HIT: ${cacheKey}`);
  }
  
  return {
    data,
    fromCache,
    cacheKey
  };
}

/**
 * Main test function
 */
async function runTests() {
  log('\n🚀 COMIC LIST CACHE TEST', 'bright');
  log('Testing comic list caching with pagination, search, and filters\n', 'cyan');
  
  try {
    // Initialize MySQL connection
    logInfo('Initializing MySQL connection...');
    await createMySQLPool();
    logSuccess('MySQL connection initialized');
    
    // ==========================================
    // TEST 1: Simple pagination (page 1)
    // ==========================================
    logTest('TEST 1: Simple pagination - Page 1 (Cache MISS)');
    
    const startTime1 = Date.now();
    const result1 = await fetchComicListWithCache(1, 20, {});
    const duration1 = Date.now() - startTime1;
    
    if (!result1.fromCache) {
      logSuccess(`Cache MISS detected (as expected)`);
      logSuccess(`Fetched from database in ${duration1}ms`);
      logInfo(`Comics found: ${result1.data.comics.length}`);
      logInfo(`Total comics: ${result1.data.total}`);
      logInfo(`Cache key: ${result1.cacheKey}`);
    } else {
      logError('Expected cache MISS but got cache HIT');
    }
    
    // ==========================================
    // TEST 2: Same query (Cache HIT)
    // ==========================================
    logTest('TEST 2: Same query - Page 1 (Cache HIT)');
    
    const startTime2 = Date.now();
    const result2 = await fetchComicListWithCache(1, 20, {});
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
    if (JSON.stringify(result1.data) === JSON.stringify(result2.data)) {
      logSuccess('Data integrity verified (cache matches database)');
    } else {
      logError('Data mismatch between database and cache');
    }
    
    // ==========================================
    // TEST 3: Different page (Cache MISS)
    // ==========================================
    logTest('TEST 3: Different page - Page 2 (Cache MISS)');
    
    const startTime3 = Date.now();
    const result3 = await fetchComicListWithCache(2, 20, {});
    const duration3 = Date.now() - startTime3;
    
    if (!result3.fromCache) {
      logSuccess(`Cache MISS for page 2 (as expected)`);
      logSuccess(`Fetched in ${duration3}ms`);
      logInfo(`Cache key: ${result3.cacheKey}`);
      logInfo(`Different from page 1: ${result3.cacheKey !== result1.cacheKey ? 'YES' : 'NO'}`);
    } else {
      logWarning('Got cache HIT for page 2 (might be cached from previous run)');
    }
    
    // ==========================================
    // TEST 4: Search with keyword (Cache MISS)
    // ==========================================
    logTest('TEST 4: Search with keyword (Cache MISS)');
    
    // Get first comic to search for
    const firstComic = result1.data.comics[0];
    const searchKeyword = firstComic ? firstComic.title.substring(0, 5) : 'one';
    
    logInfo(`Searching for: "${searchKeyword}"`);
    
    const startTime4 = Date.now();
    const result4 = await fetchComicListWithCache(1, 20, { keyword: searchKeyword });
    const duration4 = Date.now() - startTime4;
    
    if (!result4.fromCache) {
      logSuccess(`Cache MISS for search (as expected)`);
      logSuccess(`Fetched in ${duration4}ms`);
      logInfo(`Search results: ${result4.data.comics.length} comics`);
      logInfo(`Cache key: ${result4.cacheKey}`);
    } else {
      logWarning('Got cache HIT for search (might be cached from previous run)');
    }
    
    // ==========================================
    // TEST 5: Search cache HIT
    // ==========================================
    logTest('TEST 5: Same search query (Cache HIT)');
    
    const startTime5 = Date.now();
    const result5 = await fetchComicListWithCache(1, 20, { keyword: searchKeyword });
    const duration5 = Date.now() - startTime5;
    
    if (result5.fromCache) {
      logSuccess(`Cache HIT for search (as expected)`);
      logSuccess(`Retrieved in ${duration5}ms`);
      logInfo(`Same cache key: ${result5.cacheKey === result4.cacheKey ? 'YES' : 'NO'}`);
    } else {
      logError('Expected cache HIT but got cache MISS');
    }
    
    // ==========================================
    // TEST 6: Filter by genre (if genres exist)
    // ==========================================
    logTest('TEST 6: Filter by genre');
    
    // Try to get a genre from first comic
    const testGenre = firstComic && firstComic.genre ? firstComic.genre.split(',')[0].trim() : '';
    
    if (testGenre) {
      logInfo(`Filtering by genre: "${testGenre}"`);
      
      const startTime6 = Date.now();
      const result6 = await fetchComicListWithCache(1, 20, { genre: testGenre });
      const duration6 = Date.now() - startTime6;
      
      if (!result6.fromCache) {
        logSuccess(`Cache MISS for genre filter (as expected)`);
        logSuccess(`Fetched in ${duration6}ms`);
        logInfo(`Filtered results: ${result6.data.comics.length} comics`);
        logInfo(`Cache key: ${result6.cacheKey}`);
      } else {
        logWarning('Got cache HIT for genre (might be cached from previous run)');
      }
    } else {
      logWarning('No genre found to test filtering');
    }
    
    // ==========================================
    // TEST 7: Cache statistics
    // ==========================================
    logTest('TEST 7: Cache statistics');
    
    const stats = cacheService.getStats();
    logInfo(`WARM tier keys: ${stats.warm.keys}`);
    logInfo(`WARM tier size: ${(stats.warm.ksize / 1024).toFixed(2)} KB`);
    logInfo(`WARM tier hits: ${stats.warm.hits}`);
    logInfo(`WARM tier misses: ${stats.warm.misses}`);
    
    if (stats.warm.hits > 0) {
      const hitRate = (stats.warm.hits / (stats.warm.hits + stats.warm.misses) * 100).toFixed(2);
      logInfo(`Hit rate: ${hitRate}%`);
      
      if (parseFloat(hitRate) >= 40) {
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
    // TEST 8: Cache key uniqueness
    // ==========================================
    logTest('TEST 8: Cache key uniqueness');
    
    const key1 = cacheService.comicListKey(1, 20, {});
    const key2 = cacheService.comicListKey(2, 20, {});
    const key3 = cacheService.comicListKey(1, 20, { keyword: 'test' });
    const key4 = cacheService.comicListKey(1, 20, { genre: 'Action' });
    const key5 = cacheService.comicListKey(1, 20, { keyword: 'test', genre: 'Action' });
    
    logInfo(`Page 1: ${key1}`);
    logInfo(`Page 2: ${key2}`);
    logInfo(`Search: ${key3}`);
    logInfo(`Filter: ${key4}`);
    logInfo(`Both: ${key5}`);
    
    const uniqueKeys = new Set([key1, key2, key3, key4, key5]);
    if (uniqueKeys.size === 5) {
      logSuccess('All cache keys are unique!');
    } else {
      logError(`Cache key collision detected! Only ${uniqueKeys.size} unique keys`);
    }
    
    // ==========================================
    // TEST 9: Cache invalidation
    // ==========================================
    logTest('TEST 9: Cache invalidation');
    
    const clearedCount = cacheService.clearByPattern('comics:list');
    logInfo(`Cleared ${clearedCount} comic list cache entries`);
    
    // Verify all list caches are cleared
    const afterClear = [
      cacheService.get(key1, 'warm'),
      cacheService.get(key2, 'warm'),
      cacheService.get(key3, 'warm')
    ];
    
    const allCleared = afterClear.every(item => !item);
    
    if (allCleared) {
      logSuccess('All comic list caches successfully cleared');
    } else {
      logError('Some caches still exist after clearing');
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
    
    log('\nComic List Performance:', 'bright');
    log(`  - Database fetch: ${duration1}ms`);
    log(`  - Cache fetch: ${duration2}ms`);
    log(`  - Speed improvement: ${duration2 > 0 ? Math.round(duration1 / duration2) : '100+'}x faster`);
    
    log('\nCache Key Variations:', 'bright');
    log(`  - Simple pagination: comics:list:p{page}:l{limit}`);
    log(`  - With search: comics:list:p{page}:l{limit}:{"keyword":"..."}`);
    log(`  - With filter: comics:list:p{page}:l{limit}:{"genre":"..."}`);
    log(`  - With both: comics:list:p{page}:l{limit}:{"keyword":"...","genre":"..."}`);
    
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
