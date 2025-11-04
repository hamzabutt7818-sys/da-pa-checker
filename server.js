const express = require('express');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Serve static files with correct mime types
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// static files
app.use(express.static(path.join(__dirname, 'public')));

// helper: domain saaf karo
function cleanDomain(input = '') {
  return String(input)
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}

// API route: Open PageRank
app.get('/api/oprank', async (req, res) => {
  const domain = cleanDomain(req.query.domain || '');
  if (!domain) return res.status(400).json({ ok: false, message: 'domain required' });
  if (!process.env.OPR_API_KEY) return res.status(500).json({ ok: false, message: 'API key missing' });

  try {
    const url = `https://openpagerank.com/api/v1.0/getPageRank?domains[]=${encodeURIComponent(domain)}`;
    const { data } = await axios.get(url, { headers: { 'API-OPR': process.env.OPR_API_KEY } });
    const item = (data.response && data.response[0]) || {};
    return res.json({
      ok: true,
      provider: 'openpagerank',
      domain: item.domain || domain,
      page_rank_decimal: item.page_rank_decimal ?? null,
      page_rank_integer: item.page_rank_integer ?? null
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'OPR error', details: e?.response?.data || e.message });
  }
});

// health check
app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});