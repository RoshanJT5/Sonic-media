/**
 * THE SONIC MEDIA — LIVE VISUAL IN-PLACE CMS ENGINE
 * Allows admins to click any headline, text, button, card, or image directly on the live website,
 * type in-place with Undo / Redo history, Save edits to Supabase + local cache, or Cancel / Keep Original.
 */

(function () {
  'use strict';

  const SUPABASE_URL = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.URL) || window.SUPABASE_URL || '';
  const SUPABASE_ANON = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.ANON_KEY) || window.SUPABASE_ANON || '';
  const ADMIN_STORAGE_KEY = 'sonicmedia_admin_session';

  function getPageId() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    return path === '/' ? 'home' : path.replace(/^\//, '').replace(/\.html$/, '').replace(/[^a-z0-9/_-]+/gi, '-').replace(/\//g, '__');
  }

  const EDITS_STORAGE_KEY = `tsm_live_custom_edits:${getPageId()}`;
  const LIVE_EDITS_ROW_KEY = `live_cms:${getPageId()}`;

  let isEditMode = false;
  let activeEditTarget = null;
  let activeImageTarget = null;

  // History & Snapshot tracking
  let undoStack = [];
  let redoStack = [];
  const pristineSnapshots = new Map(); // key -> { el, val, type } (permanent original template baseline)
  const originalSnapshots = new Map(); // key -> pristine original HTML / src before any edits in session
  const pendingEdits = new Map();      // key -> { el, key, type: 'text'|'image', val, html, text }

  // ── Session & Auth Helper ──
  function getAdminSession() {
    try {
      const s = window.sessionStorage.getItem(ADMIN_STORAGE_KEY) || window.localStorage.getItem(ADMIN_STORAGE_KEY);
      if (!s) return null;
      const parsed = JSON.parse(s);
      return parsed && parsed.access_token ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function getAuthHeader() {
    const s = getAdminSession();
    return s && s.access_token
      ? { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }
      : { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON, 'Content-Type': 'application/json' };
  }

  function notifyContentChanged() {
    try {
      localStorage.removeItem('tsm_supabase_cache');
      localStorage.setItem('tsm_cache_invalidated_at', Date.now().toString());
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('sonic_media_cms');
        channel.postMessage({ type: 'cache_invalidated', at: Date.now() });
        channel.close();
      }
    } catch (_) {}
  }

  // ── Element Key Generator ──
  function getElementKey(el) {
    if (!el) return '';
    if (el.getAttribute('data-cms-key')) return el.getAttribute('data-cms-key');
    if (el.id) {
      const k = '#' + el.id;
      el.setAttribute('data-cms-key', k);
      return k;
    }
    const schema = el.getAttribute('data-cms-schema');
    const field = el.getAttribute('data-cms-field');
    if (schema && field) {
      const k = `[data-cms-schema="${schema}"][data-cms-field="${field}"]`;
      el.setAttribute('data-cms-key', k);
      return k;
    }
    const type = el.getAttribute('data-cms-type');
    const id = el.getAttribute('data-cms-id');
    if (type && id) {
      const k = `[data-cms-type="${type}"][data-cms-id="${id}"]`;
      el.setAttribute('data-cms-key', k);
      return k;
    }
    // Generate stable CSS selector path
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      let part = cur.tagName.toLowerCase();
      if (cur.id) {
        parts.unshift('#' + cur.id);
        break;
      }
      if (cur.className && typeof cur.className === 'string') {
        const primaryClass = cur.className.trim().split(/\s+/).filter(c => !c.startsWith('sonic-') && !c.startsWith('cms-'))[0];
        if (primaryClass) part += '.' + primaryClass;
      }
      const parent = cur.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
        if (siblings.length > 1) {
          part += `:nth-of-type(${siblings.indexOf(cur) + 1})`;
        }
      }
      parts.unshift(part);
      cur = parent;
    }
    const key = parts.join(' > ');
    el.setAttribute('data-cms-key', key);
    return key;
  }

  // ── Inject CMS Styles ──
  function injectStyles() {
    if (document.getElementById('sonic-cms-styles')) return;
    const style = document.createElement('style');
    style.id = 'sonic-cms-styles';
    style.textContent = `
      /* Sonic Live CMS Floating Toolkit Bar */
      #sonicCmsBar {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(0);
        z-index: 2147483640 !important;
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        gap: 8px !important;
        background: rgba(12, 12, 12, 0.95);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 92, 0, 0.45);
        border-radius: 50px;
        padding: 0 14px;
        height: 52px;
        box-sizing: border-box;
        box-shadow: 0 16px 45px rgba(0, 0, 0, 0.9), 0 0 25px rgba(255, 92, 0, 0.22);
        font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        color: #F5F0EB;
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
        user-select: none;
        white-space: nowrap !important;
        max-width: 96vw;
        cursor: default !important;
      }
      #sonicCmsBar.minimized {
        transform: translateX(-50%) translateY(60px);
        opacity: 0.38;
      }
      #sonicCmsBar:hover {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      .cms-badge {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-family: 'Syne', sans-serif;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #FF5C00;
        padding: 0 4px;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        cursor: default !important;
      }
      .cms-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10B981;
        box-shadow: 0 0 8px #10B981;
        animation: cmsPulse 2s infinite;
        flex-shrink: 0;
      }
      @keyframes cmsPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.45; transform: scale(0.85); }
      }
      .cms-bar-divider {
        width: 1px;
        height: 22px;
        background: rgba(255, 255, 255, 0.14);
        margin: 0 2px;
        flex-shrink: 0 !important;
      }
      .cms-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 50px;
        padding: 0 14px !important;
        height: 36px !important;
        color: #F5F0EB;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer !important;
        display: inline-flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        line-height: 1 !important;
        box-sizing: border-box;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
        text-decoration: none;
      }
      .cms-btn span {
        white-space: nowrap !important;
        display: inline-block !important;
        line-height: 1 !important;
        pointer-events: none;
      }
      .cms-btn:hover:not(:disabled):not(.disabled) {
        background: rgba(255, 92, 0, 0.22);
        border-color: #FF5C00;
        color: #FFF;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(255, 92, 0, 0.25);
      }
      .cms-btn.active {
        background: #FF5C00 !important;
        color: #080808 !important;
        border-color: #FF5C00 !important;
        font-weight: 700 !important;
        box-shadow: 0 0 16px rgba(255, 92, 0, 0.4);
      }
      .cms-btn.disabled, .cms-btn:disabled {
        opacity: 0.35 !important;
        cursor: not-allowed !important;
        pointer-events: none;
      }
      .cms-btn-icon-only {
        width: 36px !important;
        height: 36px !important;
        padding: 0 !important;
        border-radius: 50% !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
      }
      .cms-btn-icon-only svg {
        pointer-events: none;
      }
      .cms-btn-save {
        background: rgba(16, 185, 129, 0.15);
        border-color: rgba(16, 185, 129, 0.4);
        color: #6EE7B7;
        font-weight: 700;
      }
      .cms-btn-save.dirty {
        background: #10B981 !important;
        border-color: #10B981 !important;
        color: #080808 !important;
        box-shadow: 0 0 18px rgba(16, 185, 129, 0.5) !important;
        animation: cmsPulseSave 2s infinite ease-in-out;
      }
      @keyframes cmsPulseSave {
        0%, 100% { transform: scale(1); box-shadow: 0 0 12px rgba(16, 185, 129, 0.4); }
        50% { transform: scale(1.02); box-shadow: 0 0 20px rgba(16, 185, 129, 0.65); }
      }
      .cms-btn-save:hover:not(:disabled):not(.disabled) {
        background: #10B981 !important;
        border-color: #10B981 !important;
        color: #080808 !important;
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.5);
      }
      .cms-btn-cancel {
        background: rgba(239, 68, 68, 0.12);
        border-color: rgba(239, 68, 68, 0.38);
        color: #FCA5A5;
        font-weight: 600;
        transition: all 0.2s ease;
      }
      .cms-btn-cancel:hover:not(:disabled):not(.disabled) {
        background: rgba(239, 68, 68, 0.3) !important;
        border-color: #EF4444 !important;
        color: #FFF !important;
        box-shadow: 0 0 16px rgba(239, 68, 68, 0.35);
      }
      .cms-status-badge {
        font-family: 'Syne', sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        padding: 5px 11px;
        border-radius: 50px;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        line-height: 1 !important;
        cursor: default !important;
      }
      .cms-status-badge.clean {
        background: rgba(16, 185, 129, 0.15);
        color: #34D399;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }
      .cms-status-badge.dirty {
        background: rgba(255, 92, 0, 0.22);
        color: #FFB077;
        border: 1px solid rgba(255, 92, 0, 0.55);
        animation: cmsBadgePulse 1.8s infinite;
      }
      @keyframes cmsBadgePulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.65; }
      }
      .cms-btn-subtle {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 50px;
        padding: 0 12px;
        height: 32px;
        color: rgba(245, 240, 235, 0.75);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer !important;
        display: inline-flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 5px;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        line-height: 1 !important;
        box-sizing: border-box;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .cms-btn-subtle span {
        white-space: nowrap !important;
        pointer-events: none;
      }
      .cms-btn-subtle:hover {
        color: #FF5C00;
        border-color: rgba(255, 92, 0, 0.5);
        background: rgba(255, 92, 0, 0.12);
        box-shadow: 0 2px 10px rgba(255, 92, 0, 0.2);
      }
      .cms-btn-min {
        width: 32px !important;
        height: 32px !important;
        padding: 0 !important;
        border-radius: 50% !important;
        font-size: 16px !important;
        font-weight: 700 !important;
      }
      .cms-spin {
        animation: cmsSpin 1s linear infinite;
      }
      @keyframes cmsSpin {
        100% { transform: rotate(360deg); }
      }

      /* Hide custom laggy dot & follower when hovering over CMS bar or modals so native hand pointer shows */
      body.cms-hovering-bar #cursor,
      body.cms-hovering-bar #cursor-follower,
      body.cms-hovering-bar #cursor-trail,
      body.cms-hovering-bar #mouse-glow {
        opacity: 0 !important;
        visibility: hidden !important;
        display: none !important;
        pointer-events: none !important;
      }
      body.cms-hovering-bar,
      body.cms-hovering-bar #sonicCmsBar {
        cursor: default !important;
      }
      body.cms-hovering-bar #sonicCmsBar button,
      body.cms-hovering-bar #sonicCmsBar .cms-btn,
      body.cms-hovering-bar #sonicCmsBar .cms-btn-subtle,
      body.cms-hovering-bar #sonicCmsBar .cms-btn-icon-only,
      body.cms-hovering-bar #sonicCmsBar a,
      body.cms-hovering-bar #sonicCmsBar [onclick],
      body.cms-hovering-bar .cms-modal-box button,
      body.cms-hovering-bar .cms-modal-box .cms-btn {
        cursor: pointer !important;
      }
      body.cms-hovering-bar #sonicCmsBar button *,
      body.cms-hovering-bar #sonicCmsBar .cms-btn *,
      body.cms-hovering-bar #sonicCmsBar .cms-btn-subtle *,
      body.cms-hovering-bar #sonicCmsBar .cms-btn-icon-only * {
        cursor: pointer !important;
      }

      /* Hover & Focus styling for in-place editable elements */
      body.sonic-cms-active [data-cms-editable="text"] {
        outline: 1.5px dashed rgba(255, 92, 0, 0.45) !important;
        outline-offset: 3px;
        cursor: text !important;
        transition: outline 0.15s ease, box-shadow 0.15s ease;
      }
      body.sonic-cms-active [data-cms-editable="text"]:hover {
        outline: 2px dashed #FF5C00 !important;
        outline-offset: 4px;
        box-shadow: 0 0 16px rgba(255, 92, 0, 0.3) !important;
      }
      body.sonic-cms-active [data-cms-editable="text"]:focus {
        outline: 2px solid #FF5C00 !important;
        outline-offset: 4px;
        background: rgba(255, 92, 0, 0.06) !important;
        box-shadow: 0 0 24px rgba(255, 92, 0, 0.45) !important;
        border-radius: 4px;
      }
      body.sonic-cms-active [data-cms-editable="image"] {
        outline: 2px dashed rgba(0, 194, 255, 0.6) !important;
        outline-offset: 4px;
        cursor: pointer !important;
        position: relative;
        transition: all 0.2s ease;
      }
      body.sonic-cms-active [data-cms-editable="image"]:hover {
        outline: 2px solid #00C2FF !important;
        box-shadow: 0 0 20px rgba(0, 194, 255, 0.45) !important;
        transform: scale(1.01);
      }

      /* Structured card overlay details button */
      .cms-card-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 9999;
        background: rgba(14, 14, 14, 0.92);
        border: 1px solid #FF5C00;
        color: #F5F0EB;
        font-family: 'Syne', sans-serif;
        font-size: 11px;
        font-weight: 700;
        padding: 5px 12px;
        border-radius: 50px;
        cursor: pointer;
        display: none;
        align-items: center;
        gap: 5px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.6);
        transition: all 0.2s ease;
      }
      body.sonic-cms-active [data-cms-type]:hover .cms-card-btn,
      body.sonic-cms-active .fw-row:hover .cms-card-btn,
      body.sonic-cms-active .jcard:hover .cms-card-btn,
      body.sonic-cms-active .blog-item:hover .cms-card-btn {
        display: inline-flex;
      }
      .cms-card-btn:hover {
        background: #FF5C00;
        color: #080808;
        transform: scale(1.05);
      }

      /* Image Changer Modal */
      #sonicImgModal, #sonicCmsModal {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.82);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        z-index: 10000000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: cmsFadeIn 0.2s ease;
      }
      @keyframes cmsFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .cms-modal-box {
        background: #111111;
        border: 1px solid rgba(255, 92, 0, 0.4);
        border-radius: 18px;
        width: 100%;
        max-width: 620px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.95), 0 0 30px rgba(255, 92, 0, 0.25);
        font-family: 'DM Sans', sans-serif;
        color: #F5F0EB;
      }
      .cms-modal-header {
        padding: 18px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(255, 255, 255, 0.02);
      }
      .cms-modal-title {
        font-family: 'Syne', sans-serif;
        font-size: 15px;
        font-weight: 700;
        color: #F5F0EB;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .cms-modal-close {
        background: transparent;
        border: none;
        color: rgba(245, 240, 235, 0.5);
        font-size: 22px;
        cursor: pointer;
        line-height: 1;
        transition: color 0.2s;
      }
      .cms-modal-close:hover {
        color: #FF5C00;
      }
      .cms-modal-body {
        padding: 22px 24px;
        overflow-y: auto;
        flex: 1;
      }
      .cms-modal-footer {
        padding: 14px 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        background: rgba(255, 255, 255, 0.02);
      }
      .cms-form-group {
        margin-bottom: 16px;
      }
      .cms-label {
        display: block;
        font-family: 'Syne', sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: rgba(245, 240, 235, 0.6);
        margin-bottom: 8px;
      }
      .cms-input, .cms-textarea {
        width: 100%;
        background: #080808;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 11px 14px;
        color: #F5F0EB;
        font-family: inherit;
        font-size: 13.5px;
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.2s;
      }
      .cms-input:focus, .cms-textarea:focus {
        border-color: #FF5C00;
      }
      .cms-textarea {
        min-height: 100px;
        resize: vertical;
        line-height: 1.6;
      }

      /* CMS Toast Notification */
      #sonicCmsToast {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 10000001;
        background: #111111;
        border: 1px solid #10B981;
        color: #F5F0EB;
        padding: 12px 18px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.85), 0 0 15px rgba(16,185,129,0.3);
        font-family: 'Syne', sans-serif;
        font-size: 13px;
        font-weight: 600;
        display: none;
        align-items: center;
        gap: 10px;
        animation: cmsSlideDown 0.3s ease;
      }
      @keyframes cmsSlideDown {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Toast Helper ──
  function showCmsToast(msg, isSuccess = true) {
    let t = document.getElementById('sonicCmsToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'sonicCmsToast';
      document.body.appendChild(t);
    }
    t.innerHTML = `<span style="color:${isSuccess ? '#10B981' : '#EF4444'}; font-size:16px;">${isSuccess ? '✓' : '⚠'}</span><span>${msg}</span>`;
    t.style.borderColor = isSuccess ? '#10B981' : '#EF4444';
    t.style.display = 'flex';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
      t.style.display = 'none';
    }, 4000);
  }

  // ── Escape Helpers ──
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escapeAttr(str) {
    if (!str) return '';
    return String(str)
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const textSelectors = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', '.lead', 'blockquote', 'figcaption',
    '.hero-eyebrow', '.hero-sub', '.hero-h1',
    '.section-eyebrow', '.section-title', '.section-lead', '.section-sub',
    '.tagline', '.subtitle', '.desc',
    '.bento-title', '.bento-desc', '.bento-tag',
    '.svc-name', '.svc-desc', '.svc-tag', '.svc-num',
    '.stat-num', '.stat-lbl', '.stat-meta',
    '.jcard-title', '.jcard-sub', '.jcard-meta',
    '.fw-name', '.fw-cat', '.fw-title',
    '.blog-title', '.blog-meta', '.blog-cat',
    '.tcard-quote', '.tcard-author', '.tcard-role', '.tcard-tag',
    '.faq-q', '.faq-a',
    '.badge', '.chip',
    '.cta-text', '.cta-title', '.cta-sub',
    '.about-heading', '.about-desc',
    'a.btn', 'button.btn', '.nav-btn', '.btn-primary', '.btn-secondary',
    '.footer-col-title', '.footer-col p', '.footer-link'
  ];

  // ── Tag Known Structured Sections & Cards ──
  function tagStructuredDataAttrs() {
    const heroEyebrow = document.querySelector('.hero-eyebrow');
    if (heroEyebrow) {
      heroEyebrow.setAttribute('data-cms-schema', 'hero');
      heroEyebrow.setAttribute('data-cms-field', 'eyebrow');
    }
    const heroH1 = document.querySelector('.hero-h1');
    if (heroH1) {
      heroH1.setAttribute('data-cms-schema', 'hero');
      heroH1.setAttribute('data-cms-field', 'headlineHtml');
    }
    const heroSub = document.querySelector('.hero-sub');
    if (heroSub) {
      heroSub.setAttribute('data-cms-schema', 'hero');
      heroSub.setAttribute('data-cms-field', 'subheadline');
    }

    const portEyebrows = document.querySelectorAll('#port-eyebrow, .page-studio .section-eyebrow, #page-portfolio-eyebrow');
    portEyebrows.forEach(el => {
      el.setAttribute('data-cms-schema', 'portfolio');
      el.setAttribute('data-cms-field', 'eyebrow');
    });
    const portTitles = document.querySelectorAll('#port-title-main, #page-studio-title, #page-portfolio-title');
    portTitles.forEach(el => {
      el.setAttribute('data-cms-schema', 'portfolio');
      el.setAttribute('data-cms-field', 'titleCompound');
    });
    const portTaglines = document.querySelectorAll('#port-tagline, #page-portfolio-tagline');
    portTaglines.forEach(el => {
      el.setAttribute('data-cms-schema', 'portfolio');
      el.setAttribute('data-cms-field', 'tagline');
    });

    const aboutHeadings = document.querySelectorAll('#about h2, .about-heading');
    aboutHeadings.forEach(el => {
      el.setAttribute('data-cms-schema', 'about');
      el.setAttribute('data-cms-field', 'headingHtml');
    });
    const aboutDescs = document.querySelectorAll('#about p, .about-desc');
    aboutDescs.forEach(el => {
      el.setAttribute('data-cms-schema', 'about');
      el.setAttribute('data-cms-field', 'body');
    });

    // 2. Structured Cards (Portfolio, Case Study, Journal)
    const fwRows = document.querySelectorAll('.fw-row');
    fwRows.forEach(row => {
      const onclickAttr = row.getAttribute('onclick') || '';
      const match = onclickAttr.match(/openWorkDetail\(['"]([^'"]+)['"]\)/);
      if (match) {
        const id = match[1];
        row.setAttribute('data-cms-type', 'portfolio-item');
        row.setAttribute('data-cms-id', id);
        if (!row.querySelector('.cms-card-btn')) {
          const btn = document.createElement('button');
          btn.className = 'cms-card-btn';
          btn.innerHTML = '⚙️ Details';
          btn.title = `Edit structured details for ${id}`;
          btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openInlineEditor(row);
          };
          row.style.position = 'relative';
          row.appendChild(btn);
        }
      }
    });

    const jcards = document.querySelectorAll('.jcard');
    jcards.forEach(card => {
      const onclickAttr = card.getAttribute('onclick') || '';
      const match = onclickAttr.match(/openCaseStudy\(['"]([^'"]+)['"]\)/);
      if (match) {
        const id = match[1];
        card.setAttribute('data-cms-type', 'case-item');
        card.setAttribute('data-cms-id', id);
        if (!card.querySelector('.cms-card-btn')) {
          const btn = document.createElement('button');
          btn.className = 'cms-card-btn';
          btn.innerHTML = '⚙️ Details';
          btn.title = `Edit case study details for ${id}`;
          btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openInlineEditor(card);
          };
          card.style.position = 'relative';
          card.appendChild(btn);
        }
      }
    });

    const blogItems = document.querySelectorAll('.blog-item');
    blogItems.forEach(item => {
      const btn = item.querySelector('[onclick*="openBlogArticle"]');
      if (btn) {
        const onclickAttr = btn.getAttribute('onclick') || '';
        const match = onclickAttr.match(/openBlogArticle\(['"]([^'"]+)['"]\)/);
        if (match) {
          const id = match[1];
          item.setAttribute('data-cms-type', 'journal-item');
          item.setAttribute('data-cms-id', id);
          if (!item.querySelector('.cms-card-btn')) {
            const cardBtn = document.createElement('button');
            cardBtn.className = 'cms-card-btn';
            cardBtn.innerHTML = '⚙️ Details';
            cardBtn.title = `Edit article details for ${id}`;
            cardBtn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              openInlineEditor(item);
            };
            item.style.position = 'relative';
            item.appendChild(cardBtn);
          }
        }
      }
    });
  }

  // ── Permanent Pristine Baseline Snapshot (Captured at initial load) ──
  function capturePristineBaseline() {
    if (pristineSnapshots.size > 0) return;
    tagStructuredDataAttrs();

    const elements = document.querySelectorAll(textSelectors.join(', '));
    elements.forEach(el => {
      if (el.closest('#sonicCmsBar') || el.closest('#sonicCmsModal') || el.closest('#sonicImgModal') || el.closest('#sonicCmsToast') || el.closest('.brand-logo') || el.classList.contains('cms-card-btn')) return;
      if (el.children.length > 0 && Array.from(el.children).some(c => /^(H[1-6]|P|DIV|SECTION)$/i.test(c.tagName))) return;
      const key = getElementKey(el);
      if (!pristineSnapshots.has(key)) {
        pristineSnapshots.set(key, { el, val: el.innerHTML, type: 'text' });
      }
      if (!originalSnapshots.has(key)) {
        originalSnapshots.set(key, el.innerHTML);
      }
    });

    const imgs = document.querySelectorAll('img:not(.brand-logo):not(.cms-img-thumb)');
    imgs.forEach(img => {
      if (img.closest('#sonicCmsBar') || img.closest('#sonicCmsModal') || img.closest('#sonicImgModal')) return;
      const key = getElementKey(img);
      if (!pristineSnapshots.has(key)) {
        pristineSnapshots.set(key, { el: img, val: img.src, type: 'image' });
      }
      if (!originalSnapshots.has(key)) {
        originalSnapshots.set(key, img.src);
      }
    });
  }

  // ── Universal In-Place Tagging & Contenteditable Enabler ──
  function tagEditableElements() {
    tagStructuredDataAttrs();

    const elements = document.querySelectorAll(textSelectors.join(', '));
    elements.forEach(el => {
      // Skip CMS elements, scripts, svg, and brand logos
      if (el.closest('#sonicCmsBar') || el.closest('#sonicCmsModal') || el.closest('#sonicImgModal') || el.closest('#sonicCmsToast') || el.closest('.brand-logo') || el.classList.contains('cms-card-btn')) {
        return;
      }
      // Skip elements that contain other block headings to avoid nested contenteditable glitches
      if (el.children.length > 0 && Array.from(el.children).some(c => /^(H[1-6]|P|DIV|SECTION)$/i.test(c.tagName))) {
        return;
      }

      const key = getElementKey(el);
      // Store initial original baseline snapshot once per session
      if (!pristineSnapshots.has(key)) {
        pristineSnapshots.set(key, { el, val: el.innerHTML, type: 'text' });
      }
      if (!originalSnapshots.has(key)) {
        originalSnapshots.set(key, el.innerHTML);
      }

      el.setAttribute('data-cms-editable', 'text');
      el.contentEditable = isEditMode ? 'true' : 'false';
      el.spellcheck = false;

      // Attach event listeners only once
      if (!el._hasCmsListeners) {
        el._hasCmsListeners = true;

        el.addEventListener('focus', function () {
          if (!isEditMode) return;
          el._focusHtml = el.innerHTML;
        });

        el.addEventListener('input', function () {
          if (!isEditMode) return;
          markElementDirty(el, key, 'text', el.innerHTML, el.innerText);
        });

        el.addEventListener('blur', function () {
          if (!isEditMode) return;
          if (el._focusHtml !== undefined && el._focusHtml !== el.innerHTML) {
            pushHistory({
              type: 'text',
              key: key,
              el: el,
              oldVal: el._focusHtml,
              newVal: el.innerHTML
            });
            el._focusHtml = el.innerHTML;
          }
        });
      }
    });

    // 4. Content Images
    const imgs = document.querySelectorAll('img:not(.brand-logo):not(.cms-img-thumb)');
    imgs.forEach(img => {
      if (img.closest('#sonicCmsBar') || img.closest('#sonicCmsModal') || img.closest('#sonicImgModal')) return;
      const key = getElementKey(img);
      if (!pristineSnapshots.has(key)) {
        pristineSnapshots.set(key, { el: img, val: img.src, type: 'image' });
      }
      if (!originalSnapshots.has(key)) {
        originalSnapshots.set(key, img.src);
      }
      img.setAttribute('data-cms-editable', 'image');
      img.setAttribute('data-cms-label', '🖼️ Click to Change Image');
    });
  }

  // ── Dirty State & Pending Edits Tracker ──
  function markElementDirty(el, key, type, val, text = '') {
    const pristine = pristineSnapshots.get(key);
    const baselineVal = pristine ? pristine.val : originalSnapshots.get(key);
    if (baselineVal !== undefined && baselineVal === val) {
      pendingEdits.delete(key);
    } else {
      pendingEdits.set(key, { el, key, type, val, html: val, text });
    }
    updateToolbarState();
  }

  // ── History: Undo & Redo ──
  function pushHistory(action) {
    undoStack.push(action);
    redoStack = []; // Clear redo stack on new edit
    updateToolbarState();
  }

  window._sonicCmsUndo = function () {
    // If user is currently typing in an editable element, commit its current typing state to history first
    if (document.activeElement && document.activeElement.getAttribute('data-cms-editable') === 'text') {
      const activeEl = document.activeElement;
      if (activeEl._focusHtml !== undefined && activeEl._focusHtml !== activeEl.innerHTML) {
        const key = getElementKey(activeEl);
        pushHistory({
          type: 'text',
          key: key,
          el: activeEl,
          oldVal: activeEl._focusHtml,
          newVal: activeEl.innerHTML
        });
        activeEl._focusHtml = activeEl.innerHTML;
      }
    }

    if (undoStack.length === 0) return;
    const action = undoStack.pop();
    redoStack.push(action);

    let targetEl = (action.el && action.el.isConnected) ? action.el : null;
    if (!targetEl) {
      try { targetEl = document.querySelector(`[data-cms-key="${CSS.escape(action.key)}"]`); } catch (_) {}
      if (!targetEl) {
        try { targetEl = document.querySelector(action.key); } catch (_) {}
      }
    }

    if (action.type === 'text' && targetEl) {
      targetEl.innerHTML = action.oldVal;
      targetEl._focusHtml = action.oldVal;
      markElementDirty(targetEl, action.key, 'text', action.oldVal, targetEl.innerText);
    } else if (action.type === 'image' && targetEl) {
      targetEl.src = action.oldVal;
      markElementDirty(targetEl, action.key, 'image', action.oldVal);
    }

    updateToolbarState();
    showCmsToast('↶ Undone last edit', true);
  };

  window._sonicCmsRedo = function () {
    if (redoStack.length === 0) return;
    const action = redoStack.pop();
    undoStack.push(action);

    let targetEl = (action.el && action.el.isConnected) ? action.el : null;
    if (!targetEl) {
      try { targetEl = document.querySelector(`[data-cms-key="${CSS.escape(action.key)}"]`); } catch (_) {}
      if (!targetEl) {
        try { targetEl = document.querySelector(action.key); } catch (_) {}
      }
    }

    if (action.type === 'text' && targetEl) {
      targetEl.innerHTML = action.newVal;
      targetEl._focusHtml = action.newVal;
      markElementDirty(targetEl, action.key, 'text', action.newVal, targetEl.innerText);
    } else if (action.type === 'image' && targetEl) {
      targetEl.src = action.newVal;
      markElementDirty(targetEl, action.key, 'image', action.newVal);
    }

    updateToolbarState();
    showCmsToast('↷ Redone edit', true);
  };

  // ── Update Toolbar UI (Buttons, Disabled States, Badges) ──
  function updateToolbarState() {
    const undoBtn = document.getElementById('cmsUndoBtn');
    const redoBtn = document.getElementById('cmsRedoBtn');
    const saveBtn = document.getElementById('cmsSaveAllBtn');
    const cancelBtn = document.getElementById('cmsCancelAllBtn');
    const badge = document.getElementById('cmsStatusBadge');

    const hasUndo = undoStack.length > 0;
    const hasRedo = redoStack.length > 0;
    const pendingCount = pendingEdits.size;
    const hasStoredCustomEdits = !!localStorage.getItem(EDITS_STORAGE_KEY);
    const canCancel = pendingCount > 0 || hasStoredCustomEdits || hasUndo;

    if (undoBtn) {
      undoBtn.classList.toggle('disabled', !hasUndo);
      undoBtn.disabled = !hasUndo;
    }
    if (redoBtn) {
      redoBtn.classList.toggle('disabled', !hasRedo);
      redoBtn.disabled = !hasRedo;
    }
    if (saveBtn) {
      saveBtn.classList.toggle('disabled', pendingCount === 0);
      saveBtn.disabled = pendingCount === 0;
      saveBtn.classList.toggle('dirty', pendingCount > 0);
    }
    if (cancelBtn) {
      cancelBtn.classList.toggle('disabled', !canCancel);
      cancelBtn.disabled = !canCancel;
      cancelBtn.style.opacity = canCancel ? '1' : '0.45';
    }
    if (badge) {
      if (pendingCount > 0) {
        badge.className = 'cms-status-badge dirty';
        badge.textContent = `${pendingCount} Unsaved`;
      } else {
        badge.className = 'cms-status-badge clean';
        badge.textContent = 'All Saved';
      }
    }
  }

  // ── Save All Changes (Local Cache + Supabase Cloud Sync) ──
  window._sonicCmsSaveAll = async function () {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    await new Promise(r => setTimeout(r, 20));

    if (pendingEdits.size === 0) {
      showCmsToast('All edits are already saved!', true);
      return;
    }

    const saveBtn = document.getElementById('cmsSaveAllBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `
        <svg class="cms-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <span>Saving...</span>
      `;
    }

    try {
      // 1. Persist to localStorage under 'tsm_live_custom_edits'
      let storedEdits = {};
      try {
        storedEdits = JSON.parse(localStorage.getItem(EDITS_STORAGE_KEY) || '{}');
      } catch (_) {}

      pendingEdits.forEach((item, key) => {
        storedEdits[key] = {
          key: key,
          type: item.type,
          val: item.val,
          text: item.text || '',
          timestamp: Date.now()
        };
      });
      localStorage.setItem(EDITS_STORAGE_KEY, JSON.stringify(storedEdits));

      // 2. Prepare Cloud Sync to Supabase
      const syncPromises = [];
      const siteContentEdits = {};
      const pageEdits = {};

      pendingEdits.forEach((item, key) => {
        const el = item.el;
        if (!el) return;
        const schema = el.getAttribute('data-cms-schema');
        const field = el.getAttribute('data-cms-field');
        const type = el.getAttribute('data-cms-type');
        const id = el.getAttribute('data-cms-id');

        // Every visual edit is also stored in a page-scoped row. This is the
        // canonical record used on refresh and displayed in the admin panel.
        pageEdits[key] = {
          key,
          type: item.type,
          val: item.val,
          text: item.text || '',
          updated_at: new Date().toISOString()
        };

        if (schema && field) {
          if (!siteContentEdits[schema]) siteContentEdits[schema] = {};
          siteContentEdits[schema][field] = item.val;
        } else if (type === 'portfolio-item' && id) {
          syncPromises.push(syncPortfolioTitle(id, item.val));
        } else if (type === 'case-item' && id) {
          syncPromises.push(syncCaseStudyTitle(id, item.val));
        } else if (type === 'journal-item' && id) {
          syncPromises.push(syncJournalTitle(id, item.val));
        }
      });

      siteContentEdits[LIVE_EDITS_ROW_KEY] = { edits: pageEdits, page: getPageId() };

      // Upsert schema groups into Supabase site_content
      for (const [schKey, fieldsObj] of Object.entries(siteContentEdits)) {
        syncPromises.push(
          fetch(`${SUPABASE_URL}/rest/v1/site_content?key=eq.${schKey}&select=*`, { headers: getAuthHeader() })
            .then(res => res.ok ? res.json() : [])
            .then(rows => {
              const existing = rows[0]?.data || {};
              const merged = Object.assign({}, existing, fieldsObj);
              if (fieldsObj.edits) {
                merged.edits = Object.assign({}, existing.edits || {}, fieldsObj.edits);
              }
              return fetch(`${SUPABASE_URL}/rest/v1/site_content`, {
                method: 'POST',
                headers: Object.assign({}, getAuthHeader(), { 'Prefer': 'resolution=merge-duplicates' }),
                body: JSON.stringify({ key: schKey, data: merged, updated_at: new Date() })
              }).then(writeRes => {
                if (!writeRes.ok) throw new Error(`Supabase rejected ${schKey} (${writeRes.status})`);
                return writeRes;
              });
            })
        );
      }

      const results = await Promise.allSettled(syncPromises);
      const failed = results.filter(result => result.status === 'rejected');
      if (failed.length) throw failed[0].reason || new Error('One or more cloud writes failed.');

      // 3. Mark all as saved in session
      pendingEdits.clear();
      notifyContentChanged();

      updateToolbarState();
      showCmsToast('✓ All changes saved and published live!', true);
    } catch (err) {
      console.warn('Live save warning:', err);
      showCmsToast('Saved in this browser, but cloud sync failed. Please retry.', false);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>Save Changes</span>
        `;
      }
    }
  };

  // ── Cancel Edits / Keep Original ──
  window._sonicCmsCancelAll = function () {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }

    const hasPending = pendingEdits.size > 0;
    const hasHistory = undoStack.length > 0;
    const hasStored = !!localStorage.getItem(EDITS_STORAGE_KEY);
    const hasEdits = hasPending || hasHistory || hasStored;

    if (!hasEdits && pristineSnapshots.size === 0) {
      showCmsToast('✓ Page is already displaying original template.', true);
      return;
    }

    // 1. Revert all DOM elements to pristine baseline snapshots
    pristineSnapshots.forEach((snap, key) => {
      try {
        let el = (snap.el && snap.el.isConnected) ? snap.el : null;
        if (!el) {
          try { el = document.querySelector(`[data-cms-key="${CSS.escape(key)}"]`); } catch (_) {}
          if (!el) {
            try { el = document.querySelector(key); } catch (_) {}
          }
        }
        if (el) {
          if (snap.type === 'image' || el.tagName === 'IMG') {
            el.src = snap.val;
          } else {
            el.innerHTML = snap.val;
          }
          el._focusHtml = snap.val;
        }
      } catch (_) {}
    });

    // 2. Also revert any items in pendingEdits that might have been tracked
    pendingEdits.forEach((item, key) => {
      try {
        const snap = pristineSnapshots.get(key);
        if (snap && item.el && item.el.isConnected) {
          if (snap.type === 'image') item.el.src = snap.val;
          else item.el.innerHTML = snap.val;
          item.el._focusHtml = snap.val;
        }
      } catch (_) {}
    });

    // 3. Clear stored custom edits in localStorage
    try {
      localStorage.removeItem(EDITS_STORAGE_KEY);
    } catch (_) {}

    // 4. Clear pending states & history
    pendingEdits.clear();
    undoStack = [];
    redoStack = [];

    // 5. Re-tag editable elements so DOM is clean
    tagEditableElements();

    // 6. Update UI
    updateToolbarState();
    showCmsToast('✓ Original template restored! All customizations reverted.', true);
  };

  // Helper sync routines for structured tables
  async function syncPortfolioTitle(id, titleVal) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/portfolio_items?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ name: titleVal, updated_at: new Date() })
    });
    if (!res.ok) throw new Error(`Portfolio update failed (${res.status})`);
  }

  async function syncCaseStudyTitle(id, titleVal) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/case_studies?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ title: titleVal, updated_at: new Date() })
    });
    if (!res.ok) throw new Error(`Case study update failed (${res.status})`);
  }

  async function syncJournalTitle(id, titleVal) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/journal_posts?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ title: titleVal, updated_at: new Date() })
    });
    if (!res.ok) throw new Error(`Journal update failed (${res.status})`);
  }

  // ── Image Replacement Modal ──
  function openImageEditor(imgEl) {
    activeImageTarget = imgEl;
    let modal = document.getElementById('sonicImgModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'sonicImgModal';
      document.body.appendChild(modal);
    }
    const curSrc = imgEl.src || '';
    modal.innerHTML = `
      <div class="cms-modal-box">
        <div class="cms-modal-header">
          <div class="cms-modal-title">🖼️ Change Image</div>
          <button class="cms-modal-close" onclick="window._sonicCmsCloseImageModal()">×</button>
        </div>
        <div class="cms-modal-body">
          <div class="cms-form-group">
            <label class="cms-label">Image Preview</label>
            <div style="text-align:center;padding:16px;background:#080808;border-radius:10px;margin-bottom:12px;border:1px solid rgba(255,255,255,0.08);">
              <img id="cmsGeneralImgPreview" src="${curSrc}" style="max-width:100%;max-height:220px;border-radius:8px;object-fit:contain;">
            </div>
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Image Source URL</label>
            <div style="display:flex;gap:8px;">
              <input type="text" id="cmsGeneralImgUrl" class="cms-input" value="${escapeAttr(curSrc)}">
              <label class="cms-btn" style="white-space:nowrap;cursor:pointer;">
                📁 Upload
                <input type="file" accept="image/*" style="display:none;" onchange="window._sonicCmsUploadFile(this, 'cmsGeneralImgUrl', 'cmsGeneralImgPreview')">
              </label>
            </div>
          </div>
        </div>
        <div class="cms-modal-footer">
          <button class="cms-btn cms-btn-cancel" onclick="window._sonicCmsCloseImageModal()">Cancel</button>
          <button class="cms-btn cms-btn-save" onclick="window._sonicCmsApplyImage()">✓ Apply Image</button>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  }

  window._sonicCmsCloseImageModal = function () {
    const modal = document.getElementById('sonicImgModal');
    if (modal) modal.style.display = 'none';
    activeImageTarget = null;
  };

  window._sonicCmsApplyImage = function () {
    if (!activeImageTarget) return;
    const urlInput = document.getElementById('cmsGeneralImgUrl');
    const newSrc = urlInput ? urlInput.value.trim() : '';
    if (!newSrc) return;

    const oldSrc = activeImageTarget.src;
    const key = getElementKey(activeImageTarget);

    if (oldSrc !== newSrc) {
      pushHistory({
        type: 'image',
        key: key,
        el: activeImageTarget,
        oldVal: oldSrc,
        newVal: newSrc
      });
      activeImageTarget.src = newSrc;
      markElementDirty(activeImageTarget, key, 'image', newSrc);
      showCmsToast('Image updated! Click "Save Changes" to publish.', true);
    }
    window._sonicCmsCloseImageModal();
  };

  // ── File Upload to Supabase Storage ──
  window._sonicCmsUploadFile = async function (input, targetInputId, previewImgId) {
    const file = input.files && input.files[0];
    if (!file) return;

    showCmsToast('Uploading image to Supabase Storage...', true);
    const fileName = `cms_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    try {
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/sonicmedia-assets/${fileName}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': 'Bearer ' + SUPABASE_ANON,
          'Content-Type': file.type || 'image/jpeg',
          'cache-control': 'max-age=31536000',
          'x-upsert': 'false'
        },
        body: file
      });

      if (!uploadRes.ok) {
        throw new Error('Storage upload failed with code: ' + uploadRes.status);
      }

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/sonicmedia-assets/${fileName}`;
      const inputEl = document.getElementById(targetInputId);
      if (inputEl) inputEl.value = publicUrl;

      const previewEl = document.getElementById(previewImgId);
      if (previewEl) previewEl.src = publicUrl;

      showCmsToast('✓ Image uploaded successfully!', true);
    } catch (err) {
      alert('Upload error: ' + err.message);
    }
  };

  // ── Structured Item Modal Editor (Portfolio, Case Study, Journal) ──
  function openInlineEditor(targetEl) {
    activeEditTarget = targetEl;
    let modal = document.getElementById('sonicCmsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'sonicCmsModal';
      document.body.appendChild(modal);
    }

    const type = targetEl.getAttribute('data-cms-type');
    const id = targetEl.getAttribute('data-cms-id');

    let modalTitle = 'Edit Structured Details';
    let bodyContent = '';

    // Portfolio Item
    if (type === 'portfolio-item') {
      const portItem = (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.portfolio && PAGE_DATA.portfolio.works)
        ? PAGE_DATA.portfolio.works.find(w => w.id === id) : null;
      const details = (typeof workDetails !== 'undefined' && workDetails[id]) ? workDetails[id] : (portItem || {});

      modalTitle = `📁 Project Details: ${details.title || portItem?.name || id}`;
      bodyContent = `
        <div class="cms-form-group">
          <label class="cms-label">Project Name / Title</label>
          <input type="text" id="cmsPortName" class="cms-input" value="${escapeAttr(details.title || portItem?.name || '')}">
        </div>
        <div class="cms-form-group">
          <label class="cms-label">Inner Subtitle</label>
          <input type="text" id="cmsPortSubtitle" class="cms-input" value="${escapeAttr(details.subtitle || portItem?.cat || '')}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="cms-form-group">
            <label class="cms-label">Category</label>
            <input type="text" id="cmsPortCat" class="cms-input" value="${escapeAttr(portItem?.cat || details.category || '')}">
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Project Type</label>
            <input type="text" id="cmsPortType" class="cms-input" value="${escapeAttr(details.type || 'Branding Project')}">
          </div>
        </div>
        <div class="cms-form-group">
          <label class="cms-label">Featured Image URL</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="cmsPortImg" class="cms-input" value="${escapeAttr(portItem?.img || details.images?.[0]?.url || '')}">
            <label class="cms-btn" style="white-space:nowrap;cursor:pointer;">
              📁 Upload
              <input type="file" accept="image/*" style="display:none;" onchange="window._sonicCmsUploadFile(this, 'cmsPortImg', 'cmsPortImgPreview')">
            </label>
          </div>
          <div style="margin-top:8px;">
            <img id="cmsPortImgPreview" class="cms-img-thumb" src="${portItem?.img || details.images?.[0]?.url || ''}" style="max-height:80px;border-radius:6px;object-fit:cover;">
          </div>
        </div>
        <div class="cms-form-group">
          <label class="cms-label">About Narrative</label>
          <textarea id="cmsPortAbout" class="cms-textarea">${escapeHtml(details.about || '')}</textarea>
        </div>
        <div class="cms-form-group">
          <label class="cms-label">The Challenge</label>
          <textarea id="cmsPortChallenge" class="cms-textarea">${escapeHtml(details.challenge || '')}</textarea>
        </div>
        <div class="cms-form-group">
          <label class="cms-label">Our Solution</label>
          <textarea id="cmsPortSolution" class="cms-textarea">${escapeHtml(details.solution || '')}</textarea>
        </div>
      `;
    }

    // Case Study Item
    else if (type === 'case-item') {
      const caseItem = (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.casestudies && PAGE_DATA.casestudies.items)
        ? PAGE_DATA.casestudies.items.find(c => c.id === id) : null;
      const details = (typeof caseStudies !== 'undefined' && caseStudies[id]) ? caseStudies[id] : (caseItem || {});

      modalTitle = `📊 Case Study: ${details.title || caseItem?.title || id}`;
      bodyContent = `
        <div class="cms-form-group">
          <label class="cms-label">Case Study Title</label>
          <input type="text" id="cmsCaseTitle" class="cms-input" value="${escapeAttr(details.title || caseItem?.title || '')}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="cms-form-group">
            <label class="cms-label">Category</label>
            <input type="text" id="cmsCaseCat" class="cms-input" value="${escapeAttr(caseItem?.catLabel || details.category || '')}">
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Publish Date</label>
            <input type="text" id="cmsCaseDate" class="cms-input" value="${escapeAttr(caseItem?.date || details.date || '')}">
          </div>
        </div>
        <div class="cms-form-group">
          <label class="cms-label">Excerpt / Short Description</label>
          <textarea id="cmsCaseExcerpt" class="cms-textarea" style="min-height:70px;">${escapeHtml(caseItem?.excerpt || details.subtitle || '')}</textarea>
        </div>
        <div class="cms-form-group">
          <label class="cms-label">Full Article HTML Content</label>
          <textarea id="cmsCaseBody" class="cms-textarea" style="min-height:160px;">${escapeHtml(details.body || '')}</textarea>
        </div>
      `;
    }

    // Journal Item
    else if (type === 'journal-item') {
      const postItem = (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.journal && PAGE_DATA.journal.posts)
        ? PAGE_DATA.journal.posts.find(p => p.id === id) : null;
      const details = (typeof blogArticles !== 'undefined' && blogArticles[id]) ? blogArticles[id] : (postItem || {});

      modalTitle = `📝 Journal Article: ${details.title || postItem?.title || id}`;
      bodyContent = `
        <div class="cms-form-group">
          <label class="cms-label">Article Title</label>
          <input type="text" id="cmsPostTitle" class="cms-input" value="${escapeAttr(details.title || postItem?.title || '')}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="cms-form-group">
            <label class="cms-label">Category</label>
            <input type="text" id="cmsPostCat" class="cms-input" value="${escapeAttr(postItem?.cat || details.category || '')}">
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Read Time</label>
            <input type="text" id="cmsPostTime" class="cms-input" value="${escapeAttr(postItem?.time || details.readTime || '5 min read')}">
          </div>
        </div>
        <div class="cms-form-group">
          <label class="cms-label">Article Body HTML</label>
          <textarea id="cmsPostBody" class="cms-textarea" style="min-height:160px;">${escapeHtml(details.body || '')}</textarea>
        </div>
      `;
    } else {
      modalTitle = 'Edit Content';
      bodyContent = `<div class="cms-form-group"><label class="cms-label">Text</label><textarea id="cmsGeneralText" class="cms-textarea">${escapeHtml(targetEl.innerText)}</textarea></div>`;
    }

    modal.innerHTML = `
      <div class="cms-modal-box">
        <div class="cms-modal-header">
          <div class="cms-modal-title">${modalTitle}</div>
          <button class="cms-modal-close" onclick="window._sonicCmsCloseModal()">×</button>
        </div>
        <div class="cms-modal-body">
          ${bodyContent}
        </div>
        <div class="cms-modal-footer">
          <button class="cms-btn cms-btn-cancel" onclick="window._sonicCmsCloseModal()">Cancel</button>
          <button class="cms-btn cms-btn-save" id="cmsSaveModalBtn" onclick="window._sonicCmsSaveActive()">
            <span>💾 Save Details</span>
          </button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  }

  window._sonicCmsCloseModal = function () {
    const modal = document.getElementById('sonicCmsModal');
    if (modal) modal.style.display = 'none';
    activeEditTarget = null;
  };

  window._sonicCmsSaveActive = async function () {
    if (!activeEditTarget) return;
    const saveBtn = document.getElementById('cmsSaveModalBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span>Saving...</span>';
    }

    const type = activeEditTarget.getAttribute('data-cms-type');
    const id = activeEditTarget.getAttribute('data-cms-id');

    try {
      if (type === 'portfolio-item') {
        const nameVal = document.getElementById('cmsPortName')?.value.trim();
        const subVal = document.getElementById('cmsPortSubtitle')?.value.trim();
        const catVal = document.getElementById('cmsPortCat')?.value.trim();
        const typeVal = document.getElementById('cmsPortType')?.value.trim();
        const imgVal = document.getElementById('cmsPortImg')?.value.trim();
        const aboutVal = document.getElementById('cmsPortAbout')?.value.trim();
        const challengeVal = document.getElementById('cmsPortChallenge')?.value.trim();
        const solutionVal = document.getElementById('cmsPortSolution')?.value.trim();

        const currentDetails = (typeof workDetails !== 'undefined' && workDetails[id]) ? workDetails[id] : {};
        const updatedDetails = Object.assign({}, currentDetails, {
          title: nameVal,
          subtitle: subVal || catVal,
          category: catVal,
          type: typeVal,
          about: aboutVal,
          challenge: challengeVal,
          solution: solutionVal,
          images: imgVal ? [{ url: imgVal, title: nameVal, desc: aboutVal }] : currentDetails.images
        });

        await fetch(`${SUPABASE_URL}/rest/v1/portfolio_items?id=eq.${id}`, {
          method: 'PATCH',
          headers: getAuthHeader(),
          body: JSON.stringify({
            name: nameVal,
            cat: catVal,
            img: imgVal || undefined,
            details: updatedDetails,
            updated_at: new Date()
          })
        });

        if (typeof workDetails !== 'undefined') workDetails[id] = updatedDetails;
        if (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.portfolio?.works) {
          const w = PAGE_DATA.portfolio.works.find(i => i.id === id);
          if (w) {
            w.name = nameVal;
            w.cat = catVal;
            if (imgVal) w.img = imgVal;
          }
        }
        if (typeof renderPageData === 'function') renderPageData();
        showCmsToast(`Project "${nameVal}" updated!`, true);
      } else if (type === 'case-item') {
        const titleVal = document.getElementById('cmsCaseTitle')?.value.trim();
        const catVal = document.getElementById('cmsCaseCat')?.value.trim();
        const dateVal = document.getElementById('cmsCaseDate')?.value.trim();
        const excerptVal = document.getElementById('cmsCaseExcerpt')?.value.trim();
        const bodyVal = document.getElementById('cmsCaseBody')?.value.trim();

        await fetch(`${SUPABASE_URL}/rest/v1/case_studies?id=eq.${id}`, {
          method: 'PATCH',
          headers: getAuthHeader(),
          body: JSON.stringify({
            title: titleVal,
            cat_label: catVal,
            date: dateVal,
            excerpt: excerptVal,
            content: bodyVal,
            updated_at: new Date()
          })
        });

        if (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.casestudies?.items) {
          const c = PAGE_DATA.casestudies.items.find(i => i.id === id);
          if (c) {
            c.title = titleVal;
            c.catLabel = catVal;
            c.date = dateVal;
            c.excerpt = excerptVal;
          }
        }
        if (typeof renderPageData === 'function') renderPageData();
        showCmsToast(`Case Study "${titleVal}" saved!`, true);
      } else if (type === 'journal-item') {
        const titleVal = document.getElementById('cmsPostTitle')?.value.trim();
        const catVal = document.getElementById('cmsPostCat')?.value.trim();
        const timeVal = document.getElementById('cmsPostTime')?.value.trim();
        const bodyVal = document.getElementById('cmsPostBody')?.value.trim();

        await fetch(`${SUPABASE_URL}/rest/v1/journal_posts?id=eq.${id}`, {
          method: 'PATCH',
          headers: getAuthHeader(),
          body: JSON.stringify({
            title: titleVal,
            cat: catVal,
            read_time: timeVal,
            content: bodyVal,
            updated_at: new Date()
          })
        });

        if (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.journal?.posts) {
          const p = PAGE_DATA.journal.posts.find(i => i.id === id);
          if (p) {
            p.title = titleVal;
            p.cat = catVal;
            p.time = timeVal;
          }
        }
        if (typeof renderPageData === 'function') renderPageData();
        showCmsToast(`Journal Article "${titleVal}" saved!`, true);
      }
      try {
        localStorage.removeItem('tsm_supabase_cache');
        localStorage.setItem('tsm_cache_invalidated_at', Date.now().toString());
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('sonic_media_cms');
          bc.postMessage({ type: 'cache_invalidated', at: Date.now() });
          bc.close();
        }
      } catch (_) {}
      window._sonicCmsCloseModal();
      tagEditableElements();
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span>💾 Save Details</span>';
      }
    }
  };

  // ── Render Floating Toolbar Bar ──
  function renderCmsToolbar() {
    if (document.getElementById('sonicCmsBar')) return;
    const bar = document.createElement('div');
    bar.id = 'sonicCmsBar';
    bar.innerHTML = `
      <div class="cms-badge" title="Sonic Live Visual CMS">
        <span class="cms-dot"></span>
        <span>LIVE CMS</span>
      </div>

      <div class="cms-bar-divider"></div>

      <!-- Mode Toggle -->
      <button class="cms-btn ${isEditMode ? 'active' : ''}" id="cmsModeBtn" onclick="window._sonicCmsToggleMode()" title="Toggle visual editing (Ctrl+Shift+E)">
        <span>${isEditMode ? '✏️ Edit Mode' : '👁️ Preview'}</span>
      </button>

      <div class="cms-bar-divider"></div>

      <!-- History: Undo & Redo (Preserved exact icons & circular design as requested) -->
      <button class="cms-btn cms-btn-icon-only disabled" id="cmsUndoBtn" onclick="window._sonicCmsUndo()" title="Undo last change (Ctrl+Z)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
      </button>

      <button class="cms-btn cms-btn-icon-only disabled" id="cmsRedoBtn" onclick="window._sonicCmsRedo()" title="Redo last change (Ctrl+Y)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
      </button>

      <!-- Status Badge -->
      <span id="cmsStatusBadge" class="cms-status-badge clean">All Saved</span>

      <div class="cms-bar-divider"></div>

      <!-- Save & Keep Original / Cancel -->
      <button class="cms-btn cms-btn-save disabled" id="cmsSaveAllBtn" onclick="window._sonicCmsSaveAll()" title="Save all customized edits (Ctrl+S)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        <span>Save Changes</span>
      </button>

      <button class="cms-btn cms-btn-cancel disabled" id="cmsCancelAllBtn" onclick="window._sonicCmsCancelAll()" title="Discard all customizations and restore original template">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        <span>Keep Original</span>
      </button>

      <div class="cms-bar-divider"></div>

      <!-- Exit & Minimize -->
      <button class="cms-btn-subtle" onclick="window._sonicCmsExitCms()" title="Close Live CMS toolbar">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        <span>Exit</span>
      </button>
      <button class="cms-btn-subtle cms-btn-min" onclick="window._sonicCmsToggleBarMinimize()" title="Minimize toolbar"><span>−</span></button>
    `;

    bar.addEventListener('mouseenter', function () {
      document.body.classList.add('cms-hovering-bar');
    });
    bar.addEventListener('mouseleave', function () {
      document.body.classList.remove('cms-hovering-bar');
    });

    document.body.appendChild(bar);
    updateToolbarState();
  }

  window._sonicCmsExitCms = function () {
    isEditMode = false;
    document.body.classList.remove('sonic-cms-active');
    const bar = document.getElementById('sonicCmsBar');
    if (bar) bar.remove();
    const modal = document.getElementById('sonicCmsModal');
    if (modal) modal.remove();
    const imgModal = document.getElementById('sonicImgModal');
    if (imgModal) imgModal.remove();

    // Disable contenteditable on all elements
    document.querySelectorAll('[data-cms-editable="text"]').forEach(el => {
      el.contentEditable = 'false';
    });

    try {
      window.sessionStorage.setItem('sonic_cms_disabled', 'true');
      window.sessionStorage.removeItem('sonic_cms_active');
    } catch (_) {}

    if (window.location.search.includes('live_edit') || window.location.search.includes('edit=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    showCmsToast('✓ Live CMS closed. Press Ctrl+Shift+E anytime to re-open.', true);
  };

  window._sonicCmsToggleBarMinimize = function () {
    const bar = document.getElementById('sonicCmsBar');
    if (bar) bar.classList.toggle('minimized');
  };

  window._sonicCmsToggleMode = function () {
    isEditMode = !isEditMode;
    document.body.classList.toggle('sonic-cms-active', isEditMode);
    
    // Toggle contenteditable on text elements
    document.querySelectorAll('[data-cms-editable="text"]').forEach(el => {
      el.contentEditable = isEditMode ? 'true' : 'false';
    });

    const btn = document.getElementById('cmsModeBtn');
    if (btn) {
      btn.classList.toggle('active', isEditMode);
      btn.innerHTML = `<span>${isEditMode ? '✏️ Edit Mode' : '👁️ Preview'}</span>`;
    }

    showCmsToast(
      isEditMode
        ? 'Live In-Place Editing ON! Click and type directly into any text, headline, or image.'
        : 'Preview Mode Active. All editing outlines hidden.',
      true
    );
  };

  // ── Intercept Clicks on Editable Elements ──
  function initClickInterceptors() {
    // Document-level cursor suppression when hovering toolbar or modals
    document.addEventListener('mouseover', function (e) {
      if (e.target && e.target.closest && e.target.closest('#sonicCmsBar, #sonicCmsModal, #sonicImgModal, #sonicCmsToast')) {
        document.body.classList.add('cms-hovering-bar');
      } else {
        document.body.classList.remove('cms-hovering-bar');
      }
    }, true);

    document.addEventListener('click', function (e) {
      if (!isEditMode) return;
      // Never intercept inside CMS toolbar or modals
      if (e.target.closest('#sonicCmsBar') || e.target.closest('#sonicCmsModal') || e.target.closest('#sonicImgModal') || e.target.closest('#sonicCmsToast')) {
        return;
      }

      // 1. If clicking image
      const img = e.target.closest('[data-cms-editable="image"]');
      if (img) {
        e.preventDefault();
        e.stopPropagation();
        openImageEditor(img);
        return;
      }

      // 2. If clicking structured card button
      if (e.target.closest('.cms-card-btn')) {
        return; // Let the button's own click handler run
      }

      // 3. If clicking a link or button while in edit mode: prevent navigation so user can edit text in-place!
      const link = e.target.closest('a, button');
      if (link && !link.closest('#sonicCmsBar')) {
        e.preventDefault();
        const editableChild = link.closest('[data-cms-editable="text"]') || link.querySelector('[data-cms-editable="text"]') || link;
        if (editableChild && editableChild.contentEditable === 'true') {
          editableChild.focus();
        }
      }
    }, true);
  }

  // ── Keyboard Shortcuts ──
  function initKeyboardShortcuts() {
    window.addEventListener('keydown', function (e) {
      // Toggle shortcut: Ctrl + Shift + E or Cmd + Shift + E
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        try { window.sessionStorage.removeItem('sonic_cms_disabled'); } catch (_) {}
        const bar = document.getElementById('sonicCmsBar');
        if (!bar) {
          renderCmsToolbar();
          if (!isEditMode) window._sonicCmsToggleMode();
        } else {
          window._sonicCmsToggleMode();
        }
        return;
      }

      if (!isEditMode) return;

      // Undo: Ctrl + Z / Cmd + Z (when not in native modal input)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
          return; // Let native input handle local undo
        }
        e.preventDefault();
        window._sonicCmsUndo();
        return;
      }

      // Redo: Ctrl + Y or Ctrl + Shift + Z / Cmd + Shift + Z
      if (((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        window._sonicCmsRedo();
        return;
      }

      // Save: Ctrl + S / Cmd + S
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        window._sonicCmsSaveAll();
        return;
      }
    });
  }

  // ── Apply Stored Customizations at Boot ──
  function applyStoredCustomEdits() {
    try {
      const raw = localStorage.getItem(EDITS_STORAGE_KEY);
      if (!raw) return;
      const edits = JSON.parse(raw);
      Object.keys(edits).forEach(key => {
        const item = edits[key];
        if (!item) return;
        try {
          const el = document.querySelector(key);
          if (el) {
            if (item.type === 'image' && item.val) {
              el.src = item.val;
            } else if (item.val) {
              el.innerHTML = item.val;
            }
          }
        } catch (_) {}
      });
    } catch (_) {}
  }

  // ── Initialize CMS ──
  function init() {
    injectStyles();
    capturePristineBaseline();
    applyStoredCustomEdits();
    tagEditableElements();
    initClickInterceptors();
    initKeyboardShortcuts();

    const isExplicitlyDisabled = window.sessionStorage.getItem('sonic_cms_disabled') === 'true';
    const urlParams = new URLSearchParams(window.location.search);
    const wantsPreview = urlParams.get('preview') === 'true' || urlParams.get('live_edit') === 'false';
    const wantsLiveEdit = urlParams.get('live_edit') === 'true' || urlParams.get('edit') === 'true' || urlParams.get('edit') === '1' || urlParams.get('cms') === '1';
    const session = getAdminSession();
    const isCmsActive = window.sessionStorage.getItem('sonic_cms_active') === 'true';

    if (wantsPreview) {
      try { window.sessionStorage.setItem('sonic_cms_disabled', 'true'); } catch(_) {}
      isEditMode = false;
      document.body.classList.remove('sonic-cms-active');
      const bar = document.getElementById('sonicCmsBar');
      if (bar) bar.remove();
      return;
    }

    if (wantsLiveEdit || isCmsActive || (session && !isExplicitlyDisabled)) {
      try { window.sessionStorage.removeItem('sonic_cms_disabled'); } catch(_) {}
      isEditMode = true;
      document.body.classList.add('sonic-cms-active');
      renderCmsToolbar();
      tagEditableElements();
    }

    // Observe dynamic DOM changes (e.g. after Supabase fetch or filtering)
    const observer = new MutationObserver(() => {
      tagEditableElements();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
