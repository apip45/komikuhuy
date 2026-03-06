/**
 * ===========================================
 * K6 Test Configuration
 * ===========================================
 * 
 * Centralized configuration for all k6 tests.
 * Import this in your test files for consistent settings.
 */

// Environment configurations
export const environments = {
  production: {
    baseUrl: 'https://comic.mikan.my.id',
    name: 'Production',
  },
  staging: {
    baseUrl: 'https://staging.comic.mikan.my.id',
    name: 'Staging',
  },
  development: {
    baseUrl: 'http://localhost:3000',
    name: 'Development',
  },
};

// Get current environment
export function getEnvironment() {
  const envName = __ENV.ENVIRONMENT || 'production';
  return environments[envName] || environments.production;
}

// Performance thresholds
export const thresholds = {
  // Strict thresholds (production)
  strict: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.05'],
    'cache_hit_rate': ['rate>0.60'],
    'http_reqs': ['rate>100'],
    'checks': ['rate>0.95'],
  },
  
  // Moderate thresholds (staging)
  moderate: {
    'http_req_duration': ['p(95)<800', 'p(99)<1500'],
    'http_req_failed': ['rate<0.10'],
    'cache_hit_rate': ['rate>0.50'],
    'http_reqs': ['rate>50'],
    'checks': ['rate>0.90'],
  },
  
  // Lenient thresholds (development/stress tests)
  lenient: {
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'],
    'http_req_failed': ['rate<0.20'],
    'checks': ['rate>0.80'],
  },
};

// Load profiles
export const loadProfiles = {
  smoke: {
    stages: [
      { duration: '30s', target: 1 },
      { duration: '30s', target: 1 },
    ],
    description: 'Minimal load to verify test works',
  },
  
  light: {
    stages: [
      { duration: '1m', target: 10 },
      { duration: '2m', target: 10 },
      { duration: '1m', target: 0 },
    ],
    description: 'Light load for development testing',
  },
  
  medium: {
    stages: [
      { duration: '2m', target: 50 },
      { duration: '5m', target: 50 },
      { duration: '2m', target: 0 },
    ],
    description: 'Medium load for staging validation',
  },
  
  heavy: {
    stages: [
      { duration: '2m', target: 100 },
      { duration: '10m', target: 100 },
      { duration: '2m', target: 0 },
    ],
    description: 'Heavy load for production readiness',
  },
  
  stress: {
    stages: [
      { duration: '2m', target: 50 },
      { duration: '2m', target: 100 },
      { duration: '2m', target: 200 },
      { duration: '3m', target: 300 },
      { duration: '2m', target: 400 },
      { duration: '3m', target: 400 },
      { duration: '2m', target: 0 },
    ],
    description: 'Stress test to find breaking point',
  },
  
  spike: {
    stages: [
      { duration: '1m', target: 20 },
      { duration: '30s', target: 200 },
      { duration: '2m', target: 200 },
      { duration: '1m', target: 20 },
      { duration: '30s', target: 400 },
      { duration: '2m', target: 400 },
      { duration: '2m', target: 20 },
    ],
    description: 'Sudden traffic spikes',
  },
  
  soak: {
    stages: [
      { duration: '5m', target: 50 },
      { duration: '4h', target: 50 },
      { duration: '5m', target: 0 },
    ],
    description: 'Extended endurance test',
  },
};

// Sample test data
export const testData = {
  comics: [
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
    'hunter-x-hunter',
    'my-hero-academia',
    'dragon-ball',
    'one-punch-man',
    'sword-art-online',
  ],
  
  searchKeywords: [
    'one', 'hero', 'world', 'demon', 'magic', 'battle',
    'adventure', 'fantasy', 'action', 'new', 'popular',
  ],
  
  genres: [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
    'Romance', 'Sci-Fi', 'Seinen', 'Shounen', 'Supernatural',
  ],
  
  // Simulated popular content (for spike tests)
  viralContent: {
    comic: 'one-piece',
    chapters: [1045, 1046, 1047, 1048, 1049, 1050],
  },
};

// HTTP headers
export const headers = {
  json: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  
  html: {
    'Accept': 'text/html',
  },
  
  api: {
    'Accept': 'application/json',
    'User-Agent': 'k6-load-test',
  },
  
  mobile: {
    'Accept': 'application/json',
    'User-Agent': 'AF-Komik-Mobile/1.0',
  },
};

// Common options template
export function getCommonOptions(profile = 'medium', thresholdLevel = 'moderate') {
  return {
    stages: loadProfiles[profile].stages,
    thresholds: thresholds[thresholdLevel],
    insecureSkipTLSVerify: false,
    noConnectionReuse: false,
    batch: 10,
    batchPerHost: 6,
  };
}

// Sleep times (milliseconds)
export const sleepTimes = {
  immediate: 0,
  short: [0.5, 1],
  medium: [1, 3],
  long: [3, 6],
  reading: [5, 12], // User reading chapter
  thinking: [2, 5], // User thinking between actions
};

// Cache expectations
export const cacheExpectations = {
  hot: {
    hitRate: 0.80,
    description: 'Frequently accessed content',
  },
  warm: {
    hitRate: 0.60,
    description: 'Moderately accessed content',
  },
  cold: {
    hitRate: 0.30,
    description: 'Rarely accessed content',
  },
};

// Response time targets by endpoint type
export const responseTimeTargets = {
  homepage: { p95: 300, p99: 600 },
  list: { p95: 400, p99: 800 },
  detail: { p95: 500, p99: 1000 },
  chapter: { p95: 600, p99: 1200 },
  search: { p95: 500, p99: 1000 },
  api: { p95: 300, p99: 600 },
  static: { p95: 100, p99: 200 },
};

export default {
  environments,
  getEnvironment,
  thresholds,
  loadProfiles,
  testData,
  headers,
  getCommonOptions,
  sleepTimes,
  cacheExpectations,
  responseTimeTargets,
};
