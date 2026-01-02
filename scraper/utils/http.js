/**
 * ===========================================
 * AF-Komik Scraper - HTTP Client
 * ===========================================
 * 
 * Configured axios instance for web scraping.
 * Includes timeout, headers, and response handling.
 */

const axios = require('axios');
const config = require('../config/scraper.config');
const logger = require('../config/logger');

/**
 * Create configured axios instance
 */
const httpClient = axios.create({
  timeout: config.http.timeout,
  headers: {
    'User-Agent': config.http.userAgent,
    ...config.http.headers
  },
  // Don't throw on non-2xx status
  validateStatus: (status) => status < 500,
  // Decompress responses automatically
  decompress: true,
  // Follow redirects
  maxRedirects: 5
});

/**
 * Request interceptor for logging
 */
httpClient.interceptors.request.use(
  (requestConfig) => {
    logger.debug(`HTTP Request: ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`);
    return requestConfig;
  },
  (error) => {
    logger.error(`HTTP Request Error: ${error.message}`);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for logging
 */
httpClient.interceptors.response.use(
  (response) => {
    logger.debug(`HTTP Response: ${response.status} ${response.config.url}`, {
      contentLength: response.headers['content-length'] || 'unknown'
    });
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      logger.error(`HTTP Timeout: ${error.config?.url}`);
    } else if (error.response) {
      logger.error(`HTTP Error ${error.response.status}: ${error.config?.url}`);
    } else {
      logger.error(`HTTP Error: ${error.message}`);
    }
    return Promise.reject(error);
  }
);

/**
 * Fetch HTML content from a URL
 * 
 * @param {string} url - URL to fetch
 * @param {Object} extraHeaders - Additional headers to merge
 * @returns {Promise<string>} HTML content
 */
const fetchHtml = async (url, extraHeaders = {}) => {
  const options = {};
  
  // If extra headers provided, merge them
  if (Object.keys(extraHeaders).length > 0) {
    options.headers = {
      ...config.http.headers,
      ...extraHeaders
    };
  }
  
  const response = await httpClient.get(url, {
    responseType: 'text',
    ...options
  });
  
  if (response.status === 404) {
    throw new Error(`Page not found: ${url}`);
  }
  
  if (response.status >= 400) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }
  
  return response.data;
};

/**
 * Fetch with custom headers
 * 
 * @param {string} url - URL to fetch
 * @param {Object} headers - Additional headers
 * @returns {Promise<string>} HTML content
 */
const fetchWithHeaders = async (url, headers = {}) => {
  return fetchHtml(url, {
    headers: {
      ...config.http.headers,
      ...headers
    }
  });
};

/**
 * Check if a URL is accessible
 * 
 * @param {string} url - URL to check
 * @returns {Promise<boolean>} True if accessible
 */
const isAccessible = async (url) => {
  try {
    const response = await httpClient.head(url);
    return response.status >= 200 && response.status < 400;
  } catch (error) {
    return false;
  }
};

/**
 * Get the axios instance for custom operations
 * @returns {AxiosInstance} Axios instance
 */
const getClient = () => httpClient;

module.exports = {
  httpClient,
  fetchHtml,
  fetchWithHeaders,
  isAccessible,
  getClient
};
