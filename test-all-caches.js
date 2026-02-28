/**
 * Master Test Script - Run All Cache Tests
 * 
 * This script runs all cache tests in sequence:
 * 1. Chapter Reader Cache (Step 2)
 * 2. Comic Detail Cache (Step 3)
 * 3. Homepage Cache (Step 4)
 * 4. Genres Cache (Step 5)
 * 5. Comic List Cache (Step 6)
 * 
 * Run: node test-all-caches.js
 */

const { spawn } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '═'.repeat(70));
  log(message, 'bright');
  console.log('═'.repeat(70));
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

/**
 * Run a test script and capture results
 */
function runTestScript(scriptPath, testName) {
  return new Promise((resolve, reject) => {
    logHeader(`Running: ${testName}`);
    logInfo(`Script: ${scriptPath}`);
    console.log('');
    
    const startTime = Date.now();
    
    const testProcess = spawn('node', [scriptPath], {
      cwd: path.dirname(scriptPath),
      stdio: 'inherit'
    });
    
    testProcess.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      console.log('');
      if (code === 0) {
        logSuccess(`${testName} completed successfully in ${(duration / 1000).toFixed(2)}s`);
        resolve({ testName, success: true, duration, code });
      } else {
        logError(`${testName} failed with exit code ${code} after ${(duration / 1000).toFixed(2)}s`);
        resolve({ testName, success: false, duration, code });
      }
    });
    
    testProcess.on('error', (error) => {
      logError(`Failed to start ${testName}: ${error.message}`);
      reject({ testName, success: false, error: error.message });
    });
  });
}

/**
 * Main test runner
 */
async function runAllTests() {
  logHeader('🚀 COMPREHENSIVE CACHE SYSTEM TEST SUITE');
  log('Testing all 6 caching steps in sequence\n', 'cyan');
  
  const projectRoot = path.resolve(__dirname);
  
  const testSuite = [
    {
      name: 'Step 2: Chapter Reader Cache',
      script: path.join(projectRoot, 'test-chapter-cache.js'),
      priority: '⭐⭐⭐ Critical (13M+ images)'
    },
    {
      name: 'Step 3: Comic Detail Cache',
      script: path.join(projectRoot, 'test-comic-detail-cache.js'),
      priority: '⭐⭐⭐ High'
    },
    {
      name: 'Step 4: Homepage Cache',
      script: path.join(projectRoot, 'test-homepage-cache.js'),
      priority: '⭐⭐ Medium'
    },
    {
      name: 'Step 5: Genres Cache',
      script: path.join(projectRoot, 'test-genres-cache.js'),
      priority: '⭐ Low'
    },
    {
      name: 'Step 6: Comic List Cache',
      script: path.join(projectRoot, 'test-comic-list-cache.js'),
      priority: '⭐⭐⭐ High'
    }
  ];
  
  logInfo(`Running ${testSuite.length} test suites...`);
  console.log('');
  
  const results = [];
  const startTime = Date.now();
  
  // Run tests sequentially
  for (const test of testSuite) {
    try {
      log(`\n${'─'.repeat(70)}\n`, 'blue');
      logInfo(`Test ${results.length + 1}/${testSuite.length}: ${test.name}`);
      logInfo(`Priority: ${test.priority}`);
      log('', 'reset');
      
      const result = await runTestScript(test.script, test.name);
      results.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      logError(`Test execution error: ${error.message}`);
      results.push({ 
        testName: test.name, 
        success: false, 
        error: error.message 
      });
    }
  }
  
  const totalDuration = Date.now() - startTime;
  
  // Print summary
  logHeader('📊 TEST SUMMARY');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('');
  log('Test Results:', 'bright');
  results.forEach((result, index) => {
    const icon = result.success ? '✓' : '✗';
    const color = result.success ? 'green' : 'red';
    const duration = result.duration ? ` (${(result.duration / 1000).toFixed(2)}s)` : '';
    log(`  ${icon} ${result.testName}${duration}`, color);
  });
  
  console.log('');
  log('Statistics:', 'bright');
  log(`  Total Tests: ${results.length}`, 'cyan');
  log(`  Passed: ${passed}`, 'green');
  if (failed > 0) {
    log(`  Failed: ${failed}`, 'red');
  }
  log(`  Success Rate: ${((passed / results.length) * 100).toFixed(2)}%`, 'yellow');
  log(`  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`, 'cyan');
  
  // Check if any critical tests failed
  const criticalTests = [
    'Step 2: Chapter Reader Cache',
    'Step 3: Comic Detail Cache',
    'Step 6: Comic List Cache'
  ];
  
  const criticalFailures = results.filter(
    r => !r.success && criticalTests.includes(r.testName)
  );
  
  console.log('');
  if (failed === 0) {
    logHeader('✅ ALL TESTS PASSED - SYSTEM READY FOR PRODUCTION');
    log('All caching components are working correctly!', 'green');
    log('Memory usage is within acceptable limits.', 'green');
    log('Performance improvements validated.', 'green');
    console.log('');
    log('Next steps:', 'bright');
    log('  1. Review logs for any warnings', 'cyan');
    log('  2. Deploy to staging environment', 'cyan');
    log('  3. Run production load tests', 'cyan');
    log('  4. Monitor cache hit rates in production', 'cyan');
    console.log('');
  } else if (criticalFailures.length > 0) {
    logHeader('❌ CRITICAL TESTS FAILED - DO NOT DEPLOY');
    log('The following critical components failed:', 'red');
    criticalFailures.forEach(f => {
      log(`  • ${f.testName}`, 'red');
    });
    console.log('');
    log('Action required:', 'yellow');
    log('  1. Review error logs above', 'cyan');
    log('  2. Fix failing components', 'cyan');
    log('  3. Re-run tests', 'cyan');
    console.log('');
    process.exit(1);
  } else {
    logHeader('⚠️  SOME TESTS FAILED - REVIEW REQUIRED');
    log('Non-critical tests failed. Review before deploying.', 'yellow');
    console.log('');
    log('Failed tests:', 'bright');
    results.filter(r => !r.success).forEach(f => {
      log(`  • ${f.testName}`, 'yellow');
    });
    console.log('');
  }
  
  // Memory report
  logHeader('💾 FINAL MEMORY REPORT');
  const memUsage = process.memoryUsage();
  log(`Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`, 'cyan');
  log(`Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`, 'cyan');
  log(`RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`, 'cyan');
  
  if (memUsage.heapUsed < 200 * 1024 * 1024) {
    logSuccess('Memory usage is excellent (<200MB)');
  } else if (memUsage.heapUsed < 300 * 1024 * 1024) {
    log('⚠️  Memory usage is acceptable but monitor closely (<300MB)', 'yellow');
  } else {
    logError('Memory usage is high (>300MB) - optimization needed');
  }
  
  console.log('');
  log('═'.repeat(70), 'bright');
  log('Test suite completed!', 'bright');
  log('═'.repeat(70), 'bright');
  console.log('');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  logError(`Unhandled error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

process.on('SIGINT', () => {
  log('\n\nTest suite interrupted by user', 'yellow');
  process.exit(130);
});

// Run all tests
runAllTests();
