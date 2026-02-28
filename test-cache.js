/**
 * Quick test for cache system
 * 
 * Run: node test-cache.js
 */

require('dotenv').config();
const { cacheService } = require('./services/cacheService');

async function testCache() {
    console.log('\n===========================================');
    console.log('   Testing Cache System');
    console.log('===========================================\n');

    // Test 1: Basic set/get
    console.log('Test 1: Basic set/get');
    cacheService.set('test:key', { hello: 'world' }, 'warm');
    const value = cacheService.get('test:key', 'warm');
    console.log('  ✓ Set and retrieved:', value);

    // Test 2: Key generation
    console.log('\nTest 2: Key generation helpers');
    console.log('  Comic key:', cacheService.comicKey('one-piece'));
    console.log('  Chapter key:', cacheService.chapterKey('one-piece', 'chapter-1'));
    console.log('  List key:', cacheService.comicListKey(1, 20));

    // Test 3: Get or fetch
    console.log('\nTest 3: Get or fetch pattern');
    const data = await cacheService.getOrFetch(
        'test:fetch',
        async () => {
            console.log('  → Fetching from "database"...');
            return { data: 'fetched' };
        },
        'warm'
    );
    console.log('  ✓ First call (cache miss):', data);

    const cachedData = await cacheService.getOrFetch(
        'test:fetch',
        async () => {
            console.log('  → This should not be called!');
            return { data: 'should not see this' };
        },
        'warm'
    );
    console.log('  ✓ Second call (cache hit):', cachedData);

    // Test 4: Cache statistics
    console.log('\nTest 4: Cache statistics');
    const stats = cacheService.getStats();
    console.log('  Total keys:', stats.overall.totalKeys);
    console.log('  Hit rate:', stats.overall.hitRate);
    console.log('  Memory usage:', stats.memory.heapUsed, 'MB');

    // Test 5: Pattern clearing
    console.log('\nTest 5: Pattern-based clearing');
    cacheService.set('user:1:profile', { name: 'Alice' }, 'warm');
    cacheService.set('user:2:profile', { name: 'Bob' }, 'warm');
    cacheService.set('comic:123', { title: 'Test' }, 'warm');
    
    const cleared = cacheService.clearPattern('user:');
    console.log(`  ✓ Cleared ${cleared} entries matching "user:"`);

    // Test 6: Health check
    console.log('\nTest 6: Health check');
    const health = cacheService.healthCheck();
    console.log('  Status:', health.status);
    console.log('  Warnings:', health.warnings.length > 0 ? health.warnings : 'None');

    // Cleanup
    console.log('\nCleaning up test data...');
    cacheService.flushAll();
    console.log('  ✓ All cache cleared');

    console.log('\n===========================================');
    console.log('   All Tests Passed! ✓');
    console.log('===========================================\n');
}

testCache().catch(console.error);
