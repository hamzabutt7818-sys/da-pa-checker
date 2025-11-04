const axios = require('axios');

// Domain cleanup function
function cleanDomain(input = '') {
  return String(input)
    .trim()
    .replace(/^https?:\/\//, '')     // Remove http:// or https://
    .replace(/^www\./, '')            // Remove www.
    .split('/')[0]                    // Remove path
    .toLowerCase();                   // Convert to lowercase
}

module.exports = async (req, res) => {
  // CORS headers - Allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get and clean domain from query
  const domain = cleanDomain(req.query.domain || '');
  
  // Validate domain
  if (!domain) {
    return res.status(400).json({ 
      ok: false, 
      message: 'Domain parameter is required',
      example: '/api/oprank?domain=example.com'
    });
  }

  // Check API key
  const apiKey = process.env.OPR_API_KEY || 'wo80ok4sks0o4wog8404wogs484s0cc0owckk8g8';
  
  if (!apiKey) {
    return res.status(500).json({ 
      ok: false, 
      message: 'API key not configured in environment variables'
    });
  }

  try {
    // Call OpenPageRank API
    const oprResponse = await axios.get(
      `https://openpagerank.com/api/v1.0/getPageRank?domains[]=${encodeURIComponent(domain)}`,
      {
        headers: { 'API-OPR': apiKey },
        timeout: 10000
      }
    );
    
    const data = oprResponse.data;
    const item = (data.response && data.response[0]) || {};
    
    // Check if domain was found
    if (item.status_code === 404) {
      return res.status(404).json({
        ok: false,
        message: 'Domain not found in OpenPageRank database',
        domain: domain
      });
    }
    
    // Return success response
    return res.status(200).json({
      ok: true,
      provider: 'OpenPageRank',
      domain: item.domain || domain,
      metrics: {
        page_rank_decimal: item.page_rank_decimal ?? 0,
        page_rank_integer: item.page_rank_integer ?? 0,
        rank: item.rank ?? 'N/A',
        status_code: item.status_code ?? 200
      },
      raw: item // Full raw data
    });
    
  } catch (error) {
    console.error('OpenPageRank API Error:', error.message);
    
    // Handle specific errors
    if (error.response) {
      // API returned an error
      return res.status(error.response.status || 500).json({ 
        ok: false, 
        message: 'OpenPageRank API error',
        error: error.response.data?.error || error.message,
        status: error.response.status
      });
    } else if (error.request) {
      // Request was made but no response
      return res.status(503).json({ 
        ok: false, 
        message: 'OpenPageRank API is not responding',
        error: 'Network timeout or connection error'
      });
    } else {
      // Something else happened
      return res.status(500).json({ 
        ok: false, 
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};