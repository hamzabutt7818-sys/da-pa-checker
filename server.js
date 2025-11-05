const express = require('express');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Basic middleware for logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

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
    
    if (!data || !data.response || !data.response[0]) {
      return res.status(404).json({
        ok: false,
        message: 'No data found for this domain',
        domain: domain
      });
    }

    const item = data.response[0];
    // Return a consistent response shape: metrics object + raw
    return res.json({
      ok: true,
      provider: 'OpenPageRank',
      domain: item.domain || domain,
      metrics: {
        page_rank_decimal: typeof item.page_rank_decimal === 'number' && Number.isFinite(item.page_rank_decimal)
          ? Number(item.page_rank_decimal.toFixed(2))
          : null,
        page_rank_integer: typeof item.page_rank_integer === 'number' ? item.page_rank_integer : null,
        rank: typeof item.rank === 'number' ? item.rank : null,
        status_code: item.status_code ?? 200
      },
      raw: item
    });
  } catch (e) {
    console.error('API Error:', e);
    return res.status(500).json({ 
      ok: false, 
      message: 'OPR error', 
      details: e?.response?.data || e.message,
      domain: domain
    });
  }
});

// health check
app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});