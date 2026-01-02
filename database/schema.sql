-- ===========================================
-- AF-Komik V2 - MySQL Database Schema
-- ===========================================
-- 
-- This schema defines the structure for comic content storage.
-- MySQL is used ONLY for comic-related data:
-- - komik (comic metadata)
-- - chapter (chapter information)
-- - image (page images)
-- 
-- User data is stored in MongoDB (see MongoDB models).
-- 
-- Created: 2026-01-02
-- Author: AF-Komik Team
-- ===========================================

-- ===========================================
-- Database Creation
-- ===========================================
-- Run this if database doesn't exist
-- CREATE DATABASE IF NOT EXISTS af_komik 
--   CHARACTER SET utf8mb4 
--   COLLATE utf8mb4_unicode_ci;
-- USE af_komik;

-- ===========================================
-- Table: komik
-- ===========================================
-- Stores comic metadata and information
-- Each row represents one comic series
-- 
-- Columns:
-- - id: Auto-increment primary key
-- - param: URL-friendly unique identifier (slug), used in URLs like /komik/one-piece
-- - title: Display title of the comic
-- - thumbnail: URL to cover image
-- - description: Short description (shown in cards)
-- - synopsis: Full story synopsis (shown in detail page)
-- - genres: JSON array of genre strings, e.g., ["Action", "Adventure"]
-- - latest_chapter: Latest available chapter number (for quick display)
-- - created_at: When the comic was first added
-- - updated_at: When the comic was last updated (e.g., new chapter added)

