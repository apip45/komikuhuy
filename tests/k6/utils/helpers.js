/**
 * ===========================================
 * K6 Test Helpers & Utilities
 * ===========================================
 * 
 * Reusable helper functions for k6 tests.
 */

import { check } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

/**
 * Get random element from array
 */
export function randomChoice(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get multiple random elements from array
 */
export function randomChoices(arr, count) {
  if (!arr || arr.length === 0) return [];
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

/**
 * Random boolean with probability
 * @param {number} probability - Value between 0 and 1
 */
export function randomBool(probability = 0.5) {
  return Math.random() < probability;
}

/**
 * Random sleep with range
 */
export function randomSleep(minSeconds, maxSeconds) {
  const seconds = Math.random() * (maxSeconds - minSeconds) + minSeconds;
  return seconds;
}

/**
 * Check response and return detailed results
 */
export function checkResponse(response, testName, options = {}) {
  const {
    expectedStatus = 200,
    maxDuration = 2000,
    checkBody = true,
    checkHeaders = false,
  } = options;
  
  const checks = {
    [`${testName}: status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${testName}: response time < ${maxDuration}ms`]: (r) => r.timings.duration < maxDuration,
  };
  
  if (checkBody) {
    checks[`${testName}: has body`] = (r) => r.body && r.body.length > 0;
  }
  
  if (checkHeaders) {
    checks[`${testName}: has content-type`] = (r) => r.headers['Content-Type'] !== undefined;
  }
  
  const result = check(response, checks);
  
  return {
    passed: result,
    status: response.status,
    duration: response.timings.duration,
    size: response.body ? response.body.length : 0,
  };
}

/**
 * Check API response (JSON)
 */
export function checkAPIResponse(response, testName, options = {}) {
  const {
    expectedStatus = 200,
    maxDuration = 1000,
    checkData = true,
  } = options;
  
  const checks = {
    [`${testName}: status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${testName}: is JSON`]: (r) => r.headers['Content-Type']?.includes('application/json'),
    [`${testName}: response time < ${maxDuration}ms`]: (r) => r.timings.duration < maxDuration,
  };
  
  if (checkData) {
    checks[`${testName}: has data`] = (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'success' && body.data !== undefined;
      } catch {
        return false;
      }
    };
  }
  
  const result = check(response, checks);
  
  let parsedBody = null;
  try {
    parsedBody = JSON.parse(response.body);
  } catch (e) {
    // Ignore JSON parse errors
  }
  
  return {
    passed: result,
    status: response.status,
    duration: response.timings.duration,
    body: parsedBody,
    fromCache: parsedBody?.fromCache || false,
  };
}

/**
 * Check if response is cached
 */
export function isCached(response) {
  try {
    const body = response.body;
    
    // Check JSON response
    if (response.headers['Content-Type']?.includes('application/json')) {
      const json = JSON.parse(body);
      return json.fromCache === true || json.cached === true;
    }
    
    // Check HTML response
    if (typeof body === 'string') {
      return body.includes('fromCache') || body.includes('cached');
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Extract data from API response
 */
export function extractAPIData(response) {
  try {
    const body = JSON.parse(response.body);
    return {
      success: body.status === 'success',
      data: body.data,
      message: body.message,
      error: body.error,
      fromCache: body.fromCache || false,
      timestamp: body.timestamp,
    };
  } catch (e) {
    return {
      success: false,
      error: 'Failed to parse JSON',
    };
  }
}

/**
 * Build URL with query parameters
 */
export function buildURL(baseUrl, path, params = {}) {
  const url = new URL(path, baseUrl);
  
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined) {
      url.searchParams.append(key, params[key]);
    }
  });
  
  return url.toString();
}

/**
 * Generate pagination parameters
 */
export function getRandomPagination(maxPage = 100, defaultLimit = 20) {
  return {
    page: randomIntBetween(1, maxPage),
    limit: defaultLimit,
  };
}

/**
 * Measure response time percentile
 */
export function measurePercentile(durations, percentile) {
  const sorted = [...durations].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate success rate
 */
export function calculateSuccessRate(total, failed) {
  if (total === 0) return 0;
  return ((total - failed) / total) * 100;
}

/**
 * Format duration to human readable
 */
export function formatDuration(milliseconds) {
  if (milliseconds < 1000) {
    return `${milliseconds.toFixed(2)}ms`;
  }
  
  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }
  
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(2)}m`;
  }
  
  const hours = minutes / 60;
  return `${hours.toFixed(2)}h`;
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

/**
 * Generate realistic user think time
 * Simulates human reading/browsing behavior
 */
export function userThinkTime(scenario = 'normal') {
  const thinkTimes = {
    fast: [0.5, 2],      // Quick browsing
    normal: [2, 5],      // Normal browsing
    slow: [5, 10],       // Careful reading
    reading: [10, 30],   // Reading content
  };
  
  const [min, max] = thinkTimes[scenario] || thinkTimes.normal;
  return randomIntBetween(min, max);
}

/**
 * Retry logic for failed requests
 */
export function retry(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        // Wait before retry
        const waitTime = delay * Math.pow(2, i); // Exponential backoff
        // Note: k6 doesn't support sleep in this context, 
        // this is more for documentation
      }
    }
  }
  
  throw lastError;
}

/**
 * Check if response indicates rate limiting
 */
export function isRateLimited(response) {
  return response.status === 429 || 
         response.status === 503 ||
         response.body?.includes('rate limit') ||
         response.body?.includes('too many requests');
}

/**
 * Check if response indicates server error
 */
export function isServerError(response) {
  return response.status >= 500 && response.status < 600;
}

/**
 * Check if response indicates client error
 */
export function isClientError(response) {
  return response.status >= 400 && response.status < 500;
}

/**
 * Generate test summary statistics
 */
export function generateStats(data) {
  const httpReqs = data.metrics.http_reqs;
  const httpReqDuration = data.metrics.http_req_duration;
  const httpReqFailed = data.metrics.http_req_failed;
  const checks = data.metrics.checks;
  
  return {
    requests: {
      total: httpReqs.values.count,
      rate: httpReqs.values.rate.toFixed(2),
    },
    duration: {
      avg: httpReqDuration.values.avg.toFixed(2),
      min: httpReqDuration.values.min.toFixed(2),
      max: httpReqDuration.values.max.toFixed(2),
      med: httpReqDuration.values.med.toFixed(2),
      p90: httpReqDuration.values['p(90)'].toFixed(2),
      p95: httpReqDuration.values['p(95)'].toFixed(2),
      p99: httpReqDuration.values['p(99)'].toFixed(2),
    },
    errors: {
      rate: (httpReqFailed.values.rate * 100).toFixed(2),
      count: httpReqFailed.values.count,
    },
    checks: {
      rate: (checks.values.rate * 100).toFixed(2),
      passed: checks.values.passes,
      failed: checks.values.fails,
    },
  };
}

/**
 * Create console summary table
 */
export function printSummaryTable(title, stats) {
  const width = 60;
  const line = '='.repeat(width);
  
  console.log('');
  console.log(line);
  console.log(` ${title}`);
  console.log(line);
  
  Object.keys(stats).forEach(category => {
    console.log('');
    console.log(`${category.toUpperCase()}:`);
    
    Object.keys(stats[category]).forEach(key => {
      const value = stats[category][key];
      console.log(`  ${key}: ${value}`);
    });
  });
  
  console.log('');
  console.log(line);
  console.log('');
}

/**
 * Determine performance rating
 */
export function getPerformanceRating(p95, errorRate) {
  if (p95 < 500 && errorRate < 0.05) {
    return { rating: 'EXCELLENT', emoji: '✅', color: 'green' };
  } else if (p95 < 1000 && errorRate < 0.10) {
    return { rating: 'GOOD', emoji: '⚠️', color: 'yellow' };
  } else {
    return { rating: 'NEEDS IMPROVEMENT', emoji: '❌', color: 'red' };
  }
}

/**
 * Weighted random choice
 * @param {Array} choices - Array of {value, weight} objects
 */
export function weightedRandomChoice(choices) {
  const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const choice of choices) {
    random -= choice.weight;
    if (random <= 0) {
      return choice.value;
    }
  }
  
  return choices[choices.length - 1].value;
}

export default {
  randomChoice,
  randomChoices,
  randomBool,
  randomSleep,
  checkResponse,
  checkAPIResponse,
  isCached,
  extractAPIData,
  buildURL,
  getRandomPagination,
  measurePercentile,
  calculateSuccessRate,
  formatDuration,
  formatBytes,
  userThinkTime,
  retry,
  isRateLimited,
  isServerError,
  isClientError,
  generateStats,
  printSummaryTable,
  getPerformanceRating,
  weightedRandomChoice,
};
