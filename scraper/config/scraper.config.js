/**
 * ===========================================
 * AF-Komik Scraper - Configuration
 * ===========================================
 * 
 * Central configuration for the scraper.
 * All scraping parameters are configurable here.
 */

module.exports = {
  // Target website base URL
  baseUrl: 'https://komiku.org',
  
  // HTTP request settings
  http: {
    // Request timeout in milliseconds
    timeout: 30000,
    
    // User agent string to mimic real browser
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    
    // Additional headers
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0'
    }
  },
  
  // Delay settings (in milliseconds)
  delay: {
    // Delay between comic list page requests
    betweenPages: 1500,
    
    // Delay between individual comic detail requests
    betweenComics: 1000,
    
    // Delay between chapter requests
    betweenChapters: 800,
    
    // Random extra delay range (adds 0 to this value)
    randomExtra: 500
  },
  
  // Retry settings
  retry: {
    // Maximum number of retry attempts
    maxAttempts: 3,
    
    // Initial delay before first retry (doubles each attempt)
    initialDelay: 2000,
    
    // Maximum delay between retries
    maxDelay: 10000
  },
  
  // Scraping limits
  limits: {
    // Number of pages to scan for latest/periodic scrape
    latestPageLimit: 10,
    
    // Maximum comics to process in latest mode
    latestComicLimit: 100,
    
    // Maximum concurrent operations (keep low to avoid rate limiting)
    concurrency: 1,
    
    // Maximum pages to scan for full scrape (0 = unlimited)
    fullScrapeMaxPages: 0
  },
  
  // URL patterns
  urls: {
    // Comic list page pattern (append page number)
    comicList: '/daftar-komik/page/',
    
    // Alternative comic list (newest first)
    newestComics: '/pustaka/',
    
    // Base path for comics
    comicBase: '/manga/',
    
    // Chapter base path
    chapterBase: '/ch/'
  },
  
  // Selectors for parsing HTML
  selectors: {
    // Comic list page selectors
    comicList: {
      // Container for comic items
      container: '.daftar .bge',
      // Link to comic detail
      link: 'a',
      // Comic title
      title: '.kan h3',
      // Comic thumbnail
      thumbnail: '.bgei img',
      // Genres
      genres: '.tpe1_inf b'
    },
    
    // Comic detail page selectors
    comicDetail: {
      // Comic title
      title: '#Judul h1',
      // Alternative title selector
      titleAlt: '.info h1',
      // Thumbnail image
      thumbnail: '.ims img',
      // Description/synopsis container
      description: '.desc',
      // Synopsis text
      synopsis: '#Sinopsis p',
      // Genres list
      genres: '.genre li a',
      // Alternative genres
      genresAlt: '.info .genre a',
      // Chapter list container
      chapterList: '#Daftar_Chapter tbody tr',
      // Chapter link
      chapterLink: 'a',
      // Chapter label
      chapterLabel: '.jud_l',
      // Release date
      releaseDate: '.tgl_l'
    },
    
    // Chapter page selectors
    chapter: {
      // Image container
      imageContainer: '#Baca_Komik img',
      // Alternative image container
      imageContainerAlt: '.bc img',
      // Image source attribute
      imageSrc: 'src',
      // Alternative source (lazy loading)
      imageSrcAlt: 'data-src'
    }
  },
  
  // Logging settings
  logging: {
    // Log file path (relative to scraper directory)
    filePath: '../logs/scraper.log',
    
    // Log level: 'debug', 'info', 'warn', 'error'
    level: 'info',
    
    // Maximum log file size in bytes (5MB)
    maxFileSize: 5 * 1024 * 1024,
    
    // Number of backup log files to keep
    maxBackups: 3
  }
};
