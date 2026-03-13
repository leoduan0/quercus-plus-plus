const express = require('express');
const app = express();
const PORT = 3000;

const CANVAS_BASE = 'https://q.utoronto.ca';

app.use(express.json());

// ---------------------------------------------------------------------------
// Canvas API proxy — forwards requests to q.utoronto.ca, avoids CORS issues.
// Token is passed from the frontend in the Authorization header; never stored.
// ---------------------------------------------------------------------------

app.all('/api/canvas/*', async (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  // Build the Canvas URL from everything after /api/canvas
  const canvasPath = req.params[0];
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
