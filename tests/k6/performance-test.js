/**
 * ===========================================
 * AF-Komik V2 - Comprehensive Performance Test
 * ===========================================
 * 
 * Complete load testing for all endpoints and features.
 * 
 * Install k6:
 *   macOS: brew install k6
 *   Linux: sudo apt install k6
 *   Windows: choco install k6
 * 
 * Run:
 *   k6 run tests/k6/performance-test.js
 *   k6 run --vus 100 --duration 5m tests/k6/performance-test.js
 *   k6 run --vus 50 --duration 2m --out json=results.json tests/k6/performance-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// ============================================
// Configuration
// ============================================

const BASE_URL = __ENV.BASE_URL || 'https://comic.mikan.my.id';

// Custom metrics
const cacheHitRate = new Rate('cache_hit_rate');
const responseTime = new Trend('response_time');
const errorRate = new Counter('errors');
const requestsPerSecond = new Rate('requests_per_second');
const databaseQueries = new Gauge('database_queries');

// Test configuration
export const options = {
  stages: [
    // Warm-up: Gradual ramp-up
    { duration: '1m', target: 20 },    // 0 → 20 users
    { duration: '2m', target: 50 },    // 20 → 50 users
    { duration: '2m', target: 100 },   // 50 → 100 users
    
    // Peak load: Sustained high traffic
    { duration: '5m', target: 100 },   // Stay at 100 users
    
    // Stress test: Push to limits
    { duration: '2m', target: 200 },   // 100 → 200 users
    { duration: '3m', target: 200 },   // Stay at 200 users
    
    // Cool down: Gradual ramp-down
    { duration: '2m', target: 50 },    // 200 → 50 users
    { duration: '1m', target: 0 },     // 50 → 0 users
  ],
  
  thresholds: {
    // Response time requirements
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'response_time': ['p(95)<500', 'p(99)<1000'],
    
    // Error rate should be minimal
    'http_req_failed': ['rate<0.05'],  // < 5% errors
    'errors': ['count<100'],
    
    // Cache performance
    'cache_hit_rate': ['rate>0.60'],   // > 60% cache hits
    
    // Throughput requirements
    'http_reqs': ['rate>100'],         // > 100 req/s
    'requests_per_second': ['rate>100'],
    
    // Success rates per endpoint group
    'checks{group:::Homepage}': ['rate>0.95'],
    'checks{group:::Comic List}': ['rate>0.95'],
    'checks{group:::Comic Detail}': ['rate>0.90'],
    'checks{group:::Chapter Reader}': ['rate>0.90'],
    'checks{group:::Search}': ['rate>0.90'],
    'checks{group:::API}': ['rate>0.95'],
  },
  
  // HTTP settings
  insecureSkipTLSVerify: false,
  noConnectionReuse: false,
  
  // Batch requests for efficiency
  batch: 10,
  batchPerHost: 6,
};

// ============================================
// Test Data
// ============================================

// Sample comic params for testing
const SAMPLE_COMICS = [
  'one-piece',
  'naruto',
  'solo-leveling',
  'bleach',
  'attack-on-titan',
  'demon-slayer',
  'jujutsu-kaisen',
  'tokyo-ghoul',
  'death-note',
  'fullmetal-alchemist',
];

// Sample search keywords
const SEARCH_KEYWORDS = [
  'one',
  'hero',
  'world',
  'demon',
  'magic',
  'battle',
  'adventure',
  'fantasy',
];

// Sample genres
const GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Romance',
  'Sci-Fi',
  'Seinen',
  'Shounen',
];

// ============================================
// Helper Functions
// ============================================

/**
 * Get random element from array
 */
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Check response and track metrics
 */
function checkResponse(response, testName, expectedStatus = 200) {
  const checks = check(response, {
    [`${testName}: status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${testName}: response time < 1000ms`]: (r) => r.timings.duration < 1000,
    [`${testName}: has body`]: (r) => r.body && r.body.length > 0,
  });
  
  if (!checks) {
    errorRate.add(1);
  }
  
  // Track response time
  responseTime.add(response.timings.duration);
  requestsPerSecond.add(1);
  
  // Track cache hits (if available in response)
  try {
    const body = JSON.parse(response.body);
    if (body.cached || body.fromCache || body.data?.fromCache) {
      cacheHitRate.add(1);
    } else {
      cacheHitRate.add(0);
    }
    
    // Track database query count (if available)
    if (body.dbQueries !== undefined) {
      databaseQueries.add(body.dbQueries);
    }
  } catch (e) {
    // Ignore JSON parse errors for HTML pages
  }
  
  return checks;
}

