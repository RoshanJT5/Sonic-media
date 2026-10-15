/**
 * Shared Supabase REST Client with resilient timeout, retry, and DOMPurify sanitization helper.
 * The Sonic Media Production Client.
 */
const cfg = window.SUPABASE_CONFIG || {};
window.SUPABASE_URL = cfg.URL || window.SUPABASE_URL || '';
window.SUPABASE_ANON = cfg.ANON_KEY || window.SUPABASE_ANON || '';
window.REST_HEADERS = { 
  'apikey': window.SUPABASE_ANON, 
  'Authorization': 'Bearer ' + window.SUPABASE_ANON,
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache'
};

async function sbGet(path, { timeout = 8000, retries = 1 } = {}) {
  const base = window.SUPABASE_URL;
  const rawUrl = path.startsWith('http') ? path : `${base}/rest/v1/${path}`;
  const separator = rawUrl.includes('?') ? '&' : '?';
  const url = `${rawUrl}${separator}_t=${Date.now()}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { headers: window.REST_HEADERS, cache: 'no-cache', signal: ctrl.signal });
      if (res.ok) return await res.json();
      if (res.status < 500 && res.status !== 429) return null; // do not retry client 4xx
    } catch (_) {
      // network error or timeout: retry next attempt
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

function sbSanitize(html) {
  if (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) {
    return DOMPurify.sanitize(html);
  }
  return String(html || '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

function sbEscapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[s]));
}

window.sbGet = sbGet;
window.sbSanitize = sbSanitize;
window.sbEscapeHtml = sbEscapeHtml;
