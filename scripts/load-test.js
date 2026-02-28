/**
 * Load Testing Script for KomikuHuy API
 * 
 * Install k6:
 *   macOS: brew install k6
 *   Linux: sudo apt install k6
 *   Windows: choco install k6
 * 
 * Run:
 *   k6 run scripts/load-test.js
 *   k6 run --vus 50 --duration 30s scripts/load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const cacheHitRate = new Rate('cache_hit_rate');
const responseTime = new Trend('response_time');
const errors = new Counter('errors');

// Test configuration
export const options = {
    stages: [
        { duration: '30s', target: 20 },   // Ramp up to 20 users
        { duration: '1m', target: 50 },    // Ramp up to 50 users
        { duration: '2m', target: 100 },   // Ramp up to 100 users
        { duration: '2m', target: 100 },   // Stay at 100 users
        { duration: '30s', target: 50 },   // Ramp down to 50
        { duration: '30s', target: 0 },    // Ramp down to 0
    ],
    
    thresholds: {
        // 95% of requests should be below 500ms
        'http_req_duration': ['p(95)<500', 'p(99)<1000'],
        
        // Error rate should be below 5%
        'http_req_failed': ['rate<0.05'],
        
        // Cache hit rate should be above 60%
        'cache_hit_rate': ['rate>0.6'],
        
        // Request rate
        'http_reqs': ['rate>100'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test scenarios
export default function() {
    group('Homepage - List Komik', () => {
        testListKomik();
    });

    sleep(1);

    group('Detail Page - Komik Detail', () => {
        testKomikDetail();
    });

    sleep(1);

    group('Reader - Chapter Page', () => {
        testChapterRead();
    });

    sleep(2);

    group('Trending - Popular Komik', () => {
        testTrending();
    });

    sleep(1);
}

function testListKomik() {
    const page = Math.floor(Math.random() * 10) + 1; // Random page 1-10
    const url = `${BASE_URL}/api/komik?page=${page}&limit=20`;
    
    const response = http.get(url);
    
    const checkResult = check(response, {
        'list: status is 200': (r) => r.status === 200,
        'list: response time < 500ms': (r) => r.timings.duration < 500,
        'list: has data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.data && body.data.length > 0;
            } catch {
                return false;
            }
        },
    });

    if (!checkResult) errors.add(1);

    // Track cache hit
    try {
        const body = JSON.parse(response.body);
        if (body.cached) {
            cacheHitRate.add(1);
        } else {
            cacheHitRate.add(0);
        }
    } catch {
        // Ignore parse errors
    }

    responseTime.add(response.timings.duration);
}

function testKomikDetail() {
    // Test with random komik IDs (simulate real traffic)
    const komikIds = [
        '507f1f77bcf86cd799439011',
        '507f191e810c19729de860ea',
        '507f1f77bcf86cd799439012',
        '507f191e810c19729de860eb',
    ];
    
    const komikId = komikIds[Math.floor(Math.random() * komikIds.length)];
    const url = `${BASE_URL}/api/komik/${komikId}?chapterLimit=50`;
    
    const response = http.get(url);
    
    const checkResult = check(response, {
        'detail: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
        'detail: response time < 1000ms': (r) => r.timings.duration < 1000,
        'detail: has valid response': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success !== undefined;
            } catch {
                return false;
            }
        },
    });

    if (!checkResult && response.status !== 404) {
        errors.add(1);
    }

    // Track cache hit
    if (response.status === 200) {
        try {
            const body = JSON.parse(response.body);
            if (body.cached || body.data?.fromCache) {
                cacheHitRate.add(1);
            } else {
                cacheHitRate.add(0);
            }
        } catch {
            // Ignore
        }
    }

    responseTime.add(response.timings.duration);
}

function testChapterRead() {
    const komikId = '507f1f77bcf86cd799439011';
    const chapterNumber = Math.floor(Math.random() * 100) + 1; // Random chapter 1-100
    const url = `${BASE_URL}/api/komik/${komikId}/chapter/${chapterNumber}`;
    
    const response = http.get(url);
    
    const checkResult = check(response, {
        'chapter: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
        'chapter: response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    if (!checkResult && response.status !== 404) {
        errors.add(1);
    }

    // Track cache hit for chapters
    if (response.status === 200) {
        try {
            const body = JSON.parse(response.body);
            if (body.data?.fromCache) {
                cacheHitRate.add(1);
            } else {
                cacheHitRate.add(0);
            }
        } catch {
            // Ignore
        }
    }

    responseTime.add(response.timings.duration);
}

function testTrending() {
    const url = `${BASE_URL}/api/komik/trending/popular?limit=20`;
    
    const response = http.get(url);
    
    const checkResult = check(response, {
        'trending: status is 200': (r) => r.status === 200,
        'trending: response time < 300ms': (r) => r.timings.duration < 300,
        'trending: has data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.data && body.data.length > 0;
            } catch {
                return false;
            }
        },
    });

    if (!checkResult) errors.add(1);

    responseTime.add(response.timings.duration);
}

// Handle test summary
export function handleSummary(data) {
    return {
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
        'load-test-results.json': JSON.stringify(data),
    };
}

function textSummary(data, { indent = '', enableColors = false } = {}) {
    const summary = `
${indent}╔════════════════════════════════════════════════════╗
${indent}║         Load Test Summary                          ║
${indent}╚════════════════════════════════════════════════════╝

${indent}Test Duration: ${data.state.testRunDurationMs / 1000}s

${indent}📊 HTTP Metrics:
${indent}  Total Requests:  ${data.metrics.http_reqs.values.count}
${indent}  Request Rate:    ${data.metrics.http_reqs.values.rate.toFixed(2)}/s
${indent}  Failed Requests: ${data.metrics.http_req_failed.values.passes} (${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%)

${indent}⏱️  Response Times:
${indent}  Min:     ${data.metrics.http_req_duration.values.min.toFixed(2)}ms
${indent}  Avg:     ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
${indent}  Med:     ${data.metrics.http_req_duration.values.med.toFixed(2)}ms
${indent}  P95:     ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}  P99:     ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
${indent}  Max:     ${data.metrics.http_req_duration.values.max.toFixed(2)}ms

${indent}🎯 Cache Performance:
${indent}  Hit Rate: ${(data.metrics.cache_hit_rate?.values.rate * 100 || 0).toFixed(2)}%

${indent}👥 Virtual Users:
${indent}  Min: ${data.metrics.vus.values.min}
${indent}  Max: ${data.metrics.vus.values.max}

${indent}${getPassFailIndicator(data)}
    `;
    
    return summary;
}

function getPassFailIndicator(data) {
    const p95 = data.metrics.http_req_duration.values['p(95)'];
    const errorRate = data.metrics.http_req_failed.values.rate;
    const cacheHit = data.metrics.cache_hit_rate?.values.rate || 0;
    
    const passed = p95 < 500 && errorRate < 0.05 && cacheHit > 0.6;
    
    if (passed) {
        return '✅ TEST PASSED - All thresholds met!';
    } else {
        let issues = [];
        if (p95 >= 500) issues.push(`P95 too high (${p95.toFixed(0)}ms)`);
        if (errorRate >= 0.05) issues.push(`Error rate too high (${(errorRate * 100).toFixed(2)}%)`);
        if (cacheHit <= 0.6) issues.push(`Cache hit rate too low (${(cacheHit * 100).toFixed(2)}%)`);
        
        return `❌ TEST FAILED\nIssues: ${issues.join(', ')}`;
    }
}