// ============================================
// Test Scenarios
// ============================================

/**
 * Test 1: Homepage
 * Priority: HIGH (gateway page)
 */
function testHomepage() {
  const response = http.get(`${BASE_URL}/`, {
    tags: { name: 'Homepage' },
  });
  
  checkResponse(response, 'Homepage');
}

/**
 * Test 2: Comic List Page
 * Priority: HIGH (main browsing)
 */
function testComicList() {
  const page = randomIntBetween(1, 20);
  const limit = 20;
  
  const response = http.get(`${BASE_URL}/comics?page=${page}&limit=${limit}`, {
    tags: { name: 'Comic List' },
  });
  
  checkResponse(response, 'Comic List');
}

/**
 * Test 3: Comic Detail Page
 * Priority: HIGH (pre-reading)
 */
function testComicDetail() {
  const comicParam = randomChoice(SAMPLE_COMICS);
  
  const response = http.get(`${BASE_URL}/comics/${comicParam}`, {
    tags: { name: 'Comic Detail' },
  });
  
  checkResponse(response, 'Comic Detail');
}

/**
 * Test 4: Chapter Reader
 * Priority: CRITICAL (core feature)
 */
function testChapterReader() {
  const comicParam = randomChoice(SAMPLE_COMICS);
  const chapterNum = randomIntBetween(1, 100);
  const chapterParam = `chapter-${chapterNum}`;
  
  const response = http.get(
    `${BASE_URL}/comics/${comicParam}/${chapterParam}`,
    {
      tags: { name: 'Chapter Reader' },
    }
  );
  
  // Accept 200 or 404 (chapter might not exist)
  const checks = check(response, {
    'Chapter: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'Chapter: response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  if (response.status === 200) {
    responseTime.add(response.timings.duration);
    
    // Track cache hit for successful chapter loads
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
  }
  
  if (!checks) {
    errorRate.add(1);
  }
  
  requestsPerSecond.add(1);
}

/**
 * Test 5: Search Function
 * Priority: MEDIUM
 */
function testSearch() {
  const keyword = randomChoice(SEARCH_KEYWORDS);
  
  const response = http.get(
    `${BASE_URL}/comics?keyword=${encodeURIComponent(keyword)}`,
    {
      tags: { name: 'Search' },
    }
  );
  
  checkResponse(response, 'Search');
}

/**
 * Test 6: Genre Filter
 * Priority: MEDIUM
 */
function testGenreFilter() {
  const genre = randomChoice(GENRES);
  const page = randomIntBetween(1, 10);
  
  const response = http.get(
    `${BASE_URL}/comics?genre=${encodeURIComponent(genre)}&page=${page}`,
    {
      tags: { name: 'Genre Filter' },
    }
  );
  
  checkResponse(response, 'Genre Filter');
}

/**
 * Test 7: API - Comic List
 * Priority: HIGH (mobile app)
 */
function testAPIComicList() {
  const page = randomIntBetween(1, 10);
  
  const response = http.get(`${BASE_URL}/api/comics?page=${page}&limit=20`, {
    tags: { name: 'API Comic List' },
    headers: {
      'Accept': 'application/json',
    },
  });
  
  const checks = check(response, {
    'API List: status is 200': (r) => r.status === 200,
    'API List: is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
    'API List: has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'success' && body.data;
      } catch {
        return false;
      }
    },
  });
  
  if (!checks) {
    errorRate.add(1);
  }
  
  responseTime.add(response.timings.duration);
  requestsPerSecond.add(1);
  
  // Track cache hit
  try {
    const body = JSON.parse(response.body);
    if (body.fromCache) {
      cacheHitRate.add(1);
    } else {
      cacheHitRate.add(0);
    }
  } catch (e) {
    // Ignore
  }
}

/**
 * Test 8: API - Comic Detail
 * Priority: HIGH (mobile app)
 */
