-- PinoyPlay scores. Runs once when the MySQL container initializes an empty volume.
CREATE TABLE IF NOT EXISTS players (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  secret_hash BINARY(32) NOT NULL,
  username VARCHAR(20) NOT NULL,
  name_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS scores (
  player_id VARCHAR(36) NOT NULL,
  game VARCHAR(32) NOT NULL,
  difficulty ENUM('easy', 'normal', 'hard') NOT NULL,
  score INT UNSIGNED NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id, game, difficulty),
  KEY board (game, difficulty, score DESC),
  CONSTRAINT scores_player FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- One AI verdict per folded name (lowercase, no accents, leetspeak mapped, separators removed).
CREATE TABLE IF NOT EXISTS name_reviews (
  normalized VARCHAR(80) NOT NULL PRIMARY KEY,
  allowed BOOLEAN NOT NULL,
  reason VARCHAR(200) NOT NULL,
  model VARCHAR(64) NOT NULL,
  reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin;
