// Netlify Function for JARVIS Chat API
// Powered by Claude Sonnet 4 + Supabase

const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

// Read knowledge base
const fs = require('fs');
const path = require('path');
const KNOWLEDGE_BASE = fs.readFileSync(
  path.join(__dirname, '../../MIZAN_KNOWLEDGE_BASE.md'),
  'utf-8'
);

const SYSTEM_PROMPT = `أنت جارفيس - مساعد ميزان الذكي 🤖

أنت مساعد ذكي متخصص في الإجابة عن أسئلة معاوية الراوحي (مؤسس ميزان ميديا) عن شركته وبياناته.

## دورك:
- الإجابة على جميع الأسئلة عن ميزان ميديا بدقة ووضوح
- استخدام البيانات من قاعدة المعرفة أدناه
- الإجابة باللغة العربية دائماً
- أن تكون صريحاً وصادقاً، خاصة في المواضيع الحساسة
- إعطاء أرقام دقيقة عندما تكون متوفرة
- تقديم سياق ورؤى استراتيجية

${KNOWLEDGE_BASE}`;

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { message, sessionId = 'default', userName = 'معاوية' } = JSON.parse(event.body);

    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }

    // Initialize clients
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Create or get session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .upsert({
        session_id: sessionId,
        user_name: userName,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError && sessionError.code !== '23505') { // Ignore duplicate key
      console.error('Session error:', sessionError);
    }

    // Save user message
    await supabase.from('messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message,
    });

    // Get conversation history (last 20 messages)
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false })
      .limit(20);

    const conversationHistory = (history || []).reverse();

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: conversationHistory,
    });

    const assistantMessage = response.content[0].text;
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const costUsd = (inputTokens * 0.000003) + (outputTokens * 0.000015);

    // Save assistant message
    await supabase.from('messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: assistantMessage,
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      cost_usd: costUsd,
      model: 'claude-sonnet-4-20250514',
    });

    // Update session stats
    await supabase
      .from('sessions')
      .update({
        message_count: supabase.raw('message_count + 2'),
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: assistantMessage,
        sessionId,
        conversationLength: conversationHistory.length + 2,
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        },
        cost: costUsd.toFixed(4),
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
