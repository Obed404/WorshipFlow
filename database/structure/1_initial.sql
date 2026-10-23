-- Chord Viewer Database Schema
-- Version: 1.0
-- Created: 2026-10-20

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS chord_viewer 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE chord_viewer;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS song_labels;
DROP TABLE IF EXISTS songs;
DROP TABLE IF EXISTS labels;

-- Create labels table
CREATE TABLE labels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#3b82f6',
  instrument ENUM('GUITAR', 'PIANO', 'UKULELE', 'BASS', 'MANDOLIN', 'OTHER') NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_labels_name (name),
  INDEX idx_labels_instrument (instrument)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create songs table
CREATE TABLE songs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NULL,
  song_key VARCHAR(10) NULL,
  capo TINYINT DEFAULT 0,
  tempo SMALLINT NULL,
  difficulty ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED') DEFAULT 'BEGINNER',
  content MEDIUMTEXT NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_songs_title (title),
  INDEX idx_songs_artist (artist),
  INDEX idx_songs_difficulty (difficulty),
  INDEX idx_songs_created_at (created_at),
  INDEX idx_songs_updated_at (updated_at),
  
  FULLTEXT idx_songs_content (content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create song_labels junction table
CREATE TABLE song_labels (
  song_id INT NOT NULL,
  label_id INT NOT NULL,
  
  PRIMARY KEY (song_id, label_id),
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE,
  
  INDEX idx_song_labels_song_id (song_id),
  INDEX idx_song_labels_label_id (label_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create a view for labels with song counts
CREATE OR REPLACE VIEW labels_with_counts AS
SELECT 
  l.*,
  COUNT(sl.song_id) as song_count
FROM labels l
LEFT JOIN song_labels sl ON l.id = sl.label_id
GROUP BY l.id
ORDER BY l.name;

-- Create a view for songs with label names
CREATE OR REPLACE VIEW songs_with_labels AS
SELECT 
  s.*,
  GROUP_CONCAT(l.name ORDER BY l.name SEPARATOR ', ') as label_names,
  GROUP_CONCAT(l.id ORDER BY l.name SEPARATOR ',') as label_ids
FROM songs s
LEFT JOIN song_labels sl ON s.id = sl.song_id
LEFT JOIN labels l ON sl.label_id = l.id
GROUP BY s.id;

-- Add comments for documentation
ALTER TABLE labels COMMENT = 'Song categorization labels with colors and instrument associations';
ALTER TABLE songs COMMENT = 'Main songs table with chord content and metadata';
ALTER TABLE song_labels COMMENT = 'Many-to-many relationship between songs and labels';

-- Show table creation status
SHOW TABLES;

-- Show table structure
DESCRIBE labels;
DESCRIBE songs;
DESCRIBE song_labels;