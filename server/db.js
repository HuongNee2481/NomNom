const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'nomnom.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id INTEGER NOT NULL REFERENCES groups(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES groups(id),
  type TEXT NOT NULL CHECK (type IN ('out','order')),
  title TEXT NOT NULL,
  event_time TEXT,
  address TEXT,
  map_link TEXT,
  order_link TEXT,
  note TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
  place_id INTEGER REFERENCES places(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS event_participants (
  event_id INTEGER NOT NULL REFERENCES events(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS bill_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id),
  person_name TEXT NOT NULL,
  item_name TEXT,
  price INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS places (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES groups(id),
  name TEXT NOT NULL,
  category TEXT,
  price_hint TEXT,
  address TEXT,
  source_event_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(group_id, name)
);

CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  place_id INTEGER NOT NULL REFERENCES places(id),
  event_id INTEGER NOT NULL REFERENCES events(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS blacklist (
  user_id INTEGER NOT NULL REFERENCES users(id),
  place_id INTEGER NOT NULL REFERENCES places(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, place_id)
);
`);

module.exports = db;
