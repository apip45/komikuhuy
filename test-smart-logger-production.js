/**
 * Test Smart Logger - Production Mode Simulation
 */

// Simulate production environment
process.env.NODE_ENV = 'production';

const logger = require('./utils/smartLogger');

console.log('\n' + '='.repeat(60));
console.log('Testing Smart Logger in PRODUCTION MODE');
console.log('='.repeat(60) + '\n');

// Show config
const config = logger.getConfig();
console.log('Configuration:');
console.log(JSON.stringify(config, null, 2));
console.log('');

console.log('Output Test:\n');
console.log('Note: Debug & Info should NOT appear in console below');
console.log('      Only Warn & Error should appear\n');
console.log('-'.repeat(60));

logger.debug('This DEBUG should NOT appear in console', { test: 'debug' });
logger.info('This INFO should NOT appear in console', { test: 'info' });
logger.warn('This WARNING SHOULD appear in console', { test: 'warn' });
logger.error('This ERROR SHOULD appear in console', { test: 'error' });

console.log('-'.repeat(60));
console.log('\nExpected in console above:');
console.log('  ❌ No DEBUG line');
console.log('  ❌ No INFO line');
console.log('  ✅ YES WARNING line');
console.log('  ✅ YES ERROR line');
console.log('\nAll 4 logs still written to file (winston)!');
console.log('='.repeat(60) + '\n');
