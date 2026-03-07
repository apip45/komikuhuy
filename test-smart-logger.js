/**
 * Test Smart Logger
 * 
 * Run: node test-smart-logger.js
 */

const logger = require('./utils/smartLogger');

console.log('\n' + '='.repeat(60));
console.log('Testing Smart Logger Implementation');
console.log('='.repeat(60) + '\n');

// Show config
const config = logger.getConfig();
console.log('Configuration:');
console.log(JSON.stringify(config, null, 2));
console.log('');

// Test different log levels
console.log('Testing log levels:\n');

logger.debug('This is a DEBUG message', { userId: 123, action: 'test' });
logger.info('This is an INFO message', { status: 'success', duration: 42 });
logger.warn('This is a WARNING message', { threshold: 90, current: 95 });
logger.error('This is an ERROR message', { code: 'TEST_ERROR', stack: 'fake-stack' });

console.log('\n' + '='.repeat(60));
console.log('Test completed!');
console.log('');
console.log('In PRODUCTION mode:');
console.log('  - Debug & Info: NO console output (winston only)');
console.log('  - Warn & Error: YES console output + winston');
console.log('');
console.log('In DEVELOPMENT mode:');
console.log('  - All levels: console output + winston');
console.log('='.repeat(60) + '\n');
