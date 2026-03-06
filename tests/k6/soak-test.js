/**
 * ===========================================
 * AF-Komik V2 - Soak Test (Endurance Test)
 * ===========================================
 * 
 * Long-duration test to find memory leaks and stability issues.
 * Runs at moderate load for extended period.
 * 
 * Run:
 *   k6 run tests/k6/soak-test.js
 * 
 * WARNING: This test runs for 4 HOURS!
 * For shorter test, use:
 *   k6 run -e DURATION=30m tests/k6/soak-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://comic.mikan.my.id';
const DURATION = __ENV.DURATION || '4h'; // Default 4 hours

// Custom metrics
const memoryLeakIndicator = new Trend('memory_leak_indicator');
const responseTimeGrowth = new Trend('response_time_growth');
const errorRate = new Counter('errors');
const cacheHitRate = new Rate('cache_hit_rate');
const consecutiveErrors = new Counter('consecutive_errors');

// Soak test configuration
export const options = {
  stages: [
    { duration: '5m', target: 50 },      // Warm up
    { duration: DURATION, target: 50 },  // Sustained load
    { duration: '5m', target: 0 },       // Cool down
  ],
  
  thresholds: {
    // Response time should not degrade over time
    'http_req_duration': ['p(95)<800', 'p(99)<1500'],
    'response_time_growth': ['p(99)<2000'], // Should not grow significantly
    
    // Error rate should stay low throughout
    'http_req_failed': ['rate<0.05'],
    'errors': ['count<100'],
    'consecutive_errors': ['count<10'],
    
    // Cache should remain effective
    'cache_hit_rate': ['rate>0.50'],
    
    // System stability
    'checks': ['rate>0.95'],
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
  'death-note',
  'fullmetal-alchemist',
];

const SEARCH_KEYWORDS = [
  'one', 'hero', 'world', 'demon', 'magic', 'battle', 'adventure', 'fantasy',
];

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance', 'Sci-Fi',
];

// Tracking variables
let startTime = Date.now();
let lastConsecutiveErrors = 0;
let baselineResponseTime = null;

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function checkResponse(response, testName) {
  const duration = response.timings.duration;
  
  // Record baseline response time
  if (!baselineResponseTime && duration < 2000) {
    baselineResponseTime = duration;
  }
  
  // Track response time growth (potential memory leak indicator)
  if (baselineResponseTime) {
    const growth = duration - baselineResponseTime;
    responseTimeGrowth.add(growth);
    
    // Memory leak indicator: response time consistently growing
    if (growth > baselineResponseTime * 2) {
      memoryLeakIndicator.add(1);
    } else {
      memoryLeakIndicator.add(0);
    }
  }
  
  const checks = check(response, {
    [`${testName}: status OK`]: (r) => r.status === 200 || r.status === 404,
    [`${testName}: response time acceptable`]: (r) => r.timings.duration < 3000,
    [`${testName}: has body`]: (r) => r.body && r.body.length > 0,
  });
  
  // Track consecutive errors
  if (!checks) {
    errorRate.add(1);
    lastConsecutiveErrors++;
    if (lastConsecutiveErrors > 5) {
      consecutiveErrors.add(1);
    }
  } else {
    lastConsecutiveErrors = 0;
  }
  
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
  // Realistic user journey for soak testing
  
  const journey = Math.random();
  
  if (journey < 0.20) {
    // Journey 1: Browse and discover
    group('Browse Journey', () => {
      // Homepage
      let res = http.get(`${BASE_URL}/`);
      checkResponse(res, 'Homepage');
      sleep(randomIntBetween(2, 4));
      
      // Browse list
      const page = randomIntBetween(1, 20);
      res = http.get(`${BASE_URL}/comics?page=${page}&limit=20`);
      checkResponse(res, 'List');
      sleep(randomIntBetween(2, 5));
      
      // View detail
      const comic = randomChoice(SAMPLE_COMICS);
      res = http.get(`${BASE_URL}/comics/${comic}`);
      checkResponse(res, 'Detail');
      sleep(randomIntBetween(3, 6));
    });
    
  } else if (journey < 0.50) {
    // Journey 2: Search and read
    group('Search Journey', () => {
      // Search
      const keyword = randomChoice(SEARCH_KEYWORDS);
      let res = http.get(`${BASE_URL}/comics?keyword=${encodeURIComponent(keyword)}`);
      checkResponse(res, 'Search');
      sleep(randomIntBetween(2, 4));
      
      // View detail
      const comic = randomChoice(SAMPLE_COMICS);
      res = http.get(`${BASE_URL}/comics/${comic}`);
      checkResponse(res, 'Detail');
      sleep(randomIntBetween(2, 5));
      
      // Read chapter
      const chapter = randomIntBetween(1, 50);
      res = http.get(`${BASE_URL}/comics/${comic}/chapter-${chapter}`);
      checkResponse(res, 'Chapter');
      sleep(randomIntBetween(5, 10)); // Reading time
    });
    
  } else if (journey < 0.70) {
    // Journey 3: Genre browsing
    group('Genre Journey', () => {
      // Filter by genre
      const genre = randomChoice(GENRES);
      let res = http.get(`${BASE_URL}/comics?genre=${encodeURIComponent(genre)}&page=1`);
      checkResponse(res, 'Genre Filter');
      sleep(randomIntBetween(2, 4));
      
      // View multiple comics
      for (let i = 0; i < randomIntBetween(2, 4); i++) {
        const comic = randomChoice(SAMPLE_COMICS);
        res = http.get(`${BASE_URL}/comics/${comic}`);
        checkResponse(res, 'Detail');
        sleep(randomIntBetween(2, 4));
      }
    });
    
  } else if (journey < 0.90) {
    // Journey 4: Binge reading
    group('Binge Reading Journey', () => {
      const comic = randomChoice(SAMPLE_COMICS);
      
      // View comic detail
      let res = http.get(`${BASE_URL}/comics/${comic}`);
      checkResponse(res, 'Detail');
      sleep(randomIntBetween(2, 4));
      
      // Read multiple chapters
      for (let i = 0; i < randomIntBetween(3, 6); i++) {
        const chapter = randomIntBetween(1, 100);
        res = http.get(`${BASE_URL}/comics/${comic}/chapter-${chapter}`);
        checkResponse(res, 'Chapter');
        sleep(randomIntBetween(5, 12)); // Reading time
        
        // Next chapter
        res = http.get(`${BASE_URL}/comics/${comic}/chapter-${chapter + 1}`);
        checkResponse(res, 'Next Chapter');
        sleep(randomIntBetween(5, 12));
      }
    });
    
  } else {
    // Journey 5: API usage (mobile app)
    group('API Journey', () => {
      // List comics
      let res = http.get(`${BASE_URL}/api/comics?page=${randomIntBetween(1, 10)}&limit=20`, {
        headers: { 'Accept': 'application/json' },
      });
      checkResponse(res, 'API List');
      sleep(randomIntBetween(1, 3));
      
      // Get detail
      const comic = randomChoice(SAMPLE_COMICS);
      res = http.get(`${BASE_URL}/api/comics/${comic}`, {
        headers: { 'Accept': 'application/json' },
      });
      checkResponse(res, 'API Detail');
      sleep(randomIntBetween(1, 3));
      
      // Get chapter
      const chapter = randomIntBetween(1, 50);
      res = http.get(`${BASE_URL}/api/comics/${comic}/chapters/chapter-${chapter}`, {
        headers: { 'Accept': 'application/json' },
      });
      checkResponse(res, 'API Chapter');
      sleep(randomIntBetween(3, 8));
    });
  }
  
  // Random think time between journeys
  sleep(randomIntBetween(2, 5));
}

export function handleSummary(data) {
  const httpReqs = data.metrics.http_reqs;
  const httpReqDuration = data.metrics.http_req_duration;
  const httpReqFailed = data.metrics.http_req_failed;
  const errors = data.metrics.errors;
  const cacheHits = data.metrics.cache_hit_rate;
  const checks = data.metrics.checks;
  const rtGrowth = data.metrics.response_time_growth;
  const memLeak = data.metrics.memory_leak_indicator;
  const consecErrors = data.metrics.consecutive_errors;
  
  console.log('');
  console.log('='.repeat(80));
  console.log('  SOAK TEST RESULTS - ENDURANCE & STABILITY ANALYSIS');
  console.log('='.repeat(80));
  console.log('');
  
  console.log('⏱️  Test Duration:');
  console.log(`  Total Runtime: ${(data.state.testRunDurationMs / 1000 / 60 / 60).toFixed(2)} hours`);
  console.log(`  Total Requests: ${httpReqs.values.count.toLocaleString()}`);
  console.log(`  Average Throughput: ${httpReqs.values.rate.toFixed(2)} req/s`);
  console.log('');
  
  console.log('📊 Response Time Stability:');
  console.log(`  Average: ${httpReqDuration.values.avg.toFixed(2)}ms`);
  console.log(`  Median: ${httpReqDuration.values.med.toFixed(2)}ms`);
  console.log(`  95th percentile: ${httpReqDuration.values['p(95)'].toFixed(2)}ms`);
  console.log(`  99th percentile: ${httpReqDuration.values['p(99)'].toFixed(2)}ms`);
  console.log('');
  
  if (rtGrowth) {
    console.log('📈 Response Time Growth Analysis:');
    console.log(`  Average Growth: ${rtGrowth.values.avg.toFixed(2)}ms`);
    console.log(`  Max Growth: ${rtGrowth.values.max.toFixed(2)}ms`);
    
    if (rtGrowth.values.avg > 200) {
      console.log('  ⚠️  WARNING: Significant response time degradation detected!');
      console.log('  Possible memory leak or resource exhaustion');
    } else if (rtGrowth.values.avg > 100) {
      console.log('  ⚠️  Moderate response time growth detected');
    } else {
      console.log('  ✅ Response times remain stable over time');
    }
    console.log('');
  }
  
  console.log('🔍 Error Analysis:');
  console.log(`  Error Rate: ${(httpReqFailed.values.rate * 100).toFixed(2)}%`);
  console.log(`  Total Errors: ${errors.values.count}`);
  console.log(`  Consecutive Error Spikes: ${consecErrors.values.count}`);
  console.log(`  Check Success Rate: ${(checks.values.rate * 100).toFixed(2)}%`);
  console.log('');
  
  if (cacheHits) {
    console.log('🚀 Cache Performance:');
    console.log(`  Cache Hit Rate: ${(cacheHits.values.rate * 100).toFixed(2)}%`);
    
    if (cacheHits.values.rate < 0.4) {
      console.log('  ⚠️  Cache hit rate declining over time');
      console.log('  Check cache eviction policy and memory');
    } else {
      console.log('  ✅ Cache remains effective throughout test');
    }
    console.log('');
  }
  
  console.log('🎯 Stability Assessment:');
  console.log('');
  
  const p95 = httpReqDuration.values['p(95)'];
  const failRate = httpReqFailed.values.rate;
  const rtGrowthAvg = rtGrowth?.values.avg || 0;
  
  if (p95 < 800 && failRate < 0.05 && rtGrowthAvg < 100) {
    console.log('  ✅ EXCELLENT STABILITY');
    console.log('  • Response times remain consistent');
    console.log('  • Error rate stays minimal');
    console.log('  • No signs of memory leaks');
    console.log('  • System ready for extended production use');
    
  } else if (p95 < 1200 && failRate < 0.10 && rtGrowthAvg < 200) {
    console.log('  ⚠️  GOOD STABILITY WITH MINOR CONCERNS');
    console.log('  • System remains functional over time');
    console.log('  • Minor performance degradation observed');
    console.log('  • Monitor for long-term trends');
    
  } else {
    console.log('  ❌ STABILITY ISSUES DETECTED');
    console.log('  • Significant performance degradation');
    console.log('  • Rising error rates over time');
    console.log('  • Possible memory leaks or resource leaks');
    console.log('  • Investigation required before production');
  }
  
  console.log('');
  console.log('💡 Recommendations:');
  console.log('');
  
  if (rtGrowthAvg > 100) {
    console.log('  Memory & Resource Management:');
    console.log('  • Check for memory leaks in application code');
    console.log('  • Review database connection pooling');
    console.log('  • Monitor Redis memory usage');
    console.log('  • Implement proper resource cleanup');
    console.log('');
  }
  
  if (failRate > 0.05) {
    console.log('  Error Handling:');
    console.log('  • Review error logs for patterns');
    console.log('  • Implement circuit breakers');
    console.log('  • Add retry logic for transient failures');
    console.log('  • Monitor database deadlocks');
    console.log('');
  }
  
  if (cacheHits && cacheHits.values.rate < 0.5) {
    console.log('  Cache Optimization:');
    console.log('  • Review cache eviction policy');
    console.log('  • Increase Redis memory allocation');
    console.log('  • Optimize cache key strategy');
    console.log('  • Implement cache warming on startup');
    console.log('');
  }
  
  console.log('  Monitoring:');
  console.log('  • Set up APM (Application Performance Monitoring)');
  console.log('  • Enable memory profiling in production');
  console.log('  • Configure alerts for error rate spikes');
  console.log('  • Schedule regular soak tests (monthly)');
  
  console.log('');
  console.log('='.repeat(80));
  console.log('');
  
  return {
    'tests/k6/results/soak-test.json': JSON.stringify(data, null, 2),
  };
}