CREATE TABLE IF NOT EXISTS komik (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique comic identifier',
    param VARCHAR(255) NOT NULL UNIQUE COMMENT 'URL-friendly slug (e.g., one-piece)',
    title VARCHAR(500) NOT NULL COMMENT 'Comic title for display',
    thumbnail VARCHAR(1000) COMMENT 'URL to cover image',
    description TEXT COMMENT 'Short description for cards/lists',
    synopsis TEXT COMMENT 'Full story synopsis for detail page',
    genres JSON COMMENT 'Array of genre strings, e.g., ["Action", "Adventure"]',
    latest_chapter VARCHAR(50) COMMENT 'Latest chapter label (e.g., "Chapter 1100")',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time',
    
    -- Indexes for performance
    INDEX idx_param (param),
    INDEX idx_title (title(100)),
    INDEX idx_updated (updated_at),
    INDEX idx_latest_chapter (latest_chapter)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores comic series metadata and information';

-- ===========================================
-- Table: chapter
-- ===========================================
-- Stores chapter information for each comic
-- Each row represents one chapter of a comic
-- 
-- Columns:
-- - id: Auto-increment primary key
-- - komik_id: Foreign key linking to komik table
-- - param: URL-friendly unique identifier (slug), used in URLs like /komik/one-piece/chapter-1100
-- - chapter_label: Display label (e.g., "Chapter 1100", "Episode 50")
-- - release_date: When the chapter was released/scraped
-- - created_at: When the record was created
-- 
-- Relationship:
-- - komik (1) ---> (many) chapter

CREATE TABLE IF NOT EXISTS chapter (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique chapter identifier',
    komik_id INT NOT NULL COMMENT 'Foreign key to komik table',
    param VARCHAR(255) NOT NULL COMMENT 'URL-friendly slug (e.g., chapter-1100)',
    chapter_label VARCHAR(100) NOT NULL COMMENT 'Display label (e.g., "Chapter 1100")',
    release_date TIMESTAMP NULL COMMENT 'Chapter release/scrape date',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
    
    -- Foreign key constraint
    -- CASCADE: When a comic is deleted, all its chapters are also deleted
    CONSTRAINT fk_chapter_komik 
        FOREIGN KEY (komik_id) REFERENCES komik(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    -- Unique constraint: Each comic can only have one chapter with the same param
    UNIQUE KEY uk_komik_chapter_param (komik_id, param),
    
    -- Indexes for performance
    INDEX idx_komik_id (komik_id),
    INDEX idx_param (param),
    INDEX idx_release_date (release_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores chapter information for each comic';

-- ===========================================
-- Table: image
-- ===========================================
-- Stores page images for each chapter
-- Each row represents one page/image of a chapter
-- 
-- Columns:
-- - id: Auto-increment primary key
-- - chapter_id: Foreign key linking to chapter table
-- - page_number: Sequential page number (1, 2, 3, ...)
-- - image_url: URL to the page image
-- - created_at: When the record was created
-- 
-- Relationship:
-- - chapter (1) ---> (many) image

CREATE TABLE IF NOT EXISTS image (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique image identifier',
    chapter_id INT NOT NULL COMMENT 'Foreign key to chapter table',
    page_number INT NOT NULL COMMENT 'Sequential page number within chapter',
    image_url VARCHAR(1000) NOT NULL COMMENT 'URL to the page image',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation time',
    
    -- Foreign key constraint
    -- CASCADE: When a chapter is deleted, all its images are also deleted
    CONSTRAINT fk_image_chapter 
        FOREIGN KEY (chapter_id) REFERENCES chapter(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    -- Unique constraint: Each chapter can only have one image with the same page number
    UNIQUE KEY uk_chapter_page (chapter_id, page_number),
    
    -- Indexes for performance
    INDEX idx_chapter_id (chapter_id),
    INDEX idx_page_number (page_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores page images for each chapter';

-- ===========================================
-- Sample Data (Optional)
-- ===========================================
-- Uncomment to insert sample data for testing

/*
INSERT INTO komik (param, title, thumbnail, description, synopsis, genres, latest_chapter) VALUES
('one-piece', 'One Piece', 'https://example.com/one-piece.jpg', 
 'Kisah Monkey D. Luffy dan kru Topi Jerami mencari One Piece.',
 'Monkey D. Luffy adalah seorang pemuda yang bercita-cita menjadi Raja Bajak Laut...',
 '["Action", "Adventure", "Comedy", "Fantasy"]',
 'Chapter 1100'),
('naruto', 'Naruto', 'https://example.com/naruto.jpg',
 'Kisah Naruto Uzumaki yang bermimpi menjadi Hokage.',
 'Naruto Uzumaki adalah seorang ninja muda dari desa Konoha...',
 '["Action", "Adventure", "Martial Arts"]',
 'Chapter 700');

INSERT INTO chapter (komik_id, param, chapter_label, release_date) VALUES
(1, 'chapter-1100', 'Chapter 1100', NOW()),
(1, 'chapter-1099', 'Chapter 1099', NOW() - INTERVAL 7 DAY),
(2, 'chapter-700', 'Chapter 700', NOW()),
(2, 'chapter-699', 'Chapter 699', NOW() - INTERVAL 7 DAY);

INSERT INTO image (chapter_id, page_number, image_url) VALUES
(1, 1, 'https://example.com/one-piece/1100/1.jpg'),
(1, 2, 'https://example.com/one-piece/1100/2.jpg'),
(1, 3, 'https://example.com/one-piece/1100/3.jpg'),
(2, 1, 'https://example.com/one-piece/1099/1.jpg'),
(2, 2, 'https://example.com/one-piece/1099/2.jpg');
*/

-- ===========================================
-- Useful Queries
-- ===========================================

-- Get all comics with their latest chapter
-- SELECT k.id, k.title, k.latest_chapter, k.updated_at
-- FROM komik k
-- ORDER BY k.updated_at DESC;

-- Get all chapters for a specific comic
-- SELECT c.id, c.chapter_label, c.release_date
-- FROM chapter c
-- WHERE c.komik_id = 1
-- ORDER BY c.id DESC;

-- Get all images for a specific chapter
-- SELECT i.page_number, i.image_url
-- FROM image i
-- WHERE i.chapter_id = 1
-- ORDER BY i.page_number ASC;

-- Get comic with chapter count
-- SELECT k.id, k.title, COUNT(c.id) as chapter_count
-- FROM komik k
-- LEFT JOIN chapter c ON k.id = c.komik_id
-- GROUP BY k.id;
