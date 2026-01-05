-- ===========================================
-- Migration: Add status and author columns to komik table
-- ===========================================
-- Run this migration to add new columns for tracking comic status
-- and author information.
-- 
-- Created: 2026-01-05
-- ===========================================

-- Add status column (Ongoing/Completed)
ALTER TABLE komik 
ADD COLUMN status ENUM('Ongoing', 'Completed', 'Hiatus', 'Dropped') 
DEFAULT 'Ongoing' 
COMMENT 'Publication status of the comic'
AFTER latest_chapter;

-- Add author column
ALTER TABLE komik 
ADD COLUMN author VARCHAR(255) 
DEFAULT NULL 
COMMENT 'Author/Artist name'
AFTER status;

-- Add comic_type column (Manga/Manhwa/Manhua)
ALTER TABLE komik 
ADD COLUMN comic_type ENUM('Manga', 'Manhwa', 'Manhua', 'Webtoon', 'Other') 
DEFAULT 'Manga' 
COMMENT 'Type of comic (origin-based)'
AFTER author;

-- Add last_scraped column to track when comic was last fully scraped
ALTER TABLE komik 
ADD COLUMN last_scraped TIMESTAMP 
DEFAULT NULL 
COMMENT 'When this comic was last fully scraped for updates'
AFTER comic_type;

-- Add index for status to efficiently query ongoing comics
CREATE INDEX idx_status ON komik(status);

-- Add index for last_scraped
CREATE INDEX idx_last_scraped ON komik(last_scraped);

-- ===========================================
-- Verify the changes
-- ===========================================
-- DESCRIBE komik;
