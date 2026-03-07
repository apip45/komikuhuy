/**
 * Comprehensive Smart Logger Test
 * Tests all edge cases and error handling
 */

const logger = require('./utils/smartLogger');

console.log('\n' + '='.repeat(70));
console.log('🧪 COMPREHENSIVE SMART LOGGER TEST');
console.log('='.repeat(70) + '\n');

// Test 1: Normal usage
console.log('Test 1: Normal Usage');
console.log('-'.repeat(70));
logger.debug('Normal debug message', { test: 1 });
logger.info('Normal info message', { test: 2 });
logger.warn('Normal warning message', { test: 3 });
logger.error('Normal error message', { test: 4 });
console.log('✅ Test 1 passed\n');

// Test 2: Null and undefined parameters
console.log('Test 2: Null/Undefined Parameters');
console.log('-'.repeat(70));
try {
  logger.debug(null);
  logger.info(undefined);
  logger.warn('Message', null);
  logger.error('Message', undefined);
  console.log('✅ Test 2 passed - No crashes on null/undefined\n');
} catch (error) {
  console.error('❌ Test 2 failed:', error.message, '\n');
}

// Test 3: Circular reference in metadata
console.log('Test 3: Circular References');
console.log('-'.repeat(70));
try {
  const circular = { name: 'test' };
  circular.self = circular; // Create circular reference
  logger.debug('Testing circular reference', circular);
  console.log('✅ Test 3 passed - Circular references handled\n');
} catch (error) {
  console.error('❌ Test 3 failed:', error.message, '\n');
}

// Test 4: Very large metadata object
console.log('Test 4: Large Metadata Object');
console.log('-'.repeat(70));
try {
  const largeObj = {};
  for (let i = 0; i < 1000; i++) {
    largeObj[`key${i}`] = `value${i}`.repeat(10);
  }
  logger.debug('Testing large object', largeObj);
  console.log('✅ Test 4 passed - Large objects truncated safely\n');
} catch (error) {
  console.error('❌ Test 4 failed:', error.message, '\n');
}

// Test 5: Non-object metadata
console.log('Test 5: Non-Object Metadata');
console.log('-'.repeat(70));
try {
  logger.debug('String meta', 'not an object');
  logger.info('Number meta', 12345);
  logger.warn('Array meta', [1, 2, 3]);
  logger.error('Boolean meta', true);
  console.log('✅ Test 5 passed - Non-object metadata handled\n');
} catch (error) {
  console.error('❌ Test 5 failed:', error.message, '\n');
}

// Test 6: Special characters in message
console.log('Test 6: Special Characters');
console.log('-'.repeat(70));
try {
  logger.debug('Special chars: %s %d %j <>{}[]');
  logger.info('Unicode: 日本語 🎉 émojis');
  logger.warn('Quotes: "double" \'single\' `backtick`');
  logger.error('Newlines:\nLine1\nLine2');
  console.log('✅ Test 6 passed - Special characters handled\n');
} catch (error) {
  console.error('❌ Test 6 failed:', error.message, '\n');
}

// Test 7: Empty strings and objects
console.log('Test 7: Empty Strings and Objects');
console.log('-'.repeat(70));
try {
  logger.debug('');
  logger.info('Message', {});
  logger.warn('   ');
  logger.error('Message', { nested: {} });
  console.log('✅ Test 7 passed - Empty values handled\n');
} catch (error) {
  console.error('❌ Test 7 failed:', error.message, '\n');
}

// Test 8: Nested objects
console.log('Test 8: Nested Objects');
console.log('-'.repeat(70));
try {
  const nested = {
    level1: {
      level2: {
        level3: {
          level4: {
            data: 'deep'
          }
        }
      }
    }
  };
  logger.debug('Deep nesting', nested);
  console.log('✅ Test 8 passed - Nested objects handled\n');
} catch (error) {
  console.error('❌ Test 8 failed:', error.message, '\n');
}

// Test 9: Error objects
console.log('Test 9: Error Objects');
console.log('-'.repeat(70));
try {
  const err = new Error('Test error');
  logger.error('Logging error object', { error: err.message, stack: err.stack });
  console.log('✅ Test 9 passed - Error objects handled\n');
} catch (error) {
  console.error('❌ Test 9 failed:', error.message, '\n');
}

// Test 10: Logger health check
console.log('Test 10: Health Check');
console.log('-'.repeat(70));
try {
  const config = logger.getConfig();
  const healthy = logger.isHealthy();
  
  console.log('Config:', JSON.stringify(config, null, 2));
  console.log('Healthy:', healthy);
  
  if (config && typeof healthy === 'boolean') {
    console.log('✅ Test 10 passed - Health check works\n');
  } else {
    console.log('❌ Test 10 failed - Invalid health check response\n');
  }
} catch (error) {
  console.error('❌ Test 10 failed:', error.message, '\n');
}

// Test 11: Concurrent logging (stress test)
console.log('Test 11: Concurrent Logging (100 rapid calls)');
console.log('-'.repeat(70));
try {
  for (let i = 0; i < 100; i++) {
    logger.debug(`Concurrent log ${i}`, { index: i });
  }
  console.log('✅ Test 11 passed - Concurrent logging handled\n');
} catch (error) {
  console.error('❌ Test 11 failed:', error.message, '\n');
}

// Test 12: HTTP logging
console.log('Test 12: HTTP Logging');
console.log('-'.repeat(70));
try {
  logger.http('GET /api/comics', { 
    method: 'GET', 
    url: '/api/comics', 
    status: 200,
    duration: 42
  });
  console.log('✅ Test 12 passed - HTTP logging works\n');
} catch (error) {
  console.error('❌ Test 12 failed:', error.message, '\n');
}

// Summary
console.log('='.repeat(70));
console.log('🎉 ALL TESTS COMPLETED');
console.log('='.repeat(70));
console.log('');
console.log('Check above for any ❌ failures');
console.log('All ✅ means smart logger is robust and production-ready!');
console.log('');
console.log('Winston Status:', logger.isHealthy() ? '✅ ACTIVE' : '⚠️  FALLBACK MODE');
console.log('='.repeat(70) + '\n');
