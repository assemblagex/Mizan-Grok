-- Supabase Database Schema for Grok
-- Run this in Supabase SQL Editor

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  session_id BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Create index for faster queries
CREATE INDEX idx_conversations_user_name ON conversations(user_name);
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read conversations
CREATE POLICY "Public conversations are viewable by everyone"
ON conversations FOR SELECT
USING (true);

-- Policy: Anyone can insert conversations
CREATE POLICY "Anyone can insert conversations"
ON conversations FOR INSERT
WITH CHECK (true);

-- Create statistics view
CREATE OR REPLACE VIEW conversation_stats AS
SELECT
  user_name,
  COUNT(*) as total_conversations,
  COUNT(DISTINCT session_id) as total_sessions,
  MIN(created_at) as first_conversation,
  MAX(created_at) as last_conversation
FROM conversations
GROUP BY user_name;

-- Create popular questions view
CREATE OR REPLACE VIEW popular_questions AS
SELECT
  question,
  COUNT(*) as frequency,
  MAX(created_at) as last_asked
FROM conversations
GROUP BY question
ORDER BY frequency DESC
LIMIT 50;

-- Function to get user conversation history
CREATE OR REPLACE FUNCTION get_user_history(
  p_user_name TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.question,
    c.answer,
    c.created_at
  FROM conversations c
  WHERE c.user_name = p_user_name
  ORDER BY c.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get session conversations
CREATE OR REPLACE FUNCTION get_session_conversations(
  p_session_id BIGINT
)
RETURNS TABLE (
  id UUID,
  user_name TEXT,
  question TEXT,
  answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.user_name,
    c.question,
    c.answer,
    c.created_at
  FROM conversations c
  WHERE c.session_id = p_session_id
  ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data (optional - for testing)
INSERT INTO conversations (user_id, user_name, question, answer, session_id)
VALUES
  ('muawiya', 'Muawiya', 'ما أكبر مشاكل ميزان؟', 'أكبر 3 مشاكل: 1. احتراق معاوية (40%)...', 1737077140000),
  ('muawiya', 'Muawiya', 'كم عميل نشط لدينا؟', '15 عميل نشط: 2 حكومي، 13 قطاع خاص', 1737077140000);

-- Grant permissions
GRANT SELECT ON conversation_stats TO anon, authenticated;
GRANT SELECT ON popular_questions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_history TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_session_conversations TO anon, authenticated;

-- Done!
SELECT 'Database schema created successfully!' as message;
