# 🤖 Mizan Grok - Claude AI Powered Assistant

**Version:** 2.0 (Claude API)
**Date:** January 17, 2026
**By:** Hamza

---

## 🎯 What is This?

This is **Mizan Grok** - an intelligent AI assistant powered by **Claude API (Anthropic)** that has complete knowledge of Mizan Media's entire history:

- **547,693 events** analyzed
- **5.4 years** of data (2020-2026)
- **77 specialized AI agents** run
- **120+ JSON files** of analysis (234 MB)
- **Arabic-first** interface and responses

---

## 🆚 What's New in Version 2.0?

### Old Version (v1.0):
- ❌ Simple keyword matching
- ❌ Can't understand natural questions
- ❌ Limited to pre-defined Q&A
- ❌ No conversation context

### New Version (v2.0):
- ✅ **Claude AI** understanding
- ✅ Natural language processing
- ✅ Conversation context (remembers last 20 messages)
- ✅ Deep analysis capabilities
- ✅ Honest & transparent responses

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Web Browser   │
│  (Arabic UI)    │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Express Server │
│  (Node.js)      │
└────────┬────────┘
         │ API Call
         ▼
┌─────────────────┐
│  Claude API     │
│  (Anthropic)    │
└────────┬────────┘
         │ Embedded in System Prompt
         ▼
┌─────────────────────────────┐
│  MIZAN_KNOWLEDGE_BASE.md    │
│  (Complete company data)    │
└─────────────────────────────┘
```

---

## 📦 Installation

### Prerequisites:
- **Node.js 18+**
- **Claude API Key** from https://console.anthropic.com

### Steps:

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment:**
```bash
cp .env.example .env
```

3. **Add your Claude API Key to `.env`:**
```
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

4. **Start server:**
```bash
npm start
```

5. **Open browser:**
```
http://localhost:3000
```

---

## 🔧 Configuration

### Environment Variables (`.env`):

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional
PORT=3000
```

### Server Options:

```javascript
// In grok-api-server.js

// Change model (default: sonnet-4)
model: 'claude-sonnet-4-20250514'

// Change max tokens (default: 4096)
max_tokens: 4096

// Change conversation history limit (default: 20)
if (history.length > 20) { ... }
```

---

## 🌐 API Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "service": "Mizan Grok API",
  "timestamp": "2026-01-17T...",
  "knowledge_base_loaded": true
}
```

### `POST /api/chat`
Send a message and get response.

**Request:**
```json
{
  "message": "ما أكبر مشاكل ميزان؟",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "response": "أكبر 3 مشاكل في ميزان هي...",
  "sessionId": "muawiya-1234567890",
  "conversationLength": 2
}
```

### `POST /api/clear`
Clear conversation history.

**Request:**
```json
{
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "message": "تم مسح المحادثة بنجاح",
  "sessionId": "muawiya-1234567890"
}
```

### `GET /api/history/:sessionId?`
Get conversation history.

**Response:**
```json
{
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "sessionId": "muawiya-1234567890",
  "length": 10
}
```

---

## 📊 Knowledge Base

The knowledge base (`MIZAN_KNOWLEDGE_BASE.md`) contains:

### Data Sources:
- ✅ Financial events (1,729 transactions)
- ✅ WhatsApp tasks (17,664 extracted)
- ✅ Meetings (2,655 meetings, 275 decisions)
- ✅ Problems (888 identified issues)
- ✅ Deliverables (8,777 deliveries)
- ✅ Team performance (6 people analyzed)
- ✅ Client health (5 clients scored)
- ✅ Patterns & trends (weekly, daily, monthly)

### Analysis Results:
- ✅ Total revenue: 3,514,969.14 OMR
- ✅ Active clients: 5
- ✅ Team members: 6
- ✅ Average payment cycle: 14.1 days
- ✅ Unpaid invoices: 9
- ✅ Debt: 15,640 OMR

### Critical Issues Identified:
- 🔴 Founder burnout (Muawiya: 40% of all work)
- 🔴 Cash flow crisis (15,640 OMR debt)
- 🔴 Revenue concentration (67.6% from 2 clients)
- 🔴 Low problem resolution rate (0.34%)

---

## 💡 System Prompt Design

The system prompt is carefully crafted to:

1. **Embed complete knowledge** - All data in a single prompt
2. **Set clear role** - Assistant for Muawiya about his company
3. **Define personality** - Friendly, professional, honest
4. **Handle sensitive topics** - Transparent about Hamza's work
5. **Use Arabic** - All responses in Arabic
6. **Provide context** - Strategic insights, not just data

**Key sections:**
- Role definition
- Response style guidelines
- Sensitive topic handling
- Complete knowledge base (embedded)
- Example interactions

---

## 🧪 Testing

### Manual Testing:

```bash
# Start server
npm start

# In another terminal, test health:
curl http://localhost:3000/health

# Test chat:
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"ما أكبر مشاكل ميزان؟"}'
```

### Browser Testing:
1. Open `http://localhost:3000`
2. Click quick questions
3. Try natural questions
4. Test conversation context

### Example Questions to Test:

