const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'gemini.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('image', 'video')),
    prompt TEXT NOT NULL,
    model TEXT NOT NULL,
    aspect_ratio TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER,
    reference_image_path TEXT,
    start_frame_path TEXT,
    end_frame_path TEXT,
    operation_name TEXT,
    status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_generations_type ON generations(type);
  CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);
`);

// Add input_settings column if it doesn't exist (for existing databases)
try {
  db.exec(`ALTER TABLE generations ADD COLUMN input_settings TEXT`);
  console.log('[DB] Added input_settings column');
} catch (e) {
  // Column already exists, ignore
}

module.exports = db;
