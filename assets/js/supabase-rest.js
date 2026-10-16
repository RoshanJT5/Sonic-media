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
  const url = path.startsWith('http') ? path : `${base}/rest/v1/${path}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      // PostgREST interprets arbitrary query parameters as column filters, so
      // cache busting belongs in the Fetch API rather than in the REST URL.
      const res = await fetch(url, { headers: window.REST_HEADERS, cache: 'no-store', signal: ctrl.signal });
      if (res.ok) return await res.json();
      if (res.status < 500 && res.status !== 429) {
        const error = new Error(`Supabase REST request rejected (${res.status})`);
        error.status = res.status;
        error.url = url;
        console.warn(`[Supabase REST] Request rejected (${res.status}): ${url}`);
        throw error; // a rejected request is not the same as an empty result
      }
      if (attempt === retries) {
        const error = new Error(`Supabase REST request failed (${res.status})`);
        error.status = res.status;
        error.url = url;
        throw error;
      }
    } catch (error) {
      if (error && error.status) throw error;
      // network error or timeout: retry next attempt
      if (attempt === retries) {
        console.warn('[Supabase REST] Request failed:', error);
        throw error;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('Supabase REST request failed');
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
