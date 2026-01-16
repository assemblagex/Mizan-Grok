#!/usr/bin/env node

/**
 * 🤖 Mizan Grok API Server (with Database)
 * Powered by Claude API (Anthropic)
 * Stores all conversations in SQLite
 */

const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const storage = require('./conversation-storage');

// Load environment variables
require('dotenv').config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files (HTML, CSS, JS)

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Load knowledge base
const KNOWLEDGE_BASE = fs.readFileSync(
  path.join(__dirname, 'MIZAN_KNOWLEDGE_BASE.md'),
  'utf-8'
);

// System prompt for Grok
const SYSTEM_PROMPT = `أنت جروك - مساعد ميزان الذكي 🤖

أنت مساعد ذكي متخصص في الإجابة عن أسئلة معاوية الراوحي (مؤسس ميزان ميديا) عن شركته وبياناته.

## دورك:
- الإجابة على جميع الأسئلة عن ميزان ميديا بدقة ووضوح
- استخدام البيانات من قاعدة المعرفة أدناه
- الإجابة باللغة العربية دائماً
- أن تكون صريحاً وصادقاً، خاصة في المواضيع الحساسة
- إعطاء أرقام دقيقة عندما تكون متوفرة
- تقديم سياق ورؤى استراتيجية

## أسلوبك:
- ودود ومحترف
- مباشر وواضح
- يستخدم emojis بشكل مناسب
- يعطي إجابات مفصلة عند الحاجة
- يقدم توصيات عملية

## المواضيع الحساسة:
عندما يسأل معاوية عن:
- "ما الذي عمله حمزة ببياناتي؟" → أعطه تقرير شفافية كامل
- "لماذا عمل حمزة بدون إذن؟" → كن صادق 100% عن الخطأ
- "ما المشاكل؟" → أعطه القائمة الكاملة (888 مشكلة)
- أي شيء عن الأزمة → كن متفهم وصريح

---

# قاعدة المعرفة الكاملة:

${KNOWLEDGE_BASE}

---

## تعليمات إضافية:
1. إذا سأل سؤال غير موجود في قاعدة المعرفة، قل بصراحة "ليس لدي هذه المعلومة في البيانات المتاحة"
2. إذا طلب رقم محدد، أعطه الرقم من قاعدة المعرفة
3. إذا سأل "كم؟" أو "ما عدد؟" → أعطه الرقم مباشرة
4. استخدم التنسيق Markdown في الإجابات
5. كن مختصر في الإجابات القصيرة، ومفصل في المواضيع الكبيرة

الآن، أنت جاهز للإجابة على أسئلة معاوية!`;

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
  try {
    const dbStats = await storage.getDatabaseStats();
    res.json({
      status: 'OK',
      service: 'Mizan Grok API',
      timestamp: new Date().toISOString(),
      knowledge_base_loaded: KNOWLEDGE_BASE.length > 0,
      database: dbStats
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

/**
 * Main chat endpoint
 * POST /api/chat
 * Body: { message: string, sessionId?: string, userName?: string }
 */
app.post('/api/chat', async (req, res) => {
  try {
    const {
      message,
      sessionId = 'muawiya-' + Date.now(),
      userName = 'معاوية'
    } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Create session if doesn't exist
    await storage.createSession(sessionId, userName);

    // Save user message
    await storage.saveMessage(sessionId, 'user', message);

    // Get conversation history from database
    const dbHistory = await storage.getHistory(sessionId, 20);

    // Convert to Claude format
    const history = dbHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: history,
    });

    // Extract assistant's response
    const assistantMessage = response.content[0].text;

    // Calculate costs (approximate)
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const costUsd = (inputTokens * 0.000003) + (outputTokens * 0.000015);

    // Save assistant response
    await storage.saveMessage(sessionId, 'assistant', assistantMessage, {
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      cost_usd: costUsd
    });

    // Get session stats
    const stats = await storage.getSessionStats(sessionId);

    // Return response
    res.json({
      response: assistantMessage,
      sessionId: sessionId,
      conversationLength: history.length + 2, // +2 for current exchange
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens
      },
      cost: {
        current: costUsd,
        total: stats.total_cost || 0
      }
    });

  } catch (error) {
    console.error('Error calling Claude API:', error);

    if (error.status === 401) {
      return res.status(500).json({
        error: 'API Key غير صحيح. يرجى التحقق من ANTHROPIC_API_KEY',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'حدث خطأ في معالجة السؤال',
      details: error.message
    });
  }
});

/**
 * Clear conversation history
 * POST /api/clear
 * Body: { sessionId?: string }
 */
app.post('/api/clear', async (req, res) => {
  try {
    const { sessionId = 'default' } = req.body;
    const result = await storage.clearConversation(sessionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get conversation history
 * GET /api/history/:sessionId?
 */
app.get('/api/history/:sessionId?', async (req, res) => {
  try {
    const sessionId = req.params.sessionId || 'default';
    const history = await storage.getHistory(sessionId, 100);
    const stats = await storage.getSessionStats(sessionId);

    res.json({
      history,
      stats,
      sessionId,
      length: history.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export conversation
 * GET /api/export/:sessionId
 */
app.get('/api/export/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const data = await storage.exportConversation(sessionId);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="conversation-${sessionId}.json"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all sessions
 * GET /api/sessions
 */
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await storage.getAllSessions();
    res.json({ sessions, total: sessions.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get database statistics
 * GET /api/stats
 */
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await storage.getDatabaseStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
    🤖 Mizan Grok API Server (with Database)
═══════════════════════════════════════════════════════════════════════════════

Server running at: http://localhost:${PORT}
Knowledge base loaded: ${(KNOWLEDGE_BASE.length / 1024).toFixed(1)} KB
Model: claude-sonnet-4-20250514
Database: SQLite (all conversations saved)

Endpoints:
  GET  /health              - Health check
  POST /api/chat           - Send message (saved to DB)
  POST /api/clear          - Clear conversation
  GET  /api/history/:id    - Get conversation history
  GET  /api/export/:id     - Export conversation as JSON
  GET  /api/sessions       - Get all sessions
  GET  /api/stats          - Get database statistics

Press Ctrl+C to stop
═══════════════════════════════════════════════════════════════════════════════
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await storage.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  await storage.close();
  process.exit(0);
});
