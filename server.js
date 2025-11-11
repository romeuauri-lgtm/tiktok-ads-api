// src/server.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pino = require('pino');
const { fetchTopAds } = require('./tiktokClient');

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });
const app = express();
app.use(helmet());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 60 : 600, // proteger
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Endpoint principal
// GET /api/tiktok/top-ads?keyword=cake&region=US&page=1&limit=20&objective=CONVERSIONS
app.get('/api/tiktok/top-ads', async (req, res) => {
  try {
    const { keyword, region, page, limit, objective, likes } = req.query;
    if (!keyword) return res.status(400).json({ error: 'keyword is required' });

    const params = {
      keyword,
      region: region || process.env.DEFAULT_REGION,
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
      objective: objective || process.env.DEFAULT_OBJECTIVE,
      likes
    };

    const result = await fetchTopAds(params, { logger });
    // retornamos JSON bruto do TikTok (ou envelope)
    return res.json(result);
  } catch (err) {
    logger.error(err, 'fetch top ads error');
    return res.status(err.status || 500).json({ error: err.message || 'internal error' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => logger.info(`tiktok-ads-api listening on ${PORT}`));
