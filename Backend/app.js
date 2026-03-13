require('dotenv').config();
const express = require('express');
const app = express();
const PORT = 3000;

const CANVAS_BASE = 'https://q.utoronto.ca';

app.use(express.json({ limit: '5mb' }));

// ---------------------------------------------------------------------------
// Canvas API proxy — forwards requests to q.utoronto.ca, avoids CORS issues.
// Token is passed from the frontend in the Authorization header; never stored.
// ---------------------------------------------------------------------------

app.all('/api/canvas/*path', async (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  // Build the Canvas URL from everything after /api/canvas
  const canvasPath = Array.isArray(req.params.path) ? req.params.path.join('/') : req.params.path;
  const qs = new URLSearchParams(req.query).toString();
  const canvasUrl = `${CANVAS_BASE}/${canvasPath}${qs ? '?' + qs : ''}`;

  try {
    const canvasRes = await fetch(canvasUrl, {
      method: req.method,
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method)
        ? JSON.stringify(req.body)
        : undefined,
    });

    // Forward status
    res.status(canvasRes.status);

    // Forward the Link header (needed for pagination) — rewrite Canvas URLs to proxy URLs
    const linkHeader = canvasRes.headers.get('link');
    if (linkHeader) {
      const rewritten = linkHeader.replace(
        /https?:\/\/q\.utoronto\.ca\//g,
        '/api/canvas/'
      );
      res.set('link', rewritten);
    }

    // Forward body
    const data = await canvasRes.text();
    const contentType = canvasRes.headers.get('content-type') || '';
    res.set('Content-Type', contentType);
    res.send(data);
  } catch (err) {
    console.error('Canvas proxy error:', err.message);
    res.status(502).json({ error: 'Failed to reach Canvas API' });
  }
});

// ---------------------------------------------------------------------------
// AI Chat — powered by AWS Bedrock (Amazon Nova Pro)
// ---------------------------------------------------------------------------

const { chat } = require('./ai-service');
const { trimForAI } = require('./ai-context');
const { processSyllabusPdfs } = require('./syllabus-ocr');

const sessions = new Map(); // sessionId -> { context, messages, lastActivity }
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Cleanup stale sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      sessions.delete(id);
      console.log(`Session ${id} expired`);
    }
  }
}, 5 * 60 * 1000);

app.post('/api/chat', async (req, res) => {
  const { message, canvasData, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  let session;

  if (sessionId && sessions.has(sessionId)) {
    session = sessions.get(sessionId);
  } else {
    // New session — extract syllabus PDFs then trim canvas data for AI context
    if (canvasData) await processSyllabusPdfs(canvasData);
    const trimmed = canvasData ? trimForAI(canvasData) : null;
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    session = {
      id,
      context: trimmed ? JSON.stringify(trimmed) : '{}',
      messages: [],
      lastActivity: Date.now(),
    };
    sessions.set(id, session);
  }

  session.messages.push({ role: 'user', content: message });
  session.lastActivity = Date.now();

  try {
    const reply = await chat(session.context, session.messages);
    session.messages.push({ role: 'assistant', content: reply });
    res.json({ reply, sessionId: session.id });
  } catch (err) {
    console.error('AI chat error:', err.message);
    // Remove the failed user message so conversation stays consistent
    session.messages.pop();
    res.status(502).json({ error: 'AI service error: ' + err.message });
  }
});

// ---------------------------------------------------------------------------
// Syllabus summarizer — extracts weight breakdown via LLM
// ---------------------------------------------------------------------------

app.post('/api/summarize-syllabus', async (req, res) => {
  const { syllabusBody, syllabusFiles, courseName } = req.body;

  if (!syllabusBody && (!syllabusFiles || syllabusFiles.length === 0)) {
    return res.status(400).json({ error: 'No syllabus data provided' });
  }

  try {
    // If we have PDF files, OCR them first
    let fullText = syllabusBody || '';
    if (syllabusFiles && syllabusFiles.length > 0) {
      const { processSyllabusPdfs } = require('./syllabus-ocr');
      const fakeCourse = { syllabusBody: fullText, syllabusFiles, code: courseName };
      await processSyllabusPdfs({ courses: [fakeCourse] });
      fullText = fakeCourse.syllabusBody || fullText;
    }

    if (!fullText || fullText.length < 50) {
      return res.json({ summary: null, weights: [] });
    }

    // Use the AI to extract a structured summary
    const { chat: invokeChat } = require('./ai-service');
    const prompt = `Given this course syllabus text, extract:
1. A concise 2-3 sentence summary of the course
2. The grade weight breakdown as a JSON array

Respond in EXACTLY this format (no other text):
SUMMARY: <your summary>
WEIGHTS: [{"category": "...", "weight": <number>}, ...]

If no weights are found, return WEIGHTS: []

Syllabus text:
${fullText.slice(0, 6000)}`;

    const reply = await invokeChat('', [{ role: 'user', content: prompt }]);

    // Parse the response
    const summaryMatch = reply.match(/SUMMARY:\s*(.+?)(?=\nWEIGHTS:)/s);
    const weightsMatch = reply.match(/WEIGHTS:\s*(\[[\s\S]*\])/);

    let summary = summaryMatch ? summaryMatch[1].trim() : reply.slice(0, 300);
    let weights = [];
    if (weightsMatch) {
      try { weights = JSON.parse(weightsMatch[1]); } catch {}
    }

    res.json({ summary, weights });
  } catch (err) {
    console.error('Syllabus summarize error:', err.message);
    res.status(502).json({ error: 'Failed to summarize syllabus' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
