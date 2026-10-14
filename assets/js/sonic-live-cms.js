/**
 * THE SONIC MEDIA — LIVE VISUAL IN-PLACE CMS ENGINE
 * Allows admins to click any headline, topic, project, text, or image directly on the live website
 * and edit, upload, and save changes straight to Supabase.
 */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://plytoawhcvzdjtrgtnrn.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBseXRvYXdoY3Z6ZGp0cmd0bnJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NjkyNTYsImV4cCI6MjEwNzU0NTI1Nn0.AxpKzQf5LL-ePbmtsxELKQdip3bYp9hBp9xYugybelc';
  const ADMIN_STORAGE_KEY = 'sonicmedia_admin_session';

  let isEditMode = false;
  let adminSession = null;
  let activeEditTarget = null;

  // ── Session Helper ──
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

  // ── Inject CMS Styles ──
  function injectStyles() {
    if (document.getElementById('sonic-cms-styles')) return;
    const style = document.createElement('style');
    style.id = 'sonic-cms-styles';
    style.textContent = `
      /* Sonic Live CMS Toolbar */
      #sonicCmsBar {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(0);
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(14, 14, 14, 0.94);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 92, 0, 0.45);
        border-radius: 50px;
        padding: 8px 18px 8px 14px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 24px rgba(255, 92, 0, 0.25);
        font-family: 'DM Sans', sans-serif;
        color: #F5F0EB;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #sonicCmsBar.minimized {
        transform: translateX(-50%) translateY(70px);
        opacity: 0.3;
      }
      #sonicCmsBar:hover {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      .cms-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: 'Syne', sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #FF5C00;
      }
      .cms-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10B981;
        box-shadow: 0 0 8px #10B981;
        animation: cmsPulse 2s infinite;
      }
      @keyframes cmsPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.85); }
      }
      .cms-toggle-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 50px;
        padding: 6px 14px;
        color: #F5F0EB;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
      }
      .cms-toggle-btn:hover {
        background: rgba(255, 92, 0, 0.2);
        border-color: #FF5C00;
        color: #FFF;
      }
      .cms-toggle-btn.active {
        background: #FF5C00;
        color: #080808;
        border-color: #FF5C00;
        font-weight: 700;
      }
      .cms-btn-subtle {
        background: transparent;
        border: none;
        color: rgba(245, 240, 235, 0.6);
        font-size: 12px;
        cursor: pointer;
        text-decoration: none;
        padding: 4px 8px;
        border-radius: 6px;
        transition: color 0.2s;
      }
      .cms-btn-subtle:hover {
        color: #FF5C00;
      }
      .cms-btn-exit {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.16);
        color: rgba(245, 240, 235, 0.85);
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
        padding: 5px 12px;
        border-radius: 50px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: all 0.2s ease;
      }
      .cms-btn-exit:hover {
        background: rgba(239, 68, 68, 0.22);
        border-color: #ef4444;
        color: #ff9999;
      }

      /* Hover outlines when edit mode is active */
      body.sonic-cms-active [data-cms-editable] {
        position: relative;
        cursor: pointer !important;
        transition: outline 0.15s ease, box-shadow 0.15s ease;
      }
      body.sonic-cms-active [data-cms-editable]:hover {
        outline: 2px dashed #FF5C00 !important;
        outline-offset: 4px;
        box-shadow: 0 0 16px rgba(255, 92, 0, 0.25) !important;
      }
      body.sonic-cms-active [data-cms-editable]:hover::after {
        content: attr(data-cms-label);
        position: absolute;
        top: -26px;
        left: 4px;
        background: #FF5C00;
        color: #080808;
        font-family: 'Syne', sans-serif;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 3px 8px;
        border-radius: 4px;
        z-index: 99999;
        pointer-events: none;
        white-space: nowrap;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      }

      /* Modal Editor Drawer */
      #sonicCmsModal {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 1000000;
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
        border: 1px solid rgba(255, 92, 0, 0.35);
        border-radius: 18px;
        width: 100%;
        max-width: 620px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 92, 0, 0.2);
        font-family: 'DM Sans', sans-serif;
        color: #F5F0EB;
      }
      .cms-modal-header {
        padding: 20px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(255, 255, 255, 0.02);
      }
      .cms-modal-title {
        font-family: 'Syne', sans-serif;
        font-size: 16px;
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
        font-size: 24px;
        cursor: pointer;
        line-height: 1;
        transition: color 0.2s;
      }
      .cms-modal-close:hover {
        color: #FF5C00;
      }
      .cms-modal-body {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
      }
      .cms-modal-footer {
        padding: 16px 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        background: rgba(255, 255, 255, 0.02);
      }
      .cms-form-group {
        margin-bottom: 18px;
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
        padding: 12px 14px;
        color: #F5F0EB;
        font-family: inherit;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }
      .cms-input:focus, .cms-textarea:focus {
        border-color: #FF5C00;
      }
      .cms-textarea {
        min-height: 110px;
        resize: vertical;
        line-height: 1.6;
      }
      .cms-btn-primary {
        background: #FF5C00;
        color: #080808;
        border: none;
        border-radius: 8px;
        padding: 10px 22px;
        font-family: 'Syne', sans-serif;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.05em;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
      }
      .cms-btn-primary:hover {
        background: #FF7726;
        box-shadow: 0 4px 15px rgba(255, 92, 0, 0.4);
      }
      .cms-btn-secondary {
        background: rgba(255, 255, 255, 0.06);
        color: #F5F0EB;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 10px 18px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .cms-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.12);
      }
      .cms-img-preview-box {
        display: flex;
        gap: 16px;
        align-items: center;
        background: #080808;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.08);
        margin-top: 8px;
      }
      .cms-img-thumb {
        width: 80px;
        height: 60px;
        border-radius: 6px;
        object-fit: cover;
        background: #1a1a1a;
      }

      /* CMS Toast */
      #sonicCmsToast {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 1000001;
        background: #121212;
        border: 1px solid #10B981;
        color: #F5F0EB;
        padding: 14px 20px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(16,185,129,0.25);
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

  // ── Show Toast Helper ──
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

  // ── Tag Elements for Visual Editing ──
  function tagEditableElements() {
    // 1. Hero Section
    const heroEyebrow = document.querySelector('.hero-eyebrow');
    if (heroEyebrow) {
      heroEyebrow.setAttribute('data-cms-editable', 'true');
      heroEyebrow.setAttribute('data-cms-label', '✏️ Edit Hero Eyebrow');
      heroEyebrow.setAttribute('data-cms-schema', 'hero');
      heroEyebrow.setAttribute('data-cms-field', 'eyebrow');
    }
    const heroH1 = document.querySelector('.hero-h1');
    if (heroH1) {
      heroH1.setAttribute('data-cms-editable', 'true');
      heroH1.setAttribute('data-cms-label', '✏️ Edit Hero Headline');
      heroH1.setAttribute('data-cms-schema', 'hero');
      heroH1.setAttribute('data-cms-field', 'headlineHtml');
    }
    const heroSub = document.querySelector('.hero-sub');
    if (heroSub) {
      heroSub.setAttribute('data-cms-editable', 'true');
      heroSub.setAttribute('data-cms-label', '✏️ Edit Hero Subtitle');
      heroSub.setAttribute('data-cms-schema', 'hero');
      heroSub.setAttribute('data-cms-field', 'subheadline');
    }

    // 2. Portfolio Section Header
    const portEyebrows = document.querySelectorAll('#port-eyebrow, .page-studio .section-eyebrow, #page-portfolio-eyebrow');
    portEyebrows.forEach(el => {
      el.setAttribute('data-cms-editable', 'true');
      el.setAttribute('data-cms-label', '✏️ Edit Portfolio Eyebrow');
      el.setAttribute('data-cms-schema', 'portfolio');
      el.setAttribute('data-cms-field', 'eyebrow');
    });
    const portTitles = document.querySelectorAll('#port-title-main, #page-studio-title, #page-portfolio-title');
    portTitles.forEach(el => {
      el.setAttribute('data-cms-editable', 'true');
      el.setAttribute('data-cms-label', '✏️ Edit Portfolio Title');
      el.setAttribute('data-cms-schema', 'portfolio');
      el.setAttribute('data-cms-field', 'titleCompound');
    });
    const portTaglines = document.querySelectorAll('#port-tagline, #page-portfolio-tagline');
    portTaglines.forEach(el => {
      el.setAttribute('data-cms-editable', 'true');
      el.setAttribute('data-cms-label', '✏️ Edit Portfolio Tagline');
      el.setAttribute('data-cms-schema', 'portfolio');
      el.setAttribute('data-cms-field', 'tagline');
    });

    // 3. Individual Portfolio Rows & Cards
    const fwRows = document.querySelectorAll('.fw-row');
    fwRows.forEach(row => {
      const onclickAttr = row.getAttribute('onclick') || '';
      const match = onclickAttr.match(/openWorkDetail\(['"]([^'"]+)['"]\)/);
      if (match) {
        const id = match[1];
        row.setAttribute('data-cms-editable', 'true');
        row.setAttribute('data-cms-label', `📁 Edit Project (${id})`);
        row.setAttribute('data-cms-type', 'portfolio-item');
        row.setAttribute('data-cms-id', id);
      }
    });

    // 4. Case Studies Section Header & Cards
    const caseTags = document.querySelectorAll('#home-casestudies-tag, #page-case-tag');
    caseTags.forEach(el => {
      el.setAttribute('data-cms-editable', 'true');
      el.setAttribute('data-cms-label', '✏️ Edit Case Studies Tag');
      el.setAttribute('data-cms-schema', 'casestudies');
      el.setAttribute('data-cms-field', 'tag');
    });
    const caseTitles = document.querySelectorAll('#home-casestudies-title, #page-case-title');
    caseTitles.forEach(el => {
      el.setAttribute('data-cms-editable', 'true');
      el.setAttribute('data-cms-label', '✏️ Edit Case Studies Title');
      el.setAttribute('data-cms-schema', 'casestudies');
      el.setAttribute('data-cms-field', 'titleCombined');
    });
    const jcards = document.querySelectorAll('.jcard');
    jcards.forEach(card => {
      const onclickAttr = card.getAttribute('onclick') || '';
      const match = onclickAttr.match(/openCaseStudy\(['"]([^'"]+)['"]\)/);
      if (match) {
        const id = match[1];
        card.setAttribute('data-cms-editable', 'true');
        card.setAttribute('data-cms-label', `📊 Edit Case Study (${id})`);
        card.setAttribute('data-cms-type', 'case-item');
        card.setAttribute('data-cms-id', id);
      }
    });

    // 5. Journal Section Header & Items
    const journalTags = document.querySelectorAll('#home-journal-tag, #page-journal-tag');
    journalTags.forEach(el => {
      el.setAttribute('data-cms-editable', 'true');
      el.setAttribute('data-cms-label', '✏️ Edit Journal Tag');
      el.setAttribute('data-cms-schema', 'journal');
      el.setAttribute('data-cms-field', 'tag');
    });
    const journalTitles = document.querySelectorAll('#home-journal-title, #page-journal-title');
    journalTitles.forEach(el => {
      el.setAttribute('data-cms-editable', 'true');
      el.setAttribute('data-cms-label', '✏️ Edit Journal Title');
      el.setAttribute('data-cms-schema', 'journal');
      el.setAttribute('data-cms-field', 'titleCombined');
    });
    const blogItems = document.querySelectorAll('.blog-item');
    blogItems.forEach(item => {
      const btn = item.querySelector('[onclick*="openBlogArticle"]');
      if (btn) {
        const onclickAttr = btn.getAttribute('onclick') || '';
        const match = onclickAttr.match(/openBlogArticle\(['"]([^'"]+)['"]\)/);
        if (match) {
          const id = match[1];
          item.setAttribute('data-cms-editable', 'true');
          item.setAttribute('data-cms-label', `📝 Edit Article (${id})`);
          item.setAttribute('data-cms-type', 'journal-item');
          item.setAttribute('data-cms-id', id);
        }
      }
    });

    // 6. About Section
    const aboutHeadings = document.querySelectorAll('#about h2, .about-heading');
    aboutHeadings.forEach(el => {
      el.setAttribute('data-cms-editable', 'true');
      el.setAttribute('data-cms-label', '✏️ Edit About Heading');
      el.setAttribute('data-cms-schema', 'about');
      el.setAttribute('data-cms-field', 'headingHtml');
    });
    const aboutDescs = document.querySelectorAll('#about p, .about-desc');
    aboutDescs.forEach(el => {
      el.setAttribute('data-cms-editable', 'true');
      el.setAttribute('data-cms-label', '✏️ Edit About Story');
      el.setAttribute('data-cms-schema', 'about');
      el.setAttribute('data-cms-field', 'body');
    });

    // 7. General Images
    const imgs = document.querySelectorAll('img:not(.brand-logo):not(.cms-img-thumb)');
    imgs.forEach(img => {
      if (!img.closest('.fw-row') && !img.closest('.jcard') && !img.closest('.blog-item')) {
        img.setAttribute('data-cms-editable', 'true');
        img.setAttribute('data-cms-label', '🖼️ Change Image');
        img.setAttribute('data-cms-type', 'image-element');
      }
    });
  }

  // ── Open Inline Editor Modal ──
  function openInlineEditor(targetEl) {
    activeEditTarget = targetEl;
    let modal = document.getElementById('sonicCmsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'sonicCmsModal';
      document.body.appendChild(modal);
    }

    const schema = targetEl.getAttribute('data-cms-schema');
    const field = targetEl.getAttribute('data-cms-field');
    const type = targetEl.getAttribute('data-cms-type');
    const id = targetEl.getAttribute('data-cms-id');

    let modalTitle = 'Edit Content';
    let bodyContent = '';

    // A. Specific Portfolio Project (e.g. Spice Theory Kitchen)
    if (type === 'portfolio-item') {
      const portItem = (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.portfolio && PAGE_DATA.portfolio.works)
        ? PAGE_DATA.portfolio.works.find(w => w.id === id) : null;
      const details = (typeof workDetails !== 'undefined' && workDetails[id]) ? workDetails[id] : (portItem || {});

      modalTitle = `📁 Edit Portfolio: ${details.title || portItem?.name || id}`;
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
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="cms-form-group">
            <label class="cms-label">Status</label>
            <input type="text" id="cmsPortStatus" class="cms-input" value="${escapeAttr(details.status || portItem?.metricVal || 'Completed')}">
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Location</label>
            <input type="text" id="cmsPortLocation" class="cms-input" value="${escapeAttr(details.location || 'Ahmedabad, Gujarat')}">
          </div>
        </div>
        <div class="cms-form-group">
          <label class="cms-label">Featured Image URL</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="cmsPortImg" class="cms-input" value="${escapeAttr(portItem?.img || details.images?.[0]?.url || '')}">
            <label class="cms-btn-secondary" style="white-space:nowrap;cursor:pointer;">
              📁 Upload
              <input type="file" accept="image/*" style="display:none;" onchange="window._sonicCmsUploadFile(this, 'cmsPortImg', 'cmsPortImgPreview')">
            </label>
          </div>
          <div class="cms-img-preview-box">
            <img id="cmsPortImgPreview" class="cms-img-thumb" src="${portItem?.img || details.images?.[0]?.url || ''}" onerror="this.src='https://via.placeholder.com/80x60'">
            <div style="font-size:12px;color:rgba(245,240,235,0.5);">Live preview of featured cover asset</div>
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
        <div class="cms-form-group">
          <label class="cms-label">Key Deliverables (one per line)</label>
          <textarea id="cmsPortDeliverables" class="cms-textarea" style="min-height:80px;">${escapeHtml(Array.isArray(details.deliverables) ? details.deliverables.join('\n') : '')}</textarea>
        </div>
        <div style="background:rgba(255,92,0,0.06);border:1px solid rgba(255,92,0,0.2);padding:12px;border-radius:8px;font-size:12px;color:rgba(245,240,235,0.7);">
          Need multi-image showcase gallery editing or SEO keyword chips? Open the <a href="/sonicmediaadmin" target="_blank" style="color:#FF5C00;font-weight:700;">Full Admin Panel</a>.
        </div>
      `;
    }

    // B. Individual Case Study Item
    else if (type === 'case-item') {
      const caseItem = (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.casestudies && PAGE_DATA.casestudies.items)
        ? PAGE_DATA.casestudies.items.find(c => c.id === id) : null;
      const details = (typeof caseStudies !== 'undefined' && caseStudies[id]) ? caseStudies[id] : (caseItem || {});

      modalTitle = `📊 Edit Case Study: ${details.title || caseItem?.title || id}`;
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
          <label class="cms-label">Cover Image URL</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="cmsCaseImg" class="cms-input" value="${escapeAttr(caseItem?.img || details.images?.[0]?.url || '')}">
            <label class="cms-btn-secondary" style="white-space:nowrap;cursor:pointer;">
              📁 Upload
              <input type="file" accept="image/*" style="display:none;" onchange="window._sonicCmsUploadFile(this, 'cmsCaseImg', 'cmsCaseImgPreview')">
            </label>
          </div>
          <div class="cms-img-preview-box">
            <img id="cmsCaseImgPreview" class="cms-img-thumb" src="${caseItem?.img || details.images?.[0]?.url || ''}">
            <div style="font-size:12px;color:rgba(245,240,235,0.5);">Cover image displayed across grid and modal</div>
          </div>
        </div>
        <div class="cms-form-group">
          <label class="cms-label">Full Article HTML Content</label>
          <textarea id="cmsCaseBody" class="cms-textarea" style="min-height:160px;">${escapeHtml(details.body || '')}</textarea>
        </div>
      `;
    }

    // C. Individual Journal Post
    else if (type === 'journal-item') {
      const postItem = (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.journal && PAGE_DATA.journal.posts)
        ? PAGE_DATA.journal.posts.find(p => p.id === id) : null;
      const details = (typeof blogArticles !== 'undefined' && blogArticles[id]) ? blogArticles[id] : (postItem || {});

      modalTitle = `📝 Edit Journal Article: ${details.title || postItem?.title || id}`;
      bodyContent = `
        <div class="cms-form-group">
          <label class="cms-label">Article Title</label>
          <input type="text" id="cmsPostTitle" class="cms-input" value="${escapeAttr(details.title || postItem?.title || '')}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="cms-form-group">
            <label class="cms-label">Category</label>
            <input type="text" id="cmsPostCat" class="cms-input" value="${escapeAttr(postItem?.cat || details.category || '')}">
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Read Time</label>
            <input type="text" id="cmsPostTime" class="cms-input" value="${escapeAttr(postItem?.time || details.readTime || '5 min read')}">
          </div>
          <div class="cms-form-group">
            <label class="cms-label">Date</label>
            <input type="text" id="cmsPostDate" class="cms-input" value="${escapeAttr(postItem?.date || details.date || '')}">
          </div>
        </div>
        <div class="cms-form-group">
          <label class="cms-label">Thumbnail / Hero Image</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="cmsPostImg" class="cms-input" value="${escapeAttr(postItem?.thumb || details.img || '')}">
            <label class="cms-btn-secondary" style="white-space:nowrap;cursor:pointer;">
              📁 Upload
              <input type="file" accept="image/*" style="display:none;" onchange="window._sonicCmsUploadFile(this, 'cmsPostImg', 'cmsPostImgPreview')">
            </label>
          </div>
        </div>
        <div class="cms-form-group">
          <label class="cms-label">Article Body HTML</label>
          <textarea id="cmsPostBody" class="cms-textarea" style="min-height:160px;">${escapeHtml(details.body || '')}</textarea>
        </div>
      `;
    }

    // D. Direct Image Element Click
    else if (type === 'image-element') {
      const img = targetEl.tagName === 'IMG' ? targetEl : targetEl.querySelector('img');
      const curSrc = img ? img.src : '';
      modalTitle = '🖼️ Update Image';
      bodyContent = `
        <div class="cms-form-group">
          <label class="cms-label">Current Image Preview</label>
          <div style="text-align:center;padding:16px;background:#080808;border-radius:10px;margin-bottom:12px;border:1px solid rgba(255,255,255,0.08);">
            <img id="cmsGeneralImgPreview" src="${curSrc}" style="max-width:100%;max-height:220px;border-radius:8px;object-fit:contain;">
          </div>
        </div>
        <div class="cms-form-group">
          <label class="cms-label">Image Source URL</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="cmsGeneralImgUrl" class="cms-input" value="${escapeAttr(curSrc)}">
            <label class="cms-btn-secondary" style="white-space:nowrap;cursor:pointer;">
              📁 Upload New
              <input type="file" accept="image/*" style="display:none;" onchange="window._sonicCmsUploadFile(this, 'cmsGeneralImgUrl', 'cmsGeneralImgPreview')">
            </label>
          </div>
        </div>
      `;
    }

    // E. General Section Header / Text
    else {
      const label = targetEl.getAttribute('data-cms-label') || 'Edit Section Content';
      modalTitle = label;
      const curVal = targetEl.innerText || targetEl.textContent || '';
      bodyContent = `
        <div class="cms-form-group">
          <label class="cms-label">Section: ${schema ? schema.toUpperCase() : 'GENERAL'}</label>
          <textarea id="cmsGeneralText" class="cms-textarea" style="min-height:120px;">${escapeHtml(curVal.trim())}</textarea>
        </div>
      `;
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
          <button class="cms-btn-secondary" onclick="window._sonicCmsCloseModal()">Cancel</button>
          <button class="cms-btn-primary" id="cmsSaveBtn" onclick="window._sonicCmsSaveActive()">
            <span>💾 Save & Publish</span>
          </button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  }

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
          'Content-Type': file.type || 'image/jpeg'
        },
        body: file
      });

      if (!uploadRes.ok) {
        throw new Error('Supabase Storage upload failed. Status: ' + uploadRes.status);
      }

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/sonicmedia-assets/${fileName}`;
      const inputEl = document.getElementById(targetInputId);
      if (inputEl) inputEl.value = publicUrl;

      const previewEl = document.getElementById(previewImgId);
      if (previewEl) previewEl.src = publicUrl;

      showCmsToast('Image uploaded successfully!', true);
    } catch (err) {
      alert('Upload error: ' + err.message);
    }
  };

  // ── Save Functionality ──
  window._sonicCmsSaveActive = async function () {
    if (!activeEditTarget) return;
    const saveBtn = document.getElementById('cmsSaveBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span>Saving to Supabase...</span>';
    }

    const type = activeEditTarget.getAttribute('data-cms-type');
    const id = activeEditTarget.getAttribute('data-cms-id');
    const schema = activeEditTarget.getAttribute('data-cms-schema');
    const field = activeEditTarget.getAttribute('data-cms-field');

    try {
      // 1. Portfolio Item Save
      if (type === 'portfolio-item') {
        const nameVal = document.getElementById('cmsPortName').value.trim();
        const subVal = document.getElementById('cmsPortSubtitle').value.trim();
        const catVal = document.getElementById('cmsPortCat').value.trim();
        const typeVal = document.getElementById('cmsPortType').value.trim();
        const statusVal = document.getElementById('cmsPortStatus').value.trim();
        const locVal = document.getElementById('cmsPortLocation').value.trim();
        const imgVal = document.getElementById('cmsPortImg').value.trim();
        const aboutVal = document.getElementById('cmsPortAbout').value.trim();
        const challengeVal = document.getElementById('cmsPortChallenge').value.trim();
        const solutionVal = document.getElementById('cmsPortSolution').value.trim();
        const deliverables = document.getElementById('cmsPortDeliverables').value
          .split('\n').map(s => s.trim()).filter(Boolean);

        const currentDetails = (typeof workDetails !== 'undefined' && workDetails[id]) ? workDetails[id] : {};
        const updatedDetails = Object.assign({}, currentDetails, {
          title: nameVal,
          subtitle: subVal || catVal,
          category: catVal,
          type: typeVal,
          status: statusVal,
          location: locVal,
          about: aboutVal,
          challenge: challengeVal,
          solution: solutionVal,
          deliverables: deliverables.length > 0 ? deliverables : currentDetails.deliverables,
          images: imgVal ? [{ url: imgVal, title: nameVal, desc: aboutVal }] : currentDetails.images
        });

        // Patch Supabase
        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/portfolio_items?id=eq.${id}`, {
          method: 'PATCH',
          headers: getAuthHeader(),
          body: JSON.stringify({
            name: nameVal,
            cat: catVal,
            img: imgVal || undefined,
            metric_val: statusVal,
            details: updatedDetails,
            updated_at: new Date()
          })
        });

        if (!patchRes.ok) throw new Error('Supabase error: ' + patchRes.statusText);

        // Update in-memory state & DOM
        if (typeof workDetails !== 'undefined') workDetails[id] = updatedDetails;
        if (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.portfolio && PAGE_DATA.portfolio.works) {
          const w = PAGE_DATA.portfolio.works.find(i => i.id === id);
          if (w) {
            w.name = nameVal;
            w.cat = catVal;
            if (imgVal) w.img = imgVal;
            w.metricVal = statusVal;
          }
        }
        if (typeof renderPageData === 'function') renderPageData();
        tagEditableElements();
        showCmsToast(`Portfolio item "${nameVal}" updated & saved!`, true);
      }

      // 2. Case Study Save
      else if (type === 'case-item') {
        const titleVal = document.getElementById('cmsCaseTitle').value.trim();
        const catVal = document.getElementById('cmsCaseCat').value.trim();
        const dateVal = document.getElementById('cmsCaseDate').value.trim();
        const excerptVal = document.getElementById('cmsCaseExcerpt').value.trim();
        const imgVal = document.getElementById('cmsCaseImg').value.trim();
        const bodyVal = document.getElementById('cmsCaseBody').value.trim();

        const cur = (typeof caseStudies !== 'undefined' && caseStudies[id]) ? caseStudies[id] : {};
        const updated = Object.assign({}, cur, {
          title: titleVal,
          subtitle: excerptVal,
          category: catVal,
          date: dateVal,
          body: bodyVal,
          images: imgVal ? [{ url: imgVal, caption: titleVal }] : cur.images
        });

        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/case_studies?id=eq.${id}`, {
          method: 'PATCH',
          headers: getAuthHeader(),
          body: JSON.stringify({
            title: titleVal,
            cat_label: catVal,
            date: dateVal,
            excerpt: excerptVal,
            img: imgVal || undefined,
            content: bodyVal,
            details: updated,
            updated_at: new Date()
          })
        });
        if (!patchRes.ok) throw new Error('Supabase error: ' + patchRes.statusText);

        if (typeof caseStudies !== 'undefined') caseStudies[id] = updated;
        if (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.casestudies && PAGE_DATA.casestudies.items) {
          const c = PAGE_DATA.casestudies.items.find(i => i.id === id);
          if (c) {
            c.title = titleVal;
            c.catLabel = catVal;
            c.date = dateVal;
            c.excerpt = excerptVal;
            if (imgVal) c.img = imgVal;
          }
        }
        if (typeof renderPageData === 'function') renderPageData();
        tagEditableElements();
        showCmsToast(`Case Study "${titleVal}" saved!`, true);
      }

      // 3. Journal Post Save
      else if (type === 'journal-item') {
        const titleVal = document.getElementById('cmsPostTitle').value.trim();
        const catVal = document.getElementById('cmsPostCat').value.trim();
        const timeVal = document.getElementById('cmsPostTime').value.trim();
        const dateVal = document.getElementById('cmsPostDate').value.trim();
        const imgVal = document.getElementById('cmsPostImg').value.trim();
        const bodyVal = document.getElementById('cmsPostBody').value.trim();

        const cur = (typeof blogArticles !== 'undefined' && blogArticles[id]) ? blogArticles[id] : {};
        const updated = Object.assign({}, cur, {
          title: titleVal,
          category: catVal,
          readTime: timeVal,
          date: dateVal,
          img: imgVal || cur.img,
          body: bodyVal
        });

        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/journal_posts?id=eq.${id}`, {
          method: 'PATCH',
          headers: getAuthHeader(),
          body: JSON.stringify({
            title: titleVal,
            cat: catVal,
            read_time: timeVal,
            date: dateVal,
            thumb_url: imgVal || undefined,
            content: bodyVal,
            details: updated,
            updated_at: new Date()
          })
        });
        if (!patchRes.ok) throw new Error('Supabase error: ' + patchRes.statusText);

        if (typeof blogArticles !== 'undefined') blogArticles[id] = updated;
        if (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.journal && PAGE_DATA.journal.posts) {
          const p = PAGE_DATA.journal.posts.find(i => i.id === id);
          if (p) {
            p.title = titleVal;
            p.cat = catVal;
            p.time = timeVal;
            p.date = dateVal;
            if (imgVal) p.thumb = imgVal;
          }
        }
        if (typeof renderPageData === 'function') renderPageData();
        tagEditableElements();
        showCmsToast(`Journal Post "${titleVal}" saved!`, true);
      }

      // 4. Image Element Save
      else if (type === 'image-element') {
        const newUrl = document.getElementById('cmsGeneralImgUrl').value.trim();
        const img = activeEditTarget.tagName === 'IMG' ? activeEditTarget : activeEditTarget.querySelector('img');
        if (img && newUrl) {
          img.src = newUrl;
        }
        showCmsToast('Image updated live!', true);
      }

      // 5. General Schema Text Save
      else {
        const textVal = document.getElementById('cmsGeneralText').value.trim();
        activeEditTarget.innerText = textVal;

        if (schema) {
          // Fetch existing schema row
          const getRes = await fetch(`${SUPABASE_URL}/rest/v1/site_content?key=eq.${schema}&select=*`, {
            headers: getAuthHeader()
          });
          const existingData = getRes.ok ? (await getRes.json())[0]?.data || {} : {};

          if (field) {
            existingData[field] = textVal;
          } else {
            existingData.text = textVal;
          }

          // Upsert to Supabase site_content
          await fetch(`${SUPABASE_URL}/rest/v1/site_content`, {
            method: 'POST',
            headers: Object.assign({}, getAuthHeader(), { 'Prefer': 'resolution=merge-duplicates' }),
            body: JSON.stringify({
              key: schema,
              data: existingData,
              updated_at: new Date()
            })
          });
        }
        showCmsToast('Content updated & saved to Supabase!', true);
      }

      window._sonicCmsCloseModal();
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span>💾 Save & Publish</span>';
      }
    }
  };

  window._sonicCmsCloseModal = function () {
    const modal = document.getElementById('sonicCmsModal');
    if (modal) modal.style.display = 'none';
    activeEditTarget = null;
  };

  // ── Render Floating Toolbar ──
  function renderCmsToolbar() {
    if (document.getElementById('sonicCmsBar')) return;
    const bar = document.createElement('div');
    bar.id = 'sonicCmsBar';
    bar.innerHTML = `
      <div class="cms-badge">
        <span class="cms-dot"></span>
        <span>Sonic Live CMS</span>
      </div>
      <button class="cms-toggle-btn ${isEditMode ? 'active' : ''}" id="cmsModeBtn" onclick="window._sonicCmsToggleMode()" title="Toggle visual edit outlines on and off">
        <span>${isEditMode ? '✏️ Edit Mode: ON' : '👁️ Edit Mode: OFF'}</span>
      </button>
      <button class="cms-btn-exit" onclick="window._sonicCmsExitCms()" title="Close Live CMS and preview clean website without any editing tools">
        <span>✕ Exit Preview</span>
      </button>
      <a href="/sonicmediaadmin" class="cms-btn-subtle" title="Open full admin management portal">⚙️ Admin</a>
      <button class="cms-btn-subtle" onclick="window._sonicCmsToggleBarMinimize()" title="Minimize toolbar">_</button>
    `;
    document.body.appendChild(bar);
  }

  window._sonicCmsExitCms = function () {
    isEditMode = false;
    document.body.classList.remove('sonic-cms-active');
    const bar = document.getElementById('sonicCmsBar');
    if (bar) bar.remove();
    const modal = document.getElementById('sonicCmsModal');
    if (modal) modal.remove();
    
    // Remember preference so it doesn't auto-reopen on other pages in this session
    try {
      window.sessionStorage.setItem('sonic_cms_disabled', 'true');
    } catch (_) {}

    // Clean URL query params (?live_edit=true or ?edit=true)
    if (window.location.search.includes('live_edit') || window.location.search.includes('edit=')) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    showCmsToast('✓ Live CMS closed. Previewing clean visitor site. Press Ctrl+Shift+E anytime to re-open.', true);
  };

  window._sonicCmsToggleBarMinimize = function () {
    const bar = document.getElementById('sonicCmsBar');
    if (bar) bar.classList.toggle('minimized');
  };

  window._sonicCmsToggleMode = function () {
    isEditMode = !isEditMode;
    document.body.classList.toggle('sonic-cms-active', isEditMode);
    const btn = document.getElementById('cmsModeBtn');
    if (btn) {
      btn.classList.toggle('active', isEditMode);
      btn.innerHTML = `<span>${isEditMode ? '✏️ Edit Mode: ON' : '👁️ Edit Mode: OFF'}</span>`;
    }
    showCmsToast(isEditMode ? 'Visual In-Place CMS Activated! Click any headline or item to edit.' : 'Visual Edit Mode Deactivated. Previewing as visitor.', true);
  };

  // ── Intercept Clicks on Editable Elements ──
  function initClickInterceptors() {
    document.addEventListener('click', function (e) {
      if (!isEditMode) return;
      if (e.target.closest('#sonicCmsBar') || e.target.closest('#sonicCmsModal') || e.target.closest('#sonicCmsToast')) return;

      const target = e.target.closest('[data-cms-editable]');
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        openInlineEditor(target);
      }
    }, true);
  }

  // ── Check if Admin and Initialize ──
  function init() {
    injectStyles();
    tagEditableElements();
    initClickInterceptors();

    // Check if user explicitly asked to preview without editing toolkit
    const isExplicitlyDisabled = window.sessionStorage.getItem('sonic_cms_disabled') === 'true';
    const urlParams = new URLSearchParams(window.location.search);
    const wantsPreview = urlParams.get('preview') === 'true' || urlParams.get('live_edit') === 'false';
    const wantsLiveEdit = urlParams.get('live_edit') === 'true' || urlParams.get('edit') === 'true';
    const session = getAdminSession();

    if (wantsPreview) {
      try { window.sessionStorage.setItem('sonic_cms_disabled', 'true'); } catch(_) {}
      isEditMode = false;
      document.body.classList.remove('sonic-cms-active');
      const bar = document.getElementById('sonicCmsBar');
      if (bar) bar.remove();
      return;
    }

    if (wantsLiveEdit) {
      try { window.sessionStorage.removeItem('sonic_cms_disabled'); } catch(_) {}
      isEditMode = true;
      document.body.classList.add('sonic-cms-active');
      renderCmsToolbar();
    } else if (session && !isExplicitlyDisabled) {
      isEditMode = true;
      document.body.classList.add('sonic-cms-active');
      renderCmsToolbar();
    }

    // Keyboard shortcut: Ctrl + Shift + E or Cmd + Shift + E to toggle anytime
    window.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        try { window.sessionStorage.removeItem('sonic_cms_disabled'); } catch(_) {}
        const bar = document.getElementById('sonicCmsBar');
        if (!bar) {
          renderCmsToolbar();
          if (!isEditMode) window._sonicCmsToggleMode();
        } else {
          window._sonicCmsToggleMode();
        }
      }
    });

    // Re-tag when page data or view changes
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
