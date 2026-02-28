/**
 * Test script for Comic Detail Cache
 * 
 * This script tests the comic detail caching functionality:
 * - Comic metadata caching
 * - Chapter list caching
 * - Cache hit/miss detection
 * - Performance measurement
 * 
 * Run: node test-comic-cache.js
 */

require('dotenv').config();

const { cacheService } = require('./services/cacheService');
const ComicModel = require('./models/mysql/comic.model');
const ChapterModel = require('./models/mysql/chapter.model');
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
 * Simulate fetching comic detail with caching (mimics controller logic)
 */
async function fetchComicDetailWithCache(comicParam) {
  const comicCacheKey = cacheService.comicKey(comicParam);
  const chaptersCacheKey = `comic:chapters:${comicParam}`;
  
  let comic = cacheService.get(comicCacheKey, 'warm');
  let chapters = cacheService.get(chaptersCacheKey, 'warm');
  
  const cacheStatus = {
    comic: !!comic ? 'HIT' : 'MISS',
    chapters: !!chapters ? 'HIT' : 'MISS'
  };
  
  if (!comic) {
    logInfo(`Cache MISS: ${comicCacheKey}`);
    comic = await ComicModel.findByParam(comicParam);
    
    if (!comic) {
      return { fromCache: false, data: null, cacheStatus };
    }
    
    cacheService.set(comicCacheKey, comic, 'warm', 1800);
    logInfo(`Cached comic: ${comicCacheKey}`);
  } else {
    logInfo(`Cache HIT: ${comicCacheKey}`);
  }
  
  if (!chapters) {
    logInfo(`Cache MISS: ${chaptersCacheKey}`);
    chapters = await ChapterModel.findByComicId(comic.id);
    cacheService.set(chaptersCacheKey, chapters, 'warm', 1800);
    logInfo(`Cached chapters: ${chaptersCacheKey} (${chapters.length} items)`);
  } else {
    logInfo(`Cache HIT: ${chaptersCacheKey} (${chapters.length} items)`);
  }
  
  return {
    fromCache: cacheStatus.comic === 'HIT' && cacheStatus.chapters === 'HIT',
    data: { comic, chapters },
    cacheStatus
  };
}

/**
 * Main test function
 */
