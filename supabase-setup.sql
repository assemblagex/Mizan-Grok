-- Supabase Database Setup for Mizan JARVIS
-- Run this SQL in Supabase SQL Editor

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active'
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_usd DECIMAL(10, 6),
  model TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);

-- Create insights table (optional)
CREATE TABLE IF NOT EXISTS insights (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  insight_type TEXT,
  insight_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

-- Create RLS (Row Level Security) policies
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (service role)
CREATE POLICY "Enable all for service role" ON sessions
  FOR ALL USING (true);

CREATE POLICY "Enable all for service role" ON messages
  FOR ALL USING (true);

CREATE POLICY "Enable all for service role" ON insights
  FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON sessions TO service_role;
GRANT ALL ON messages TO service_role;
GRANT ALL ON insights TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Create view for session stats
CREATE OR REPLACE VIEW session_stats AS
SELECT
  s.session_id,
  s.user_name,
  s.created_at,
  s.updated_at,
  COUNT(m.id) as total_messages,
  SUM(CASE WHEN m.role = 'user' THEN 1 ELSE 0 END) as user_messages,
  SUM(CASE WHEN m.role = 'assistant' THEN 1 ELSE 0 END) as assistant_messages,
  SUM(m.tokens_input) as total_input_tokens,
  SUM(m.tokens_output) as total_output_tokens,
  SUM(m.cost_usd) as total_cost
FROM sessions s
LEFT JOIN messages m ON s.session_id = m.session_id
GROUP BY s.session_id, s.user_name, s.created_at, s.updated_at;

-- Grant view permissions
GRANT SELECT ON session_stats TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Supabase setup complete!';
  RAISE NOTICE 'Tables created: sessions, messages, insights';
  RAISE NOTICE 'View created: session_stats';
  RAISE NOTICE 'RLS policies enabled';
END $$;