function testAPIComicDetail() {
  const comicParam = randomChoice(SAMPLE_COMICS);
  
  const response = http.get(`${BASE_URL}/api/comics/${comicParam}`, {
    tags: { name: 'API Comic Detail' },
    headers: {
      'Accept': 'application/json',
    },
  });
  
  const checks = check(response, {
    'API Detail: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'API Detail: is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
  });
  
  if (response.status === 200) {
    responseTime.add(response.timings.duration);
    
    try {
      const body = JSON.parse(response.body);
      if (body.fromCache) {
        cacheHitRate.add(1);
      } else {
        cacheHitRate.add(0);
      }
    } catch (e) {
      // Ignore
    }
  }
  
  if (!checks) {
    errorRate.add(1);
  }
  
  requestsPerSecond.add(1);
}

/**
 * Test 9: API - Chapter Detail
 * Priority: HIGH (mobile app)
 */
function testAPIChapterDetail() {
  const comicParam = randomChoice(SAMPLE_COMICS);
  const chapterNum = randomIntBetween(1, 50);
  const chapterParam = `chapter-${chapterNum}`;
  
  const response = http.get(
    `${BASE_URL}/api/comics/${comicParam}/chapters/${chapterParam}`,
    {
      tags: { name: 'API Chapter Detail' },
      headers: {
        'Accept': 'application/json',
      },
    }
  );
  
  const checks = check(response, {
    'API Chapter: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'API Chapter: is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
  });
  
  if (response.status === 200) {
    responseTime.add(response.timings.duration);
    
    try {
      const body = JSON.parse(response.body);
      if (body.fromCache) {
        cacheHitRate.add(1);
      } else {
        cacheHitRate.add(0);
      }
    } catch (e) {
      // Ignore
    }
  }
  
  if (!checks) {
    errorRate.add(1);
  }
  
  requestsPerSecond.add(1);
}

/**
 * Test 10: Static Assets
 * Priority: LOW
 */
function testStaticAssets() {
  const assets = [
    '/css/styles.css',
    '/js/main.js',
  ];
  
  const asset = randomChoice(assets);
  
  const response = http.get(`${BASE_URL}${asset}`, {
    tags: { name: 'Static Assets' },
  });
  
  check(response, {
    'Static: status is 200': (r) => r.status === 200,
    'Static: fast response': (r) => r.timings.duration < 200,
  });
  
  requestsPerSecond.add(1);
}

// ============================================
// Main Test Execution
// ============================================

export default function () {
  // Simulate realistic user behavior
  
  // 1. Homepage visit (30% of traffic)
  if (Math.random() < 0.3) {
    group('Homepage', () => {
      testHomepage();
      sleep(randomIntBetween(1, 3));
    });
  }
  
  // 2. Browse comic list (40% of traffic)
  if (Math.random() < 0.4) {
    group('Comic List', () => {
      testComicList();
      sleep(randomIntBetween(1, 2));
    });
  }
  
  // 3. Search or filter (20% of traffic)
  if (Math.random() < 0.2) {
    group('Search', () => {
      if (Math.random() < 0.5) {
        testSearch();
      } else {
        testGenreFilter();
      }
      sleep(randomIntBetween(1, 2));
    });
  }
  
  // 4. View comic detail (60% of traffic)
  if (Math.random() < 0.6) {
    group('Comic Detail', () => {
      testComicDetail();
      sleep(randomIntBetween(2, 4));
    });
  }
  
  // 5. Read chapter (50% of traffic - CORE FEATURE)
  if (Math.random() < 0.5) {
    group('Chapter Reader', () => {
      testChapterReader();
      sleep(randomIntBetween(3, 8)); // Users spend more time reading
    });
  }
  
  // 6. API calls (30% of traffic - mobile app simulation)
  if (Math.random() < 0.3) {
    group('API', () => {
      const apiTest = Math.random();
      
      if (apiTest < 0.4) {
        testAPIComicList();
      } else if (apiTest < 0.7) {
        testAPIComicDetail();
      } else {
        testAPIChapterDetail();
      }
      
      sleep(randomIntBetween(1, 2));
    });
  }
  
  // 7. Static assets (occasional)
  if (Math.random() < 0.1) {
    group('Static Assets', () => {
      testStaticAssets();
    });
  }
  
  // Random sleep between actions (1-3 seconds)
  sleep(randomIntBetween(1, 3));
}

