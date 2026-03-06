/**
 * ===========================================
 * AF-Komik V2 - Quick Performance Test
 * ===========================================
 * 
 * Fast 2-minute load test for quick validation.
 * Useful for development and CI/CD pipelines.
 * 
 * Run:
 *   k6 run tests/k6/quick-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://comic.mikan.my.id';

// Custom metrics
const cacheHitRate = new Rate('cache_hit_rate');
const responseTime = new Trend('response_time');

// Test configuration - QUICK TEST
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp-up to 20 users
    { duration: '1m', target: 20 },    // Stay at 20 users
    { duration: '30s', target: 0 },    // Ramp-down to 0
  ],
  
  thresholds: {
    'http_req_duration': ['p(95)<800', 'p(99)<1500'],
    'http_req_failed': ['rate<0.10'],
    'cache_hit_rate': ['rate>0.40'],
    'checks': ['rate>0.90'],
  },
};

// Test data
const SAMPLE_COMICS = [
  'one-piece',
  'naruto',
  'solo-leveling',
  'bleach',
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function checkResponse(response, testName) {
  const checks = check(response, {
    [`${testName}: status OK`]: (r) => r.status === 200 || r.status === 404,
    [`${testName}: fast response`]: (r) => r.timings.duration < 1500,
  });
  
  responseTime.add(response.timings.duration);
  
  // Track cache
  try {
    const body = response.body;
    if (body.includes('fromCache') || body.includes('cached')) {
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
  // Quick test of main endpoints
  
  // Homepage
  if (Math.random() < 0.3) {
    group('Homepage', () => {
      const res = http.get(`${BASE_URL}/`);
      checkResponse(res, 'Homepage');
      sleep(1);
    });
  }
  
  // Comic list
  if (Math.random() < 0.5) {
    group('Comic List', () => {
      const page = randomIntBetween(1, 5);
      const res = http.get(`${BASE_URL}/comics?page=${page}&limit=20`);
      checkResponse(res, 'Comic List');
      sleep(1);
    });
  }
  
  // Comic detail
  if (Math.random() < 0.6) {
    group('Comic Detail', () => {
      const comic = randomChoice(SAMPLE_COMICS);
      const res = http.get(`${BASE_URL}/comics/${comic}`);
      checkResponse(res, 'Comic Detail');
      sleep(1);
    });
  }
  
  // Chapter reader
  if (Math.random() < 0.4) {
    group('Chapter Reader', () => {
      const comic = randomChoice(SAMPLE_COMICS);
      const chapter = randomIntBetween(1, 10);
      const res = http.get(`${BASE_URL}/comics/${comic}/chapter-${chapter}`);
      checkResponse(res, 'Chapter');
      sleep(2);
    });
  }
  
  // API
  if (Math.random() < 0.3) {
    group('API', () => {
      const res = http.get(`${BASE_URL}/api/comics?page=1&limit=20`, {
        headers: { 'Accept': 'application/json' },
      });
      checkResponse(res, 'API');
      sleep(1);
    });
  }
  
  sleep(randomIntBetween(1, 2));
}

export function handleSummary(data) {
  const httpReqs = data.metrics.http_reqs;
  const httpReqDuration = data.metrics.http_req_duration;
  const httpReqFailed = data.metrics.http_req_failed;
  const cacheHits = data.metrics.cache_hit_rate;
  const checks = data.metrics.checks;
  
  console.log('');
  console.log('='.repeat(60));
  console.log('  QUICK TEST RESULTS');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Total Requests: ${httpReqs.values.count}`);
  console.log(`Throughput: ${httpReqs.values.rate.toFixed(2)} req/s`);
  console.log(`Avg Response: ${httpReqDuration.values.avg.toFixed(2)}ms`);
  console.log(`p95: ${httpReqDuration.values['p(95)'].toFixed(2)}ms`);
  console.log(`Error Rate: ${(httpReqFailed.values.rate * 100).toFixed(2)}%`);
  console.log(`Check Pass: ${(checks.values.rate * 100).toFixed(2)}%`);
  
  if (cacheHits) {
    console.log(`Cache Hit: ${(cacheHits.values.rate * 100).toFixed(2)}%`);
  }
  
  console.log('');
  
  const p95 = httpReqDuration.values['p(95)'];
  const failRate = httpReqFailed.values.rate;
  
  if (p95 < 800 && failRate < 0.10) {
    console.log('✅ PASS - Performance acceptable');
  } else {
    console.log('❌ FAIL - Performance issues detected');
  }
  
  console.log('='.repeat(60));
  console.log('');
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