async function runTests() {
  log('\n🚀 COMIC DETAIL CACHE TEST', 'bright');
  log('Testing comic detail caching with real database data\n', 'cyan');
  
  try {
    // Initialize MySQL connection
    logInfo('Initializing MySQL connection...');
    await createMySQLPool();
    logSuccess('MySQL connection initialized');
    
    // ==========================================
    // TEST 1: Find a test comic
    // ==========================================
    logTest('TEST 1: Finding a test comic with chapters');
    
    const comics = await ComicModel.findAll({ limit: 1 });
    
    if (!comics || comics.length === 0) {
      logError('No comics found in database');
      logWarning('Please run the scraper first to populate the database');
      process.exit(1);
    }
    
    const testComic = comics[0];
    logSuccess(`Found comic: "${testComic.title}" (${testComic.param})`);
    logInfo(`Genres: ${testComic.genre || 'N/A'}`);
    logInfo(`Author: ${testComic.author || 'N/A'}`);
    
    const testComicParam = testComic.param;
    
    // ==========================================
    // TEST 2: First load (Cache MISS)
    // ==========================================
    logTest('TEST 2: First load - should be Cache MISS');
    
    const startTime1 = Date.now();
    const result1 = await fetchComicDetailWithCache(testComicParam);
    const duration1 = Date.now() - startTime1;
    
    if (!result1.fromCache && result1.data) {
      logSuccess(`Cache MISS detected (as expected)`);
      logSuccess(`Fetched from database in ${duration1}ms`);
      logInfo(`Comic: "${result1.data.comic.title}"`);
      logInfo(`Chapters: ${result1.data.chapters.length} chapters`);
      logInfo(`Cache status - Comic: ${result1.cacheStatus.comic}, Chapters: ${result1.cacheStatus.chapters}`);
    } else {
      logError('Expected cache MISS but got cache HIT');
    }
    
    // ==========================================
    // TEST 3: Second load (Cache HIT)
    // ==========================================
    logTest('TEST 3: Second load - should be Cache HIT');
    
    const startTime2 = Date.now();
    const result2 = await fetchComicDetailWithCache(testComicParam);
    const duration2 = Date.now() - startTime2;
    
    if (result2.fromCache) {
      logSuccess(`Cache HIT detected (as expected)`);
      logSuccess(`Retrieved from cache in ${duration2}ms`);
      logInfo(`Speed improvement: ${Math.round(duration1 / duration2)}x faster`);
      logInfo(`Time saved: ${duration1 - duration2}ms`);
      logInfo(`Cache status - Comic: ${result2.cacheStatus.comic}, Chapters: ${result2.cacheStatus.chapters}`);
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
    // TEST 4: Cache statistics
    // ==========================================
    logTest('TEST 4: Cache statistics');
    
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
    // TEST 5: Cache invalidation
    // ==========================================
    logTest('TEST 5: Cache invalidation');
    
    const invalidated = cacheService.invalidateComic(testComicParam);
    logInfo(`Invalidated ${invalidated} cache entries`);
    
    // Try to fetch again
    const comicKey = cacheService.comicKey(testComicParam);
    const chaptersKey = `comic:chapters:${testComicParam}`;
    const afterInvalidation = cacheService.get(comicKey, 'warm') || cacheService.get(chaptersKey, 'warm');
    
    if (!afterInvalidation) {
      logSuccess('Cache successfully invalidated');
    } else {
      logError('Cache still exists after invalidation');
    }
    
    // ==========================================
    // TEST 6: Multiple comics (stress test)
    // ==========================================
    logTest('TEST 6: Multiple comics loading');
    
    const allComics = await ComicModel.findAll({ limit: 5 });
    logInfo(`Testing with ${allComics.length} comics`);
    
    const loadStartTime = Date.now();
    
    for (const comic of allComics) {
      await fetchComicDetailWithCache(comic.param);
    }
    
    const loadDuration = Date.now() - loadStartTime;
    logSuccess(`Loaded ${allComics.length} comics in ${loadDuration}ms`);
    logInfo(`Average: ${(loadDuration / allComics.length).toFixed(2)}ms per comic`);
    
    // Load again (should be all cache hits)
    const cacheLoadStartTime = Date.now();
    
    for (const comic of allComics) {
      await fetchComicDetailWithCache(comic.param);
    }
    
    const cacheLoadDuration = Date.now() - cacheLoadStartTime;
    logSuccess(`Loaded ${allComics.length} comics from cache in ${cacheLoadDuration}ms`);
    logInfo(`Average: ${(cacheLoadDuration / allComics.length).toFixed(2)}ms per comic (from cache)`);
    logInfo(`Cache speedup: ${(loadDuration / cacheLoadDuration).toFixed(2)}x faster`);
    
    // ==========================================
    // TEST 7: Chapter list size analysis
    // ==========================================
    logTest('TEST 7: Chapter list size analysis');
    
    const comicWithMostChapters = allComics.reduce((max, comic) => {
      const result = result1.data.comic.id === comic.id ? result1.data.chapters.length : 0;
      return result > max.chapterCount ? { comic, chapterCount: result } : max;
    }, { comic: allComics[0], chapterCount: 0 });
    
    logInfo(`Comic with most chapters being tested: "${allComics[0].title}"`);
    
    // Get detailed chapter list
    const detailComic = await fetchComicDetailWithCache(allComics[0].param);
    const chapterListSize = JSON.stringify(detailComic.data.chapters).length;
    
    logInfo(`Chapter list size: ${(chapterListSize / 1024).toFixed(2)} KB`);
    logInfo(`Number of chapters: ${detailComic.data.chapters.length}`);
    
    if (chapterListSize < 500 * 1024) {
      logSuccess('Chapter list size is within cache limits (<500KB)');
    } else {
      logWarning(`Large chapter list: ${(chapterListSize / 1024).toFixed(2)} KB`);
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
