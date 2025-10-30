-- 데이터베이스와 전체 스키마 생성
CREATE DATABASE IF NOT EXISTS melody CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE melody;

-- 1) users
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- 2) artists
CREATE TABLE IF NOT EXISTS artists (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  bio TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- 3) albums
CREATE TABLE IF NOT EXISTS albums (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  artist_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  cover_url VARCHAR(1024) NULL,
  release_date DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_albums_artist_id (artist_id),
  CONSTRAINT fk_albums_artist_id FOREIGN KEY (artist_id)
    REFERENCES artists(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4) tracks
CREATE TABLE IF NOT EXISTS tracks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  artist_id BIGINT UNSIGNED NOT NULL,
  album_id BIGINT UNSIGNED NULL,
  title VARCHAR(255) NOT NULL,
  duration_sec INT UNSIGNED NULL,
  isrc VARCHAR(20) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_tracks_artist_id (artist_id),
  INDEX idx_tracks_album_id (album_id),
  CONSTRAINT fk_tracks_artist_id FOREIGN KEY (artist_id)
    REFERENCES artists(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tracks_album_id FOREIGN KEY (album_id)
    REFERENCES albums(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 5) track_files
CREATE TABLE IF NOT EXISTS track_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  track_id BIGINT UNSIGNED NOT NULL,
  storage_path VARCHAR(1024) NOT NULL,
  mime_type VARCHAR(128) NULL,
  bitrate_kbps INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_track_files_track_id (track_id),
  CONSTRAINT fk_track_files_track_id FOREIGN KEY (track_id)
    REFERENCES tracks(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 6) playlists
CREATE TABLE IF NOT EXISTS playlists (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_playlists_user_id (user_id),
  CONSTRAINT fk_playlists_user_id FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 7) playlist_tracks
CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id BIGINT UNSIGNED NOT NULL,
  track_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (playlist_id, track_id),
  INDEX idx_playlist_tracks_track_id (track_id),
  CONSTRAINT fk_playlist_tracks_playlist_id FOREIGN KEY (playlist_id)
    REFERENCES playlists(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_playlist_tracks_track_id FOREIGN KEY (track_id)
    REFERENCES tracks(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 8) streams
CREATE TABLE IF NOT EXISTS streams (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  track_id BIGINT UNSIGNED NOT NULL,
  played_ms INT UNSIGNED NOT NULL DEFAULT 0,
  client_ip VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_streams_user_id (user_id),
  INDEX idx_streams_track_id (track_id),
  CONSTRAINT fk_streams_user_id FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_streams_track_id FOREIGN KEY (track_id)
    REFERENCES tracks(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 9) licenses
CREATE TABLE IF NOT EXISTS licenses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  track_id BIGINT UNSIGNED NOT NULL,
  licensor VARCHAR(255) NOT NULL,
  revenue_share DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  start_date DATE NULL,
  end_date DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_licenses_track_id (track_id),
  CONSTRAINT fk_licenses_track_id FOREIGN KEY (track_id)
    REFERENCES tracks(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

