const express = require('express');
const path    = require('path');

const app = express();

// Railway (and most cloud platforms) inject a PORT environment variable
// We use that if it exists, otherwise fall back to 3000 for local dev
const PORT = process.env.PORT || 3000;

// ── In-memory store ───────────────────────────────────────────
const urls = {};

// ── Middleware ────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── POST /shorten ─────────────────────────────────────────────
app.post('/shorten', (req, res) => {
  const { originalUrl } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ error: 'No URL provided' });
  }

  const code = generateCode();
  urls[code] = originalUrl;

  console.log(`Shortened: ${originalUrl} → /r/${code}`);

  res.json({ code, shortUrl: `/r/${code}` });
});

// ── GET /r/:code ──────────────────────────────────────────────
app.get('/r/:code', (req, res) => {
  const { code } = req.params;
  const original  = urls[code];

  if (!original) {
    return res.status(404).send('Short URL not found.');
  }

  res.redirect(301, original);
});

// ── Start the server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Snip server running at http://localhost:${PORT}`);
});

// ── Helper ────────────────────────────────────────────────────
function generateCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}