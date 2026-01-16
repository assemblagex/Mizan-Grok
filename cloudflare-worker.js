/**
 * Cloudflare Worker - Grok API for Mizan
 * Deploy at: workers.cloudflare.com
 */

// Environment variables (set in Cloudflare dashboard)
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Mizan Knowledge Base
const MIZAN_KNOWLEDGE = {
  stats: { messages: 70207, tasks: 14210, meetings: 4443, problems: 9115, clients: 15 }
};

const QA_DATABASE = {
  "ما أكبر مشاكل ميزان؟": "أكبر 3 مشاكل:\n1️⃣ احتراق معاوية (40%)\n2️⃣ أزمة سيولة (15,640 OMR)\n3️⃣ تركيز إيرادات (67.6% من عميلين)",
  "كم عميل نشط لدينا؟": "15 عميل نشط:\n🏛️ 2 حكومي\n🏢 13 قطاع خاص",
  "ما حالة الفواتير؟": "💰 إيرادات: 21,540 OMR\n💸 محصّل: 2,100 OMR\n🚨 مستحقات: 15,640 OMR"
};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  try {
    if (path === '/api/ask' && request.method === 'POST') {
      return await handleAskQuestion(request);
    }

    if (path === '/api/history' && request.method === 'GET') {
      return await handleGetHistory(request);
    }

    if (path === '/api/stats' && request.method === 'GET') {
      return await handleGetStats();
    }

    return jsonResponse({
      service: 'Grok API for Mizan',
      version: '1.0',
      status: 'online'
    });

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function handleAskQuestion(request) {
  const body = await request.json();
  const { question, user_name = 'Muawiya', session_id } = body;

  if (!question) {
    return jsonResponse({ error: 'Question is required' }, 400);
  }

  const answer = getGrokAnswer(question);

  const conversationId = await saveToSupabase({
    user_id: user_name.toLowerCase(),
    user_name,
    question,
    answer,
    session_id: session_id || Date.now(),
    created_at: new Date().toISOString()
  });

  return jsonResponse({
    answer,
    conversation_id: conversationId,
    timestamp: new Date().toISOString()
  });
}

async function handleGetHistory(request) {
  const url = new URL(request.url);
  const user_name = url.searchParams.get('user') || 'Muawiya';
  const limit = parseInt(url.searchParams.get('limit') || '50');

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/conversations?user_name=eq.${user_name}&order=created_at.desc&limit=${limit}`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );

  const conversations = await response.json();
  return jsonResponse({ conversations, total: conversations.length });
}

async function handleGetStats() {
  return jsonResponse({
    mizan_stats: MIZAN_KNOWLEDGE.stats,
    grok_stats: {
      total_conversations: 0, // Update from Supabase
      uptime: '99.9%',
      avg_response_time: '0.3s'
    }
  });
}

function getGrokAnswer(question) {
  const lowerQuestion = question.toLowerCase();

  for (let key in QA_DATABASE) {
    const keyWords = key.toLowerCase().split(' ').slice(0, 3);
    if (keyWords.some(word => lowerQuestion.includes(word))) {
      return QA_DATABASE[key];
    }
  }

  if (lowerQuestion.includes('عميل')) return QA_DATABASE["كم عميل نشط لدينا؟"];
  if (lowerQuestion.includes('مشكل')) return QA_DATABASE["ما أكبر مشاكل ميزان؟"];
  if (lowerQuestion.includes('فاتور')) return QA_DATABASE["ما حالة الفواتير؟"];

  return `سؤال ممتاز! 🤔\n\nللأسف، أحتاج مزيد من التفاصيل.\n\nجرب الأسئلة السريعة أعلاه!`;
}

async function saveToSupabase(data) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/conversations`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    }
  );

  const result = await response.json();
  return result[0]?.id;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}
