const axios = require('axios');

function cleanDomain(input = '') {
  return String(input)
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const domain = cleanDomain(req.query.domain || '');
  
  if (!domain) {
    return res.status(400).json({ 
      ok: false, 
      message: 'Domain required' 
    });
  }

  const apiKey = process.env.OPR_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ 
      ok: false, 
      message: 'API key missing' 
    });
  }

  try {
    const url = `https://openpagerank.com/api/v1.0/getPageRank?domains[]=${encodeURIComponent(domain)}`;
    const { data } = await axios.get(url, { 
      headers: { 'API-OPR': apiKey } 
    });
    
    const item = (data.response && data.response[0]) || {};
    
    return res.status(200).json({
      ok: true,
      provider: 'openpagerank',
      domain: item.domain || domain,
      page_rank_decimal: item.page_rank_decimal ?? null,
      page_rank_integer: item.page_rank_integer ?? null,
      rank: item.rank ?? null,
      status_code: item.status_code ?? null
    });
  } catch (e) {
    console.error('OPR API Error:', e.message);
    return res.status(500).json({ 
      ok: false, 
      message: 'OpenPageRank API error', 
      details: e?.response?.data || e.message 
    });
  }
};