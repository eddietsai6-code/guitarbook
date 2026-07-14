PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS catalog_releases (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  published_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_release_songs (
  release_id TEXT NOT NULL,
  song_id TEXT NOT NULL,
  level_id TEXT NOT NULL CHECK (level_id IN ('debut', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8')),
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  song_json TEXT NOT NULL CHECK (json_valid(song_json)),
  PRIMARY KEY (release_id, song_id),
  FOREIGN KEY (release_id) REFERENCES catalog_releases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS catalog_release_songs_order
  ON catalog_release_songs (release_id, level_id, sort_order, song_id);

CREATE TABLE IF NOT EXISTS site_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS publish_nonces (
  nonce TEXT PRIMARY KEY,
  used_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS publish_nonces_used_at ON publish_nonces (used_at);

