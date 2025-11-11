// src/tiktokClient.js
const axios = require('axios');
const axiosRetry = require('axios-retry');
const { buildHeaders } = require('./utils/headers');
const ProxyPool = require('./utils/proxyPool');
const HttpsProxyAgent = require('https-proxy-agent');
const HttpProxyAgent = require('http-proxy-agent');

const PROXY_POOL = new ProxyPool(process.env.PROXY_LIST || '');
const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);

// helper to build axios instance per-request (to attach proxy agent)
function makeAxiosInstance(proxyConfig) {
  const instance = axios.create({
    timeout: TIMEOUT,
    validateStatus: status => status >= 200 && status < 500 // we'll handle 4xx/5xx explicitly
  });

  axiosRetry(instance, {
    retries: MAX_RETRIES,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
      if (!error || !error.response) return true;
      const status = error.response.status;
      // retry on 429 and 5xx
      return status === 429 || (status >= 500 && status < 600);
    }
  });

  if (proxyConfig) {
    // for https requests use https-proxy-agent; axios proxy config sometimes fails with auth
    const agent = proxyConfig.protocol === 'https' ?
      new HttpsProxyAgent(proxyConfig.raw) :
      new HttpProxyAgent(proxyConfig.raw);
    instance.defaults.httpsAgent = agent;
    instance.defaults.httpAgent = agent;
    // avoid axios internal proxy handling (we use agent)
    instance.defaults.proxy = false;
  }

  return instance;
}

// main fetch function
async function fetchTopAds({ keyword, region='US', page=1, limit=20, objective='CONVERSIONS', likes }, { logger } = {}) {
  if (!keyword) throw Object.assign(new Error('keyword required'), { status: 400 });

  const baseUrl = 'https://ads.tiktok.com/creative_radar_api/v1/top_ads/search';
  const params = {
    region,
    keyword,
    objective,
    page,
    limit
  };
  if (likes) params.likes = likes;

  // rotate proxy per request if proxies configured
  const proxyRaw = PROXY_POOL.next();
  const proxyConfig = proxyRaw ? PROXY_POOL.parse(proxyRaw) : null;
  const axiosInst = makeAxiosInstance(proxyConfig);

  const headers = buildHeaders({ region });

  try {
    const resp = await axiosInst.get(baseUrl, { params, headers });
    const status = resp.status;
    if (status >= 200 && status < 300) {
      // Assumimos que a API devolve JSON - retornamos tal qual (envelope)
      return {
        meta: { fromProxy: !!proxyRaw, proxy: proxyRaw || null, usedParams: params },
        data: resp.data
      };
    } else if (status === 429) {
      const err = new Error('rate_limited');
      err.status = 429;
      throw err;
    } else {
      const err = new Error(`unexpected_status_${status}`);
      err.status = status;
      err.body = resp.data;
      throw err;
    }
  } catch (err) {
    // normalizar erros
    if (!err.status) err.status = err.response ? err.response.status : 500;
    if (logger) logger.debug({ err, params }, 'fetchTopAds error');
    throw err;
  }
}

module.exports = { fetchTopAds };
