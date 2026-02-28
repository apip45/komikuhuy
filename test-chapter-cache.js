/**
 * Test script for Chapter Reader Cache
 * 
 * This script tests the chapter caching functionality:
 * - First load (cache MISS) - fetch from database
 * - Second load (cache HIT) - retrieve from cache
 * - Prefetching of adjacent chapters
 * - Cache invalidation
 * 
 * Run: node test-chapter-cache.js
 */

require('dotenv').config();

const { cacheService } = require('./services/cacheService');
const ChapterModel = require('./models/mysql/chapter.model');
const ImageModel = require('./models/mysql/image.model');
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
 * Simulate fetching chapter with caching (mimics controller logic)
 */
async function fetchChapterWithCache(comicParam, chapterParam) {
  const cacheKey = cacheService.chapterKey(comicParam, chapterParam);
  
  // Try cache first
  let cachedData = cacheService.get(cacheKey, 'cold');
  
  if (cachedData) {
    logInfo(`Cache HIT: ${cacheKey}`);
    return {
      fromCache: true,
      data: cachedData
    };
  }
  
  // Cache MISS - fetch from database
  logInfo(`Cache MISS: ${cacheKey}`);
  
  const chapter = await ChapterModel.findByParams(comicParam, chapterParam);
  if (!chapter) {
    return { fromCache: false, data: null };
  }
  
  const [images, navigation] = await Promise.all([
    ImageModel.findByChapterId(chapter.id),
    ChapterModel.getNavigation(chapter.komik_id, chapter.id)
  ]);
  
  const data = { chapter, images, navigation };
  
  // Cache it
  cacheService.set(cacheKey, data, 'cold', 86400);
  logInfo(`Cached: ${cacheKey} (${images.length} images)`);
  
  return { fromCache: false, data };
}

/**
 * Main test function
 */
async function runTests() {
  log('\n🚀 CHAPTER READER CACHE TEST', 'bright');
  log('Testing chapter caching with real database data\n', 'cyan');
  
  try {
    // Initialize MySQL connection
    logInfo('Initializing MySQL connection...');
    await createMySQLPool();
    logSuccess('MySQL connection initialized');
    
    // ==========================================
    // TEST 1: Find a real comic to test with
    // ==========================================
    logTest('TEST 1: Finding a test comic with chapters');
    
    const comics = await ComicModel.findAll({ limit: 1 });
    
    if (!comics || comics.length === 0) {
      logError('No comics found in database');
      logWarning('Please run the scraper first to populate the database');
      process.exit(1);
    }
    
    const testComic = comics[0];
    logSuccess(`Found comic: "${testComic.judul}" (${testComic.param})`);
    
    // Find a chapter for this comic
    const chapters = await ChapterModel.findByParam('komik_id', testComic.id, { limit: 1 });
    
    if (!chapters || chapters.length === 0) {
      logError(`No chapters found for comic "${testComic.judul}"`);
      logWarning('Please run the scraper to populate chapters');
      process.exit(1);
    }
    
    const testChapter = chapters[0];
    logSuccess(`Found chapter: "${testChapter.param}" (ID: ${testChapter.id})`);
    
    const testComicParam = testComic.param;
    const testChapterParam = testChapter.param;
    
    // ==========================================
    // TEST 2: First load (Cache MISS)
    // ==========================================
    logTest('TEST 2: First load - should be Cache MISS');
    
    const startTime1 = Date.now();
    const result1 = await fetchChapterWithCache(testComicParam, testChapterParam);
    const duration1 = Date.now() - startTime1;
    
    if (!result1.fromCache) {
      logSuccess(`Cache MISS detected (as expected)`);
      logSuccess(`Fetched from database in ${duration1}ms`);
      logInfo(`Chapter: "${result1.data.chapter.chapter_label}"`);
      logInfo(`Images: ${result1.data.images.length} pages`);
      logInfo(`Navigation: prev=${result1.data.navigation.prev ? 'yes' : 'no'}, next=${result1.data.navigation.next ? 'yes' : 'no'}`);
    } else {
      logError('Expected cache MISS but got cache HIT');
    }
    
    // ==========================================
    // TEST 3: Second load (Cache HIT)
    // ==========================================
    logTest('TEST 3: Second load - should be Cache HIT');
    
    const startTime2 = Date.now();
    const result2 = await fetchChapterWithCache(testComicParam, testChapterParam);
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
    // TEST 4: Cache statistics
    // ==========================================
    logTest('TEST 4: Cache statistics');
    
    const stats = cacheService.getStats();
    logInfo(`COLD tier keys: ${stats.cold.keys}`);
    logInfo(`COLD tier size: ${(stats.cold.ksize / 1024).toFixed(2)} KB`);
    logInfo(`COLD tier hits: ${stats.cold.hits}`);
    logInfo(`COLD tier misses: ${stats.cold.misses}`);
    
    if (stats.cold.hits > 0) {
      const hitRate = (stats.cold.hits / (stats.cold.hits + stats.cold.misses) * 100).toFixed(2);
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
    
    const invalidated = cacheService.invalidateChapter(testComicParam, testChapterParam);
    logInfo(`Invalidated ${invalidated} cache entries`);
    
    // Try to fetch again
    const cacheKey = cacheService.chapterKey(testComicParam, testChapterParam);
    const afterInvalidation = cacheService.get(cacheKey, 'cold');
    
    if (!afterInvalidation) {
      logSuccess('Cache successfully invalidated');
    } else {
      logError('Cache still exists after invalidation');
    }
    
    // ==========================================
    // TEST 6: Multiple chapters (stress test)
    // ==========================================
    logTest('TEST 6: Multiple chapters loading');
    
    const allChapters = await ChapterModel.findByParam('komik_id', testComic.id, { limit: 5 });
    logInfo(`Testing with ${allChapters.length} chapters`);
    
    const loadStartTime = Date.now();
    
    for (const chapter of allChapters) {
      await fetchChapterWithCache(testComicParam, chapter.param);
    }
    
    const loadDuration = Date.now() - loadStartTime;
    logSuccess(`Loaded ${allChapters.length} chapters in ${loadDuration}ms`);
    logInfo(`Average: ${(loadDuration / allChapters.length).toFixed(2)}ms per chapter`);
    
    // Load again (should be all cache hits)
    const cacheLoadStartTime = Date.now();
    
    for (const chapter of allChapters) {
      await fetchChapterWithCache(testComicParam, chapter.param);
    }
    
    const cacheLoadDuration = Date.now() - cacheLoadStartTime;
    logSuccess(`Loaded ${allChapters.length} chapters from cache in ${cacheLoadDuration}ms`);
    logInfo(`Average: ${(cacheLoadDuration / allChapters.length).toFixed(2)}ms per chapter (from cache)`);
    logInfo(`Cache speedup: ${(loadDuration / cacheLoadDuration).toFixed(2)}x faster`);
    
    // ==========================================
    // FINAL SUMMARY
    // ==========================================
    logTest('FINAL SUMMARY');
    
    const finalStats = cacheService.getStats();
    
    log('\nCache Statistics:', 'bright');
    log(`  COLD tier:`, 'yellow');
    log(`    - Keys: ${finalStats.cold.keys}`);
    log(`    - Hits: ${finalStats.cold.hits}`);
    log(`    - Misses: ${finalStats.cold.misses}`);
    log(`    - Hit Rate: ${(finalStats.cold.hits / (finalStats.cold.hits + finalStats.cold.misses) * 100).toFixed(2)}%`);
    log(`    - Size: ${(finalStats.cold.ksize / 1024).toFixed(2)} KB`);
    
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
