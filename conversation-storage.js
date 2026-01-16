/**
 * 💾 Conversation Storage Module
 * Saves all conversations to SQLite database
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path
const DB_PATH = path.join(__dirname, 'data', 'conversations.db');

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('💾 Conversation database connected:', DB_PATH);
    initializeDatabase();
  }
});

/**
 * Initialize database schema
 */
function initializeDatabase() {
  db.serialize(() => {
    // Sessions table
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        user_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        message_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active'
      )
    `);

    // Messages table
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        tokens_input INTEGER,
        tokens_output INTEGER,
        cost_usd REAL,
        model TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
      )
    `);

    // Insights table (for extracted insights from conversations)
    db.run(`
      CREATE TABLE IF NOT EXISTS insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        message_id INTEGER,
        category TEXT,
        content TEXT,
        importance TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id),
        FOREIGN KEY (message_id) REFERENCES messages(id)
      )
    `);

    // Create indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)');
    db.run('CREATE INDEX IF NOT EXISTS idx_insights_session ON insights(session_id)');

    console.log('✅ Database schema initialized');
  });
}

/**
 * Create or get session
 */
function createSession(sessionId, userName = 'معاوية') {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO sessions (session_id, user_name) VALUES (?, ?)`,
      [sessionId, userName],
      (err) => {
        if (err) reject(err);
        else resolve(sessionId);
      }
    );
  });
}

/**
 * Save message to database
 */
function saveMessage(sessionId, role, content, metadata = {}) {
  return new Promise((resolve, reject) => {
    const {
      tokens_input = null,
      tokens_output = null,
      cost_usd = null,
      model = 'claude-sonnet-4-20250514'
    } = metadata;

    db.run(
      `INSERT INTO messages
       (session_id, role, content, tokens_input, tokens_output, cost_usd, model)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, role, content, tokens_input, tokens_output, cost_usd, model],
      function(err) {
        if (err) {
          reject(err);
        } else {
          // Update session
          db.run(
            `UPDATE sessions
             SET message_count = message_count + 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE session_id = ?`,
            [sessionId]
          );
          resolve({ id: this.lastID, sessionId, role, content });
        }
      }
    );
  });
}

/**
 * Get conversation history
 */
function getHistory(sessionId, limit = 20) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT role, content, timestamp, tokens_input, tokens_output, cost_usd
       FROM messages
       WHERE session_id = ?
       ORDER BY id DESC
       LIMIT ?`,
      [sessionId, limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows.reverse()); // Reverse to get chronological order
      }
    );
  });
}

/**
 * Get all sessions
 */
function getAllSessions() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM sessions ORDER BY updated_at DESC`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

/**
 * Get session stats
 */
function getSessionStats(sessionId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT
        COUNT(*) as total_messages,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_messages,
        SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistant_messages,
        SUM(tokens_input) as total_tokens_input,
        SUM(tokens_output) as total_tokens_output,
        SUM(cost_usd) as total_cost,
        MIN(timestamp) as first_message,
        MAX(timestamp) as last_message
       FROM messages
       WHERE session_id = ?`,
      [sessionId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

/**
 * Save insight (extracted important information)
 */
function saveInsight(sessionId, messageId, category, content, importance = 'medium') {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO insights (session_id, message_id, category, content, importance)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, messageId, category, content, importance],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}

/**
 * Get all insights for a session
 */
function getInsights(sessionId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM insights WHERE session_id = ? ORDER BY timestamp DESC`,
      [sessionId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

/**
 * Clear conversation (soft delete)
 */
function clearConversation(sessionId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE sessions SET status = 'archived' WHERE session_id = ?`,
      [sessionId],
      (err) => {
        if (err) reject(err);
        else resolve({ message: 'تم أرشفة المحادثة', sessionId });
      }
    );
  });
}

/**
 * Export conversation to JSON
 */
function exportConversation(sessionId) {
  return new Promise((resolve, reject) => {
    Promise.all([
      new Promise((res, rej) => {
        db.get('SELECT * FROM sessions WHERE session_id = ?', [sessionId], (err, row) => {
          if (err) rej(err);
          else res(row);
        });
      }),
      getHistory(sessionId, 1000),
      getInsights(sessionId),
      getSessionStats(sessionId)
    ])
      .then(([session, messages, insights, stats]) => {
        resolve({
          session,
          messages,
          insights,
          stats,
          exported_at: new Date().toISOString()
        });
      })
      .catch(reject);
  });
}

/**
 * Get database stats
 */
function getDatabaseStats() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT
        (SELECT COUNT(*) FROM sessions) as total_sessions,
        (SELECT COUNT(*) FROM sessions WHERE status = 'active') as active_sessions,
        (SELECT COUNT(*) FROM messages) as total_messages,
        (SELECT COUNT(*) FROM insights) as total_insights,
        (SELECT SUM(cost_usd) FROM messages WHERE cost_usd IS NOT NULL) as total_cost
       `,
      [],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

/**
 * Close database connection
 */
function close() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else {
        console.log('💾 Database connection closed');
        resolve();
      }
    });
  });
}

module.exports = {
  createSession,
  saveMessage,
  getHistory,
  getAllSessions,
  getSessionStats,
  saveInsight,
  getInsights,
  clearConversation,
  exportConversation,
  getDatabaseStats,
  close,
  db
};
