// src/utils/proxyPool.js
const url = require('url');

class ProxyPool {
  constructor(proxyListString) {
    this.proxies = (proxyListString || '').split(',').map(s => s.trim()).filter(Boolean);
    this.index = 0;
  }

  hasProxies() {
    return this.proxies.length > 0;
  }

  next() {
    if (!this.hasProxies()) return null;
    const p = this.proxies[this.index % this.proxies.length];
    this.index++;
    return p;
  }

  // retorna configuração compatível com axios (protocol+host+port+auth)
  parse(proxyString) {
    if (!proxyString) return null;
    const u = url.parse(proxyString);
    const auth = u.auth ? u.auth.split(':') : null;
    return {
      protocol: u.protocol ? u.protocol.replace(':','') : 'http',
      host: u.hostname,
      port: u.port ? parseInt(u.port,10) : (u.protocol === 'https:' ? 443 : 80),
      auth: auth ? { username: auth[0], password: auth[1] } : undefined,
      raw: proxyString
    };
  }
}

module.exports = ProxyPool;