// ============================================
// Test Summary
// ============================================

export function handleSummary(data) {
  console.log('');
  console.log('='.repeat(80));
  console.log('  AF-KOMIK V2 - PERFORMANCE TEST SUMMARY');
  console.log('='.repeat(80));
  console.log('');
  
  // Extract key metrics
  const httpReqs = data.metrics.http_reqs;
  const httpReqDuration = data.metrics.http_req_duration;
  const httpReqFailed = data.metrics.http_req_failed;
  const cacheHits = data.metrics.cache_hit_rate;
  const checks = data.metrics.checks;
  
  console.log('📊 Request Statistics:');
  console.log(`  Total Requests: ${httpReqs.values.count}`);
  console.log(`  Requests/sec: ${httpReqs.values.rate.toFixed(2)}`);
  console.log('');
  
  console.log('⏱️  Response Times:');
  console.log(`  Average: ${httpReqDuration.values.avg.toFixed(2)}ms`);
  console.log(`  Median (p50): ${httpReqDuration.values.med.toFixed(2)}ms`);
  console.log(`  95th percentile: ${httpReqDuration.values['p(95)'].toFixed(2)}ms`);
  console.log(`  99th percentile: ${httpReqDuration.values['p(99)'].toFixed(2)}ms`);
  console.log(`  Max: ${httpReqDuration.values.max.toFixed(2)}ms`);
  console.log('');
  
  console.log('✅ Success Rate:');
  console.log(`  Passed Checks: ${(checks.values.rate * 100).toFixed(2)}%`);
  console.log(`  Failed Requests: ${(httpReqFailed.values.rate * 100).toFixed(2)}%`);
  console.log('');
  
  if (cacheHits) {
    console.log('🚀 Cache Performance:');
    console.log(`  Cache Hit Rate: ${(cacheHits.values.rate * 100).toFixed(2)}%`);
    console.log('');
  }
  
  console.log('🎯 Performance Assessment:');
  
  const p95 = httpReqDuration.values['p(95)'];
  const failRate = httpReqFailed.values.rate;
  const checkRate = checks.values.rate;
  
  if (p95 < 500 && failRate < 0.05 && checkRate > 0.95) {
    console.log('  ✅ EXCELLENT - All thresholds met!');
  } else if (p95 < 1000 && failRate < 0.10 && checkRate > 0.90) {
    console.log('  ⚠️  GOOD - Minor performance issues');
  } else {
    console.log('  ❌ NEEDS IMPROVEMENT - Performance issues detected');
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log('');
  
  return {
    'tests/k6/results/summary.json': JSON.stringify(data, null, 2),
    'tests/k6/results/summary.html': htmlReport(data),
  };
}

// ============================================
// Report Generators
// ============================================

function htmlReport(data) {
  const httpReqs = data.metrics.http_reqs;
  const httpReqDuration = data.metrics.http_req_duration;
  const httpReqFailed = data.metrics.http_req_failed;
  const cacheHits = data.metrics.cache_hit_rate;
  const testDate = new Date().toLocaleString();
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AF-Komik V2 - Performance Test Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header {
      background: white;
      padding: 40px;
      border-radius: 15px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    
    .header h1 {
      color: #333;
      font-size: 32px;
      margin-bottom: 10px;
    }
    
    .header .subtitle {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }
    
    .header .info {
      display: flex;
      gap: 30px;
      flex-wrap: wrap;
    }
    
    .header .info-item {
      display: flex;
      flex-direction: column;
    }
    
    .header .info-label {
      font-size: 12px;
      color: #999;
      margin-bottom: 5px;
    }
    
    .header .info-value {
      font-size: 16px;
      color: #333;
      font-weight: 600;
    }
    
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .metric-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }
    
    .metric-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    
    .metric-icon {
      font-size: 32px;
      margin-bottom: 10px;
    }
    
    .metric-title {
      font-size: 13px;
      color: #666;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .metric-value {
      font-size: 36px;
      font-weight: bold;
      color: #333;
      line-height: 1;
    }
    
    .metric-unit {
      font-size: 18px;
      color: #999;
      margin-left: 3px;
    }
    
    .detail-card {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    
    .detail-card h2 {
      color: #333;
      font-size: 24px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #f0f0f0;
    }
    
    .table-responsive {
      overflow-x: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th, td {
      padding: 12px 15px;
      text-align: left;
    }
    
    th {
      background: #f8f9fa;
      color: #333;
      font-weight: 600;
      border-bottom: 2px solid #e9ecef;
    }
    
    tr:hover {
      background: #f8f9fa;
    }
    
    .status-pass {
      color: #10b981;
      font-weight: 600;
    }
    
    .status-warn {
      color: #f59e0b;
      font-weight: 600;
    }
    
    .status-fail {
      color: #ef4444;
      font-weight: 600;
    }
    
    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }
    
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }
    
    .badge-danger {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s;
    }
    
    .footer {
      text-align: center;
      color: white;
      margin-top: 40px;
      padding: 20px;
      font-size: 14px;
    }
    
    @media (max-width: 768px) {
      .metric-grid {
        grid-template-columns: 1fr;
      }
      
      .header .info {
        flex-direction: column;
        gap: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🚀 AF-Komik V2 Performance Test Report</h1>
      <div class="subtitle">Comprehensive Load Testing & Performance Analysis</div>
      <div class="info">
        <div class="info-item">
          <div class="info-label">Test URL</div>
          <div class="info-value">${BASE_URL}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Test Date</div>
          <div class="info-value">${testDate}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Duration</div>
          <div class="info-value">${(data.state.testRunDurationMs / 1000 / 60).toFixed(1)} minutes</div>
        </div>
        <div class="info-item">
          <div class="info-label">Overall Status</div>
          <div class="info-value">
            ${
              httpReqDuration.values['p(95)'] < 500 && httpReqFailed.values.rate < 0.05
                ? '<span class="badge badge-success">✅ Excellent</span>'
                : httpReqDuration.values['p(95)'] < 1000 && httpReqFailed.values.rate < 0.10
                ? '<span class="badge badge-warning">⚠️ Good</span>'
                : '<span class="badge badge-danger">❌ Needs Work</span>'
            }
          </div>
        </div>
      </div>
    </div>
    
    <!-- Key Metrics Grid -->
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-icon">📊</div>
        <div class="metric-title">Total Requests</div>
        <div class="metric-value">${httpReqs.values.count.toLocaleString()}</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-icon">⚡</div>
        <div class="metric-title">Throughput</div>
        <div class="metric-value">
          ${httpReqs.values.rate.toFixed(1)}
          <span class="metric-unit">req/s</span>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-icon">⏱️</div>
        <div class="metric-title">Avg Response Time</div>
        <div class="metric-value ${httpReqDuration.values.avg < 300 ? 'status-pass' : httpReqDuration.values.avg < 600 ? 'status-warn' : 'status-fail'}">
          ${httpReqDuration.values.avg.toFixed(0)}
          <span class="metric-unit">ms</span>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-icon">📈</div>
        <div class="metric-title">95th Percentile</div>
        <div class="metric-value ${httpReqDuration.values['p(95)'] < 500 ? 'status-pass' : httpReqDuration.values['p(95)'] < 1000 ? 'status-warn' : 'status-fail'}">
          ${httpReqDuration.values['p(95)'].toFixed(0)}
          <span class="metric-unit">ms</span>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-icon">🚀</div>
        <div class="metric-title">Cache Hit Rate</div>
        <div class="metric-value ${cacheHits && cacheHits.values.rate > 0.6 ? 'status-pass' : 'status-warn'}">
          ${cacheHits ? (cacheHits.values.rate * 100).toFixed(1) : '0'}
          <span class="metric-unit">%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${cacheHits ? (cacheHits.values.rate * 100) : 0}%"></div>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-icon">❌</div>
        <div class="metric-title">Error Rate</div>
        <div class="metric-value ${httpReqFailed.values.rate < 0.05 ? 'status-pass' : httpReqFailed.values.rate < 0.10 ? 'status-warn' : 'status-fail'}">
          ${(httpReqFailed.values.rate * 100).toFixed(2)}
          <span class="metric-unit">%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(httpReqFailed.values.rate * 100)}%; background: ${httpReqFailed.values.rate < 0.05 ? '#10b981' : httpReqFailed.values.rate < 0.10 ? '#f59e0b' : '#ef4444'}"></div>
        </div>
      </div>
    </div>
    
    <!-- Response Time Distribution -->
    <div class="detail-card">
      <h2>📈 Response Time Distribution</h2>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Percentile</th>
              <th style="text-align: right;">Response Time</th>
              <th style="text-align: right;">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Minimum</td>
              <td style="text-align: right;">${httpReqDuration.values.min.toFixed(2)} ms</td>
              <td style="text-align: right;"><span class="status-pass">✓</span></td>
            </tr>
            <tr>
              <td>Average</td>
              <td style="text-align: right;">${httpReqDuration.values.avg.toFixed(2)} ms</td>
              <td style="text-align: right;">
                <span class="${httpReqDuration.values.avg < 300 ? 'status-pass' : httpReqDuration.values.avg < 600 ? 'status-warn' : 'status-fail'}">
                  ${httpReqDuration.values.avg < 300 ? '✓' : httpReqDuration.values.avg < 600 ? '⚠' : '✗'}
                </span>
              </td>
            </tr>
            <tr>
              <td>Median (p50)</td>
              <td style="text-align: right;">${httpReqDuration.values.med.toFixed(2)} ms</td>
              <td style="text-align: right;">
                <span class="${httpReqDuration.values.med < 250 ? 'status-pass' : httpReqDuration.values.med < 500 ? 'status-warn' : 'status-fail'}">
                  ${httpReqDuration.values.med < 250 ? '✓' : httpReqDuration.values.med < 500 ? '⚠' : '✗'}
                </span>
              </td>
            </tr>
            <tr>
              <td>75th percentile (p75)</td>
              <td style="text-align: right;">${httpReqDuration.values['p(75)'].toFixed(2)} ms</td>
              <td style="text-align: right;">
                <span class="${httpReqDuration.values['p(75)'] < 400 ? 'status-pass' : httpReqDuration.values['p(75)'] < 800 ? 'status-warn' : 'status-fail'}">
                  ${httpReqDuration.values['p(75)'] < 400 ? '✓' : httpReqDuration.values['p(75)'] < 800 ? '⚠' : '✗'}
                </span>
              </td>
            </tr>
            <tr>
              <td>90th percentile (p90)</td>
              <td style="text-align: right;">${httpReqDuration.values['p(90)'].toFixed(2)} ms</td>
              <td style="text-align: right;">
                <span class="${httpReqDuration.values['p(90)'] < 450 ? 'status-pass' : httpReqDuration.values['p(90)'] < 900 ? 'status-warn' : 'status-fail'}">
                  ${httpReqDuration.values['p(90)'] < 450 ? '✓' : httpReqDuration.values['p(90)'] < 900 ? '⚠' : '✗'}
                </span>
              </td>
            </tr>
            <tr style="background: #f8f9fa; font-weight: 600;">
              <td><strong>95th percentile (p95)</strong></td>
              <td style="text-align: right;">${httpReqDuration.values['p(95)'].toFixed(2)} ms</td>
              <td style="text-align: right;">
                <span class="${httpReqDuration.values['p(95)'] < 500 ? 'status-pass' : httpReqDuration.values['p(95)'] < 1000 ? 'status-warn' : 'status-fail'}">
                  ${httpReqDuration.values['p(95)'] < 500 ? '✓ Target' : httpReqDuration.values['p(95)'] < 1000 ? '⚠ Acceptable' : '✗ Exceeded'}
                </span>
              </td>
            </tr>
            <tr style="background: #f8f9fa; font-weight: 600;">
              <td><strong>99th percentile (p99)</strong></td>
              <td style="text-align: right;">${httpReqDuration.values['p(99)'].toFixed(2)} ms</td>
              <td style="text-align: right;">
                <span class="${httpReqDuration.values['p(99)'] < 1000 ? 'status-pass' : httpReqDuration.values['p(99)'] < 2000 ? 'status-warn' : 'status-fail'}">
                  ${httpReqDuration.values['p(99)'] < 1000 ? '✓ Target' : httpReqDuration.values['p(99)'] < 2000 ? '⚠ Acceptable' : '✗ Exceeded'}
                </span>
              </td>
            </tr>
            <tr>
              <td>Maximum</td>
              <td style="text-align: right;">${httpReqDuration.values.max.toFixed(2)} ms</td>
              <td style="text-align: right;">
                <span class="${httpReqDuration.values.max < 2000 ? 'status-pass' : httpReqDuration.values.max < 5000 ? 'status-warn' : 'status-fail'}">
                  ${httpReqDuration.values.max < 2000 ? '✓' : httpReqDuration.values.max < 5000 ? '⚠' : '✗'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Performance Assessment -->
    <div class="detail-card">
      <h2>🎯 Performance Assessment</h2>
      <div style="padding: 20px; background: #f8f9fa; border-radius: 8px;">
        ${
          httpReqDuration.values['p(95)'] < 500 && httpReqFailed.values.rate < 0.05 && (cacheHits?.values.rate || 0) > 0.6
            ? `
              <div style="color: #10b981; font-size: 20px; font-weight: 600; margin-bottom: 15px;">
                ✅ EXCELLENT - Production Ready!
              </div>
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 8px 0; color: #065f46;">✓ Response times are excellent (p95 < 500ms)</li>
                <li style="padding: 8px 0; color: #065f46;">✓ Error rate is minimal (< 5%)</li>
                <li style="padding: 8px 0; color: #065f46;">✓ Cache hit rate is optimal (> 60%)</li>
                <li style="padding: 8px 0; color: #065f46;">✓ System can handle production traffic</li>
              </ul>
            `
            : httpReqDuration.values['p(95)'] < 1000 && httpReqFailed.values.rate < 0.10
            ? `
              <div style="color: #f59e0b; font-size: 20px; font-weight: 600; margin-bottom: 15px;">
                ⚠️ GOOD - Minor Optimization Needed
              </div>
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 8px 0; color: #92400e;">⚠ Response times are acceptable but could be improved</li>
                <li style="padding: 8px 0; color: #92400e;">⚠ Consider optimizing slow endpoints</li>
                <li style="padding: 8px 0; color: #92400e;">⚠ Review cache strategy for better hit rates</li>
                <li style="padding: 8px 0; color: #065f46;">✓ System is stable and functional</li>
              </ul>
            `
            : `
              <div style="color: #ef4444; font-size: 20px; font-weight: 600; margin-bottom: 15px;">
                ❌ NEEDS IMPROVEMENT - Action Required
              </div>
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 8px 0; color: #991b1b;">✗ Response times exceed acceptable thresholds</li>
                <li style="padding: 8px 0; color: #991b1b;">✗ High error rate detected</li>
                <li style="padding: 8px 0; color: #991b1b;">✗ Cache performance needs optimization</li>
                <li style="padding: 8px 0; color: #991b1b;">⚠ Review system architecture and database queries</li>
              </ul>
            `
        }
      </div>
    </div>
    
    <!-- Recommendations -->
    <div class="detail-card">
      <h2>💡 Recommendations</h2>
      <div style="line-height: 1.8; color: #555;">
        ${
          httpReqDuration.values['p(95)'] < 500
            ? '<p><strong>✅ Performance is excellent!</strong> Continue monitoring and maintain current optimization strategies.</p>'
            : '<p><strong>⚠️ Performance optimization needed:</strong></p>'
        }
        <ul style="margin-left: 20px; margin-top: 10px;">
          ${httpReqDuration.values['p(95)'] >= 500 ? '<li>Optimize database queries with proper indexing</li>' : ''}
          ${(cacheHits?.values.rate || 0) < 0.6 ? '<li>Improve cache hit rate by warming cache and adjusting TTL</li>' : ''}
          ${httpReqFailed.values.rate >= 0.05 ? '<li>Investigate and fix sources of errors</li>' : ''}
          ${httpReqs.values.rate < 100 ? '<li>Consider scaling infrastructure for higher throughput</li>' : ''}
          <li>Monitor real-world user experience with APM tools</li>
          <li>Set up alerts for performance degradation</li>
          <li>Run regular load tests before major deployments</li>
        </ul>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      Generated by k6 Performance Testing Tool • AF-Komik V2<br>
      For questions or issues, contact your DevOps team
    </div>
  </div>
</body>
</html>
  `;
}
