// src/utils/headers.js
function buildHeaders({ region = 'US', referer = 'https://ads.tiktok.com/creativecenter' } = {}) {
  return {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': referer,
    'Origin': 'https://ads.tiktok.com',
    'Sec-Fetch-Site': 'same-origin'
  };
}

module.exports = { buildHeaders };