**Simple:**
- كم عميل لدينا؟
- من أكثر شخص منتج؟

**Complex:**
- ما أكبر 3 مشاكل وكيف نحلها؟
- قارن أداء معاوية ومعاذ

**Contextual:**
- (After asking about clients) "وما health score كل واحد؟"
- (After mentioning a problem) "كيف نحلها؟"

**Sensitive:**
- ماذا عمل حمزة ببياناتي؟
- لماذا عمل بدون إذن؟

---

## 📁 Project Structure

```
Mizan_Synthesis_Project/
├── grok-api-server.js           # Main API server
├── public/
│   └── index.html               # Web interface
├── package.json                 # Node.js config
├── .env.example                 # Environment template
├── .env                         # Your keys (create this!)
├── MIZAN_KNOWLEDGE_BASE.md      # Complete knowledge base
├── دليل_التشغيل_السريع.md       # Arabic quick start
├── README_CLAUDE_VERSION.md     # This file
└── outputs/                     # Analysis results
    ├── 00_master_summary.json
    ├── 01_financial_events.json
    └── ... (120+ files)
```

---

## 🚀 Deployment Options

### Option 1: Local (Development)
```bash
npm start
# Access: http://localhost:3000
```

### Option 2: Cloud (Production)

**Deploy to Railway:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up

# Add API key
railway variables set ANTHROPIC_API_KEY=sk-ant-...
```

**Deploy to Render:**
1. Push to GitHub
2. Connect repo to Render
3. Add environment variable: `ANTHROPIC_API_KEY`
4. Deploy

**Deploy to Fly.io:**
```bash
# Install flyctl
brew install flyctl

# Launch
fly launch

# Set secret
fly secrets set ANTHROPIC_API_KEY=sk-ant-...

# Deploy
fly deploy
```

---

## 💰 Cost Estimation

### Claude API Pricing (Sonnet 4):
- **Input:** $3.00 per million tokens
- **Output:** $15.00 per million tokens

### Typical Usage:
- **Knowledge base:** ~50K tokens (embedded once per request)
- **User question:** ~50 tokens
- **Response:** ~500 tokens average

### Cost per Request:
- Input: 50,050 tokens = $0.15
- Output: 500 tokens = $0.0075
- **Total:** ~$0.16 per request

### Monthly Estimates:
- **100 questions:** $16
- **500 questions:** $80
- **1000 questions:** $160

**Note:** Claude API is cheaper than running local LLMs when factoring in server costs!

---

## 🔒 Security Considerations

### ⚠️ Important:
1. **Never commit `.env`** to git
2. **API Key is sensitive** - treat like a password
3. **Knowledge base contains private data** - don't share publicly
4. **Use HTTPS in production**
5. **Rate limit API calls** (not implemented yet)

### Recommendations:
- [ ] Add rate limiting (express-rate-limit)
- [ ] Add authentication for production
- [ ] Implement API key rotation
- [ ] Add logging (Winston, Pino)
- [ ] Monitor costs (Anthropic dashboard)

---

## 🐛 Troubleshooting

### API Key Issues:
```
Error: 401 Unauthorized
```
**Fix:** Check `.env` file has correct API key

### CORS Issues:
```
Access-Control-Allow-Origin error
```
**Fix:** Already handled with `cors` package

### Knowledge Base Too Large:
```
Error: Context length exceeded
```
**Fix:** Current size is fine (~50K tokens). If needed, summarize.

### Slow Responses:
**Normal!** Claude thinks deeply.
- Simple: 2-5 seconds
- Complex: 5-15 seconds
- Deep analysis: 15-30 seconds

---

## 📈 Future Improvements

### Planned:
- [ ] Add authentication (JWT)
- [ ] Implement rate limiting
- [ ] Add caching (Redis)
- [ ] Add logging & monitoring
- [ ] Add analytics dashboard
- [ ] Multi-user support
- [ ] Export conversations (PDF)
- [ ] Voice input (Arabic)

### Ideas:
- [ ] Scheduled reports (daily/weekly)
- [ ] Email notifications for critical issues
- [ ] Integration with Slack/WhatsApp
- [ ] Mobile app (React Native)
- [ ] Offline mode (with cached responses)

---

## 🤝 Contributing

This is a private project for Mizan Media, but if you want to extend it:

1. Fork the repo
2. Create feature branch
3. Test thoroughly
4. Submit pull request

---

## 📄 License

MIT License - See LICENSE file

---

## 👥 Credits

**Developed by:** Hamza
**Powered by:** Claude AI (Anthropic)
**Date:** January 17, 2026
**For:** Muawiya Alrawahi (Mizan Media)

### Technologies Used:
- **Claude Sonnet 4** - AI Model
- **Node.js & Express** - Backend
- **Anthropic SDK** - API Client
- **Pure HTML/CSS/JS** - Frontend (no frameworks!)

---

## 📞 Support

For issues or questions:
1. Check this README
2. Check `دليل_التشغيل_السريع.md` (Arabic guide)
3. Review Anthropic docs: https://docs.anthropic.com
4. Check server logs in Terminal

---

**Made with ❤️ for Mizan Media**

**🚀 Ready to deploy and use!**
