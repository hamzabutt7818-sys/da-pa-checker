// api/oprank.js  (Vercel serverless function)
const axios = require('axios');

function cleanDomain(input = '') {
  return String(input).trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}

module.exports = async (req, res) => {
  try {
    const domain = cleanDomain((req.query.domain || '').toString());
    if (!domain) return res.status(400).json({ ok: false, message: 'domain required' });

    const key = process.env.OPR_API_KEY;
    if (!key) return res.status(500).json({ ok: false, message: 'OPR_API_KEY missing' });

    const url = `https://openpagerank.com/api/v1.0/getPageRank?domains[]=${encodeURIComponent(domain)}`;
    const { data } = await axios.get(url, { headers: { 'API-OPR': key } });
    const item = (data.response && data.response[0]) || {};
    return res.status(200).json({
      ok: true,
      provider: 'openpagerank',
      domain: item.domain || domain,
      page_rank_decimal: item.page_rank_decimal ?? null,
      page_rank_integer: item.page_rank_integer ?? null
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'OPR error', details: e?.response?.data || e.message });
  }
};