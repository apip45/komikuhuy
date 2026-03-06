/**
 * ===========================================
 * AF-Komik V2 - Spike Test
 * ===========================================
 * 
 * Tests system response to sudden traffic spikes.
 * Simulates viral content or marketing campaign scenarios.
 * 
 * Run:
 *   k6 run tests/k6/spike-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://comic.mikan.my.id';

// Custom metrics
const spikeRecovery = new Rate('spike_recovery_rate');
const errorDuringSpike = new Counter('spike_errors');
const normalErrors = new Counter('normal_errors');
const responseTime = new Trend('response_time');
const cacheHitRate = new Rate('cache_hit_rate');

// Spike test configuration
export const options = {
  stages: [
    // Normal load
    { duration: '2m', target: 20 },    // Baseline
    { duration: '1m', target: 20 },    // Stable
    
    // SPIKE 1: Sudden 10x increase
    { duration: '30s', target: 200 },  // Rapid spike!
    { duration: '2m', target: 200 },   // Hold spike
    { duration: '1m', target: 20 },    // Back to normal
    { duration: '1m', target: 20 },    // Recover
    
    // SPIKE 2: Even bigger spike
    { duration: '30s', target: 400 },  // Massive spike!
    { duration: '2m', target: 400 },   // Hold
    { duration: '1m', target: 20 },    // Recovery
    { duration: '1m', target: 20 },    // Stabilize
    
    // SPIKE 3: Extreme spike
    { duration: '20s', target: 600 },  // Extreme!
    { duration: '1m', target: 600 },   // Brief hold
    { duration: '2m', target: 20 },    // Long recovery
  ],
  
  thresholds: {
    // Should survive spikes without complete failure
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'],
    'http_req_failed': ['rate<0.20'],  // Allow higher error rate during spikes
    'spike_recovery_rate': ['rate>0.80'], // 80% should recover
    'checks': ['rate>0.80'],
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
];

let inSpike = false;
let previousLoad = 20;

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function checkResponse(response, testName) {
  const duration = response.timings.duration;
  responseTime.add(duration);
  
  const checks = check(response, {
    [`${testName}: not 5xx`]: (r) => r.status < 500,
    [`${testName}: response received`]: (r) => r.body !== null,
  });
  
  // Track errors separately for spike vs normal
  if (!checks) {
    if (inSpike) {
      errorDuringSpike.add(1);
    } else {
      normalErrors.add(1);
    }
  }
  
  // Track recovery rate (success after spike)
  if (!inSpike && checks) {
    spikeRecovery.add(1);
  } else if (!inSpike && !checks) {
    spikeRecovery.add(0);
  }
  
  // Track cache
  try {
    if (response.body && (response.body.includes('fromCache') || response.body.includes('cached'))) {
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
  // Detect if we're in a spike
  const currentVUs = __VU;
  if (currentVUs > 100) {
    inSpike = true;
  } else {
    inSpike = false;
  }
  
  // Spike scenario - focus on most popular endpoints
  const scenario = Math.random();
  
  if (scenario < 0.35) {
    // Viral comic scenario
    group('Viral Comic', () => {
      // Everyone rushes to read the same popular comic
      const viralComic = 'one-piece'; // Simulating viral content
      
      const res = http.get(`${BASE_URL}/comics/${viralComic}`);
      checkResponse(res, 'Viral Detail');
      sleep(0.5);
      
      // Many read the latest chapter
      const latestChapter = randomIntBetween(1000, 1100);
      const chapRes = http.get(`${BASE_URL}/comics/${viralComic}/chapter-${latestChapter}`);
      checkResponse(chapRes, 'Viral Chapter');
      sleep(1);
    });
    
  } else if (scenario < 0.60) {
    // Homepage traffic spike (marketing campaign)
    group('Marketing Spike', () => {
      const res = http.get(`${BASE_URL}/`);
      checkResponse(res, 'Homepage');
      sleep(0.5);
      
      // Quick browse
      const listRes = http.get(`${BASE_URL}/comics?page=1&limit=20`);
      checkResponse(listRes, 'List');
      sleep(0.5);
    });
    
  } else if (scenario < 0.80) {
    // API spike (mobile app notification)
    group('App Notification Spike', () => {
      const res = http.get(`${BASE_URL}/api/comics?page=1&limit=20`, {
        headers: { 'Accept': 'application/json' },
      });
      checkResponse(res, 'API List');
      sleep(0.3);
      
      // Check for updates
      const comic = randomChoice(SAMPLE_COMICS);
      const detailRes = http.get(`${BASE_URL}/api/comics/${comic}`, {
        headers: { 'Accept': 'application/json' },
      });
      checkResponse(detailRes, 'API Detail');
      sleep(0.5);
    });
    
  } else {
    // Search spike (trending topic)
    group('Search Spike', () => {
      const trendingKeyword = 'new'; // Everyone searching for new releases
      const res = http.get(`${BASE_URL}/comics?keyword=${encodeURIComponent(trendingKeyword)}`);
      checkResponse(res, 'Search');
      sleep(0.5);
    });
  }
  
  // Very short sleep during spike, longer during normal
  if (inSpike) {
    sleep(randomIntBetween(0, 1));
  } else {
    sleep(randomIntBetween(1, 3));
  }
}

export function handleSummary(data) {
  const httpReqs = data.metrics.http_reqs;
  const httpReqDuration = data.metrics.http_req_duration;
  const httpReqFailed = data.metrics.http_req_failed;
  const spikeRecov = data.metrics.spike_recovery_rate;
  const spikeErrs = data.metrics.spike_errors;
  const normalErrs = data.metrics.normal_errors;
  const cacheHits = data.metrics.cache_hit_rate;
  const checks = data.metrics.checks;
  
  console.log('');
  console.log('='.repeat(80));
  console.log('  SPIKE TEST RESULTS - SUDDEN TRAFFIC SURGE ANALYSIS');
  console.log('='.repeat(80));
  console.log('');
  
  console.log('⚡ Traffic Pattern:');
  console.log('  • Baseline: 20 users');
  console.log('  • Spike 1: 200 users (10x increase)');
  console.log('  • Spike 2: 400 users (20x increase)');
  console.log('  • Spike 3: 600 users (30x increase)');
  console.log('');
  
  console.log('📊 Overall Statistics:');
  console.log(`  Total Requests: ${httpReqs.values.count.toLocaleString()}`);
  console.log(`  Peak Throughput: ${httpReqs.values.rate.toFixed(2)} req/s`);
  console.log(`  Test Duration: ${(data.state.testRunDurationMs / 1000 / 60).toFixed(1)} minutes`);
  console.log('');
  
  console.log('⏱️  Response Times During Spikes:');
  console.log(`  Average: ${httpReqDuration.values.avg.toFixed(2)}ms`);
  console.log(`  Median: ${httpReqDuration.values.med.toFixed(2)}ms`);
  console.log(`  95th percentile: ${httpReqDuration.values['p(95)'].toFixed(2)}ms`);
  console.log(`  99th percentile: ${httpReqDuration.values['p(99)'].toFixed(2)}ms`);
  console.log(`  Maximum: ${httpReqDuration.values.max.toFixed(2)}ms`);
  console.log('');
  
  console.log('❌ Error Analysis:');
  console.log(`  Overall Error Rate: ${(httpReqFailed.values.rate * 100).toFixed(2)}%`);
  console.log(`  Errors During Spike: ${spikeErrs.values.count}`);
  console.log(`  Errors During Normal: ${normalErrs.values.count}`);
  console.log(`  Check Success Rate: ${(checks.values.rate * 100).toFixed(2)}%`);
  console.log('');
  
  if (spikeRecov) {
    console.log('🔄 Recovery Performance:');
    console.log(`  Recovery Success Rate: ${(spikeRecov.values.rate * 100).toFixed(2)}%`);
    
    if (spikeRecov.values.rate > 0.90) {
      console.log('  ✅ Excellent recovery - system bounces back quickly');
    } else if (spikeRecov.values.rate > 0.80) {
      console.log('  ⚠️  Good recovery - some lingering issues');
    } else {
      console.log('  ❌ Poor recovery - system struggles to stabilize');
    }
    console.log('');
  }
  
  if (cacheHits) {
    console.log('🚀 Cache Performance During Spikes:');
    console.log(`  Cache Hit Rate: ${(cacheHits.values.rate * 100).toFixed(2)}%`);
    
    if (cacheHits.values.rate > 0.70) {
      console.log('  ✅ Cache effectively handles traffic spikes');
    } else if (cacheHits.values.rate > 0.50) {
      console.log('  ⚠️  Cache helps but could be optimized');
    } else {
      console.log('  ❌ Cache overwhelmed during spikes');
    }
    console.log('');
  }
  
  console.log('🎯 Spike Resistance Assessment:');
  console.log('');
  
  const p95 = httpReqDuration.values['p(95)'];
  const failRate = httpReqFailed.values.rate;
  const recovRate = spikeRecov?.values.rate || 0;
  
  if (p95 < 2000 && failRate < 0.10 && recovRate > 0.90) {
    console.log('  ✅ EXCELLENT SPIKE RESISTANCE');
    console.log('  • System handles sudden traffic surges gracefully');
    console.log('  • Quick recovery to normal performance');
    console.log('  • Minimal errors during peak load');
    console.log('  • Ready for viral content scenarios');
    
  } else if (p95 < 3000 && failRate < 0.20 && recovRate > 0.80) {
    console.log('  ⚠️  GOOD SPIKE RESISTANCE');
    console.log('  • System survives traffic spikes');
    console.log('  • Moderate performance degradation');
    console.log('  • Recovery takes some time');
    console.log('  • Consider auto-scaling for better handling');
    
  } else {
    console.log('  ❌ POOR SPIKE RESISTANCE');
    console.log('  • System struggles with sudden traffic increases');
    console.log('  • High error rates during spikes');
    console.log('  • Slow or incomplete recovery');
    console.log('  • Critical: Implement protective measures');
  }
  
  console.log('');
  console.log('💡 Recommendations:');
  console.log('');
  
  if (failRate > 0.10) {
    console.log('  Traffic Management:');
    console.log('  • Implement rate limiting to protect backend');
    console.log('  • Add queue system for request throttling');
    console.log('  • Use CDN for static content');
    console.log('  • Consider CloudFlare or similar DDoS protection');
    console.log('');
  }
  
  if (p95 > 2000) {
    console.log('  Performance Optimization:');
    console.log('  • Increase cache TTL for popular content');
    console.log('  • Implement cache warming for viral content');
    console.log('  • Pre-generate popular pages');
    console.log('  • Optimize database connection pooling');
    console.log('');
  }
  
  if (recovRate < 0.85) {
    console.log('  Recovery & Resilience:');
    console.log('  • Implement circuit breakers');
    console.log('  • Add graceful degradation for non-critical features');
    console.log('  • Use connection pooling with proper limits');
    console.log('  • Monitor and auto-restart unhealthy instances');
    console.log('');
  }
  
  console.log('  Scaling Strategy:');
  console.log('  • Configure auto-scaling based on traffic patterns');
  console.log('  • Set up load balancer health checks');
  console.log('  • Implement horizontal pod autoscaling (HPA)');
  console.log('  • Use Redis cluster for cache distribution');
  console.log('');
  
  console.log('  Monitoring & Alerts:');
  console.log('  • Set up alerts for sudden traffic increases');
  console.log('  • Monitor response time during peak hours');
  console.log('  • Track error rate spikes in real-time');
  console.log('  • Configure PagerDuty/Slack notifications');
  
  console.log('');
  console.log('='.repeat(80));
  console.log('');
  
  return {
    'tests/k6/results/spike-test.json': JSON.stringify(data, null, 2),
  };
}
