/**
 * ===========================================
 * AF-Komik V2 - Stress Test
 * ===========================================
 * 
 * Stress test to find system breaking point.
 * Gradually increases load until failures occur.
 * 
 * Run:
 *   k6 run tests/k6/stress-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://comic.mikan.my.id';

// Custom metrics
const errorRate = new Counter('errors');
const responseTime = new Trend('response_time');
const cacheHitRate = new Rate('cache_hit_rate');

// Stress test configuration
export const options = {
  stages: [
    // Gradual ramp-up to stress point
    { duration: '2m', target: 50 },    // Normal load
    { duration: '2m', target: 100 },   // Increased load
    { duration: '2m', target: 200 },   // High load
    { duration: '3m', target: 300 },   // Very high load
    { duration: '3m', target: 400 },   // Extreme load
    { duration: '2m', target: 500 },   // Breaking point
    { duration: '3m', target: 500 },   // Hold at max
    { duration: '2m', target: 0 },     // Recovery
  ],
  
  thresholds: {
    // More lenient thresholds for stress test
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'],
    'http_req_failed': ['rate<0.25'],  // Allow up to 25% errors
    'errors': ['count<1000'],
  },
};

// Test data
const SAMPLE_COMICS = [
  'one-piece',
  'naruto',
  'solo-leveling',
  'bleach',
  'attack-on-titan',
  'demon-slayer',
  'jujutsu-kaisen',
  'tokyo-ghoul',
];

const SEARCH_KEYWORDS = [
  'one', 'hero', 'world', 'demon', 'magic', 'battle',
];

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function checkResponse(response, testName) {
  const checks = check(response, {
    [`${testName}: not 5xx`]: (r) => r.status < 500,
    [`${testName}: response received`]: (r) => r.body && r.body.length > 0,
  });
  
  if (!checks || response.status >= 500) {
    errorRate.add(1);
  }
  
  responseTime.add(response.timings.duration);
  
  // Track cache hits
  try {
    if (response.body.includes('fromCache') || response.body.includes('cached')) {
      cacheHitRate.add(1);
    } else {
      cacheHitRate.add(0);
    }
  } catch (e) {
    // Ignore
  }
  
  return checks;
}

export default function () {
  // Stress test - Hit all endpoints aggressively
  
  const scenario = Math.random();
  
  if (scenario < 0.25) {
    // Homepage heavy
    group('Homepage Stress', () => {
      const res = http.get(`${BASE_URL}/`);
      checkResponse(res, 'Homepage');
      sleep(0.5);
    });
    
  } else if (scenario < 0.50) {
    // Comic list heavy
    group('List Stress', () => {
      const page = randomIntBetween(1, 50);
      const res = http.get(`${BASE_URL}/comics?page=${page}&limit=20`);
      checkResponse(res, 'List');
      sleep(0.5);
    });
    
  } else if (scenario < 0.70) {
    // Comic detail heavy
    group('Detail Stress', () => {
      const comic = randomChoice(SAMPLE_COMICS);
      const res = http.get(`${BASE_URL}/comics/${comic}`);
      checkResponse(res, 'Detail');
      sleep(0.5);
    });
    
  } else if (scenario < 0.85) {
    // Chapter reader heavy (most important)
    group('Chapter Stress', () => {
      const comic = randomChoice(SAMPLE_COMICS);
      const chapter = randomIntBetween(1, 100);
      const res = http.get(`${BASE_URL}/comics/${comic}/chapter-${chapter}`);
      checkResponse(res, 'Chapter');
      sleep(1);
    });
    
  } else {
    // API stress
    group('API Stress', () => {
      const endpoint = Math.random();
      let res;
      
      if (endpoint < 0.33) {
        res = http.get(`${BASE_URL}/api/comics?page=${randomIntBetween(1, 20)}`, {
          headers: { 'Accept': 'application/json' },
        });
      } else if (endpoint < 0.66) {
        const comic = randomChoice(SAMPLE_COMICS);
        res = http.get(`${BASE_URL}/api/comics/${comic}`, {
          headers: { 'Accept': 'application/json' },
        });
      } else {
        const comic = randomChoice(SAMPLE_COMICS);
        const chapter = randomIntBetween(1, 50);
        res = http.get(`${BASE_URL}/api/comics/${comic}/chapters/chapter-${chapter}`, {
          headers: { 'Accept': 'application/json' },
        });
      }
      
      checkResponse(res, 'API');
      sleep(0.5);
    });
  }
  
  // Very short sleep to maximize stress
  sleep(randomIntBetween(0, 1));
}

export function handleSummary(data) {
  const httpReqs = data.metrics.http_reqs;
  const httpReqDuration = data.metrics.http_req_duration;
  const httpReqFailed = data.metrics.http_req_failed;
  const errors = data.metrics.errors;
  const cacheHits = data.metrics.cache_hit_rate;
  const checks = data.metrics.checks;
  
  console.log('');
  console.log('='.repeat(80));
  console.log('  STRESS TEST RESULTS - FINDING BREAKING POINT');
  console.log('='.repeat(80));
  console.log('');
  
  console.log('📊 Load Statistics:');
  console.log(`  Total Requests: ${httpReqs.values.count.toLocaleString()}`);
  console.log(`  Peak Throughput: ${httpReqs.values.rate.toFixed(2)} req/s`);
  console.log(`  Test Duration: ${(data.state.testRunDurationMs / 1000 / 60).toFixed(1)} minutes`);
  console.log('');
  
  console.log('⏱️  Response Times Under Stress:');
  console.log(`  Average: ${httpReqDuration.values.avg.toFixed(2)}ms`);
  console.log(`  Median (p50): ${httpReqDuration.values.med.toFixed(2)}ms`);
  console.log(`  90th percentile: ${httpReqDuration.values['p(90)'].toFixed(2)}ms`);
  console.log(`  95th percentile: ${httpReqDuration.values['p(95)'].toFixed(2)}ms`);
  console.log(`  99th percentile: ${httpReqDuration.values['p(99)'].toFixed(2)}ms`);
  console.log(`  Maximum: ${httpReqDuration.values.max.toFixed(2)}ms`);
  console.log('');
  
  console.log('❌ Error Analysis:');
  console.log(`  Failed Requests: ${(httpReqFailed.values.rate * 100).toFixed(2)}%`);
  console.log(`  Error Count: ${errors.values.count}`);
  console.log(`  Check Success Rate: ${(checks.values.rate * 100).toFixed(2)}%`);
  console.log('');
  
  if (cacheHits) {
    console.log('🚀 Cache Performance Under Stress:');
    console.log(`  Cache Hit Rate: ${(cacheHits.values.rate * 100).toFixed(2)}%`);
    console.log('');
  }
  
  console.log('🎯 Stress Test Analysis:');
  
  const p95 = httpReqDuration.values['p(95)'];
  const failRate = httpReqFailed.values.rate;
  
  if (p95 < 1000 && failRate < 0.05) {
    console.log('  ✅ EXCELLENT - System handles extreme load well!');
    console.log('  System can safely handle 500+ concurrent users');
  } else if (p95 < 2000 && failRate < 0.15) {
    console.log('  ⚠️  GOOD - System degrades gracefully under stress');
    console.log('  Recommended max load: 300-400 concurrent users');
  } else if (failRate < 0.25) {
    console.log('  ⚠️  ACCEPTABLE - System shows stress at high load');
    console.log('  Recommended max load: 200-300 concurrent users');
    console.log('  Consider scaling infrastructure');
  } else {
    console.log('  ❌ BREAKING POINT REACHED');
    console.log('  System cannot handle 500 concurrent users');
    console.log('  Immediate scaling required for production');
  }
  
  console.log('');
  console.log('💡 Recommendations:');
  
  if (failRate > 0.10) {
    console.log('  • Scale horizontally - Add more server instances');
    console.log('  • Implement load balancing');
    console.log('  • Increase database connection pool');
  }
  
  if (p95 > 1000) {
    console.log('  • Optimize slow database queries');
    console.log('  • Increase cache TTL for hot data');
    console.log('  • Consider read replicas for database');
  }
  
  if (cacheHits && cacheHits.values.rate < 0.5) {
    console.log('  • Improve cache warming strategy');
    console.log('  • Increase Redis memory allocation');
    console.log('  • Review cache invalidation logic');
  }
  
  console.log('  • Monitor infrastructure metrics during peak hours');
  console.log('  • Set up auto-scaling based on load');
  console.log('  • Implement circuit breakers for resilience');
  
  console.log('');
  console.log('='.repeat(80));
  console.log('');
  
  return {
    'tests/k6/results/stress-test.json': JSON.stringify(data, null, 2),
  };
}
