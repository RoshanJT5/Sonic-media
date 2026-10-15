/* ═══════════════════════════════════════════════════
   THE SONIC MEDIA — SHARED APP JS
   Contains: Router, Cursor, Canvas, Animations,
   Page Data, Scroll Engine, Footer Injector,
   FV Modal, Video Loop Fix
═══════════════════════════════════════════════════ */

/* ─ PAGE ROUTER ─ */
const PAGES = ['home','about','services','studio','portfolio','casestudies','journal','future','faq','contact','svc-web','svc-app','svc-seo','svc-smm','svc-perf','svc-inf','svc-ecom','svc-content','svc-brand','svc-ai'];

/* ── Multi-file URL routing ──
   Each HTML file sets window.__INITIAL_PAGE__ before loading this script.
   On load we activate that page, and navigate() also offers URL-based navigation
   (falls back to SPA toggle if the target page div exists in the same file).
*/
const PAGE_FILE_MAP = {
  'home':        'index',
  'about':       'about',
  'services':    'services',
  'studio':      'portfolio',
  'portfolio':   'portfolio',
  'casestudies': 'casestudies',
  'journal':     'journal',
  'future':      'future',
  'faq':         'faq',
  'contact':     'contact',
  'svc-web':     'services/web',
  'svc-app':     'services/app',
  'svc-seo':     'services/seo',
  'svc-smm':     'services/smm',
  'svc-perf':    'services/perf',
  'svc-inf':     'services/inf',
  'svc-ecom':    'services/ecom',
  'svc-content': 'services/content',
  'svc-brand':   'services/brand',
  'svc-ai':      'services/ai',
};

/* ── Clean URL immediately on load: strip .html from address bar ── */
(function cleanUrlOnLoad() {
  if (typeof window === 'undefined' || window.location.protocol === 'file:') return;
  const p = window.location.pathname;
  if (p.endsWith('.html')) {
    let clean = p.slice(0, -5);
    if (clean === '/index' || clean === 'index') clean = '/';
    const newUrl = clean + window.location.search + window.location.hash;
    try {
      history.replaceState(null, '', newUrl);
    } catch (_) {}
  }
})();

/* Detect if we're in the services/ subfolder */
const _inServicesDir = window.location.pathname.includes('/services/');

/* Detect whether URLs must include .html (only for raw file:// protocol) */
function _useHtmlExtension() {
  return window.location.protocol === 'file:';
}

/* Resolve a page key to a clean URL relative to root or current file */
function pageUrl(page) {
  if (page === 'studio') page = 'portfolio';
  const target = PAGE_FILE_MAP[page] || 'index';

  if (_useHtmlExtension()) {
    // Only used when opening files directly from disk without a local server (file:///)
    if (_inServicesDir) {
      if (target.startsWith('services/')) return target.replace('services/', '') + '.html';
      return (target === 'index') ? '../index.html' : '../' + target + '.html';
    }
    return (target === 'index') ? 'index.html' : target + '.html';
  }

  // Clean URLs for development server and production website
  if (target === 'index') return '/';
  return '/' + target;
}

let currentPage = (window.__INITIAL_PAGE__ && PAGES.includes(window.__INITIAL_PAGE__)) ? window.__INITIAL_PAGE__ : 'home';
if (currentPage === 'studio') currentPage = 'portfolio';

function navigate(page) {
  if (page === 'studio') page = 'portfolio';
  if (!PAGES.includes(page)) page = 'home';
  // SPA toggle: if the target page div exists in this document, switch in-place
  let targetEl = document.getElementById('page-' + page);
  if (!targetEl && page === 'portfolio') {
    targetEl = document.getElementById('page-studio');
  }
  if (!targetEl) {
    // Navigate to the clean URL route for that page
    window.location.href = pageUrl(page);
    return;
  }
  // Hide current
  const curEl = document.getElementById('page-' + currentPage) || (currentPage === 'portfolio' ? document.getElementById('page-studio') : null);
  if (curEl) curEl.classList.remove('active');
  // Show new
  targetEl.classList.add('active');
  currentPage = page;

  // Sync clean URL in browser address bar without reloading
  if (window.location.protocol !== 'file:') {
    const cleanRoute = page === 'home' ? '/' : '/' + (page === 'studio' ? 'portfolio' : page);
    if (window.location.pathname !== cleanRoute) {
      try {
        history.pushState({ page }, '', cleanRoute);
      } catch (_) {}
    }
  }

  // Scroll to top — use both native and Lenis so smooth scroll doesn't override
  window.scrollTo(0, 0);
  if (window.lenis) {
    window.lenis.scrollTo(0, { immediate: true });
  }
  // Update nav active state
  document.querySelectorAll('.nav-links [data-page]').forEach(a => {
    const p = a.dataset.page;
    a.classList.toggle('active-link', p === page || (page === 'portfolio' && p === 'studio'));
  });

  // Handle browser back/forward buttons
  if (!window._popstateRegistered) {
    window._popstateRegistered = true;
    window.addEventListener('popstate', function(e) {
      if (e.state && e.state.page) {
        navigate(e.state.page);
      } else {
        const rawPath = window.location.pathname.replace(/^\/|\.html$/g, '');
        let target = rawPath === '' ? 'home' : rawPath;
        if (target === 'studio') target = 'portfolio';
        if (PAGES.includes(target)) {
          navigate(target);
        }
      }
    });
  }

  // Update title
  const titles = {
    home:'The Sonic Media — Premium Digital Marketing Agency',
    about:'About Us — The Sonic Media',
    services:'Services — The Sonic Media',
    studio:'Portfolio — The Sonic Media',
    portfolio:'Portfolio — The Sonic Media',
    casestudies:'Case Studies — The Sonic Media',
    journal:'Journal — The Sonic Media',
    future:'Future Vision — The Sonic Media',
    faq:'FAQ — The Sonic Media',
    contact:'Contact — The Sonic Media',
    'svc-web':'Website Development — The Sonic Media',
    'svc-app':'Mobile App Development — The Sonic Media',
    'svc-seo':'SEO — The Sonic Media',
    'svc-smm':'Social Media Management — The Sonic Media',
    'svc-perf':'Performance Marketing — The Sonic Media',
    'svc-inf':'Influencer Marketing — The Sonic Media',
    'svc-ecom':'E-Commerce Marketing — The Sonic Media',
    'svc-content':'Content Production — The Sonic Media',
    'svc-brand':'Branding & Advertising Solutions — The Sonic Media',
    'svc-ai':'AI Doodling/Editing — The Sonic Media'
  };
  document.title = titles[page] || titles.home;
  // Re-init observers for new page
  setTimeout(initReveal, 50);
  // Re-init canvas if going home
  if (page === 'home') {
    setTimeout(initCanvas, 100);
    // Reinit all home-specific GSAP animations after a short delay
    // so the page is visible before ScrollTrigger measures positions
    setTimeout(reinitHomeAnimations, 120);
  }
  // Rebuild FAQ if needed
  if (page === 'faq') buildFAQPage();
}

/* ── Home animation reinit helper ──
   Called every time the user navigates back to the home page.
   Kills stale ScrollTriggers scoped to home elements, then rebuilds them.
*/
function reinitHomeAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    setTimeout(reinitHomeAnimations, 80);
    return;
  }

  // 1. Kill all ScrollTriggers that belong to home-only elements
  ScrollTrigger.getAll().forEach(st => {
    const trigger = st.trigger || st.vars?.trigger;
    if (!trigger) return;
    const el = typeof trigger === 'string' ? document.querySelector(trigger) : trigger;
    if (!el) return;
    // Kill if the trigger is inside home page or is the home future/coverflow/TSM section
    if (
      el.closest && (
        el.closest('#page-home') ||
        el.closest('#tsmScrollSection') ||
        el.closest('#homeSvcScrollWrapper') ||
        el.closest('#futureSplitSection') ||
        el.closest && el.classList && el.classList.contains('cta-zoom-wrapper')
      )
    ) {
      st.kill();
    }
  });

  // 2. Refresh ScrollTrigger so it recalculates page dimensions
  ScrollTrigger.refresh();

  // 3. Rebuild Future Vision split-screen
  buildFutureVisionSplit({
    sectionId:    'futureSplitSection',
    archSelector: '#futureSplitSection .fv-arch',
    rightSelector:'#home-fv-right',
    imgSelector:  '#futureSplitSection .fv-img-wrapper'
  });

  // 4. Rebuild Thought Vessel (TSM) animation
  (function() {
    const vc        = document.getElementById('tsm-vc');
    const vid       = document.getElementById('tsm-vid');
    const darkOv    = document.getElementById('tsm-dark-overlay');
    const overlay   = document.getElementById('tsmVidOverlay');
    const caption   = document.getElementById('tsmCaption');
    const ovContent = document.getElementById('tsmOvContent');
    if (!vc || !vid) return;

    // Reset elements to initial state before re-animating
    const _isMob = window.innerWidth <= 768;
    const _tsmInitSize = _isMob ? '72vw' : '320px';

    setResponsiveVideoSrc(vid, _isMob);

    gsap.set(vc,        { width: _tsmInitSize, height: _tsmInitSize, borderRadius: '16px', borderColor: 'rgba(255,92,0,0.18)' });
    gsap.set(vid,       { scale: 1 });
    gsap.set(darkOv,    { backgroundColor: 'rgba(0,0,0,0)' });
    gsap.set(overlay,   { clipPath: 'inset(100% 0 0 0)' });
    gsap.set(caption,   { transform: 'translateY(30px)' });
    gsap.set(ovContent, { filter: 'blur(10px)', transform: 'scale(1.1)' });

    vid.play().catch(() => {});

    gsap.timeline({
      scrollTrigger: {
        trigger: '#tsmScrollSection',
        start: 'top top',
        end: 'bottom bottom',
        pin: false,
        scrub: 1.2,
        onEnter: () => vid.play()
      }
    })
    .to(vc,        { width: '100%', height: '100%', borderRadius: '0px', borderColor: 'transparent', ease: 'expo.out', duration: 0.5 }, 0)
    .to(vid,       { scale: 1.08, ease: 'expo.out', duration: 0.5 }, 0)
    .to(darkOv,    { backgroundColor: 'rgba(0,0,0,0.45)', ease: 'power3.inOut', duration: 0.5 }, 0)
    .to(overlay,   { clipPath: 'inset(0% 0 0 0)', ease: 'expo.out', duration: 0.3 }, 0.4)
    .to(caption,   { transform: 'translateY(0)', ease: 'expo.out', duration: 0.3 }, 0.45)
    .to(ovContent, { filter: 'blur(0px)', transform: 'scale(1)', ease: 'expo.out', duration: 0.4 }, 0.45);
  })();

  // 5. Rebuild home coverflow — clear old cards and rebuild
  (function() {
    const list = document.getElementById('homeSvcList');
    const gallery = document.getElementById('homeSvcGallery');
    if (!list || !gallery) return;
    // Clear old GSAP-set styles and DOM cards so buildCoverflowInstance starts fresh
    list.innerHTML = '';
    // Remove old scroll hint if present to avoid duplicates
    const oldHint = gallery.querySelector('.hcf-scroll-hint');
    if (oldHint) oldHint.remove();
    buildCoverflowInstance({
      listId:    'homeSvcList',
      galleryId: 'homeSvcGallery',
      wrapperId: 'homeSvcScrollWrapper',
      cardsData: SVC_CARDS_DATA,
      showHint:  false,
    });
  })();

  // 6. Rebuild "Design Your Legacy" CTA zoom perspective animation
  (function() {
    const zoomContainer = document.querySelector('.cta-zoom-container');
    const zoomWrapper   = document.querySelector('.cta-zoom-wrapper');
    if (!zoomContainer || !zoomWrapper) return;

    // Reset all GSAP inline styles so the animation starts from the CSS baseline
    gsap.set('.czoom-item[data-layer="3"]', { opacity: 0.65, z: 0, clearProps: 'z' });
    gsap.set('.czoom-item[data-layer="2"]', { opacity: 0.45, z: 0, clearProps: 'z' });
    gsap.set('.czoom-item[data-layer="1"]', { opacity: 0.22, z: 0, clearProps: 'z' });
    gsap.set('.cta-zoom-heading',           { opacity: 0.07, z: 0, clearProps: 'z' });

    // Kill any stale ScrollTrigger pinning this container
    ScrollTrigger.getAll().forEach(st => {
      if (st.pin === zoomContainer || st.trigger === zoomWrapper) st.kill();
    });

    gsap.timeline({
      scrollTrigger: {
        trigger: zoomWrapper,
        start: 'top top',
        end: 'bottom bottom',
        pin: zoomContainer,
        scrub: 1.4,
        anticipatePin: 1,
      }
    })
    .to('.czoom-item[data-layer="3"]', { opacity: 1, z: 850, ease: 'power1.inOut' }, 0)
    .to('.czoom-item[data-layer="2"]', { opacity: 1, z: 640, ease: 'power1.inOut' }, 0)
    .to('.czoom-item[data-layer="1"]', { opacity: 1, z: 420, ease: 'power1.inOut' }, 0)
    .to('.cta-zoom-heading',           { opacity: 0.92, z: 60, ease: 'power1.inOut' }, 0);
  })();

  // 7. Rebuild Horizontal Timeline animation
  initTimelineAnimations();

  ScrollTrigger.refresh();
}

/* ── RESULTS THAT SPEAK — PINNED HORIZONTAL TIMELINE GSAP ANIMATION ──
   Dynamic, unbounded timeline: supports ANY number of portfolio cards (6, 7, 10, 15+).
   Pins the viewport and scrubs horizontal progress, central rail & traveling pulse head,
   and staggered vertical stems, glowing dots, and milestone cards along a single unified master timeline.
*/
function initTimelineAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const sections = document.querySelectorAll('.sonic-timeline-section');
  if (!sections.length) return;

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const winW = window.innerWidth;
  const isMobile = winW < 768;
  const isSmallPhone = winW <= 480;
  const isTablet = winW >= 768 && winW <= 1024;

  sections.forEach(function(section) {
    const slider = section.querySelector('.sonic-timeline-slider');
    if (!slider) return;

    // 1. Kill any existing ScrollTrigger instances scoped to this section to avoid duplicate triggers
    ScrollTrigger.getAll().forEach(function(st) {
      if (st.trigger === section || (st.vars && st.vars.trigger === section)) {
        st.kill();
      }
    });

    // 2. Discover all milestone items in alternating chronological order
    const works = (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.portfolio && PAGE_DATA.portfolio.works) 
      ? PAGE_DATA.portfolio.works 
      : [];
    
    let itemsToAnimate = [];
    if (works && works.length > 0) {
      works.forEach(function(w, idx) {
        const el = section.querySelector('.sonic-milestone-item[data-id="' + w.id + '"]');
        if (el) itemsToAnimate.push({ el: el, index: idx, id: w.id });
      });
    }
    // Also include any milestone items in the DOM that might not be in works array
    section.querySelectorAll('.sonic-milestone-item').forEach(function(el) {
      if (!itemsToAnimate.some(it => it.el === el)) {
        itemsToAnimate.push({ el: el, index: itemsToAnimate.length, id: el.getAttribute('data-id') || '' });
      }
    });

    const numCards = itemsToAnimate.length;
    const cols = Math.max(3, Math.ceil(numCards / 2));

    // Dynamic section height: tuned for each device tier so pacing is relaxed and luxurious
    const targetVh = isSmallPhone
      ? Math.max(340, 170 + cols * 48)
      : (isMobile 
          ? Math.max(360, 185 + cols * 52) 
          : (isTablet 
              ? Math.max(300, 160 + cols * 44) 
              : Math.max(280, 150 + cols * 42)));
    section.style.height = targetVh + 'vh';

    // Ensure .sonic-timeline-rail and .journey-line-glow-head are present
    const lineWrap = section.querySelector('.sonic-timeline-center-line-wrap');
    if (lineWrap) {
      let rail = lineWrap.querySelector('.sonic-timeline-rail');
      let journeyLine = lineWrap.querySelector('.journey-line');
      if (!rail && journeyLine) {
        rail = document.createElement('div');
        rail.className = 'sonic-timeline-rail';
        journeyLine.parentNode.insertBefore(rail, journeyLine);
        rail.appendChild(journeyLine);
      }
      if (journeyLine && !journeyLine.querySelector('.journey-line-glow-head')) {
        const head = document.createElement('div');
        head.className = 'journey-line-glow-head';
        journeyLine.appendChild(head);
      }
    }

    const line = section.querySelector('.journey-line');
    const endDot = section.querySelector('.sonic-timeline-line-dot.end');
    const headDot = line ? line.querySelector('.journey-line-glow-head') : null;

    if (prefersReduced) {
      if (line) gsap.set(line, { width: '100%' });
      if (headDot) gsap.set(headDot, { opacity: 1 });
      if (endDot) endDot.classList.add('active');
      itemsToAnimate.forEach(function(itemObj) {
        const s = itemObj.el.querySelector('.sonic-stem-line');
        const d = itemObj.el.querySelector('.sonic-stem-dot');
        const c = itemObj.el.querySelector('.sonic-milestone-card');
        if (s) gsap.set(s, { scaleY: 1 });
        if (d) gsap.set(d, { scale: 1 });
        if (c) gsap.set(c, { opacity: 1, y: 0 });
      });
      return;
    }

    // Dynamic horizontal scrub calculation tailored per device
    const getSlideDistance = function() {
      const extra = isSmallPhone ? 15 : (isMobile ? 25 : (isTablet ? 40 : 60));
      return -(slider.scrollWidth - window.innerWidth + extra);
    };

    // Responsive scrub stiffness: snappy on touch devices, buttery on desktop
    const scrubVal = isMobile ? 0.75 : (isTablet ? 0.95 : 1.2);

    // 3. Unified Master Timeline scrubbed across the pinned section
    const masterTl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: scrubVal,
        invalidateOnRefresh: true,
        onUpdate: function(self) {
          if (headDot) {
            headDot.style.opacity = self.progress > 0.005 ? '1' : '0';
          }
          if (endDot) {
            if (self.progress >= 0.88) {
              endDot.classList.add('active');
            } else {
              endDot.classList.remove('active');
            }
          }
        }
      }
    });

    // 3a. Horizontal slider scrub across the entire 0 -> 1 timeline progress
    masterTl.fromTo(slider,
      { x: 0 },
      { x: getSlideDistance, ease: 'none', duration: 1 },
      0
    );

    // 3b. Central timeline line expansion (horizontal drawing animation with traveling pulse head)
    if (line) {
      masterTl.fromTo(line,
        { width: '0%' },
        { width: '100%', ease: 'none', duration: 0.88 },
        0
      );
    }

    // 3c. Staggered stem, dot & card reveals along the scrub
    // Supports ANY number of cards: dynamically slots every card between startRange and endRange
    const startRange = isSmallPhone ? 0.025 : (isMobile ? 0.03 : 0.03);
    const endRange = isMobile ? 0.85 : 0.82;
    const step = numCards > 1 ? ((endRange - startRange) / (numCards - 0.5)) : 0.4;
    const cardDuration = Math.min(0.20, Math.max(0.08, step * 1.3));

    itemsToAnimate.forEach(function(itemObj) {
      const el = itemObj.el;
      const index = itemObj.index;
      const isTop = el.classList.contains('top') || (index % 2 === 0);
      const stem = el.querySelector('.sonic-stem-line');
      const dot = el.querySelector('.sonic-stem-dot');
      const card = el.querySelector('.sonic-milestone-card');

      const cardStart = startRange + (index * step);

      if (stem) {
        masterTl.fromTo(stem,
          { scaleY: 0, transformOrigin: isTop ? 'bottom bottom' : 'top top' },
          { scaleY: 1, duration: cardDuration * 0.65, ease: 'power2.out' },
          cardStart
        );
      }
      if (dot) {
        masterTl.fromTo(dot,
          { scale: 0 },
          { scale: 1, duration: cardDuration * 0.55, ease: 'back.out(2)' },
          cardStart
        );
      }
      if (card) {
        const yOffset = isSmallPhone ? (isTop ? 20 : -20) : (isMobile ? (isTop ? 26 : -26) : (isTop ? 32 : -32));
        masterTl.fromTo(card,
          { opacity: 0.15, y: yOffset },
          { opacity: 1, y: 0, duration: cardDuration, ease: 'power2.out' },
          cardStart + cardDuration * 0.12
        );
      }
    });

    // 4. Touch swipe helper for mobile: horizontal finger swipe smoothly scrolls the timeline
    if (isMobile && !slider.__hasTouchListener) {
      slider.__hasTouchListener = true;
      let touchStartX = 0;
      let touchStartY = 0;

      slider.addEventListener('touchstart', function(e) {
        if (e.touches && e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      slider.addEventListener('touchmove', function(e) {
        if (e.touches && e.touches.length === 1) {
          const dx = e.touches[0].clientX - touchStartX;
          const dy = e.touches[0].clientY - touchStartY;
          if (Math.abs(dx) > Math.abs(dy) * 1.15 && Math.abs(dx) > 10) {
            window.scrollBy({ top: -dx * 0.85, behavior: 'auto' });
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
          }
        }
      }, { passive: true });
    }
  });

  ScrollTrigger.refresh();
}
window.initTimelineAnimations = initTimelineAnimations;

// Hook timeline into resize and orientation change
let _timelineResizeTimer = null;
window.addEventListener('resize', function() {
  clearTimeout(_timelineResizeTimer);
  _timelineResizeTimer = setTimeout(initTimelineAnimations, 200);
}, { passive: true });

window.addEventListener('orientationchange', function() {
  setTimeout(initTimelineAnimations, 300);
}, { passive: true });


/* ── Navigate Hook System ──
   Instead of wrapping window.navigate repeatedly (which causes stacking bugs),
   modules register post-navigate callbacks here.
*/
window._navigateHooks = [];
window._addNavHook = function(fn) { window._navigateHooks.push(fn); };

window._addNavHook(function(page) {
  if (page === 'portfolio' || page === 'studio' || page === 'home') {
    setTimeout(initTimelineAnimations, 120);
  }
});

const _coreNavigate = navigate;
window.navigate = function(page) {
  _coreNavigate(page);
  window._navigateHooks.forEach(function(fn){ try { fn(page); } catch(e){} });
};

/* ─ Cursor ─ */
const cursor = document.getElementById('cursor');
const isTouchDevice = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
const cursorFollower = document.getElementById('cursor-follower');
const mouseGlow = document.getElementById('mouse-glow');
let mx = 0, my = 0, fx = 0, fy = 0;
let cursorRAF = null;
let animCursorRunning = false;

if (!isTouchDevice) {
  // Throttle mousemove for better performance
  let lastUpdate = 0;
  document.addEventListener('mousemove', e => {
    const now = performance.now();
    if (now - lastUpdate < 10) return; // Max 100fps
    lastUpdate = now;
    
    mx = e.clientX; my = e.clientY;
    if (cursor) { cursor.style.left = mx + 'px'; cursor.style.top = my + 'px'; }
    if (mouseGlow) { mouseGlow.style.left = mx + 'px'; mouseGlow.style.top = my + 'px'; }

    // Start cursor animation loop only when mouse moves
    if (!animCursorRunning && cursorFollower) {
      animCursorRunning = true;
      cursorRAF = requestAnimationFrame(animCursor);
    }
  }, { passive: true });

  function animCursor() {
    if (cursorFollower) {
      const dx = mx - fx;
      const dy = my - fy;
      fx += dx * 0.15; 
      fy += dy * 0.15;
      cursorFollower.style.left = fx + 'px'; 
      cursorFollower.style.top = fy + 'px';

      // Sleep loop if close enough to mouse position
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        animCursorRunning = false;
        return;
      }
    }
    cursorRAF = requestAnimationFrame(animCursor);
  }

  document.addEventListener('mouseover', e => {
    if (e.target.closest('a,button,.svc-card,.cs-item,.tcard,.jcard,.fv-card,.studio-card,.team-card,.val-card,.equip-card,.price-card,.wd-card,.wd-full-card,.wd-gallery-card,.wd-meta-card,.wd-nav-btn'))
      document.body.classList.add('cursor-hover');
    else document.body.classList.remove('cursor-hover');
  }, { passive: true });

  /* ─ Cursor Trail (Event-Driven & Sleeping Loop) ─ */
  (function() {
    const canvas = document.getElementById('cursor-trail');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight;
      }, 200);
    }, { passive: true });
    
    const trail = [];
    const maxTrailLength = 15;
    let trailRunning = false;
    let lastTrailUpdate = 0;

    document.addEventListener('mousemove', e => {
      const now = performance.now();
      if (now - lastTrailUpdate < 40) return;
      lastTrailUpdate = now;
      
      trail.push({ x: e.clientX, y: e.clientY, alpha: 1 });
      if (trail.length > maxTrailLength) trail.shift();

      if (!trailRunning) {
        trailRunning = true;
        requestAnimationFrame(drawTrail);
      }
    }, { passive: true });
    
    function drawTrail() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,92,0,${p.alpha * 0.2})`;
        ctx.fill();
        p.alpha -= 0.06;
        if (p.alpha <= 0) trail.splice(i, 1);
      }

      if (trail.length > 0) {
        requestAnimationFrame(drawTrail);
      } else {
        trailRunning = false; // Sleep until next mouse move!
      }
    }
  })();
} else {
  // Mobile / Touch devices: hide unused desktop cursor elements
  if (cursor) cursor.style.display = 'none';
  if (cursorFollower) cursorFollower.style.display = 'none';
  const cTrail = document.getElementById('cursor-trail');
  if (cTrail) cTrail.style.display = 'none';
}

/* ─ Scroll Progress ─ */
const sp=document.getElementById('sp');
let scrollTicking = false;

window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    requestAnimationFrame(() => {
      if (sp) {
        const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100;
        sp.style.width = pct + '%';
      }
      const navEl = document.getElementById('navbar');
      if (navEl) {
        navEl.classList.toggle('stuck', window.scrollY > 60);
      }
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}, { passive: true });

/* ─ Mobile Nav ─ */
const mobNav=document.getElementById('mobNav');
const hamBtn=document.getElementById('ham');

function openMob(){
  if (!mobNav || !hamBtn) return;
  mobNav.classList.add('open');
  hamBtn.classList.add('active');
  document.body.classList.add('mob-open');
  document.body.style.overflow='hidden';
}
function closeMob(){
  if (!mobNav || !hamBtn) return;
  mobNav.classList.remove('open');
  hamBtn.classList.remove('active');
  document.body.classList.remove('mob-open');
  document.body.style.overflow='';
  // Close services accordion too
  const toggle=document.getElementById('mobSvcToggle');
  const submenu=document.getElementById('mobSvcSubmenu');
  if(toggle && submenu){
    toggle.classList.remove('open');
    submenu.classList.remove('open');
    toggle.setAttribute('aria-expanded','false');
  }
}

function toggleMobServices(){
  const toggle=document.getElementById('mobSvcToggle');
  const submenu=document.getElementById('mobSvcSubmenu');
  if(!toggle || !submenu) return;
  const isOpen=submenu.classList.contains('open');
  toggle.classList.toggle('open',!isOpen);
  submenu.classList.toggle('open',!isOpen);
  toggle.setAttribute('aria-expanded',String(!isOpen));
}

if (hamBtn && mobNav) {
  hamBtn.addEventListener('click',function(){ mobNav.classList.contains('open') ? closeMob() : openMob(); });
}
const mobCloseBtn = document.getElementById('mobClose');
if (mobCloseBtn) {
  mobCloseBtn.addEventListener('click',closeMob);
}

// Update active state in mobile nav when page changes
window._addNavHook(function(page){
  document.querySelectorAll('[data-mob-page]').forEach(btn=>{
    btn.classList.toggle('active-mob', btn.dataset.mobPage===page);
  });
});

/* ─ Reveal Observer ─ */
/* ── Activate the correct initial page on load ── */
(function activateInitialPage() {
  const initPage = (window.__INITIAL_PAGE__ && PAGES.includes(window.__INITIAL_PAGE__))
    ? window.__INITIAL_PAGE__ : 'home';
  // Hide all pages first
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Show the correct one
  const el = document.getElementById('page-' + initPage);
  if (el) {
    el.classList.add('active');
    currentPage = initPage;
  }
  // Update nav active state
  document.querySelectorAll('.nav-links [data-page]').forEach(a => {
    a.classList.toggle('active-link', a.dataset.page === initPage);
  });
  document.querySelectorAll('[data-mob-page]').forEach(b => {
    b.classList.toggle('active-mob', b.dataset.mobPage === initPage);
  });
})();

function initReveal() {
  const revEls = document.querySelectorAll('.page.active .reveal, .page.active .reveal-l, .page.active .reveal-r');
  const obs = new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('vis');});
  },{threshold:.1});
  revEls.forEach(el=>obs.observe(el));
}
initReveal();

/* ─ CTA Matrix Canvas ─ */
function initCanvas() {
  const canvas = document.getElementById('ctaCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  
  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 200);
  }, { passive: true });
  
  const chars = 'SONICMEDIA01アイウエオ∆∇★✦'.split('');
  const fs = 13;
  let cols = Math.floor(canvas.width / fs);
  const drops = Array(cols).fill(1);
  
  if (canvas._interval) clearInterval(canvas._interval);
  canvas._interval = setInterval(() => {
    ctx.fillStyle = 'rgba(20,10,0,0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    cols = Math.floor(canvas.width / fs);
    while (drops.length < cols) drops.push(Math.random() * canvas.height);
    ctx.font = fs + 'px monospace';
    for (let i = 0; i < cols; i++) {
      ctx.fillStyle = `rgba(255,92,0,${Math.random() * 0.4 + 0.2})`;
      ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fs, drops[i] * fs);
      if (drops[i] * fs > canvas.height && Math.random() > 0.97) drops[i] = 0;
      drops[i]++;
    }
  }, 80);
}
initCanvas();

/* ─ Counter Animation ─ */
function animCount(el){
  const target=parseInt(el.dataset.count);
  let cur2=0;const inc=target/60;
  const t=setInterval(()=>{
    cur2+=inc;if(cur2>=target){cur2=target;clearInterval(t);}
    el.textContent=Math.floor(cur2);
  },28);
}
const countObs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){animCount(e.target);countObs.unobserve(e.target);}});
},{threshold:.5});
document.querySelectorAll('[data-count]').forEach(el=>countObs.observe(el));

/* ─ Ripple on Click ─ */
document.addEventListener('click',e=>{
  const r=document.createElement('div');
  const s=70;
  r.style.cssText=`position:fixed;pointer-events:none;z-index:99990;border-radius:50%;width:${s}px;height:${s}px;left:${e.clientX-s/2}px;top:${e.clientY-s/2}px;background:rgba(255,92,0,.18);transform:scale(0);animation:ripA .7s ease-out forwards;`;
  document.body.appendChild(r);setTimeout(()=>r.remove(),700);
});
const rStyle=document.createElement('style');
rStyle.textContent='@keyframes ripA{to{transform:scale(4);opacity:0;}}';
document.head.appendChild(rStyle);

/* ─ Parallax on Hero ─ */
let parallaxTicking = false;

window.addEventListener('scroll', () => {
  if (!parallaxTicking) {
    requestAnimationFrame(() => {
      const hero = document.querySelector('.page.active .hero-left');
      if (hero && window.scrollY < window.innerHeight) {
        // Only apply parallax translate to non-button elements
        const fadeEls = hero.querySelectorAll('.hero-eyebrow,.hero-h1,.hero-sub,.hero-stats,.hero-scroll');
        const opacity = Math.max(0, 1 - window.scrollY / (window.innerHeight * 0.8));
        const ty = window.scrollY * 0.18;
        fadeEls.forEach(el => {
          el.style.opacity = opacity;
          el.style.transform = `translate3d(0, ${ty}px, 0)`;
        });
        // Buttons: keep fully visible, no transform
        const btns = hero.querySelector('.hero-btns');
        if (btns) { btns.style.opacity = '1'; btns.style.transform = 'none'; }
      }
      parallaxTicking = false;
    });
    parallaxTicking = true;
  }
}, { passive: true });

/* ─ Portfolio Filter ─ */
function filterPort(btn, cat) {
  document.querySelectorAll('.pfilt').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.port-item').forEach(item=>{
    if(cat==='all'||item.dataset.cat.includes(cat)) item.classList.remove('hidden');
    else item.classList.add('hidden');
  });
}

/* ─ Journal Filter ─ */
function filterJournal(btn, cat) {
  document.querySelectorAll('.jcat-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#page-casestudies-grid .jcard').forEach(item=>{
    if(cat==='all'||item.dataset.cat===cat) item.style.display='flex';
    else item.style.display='none';
  });
}

/* ─ FAQ Data & Builder ─ */
const faqs=[
  {q:'What services does The Sonic Media provide?',a:'The Sonic Media provides a range of digital marketing services including social media management, content creation, brand strategy, SEO services, paid advertising campaigns, website marketing, influencer collaborations, online reputation management, and performance reporting tailored to business growth and brand visibility.'},
  {q:'How can I start working with The Sonic Media?',a:'You can get started by contacting The Sonic Media through the website, email, phone, or WhatsApp. After understanding your business goals, target audience, and marketing requirements, a customized digital marketing strategy and service proposal is prepared based on your brand objectives.'},
  {q:'Do you work with businesses outside Ahmedabad or India?',a:'Yes. The Sonic Media works with businesses across different cities and international markets through remote collaboration, online meetings, digital reporting systems, and streamlined communication channels for efficient project management.'},
  {q:'Can The Sonic Media help with negative reviews and online reputation management?',a:'Yes. The Sonic Media offers online reputation management services that include review response strategies, brand monitoring, digital communication support, and reputation improvement planning to help businesses maintain a professional and trustworthy online presence.'},
  {q:'What is your pricing structure for digital marketing services?',a:'Pricing depends on the scope of work, business goals, selected services, and project duration. The Sonic Media offers flexible service plans for social media marketing, SEO, branding, advertising campaigns, and website-related projects with clear deliverables and transparent communication.'},
  {q:'How do you handle client data security and confidentiality?',a:'The Sonic Media follows professional processes to maintain the confidentiality of client information, marketing assets, and account access. Secure systems, restricted access controls, and confidential working practices are maintained throughout project collaboration.'},
  {q:'Can you help startups or new businesses build an online presence?',a:'Yes. The Sonic Media supports startups and new businesses with branding, logo design, website development, social media setup, SEO foundations, content strategy, and digital marketing solutions designed to establish a strong online presence from the beginning.'},
  {q:'Which platforms does The Sonic Media work with?',a:'The Sonic Media works across major digital platforms including Instagram, Facebook, Google, YouTube, LinkedIn, and other online marketing channels. Various industry-standard marketing, analytics, advertising, and content management tools are used to support campaign performance and audience engagement.'},
  {q:'How quickly can your team respond to urgent marketing or campaign issues?',a:'Response times may vary depending on the nature of the issue and project requirements. The Sonic Media prioritizes active campaigns, technical concerns, advertising issues, and brand communication matters through structured support and ongoing client coordination.'},
];

function buildFAQList(containerId, limit) {
  const container = document.getElementById(containerId);
  if(!container||container.children.length>0) return;
  const items = limit ? faqs.slice(0, limit) : faqs;
  items.forEach(f=>{
    const item=document.createElement('div');
    item.className='faq-item-pro';
    item.innerHTML=`<button class="faq-q-btn" onclick="toggleFaqPro(this)"><span>${f.q}</span><i class="faq-q-icon">+</i></button><div class="faq-ans-pro"><p>${f.a}</p></div>`;
    container.appendChild(item);
  });
}

function buildFAQPage() {
  buildFAQList('faqListPage');
}

// Build home FAQ on load (show only 5)
buildFAQList('faqList', 5);

// Build full FAQ list if landing directly on faq.html
(function() {
  function maybeInitFaqPage() {
    if (window.__INITIAL_PAGE__ === 'faq') {
      buildFAQList('faqListPage');
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeInitFaqPage);
  } else {
    maybeInitFaqPage();
  }
})();

function toggleFaqPro(btn){
  const item=btn.closest('.faq-item-pro');
  const ans=item.querySelector('.faq-ans-pro');
  const icon=item.querySelector('.faq-q-icon');
  const isOpen=item.classList.contains('faq-open');
  document.querySelectorAll('.faq-item-pro.faq-open').forEach(el=>{
    el.classList.remove('faq-open');
    el.querySelector('.faq-ans-pro').style.maxHeight='0';
    el.querySelector('.faq-q-icon').textContent='+';
  });
  if(!isOpen){
    item.classList.add('faq-open');
    ans.style.maxHeight=ans.scrollHeight+'px';
    icon.textContent='×';
  }
}

/* ─ Legal Pages ─ */
const legalContent = {
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'May 2026',
    sections: [
      { heading: '1. Information We Collect', body: 'We collect information you provide directly, such as your name, email address, phone number, and any other information you submit through our contact forms or newsletter sign-ups. We may also collect information automatically when you visit our website, including IP addresses, browser type, pages visited, and referral sources via cookies and analytics tools.' },
      { heading: '2. How We Use Your Information', body: 'We use the information we collect to respond to your enquiries, provide our digital marketing services, send newsletters and marketing communications (with your consent), improve our website and services, analyse website usage, and comply with legal obligations.' },
      { heading: '3. Sharing of Information', body: 'We do not sell, rent, or trade your personal information to third parties. We may share your information with trusted service providers who assist us in operating our website and delivering our services, subject to strict confidentiality agreements. We may also disclose information when required by law.' },
      { heading: '4. Data Retention', body: 'We retain your personal data only for as long as necessary to fulfil the purposes for which it was collected or as required by applicable law. You may request deletion of your data at any time by contacting us.' },
      { heading: '5. Cookies', body: 'Our website uses cookies to enhance your experience. You can control cookie settings through your browser. For more details, please refer to our Cookie Policy.' },
      { heading: '6. Your Rights', body: 'You have the right to access, correct, or delete your personal data at any time. You may also withdraw consent for marketing communications by clicking "unsubscribe" in any email or by contacting us directly.' },
      { heading: '7. Security', body: 'We implement industry-standard security measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction. All client credentials and data are stored in access-controlled systems.' },
      { heading: '8. Contact Us', body: 'For any privacy-related queries, please contact us at hello@thesonicmedia.com or via WhatsApp at +91 99999 99999.' }
    ]
  },
  terms: {
    title: 'Terms of Service',
    lastUpdated: 'May 2026',
    sections: [
      { heading: '1. Acceptance of Terms', body: 'By accessing or using any services offered by The Sonic Media, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services or website.' },
      { heading: '2. Services', body: 'The Sonic Media provides digital marketing, website development, social media management, performance marketing, SEO, content production, branding, and related services as described on our website. Specific deliverables, timelines, and pricing are defined in individual client agreements.' },
      { heading: '3. Client Responsibilities', body: 'Clients agree to provide accurate and complete information required for service delivery, timely feedback and approvals, access to necessary accounts and platforms, and payment as agreed in the service contract.' },
      { heading: '4. Intellectual Property', body: 'Upon full payment, clients receive ownership of all creative assets produced specifically for them. The Sonic Media retains the right to display work in our portfolio unless explicitly agreed otherwise. Pre-existing tools, templates, and methodologies remain our intellectual property.' },
      { heading: '5. Confidentiality', body: 'We sign NDAs with every client and treat all client information, strategies, and data as strictly confidential. We will never share your brand information with third parties without your explicit consent.' },
      { heading: '6. Payment Terms', body: 'Payment terms are defined in individual service agreements. Retainer fees are due in advance. Late payments may result in suspension of services. All prices are exclusive of applicable taxes unless stated otherwise.' },
      { heading: '7. Limitation of Liability', body: 'The Sonic Media\'s liability is limited to the fees paid for the specific service in question. We are not liable for indirect, incidental, or consequential damages. Results may vary and are not guaranteed unless explicitly stated in a signed performance agreement.' },
      { heading: '8. Termination', body: 'Either party may terminate a service agreement with 30 days written notice. Fees for work completed up to the termination date are due and payable. Ongoing retainer agreements require notice as specified in the signed contract.' },
      { heading: '9. Governing Law', body: 'These terms are governed by the laws of India. Any disputes shall be resolved through mutual negotiation, and if unresolved, through arbitration in Ahmedabad, Gujarat.' },
      { heading: '10. Changes to Terms', body: 'We reserve the right to update these terms at any time. Changes will be communicated via email or posted on our website. Continued use of our services constitutes acceptance of updated terms.' }
    ]
  },
  cookie: {
    title: 'Cookie Policy',
    lastUpdated: 'May 2026',
    sections: [
      { heading: '1. What Are Cookies', body: 'Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences, analyse traffic, and improve user experience. Cookies cannot run programs or deliver viruses to your device.' },
      { heading: '2. Types of Cookies We Use', body: 'Essential Cookies: Required for the website to function properly, such as session cookies and security cookies. These cannot be disabled. Analytics Cookies: We use Google Analytics and similar tools to understand how visitors interact with our website — which pages are visited, how long users stay, and where traffic comes from. Marketing Cookies: Used to deliver relevant advertisements and track campaign effectiveness on platforms such as Meta and Google.' },
      { heading: '3. Third-Party Cookies', body: 'Some cookies are placed by third-party services that appear on our website, such as Google Analytics, Meta Pixel, and embedded social media content. These are subject to the respective third parties\' privacy policies.' },
      { heading: '4. Managing Cookies', body: 'You can control and delete cookies through your browser settings. Most browsers allow you to block cookies, delete existing cookies, or be notified when a cookie is being set. Note that disabling certain cookies may affect website functionality.' },
      { heading: '5. Cookie Retention', body: 'Session cookies are deleted when you close your browser. Persistent cookies remain on your device for a set period (typically 30 days to 2 years) or until you delete them. Analytics cookies expire as per the data retention settings of the respective analytics platform.' },
      { heading: '6. Your Consent', body: 'By continuing to use our website, you consent to our use of cookies as described in this policy. You may withdraw consent at any time by adjusting your browser settings or contacting us at hello@thesonicmedia.com.' },
      { heading: '7. Updates to This Policy', body: 'We may update this Cookie Policy from time to time to reflect changes in technology or legal requirements. The latest version will always be available on our website with the date of last update.' }
    ]
  }
};

/* ─ Work Detail Pages ─ */
const workDetails = {
  luxefashion: {
    title: 'LedgerLink Consultation Pvt Ltd',
    subtitle: 'Tax & Financial Advisory Website',
    category: 'Web Design & Development',
    type: 'Client Project',
    status: 'Live',
    location: 'Ahmedabad, Gujarat',
    industry: 'Tax & Financial Advisory',
    year: '2026',
    liveUrl: 'https://lcpladvisory.com',
    liveDomain: 'lcpladvisory.com',
    metric: 'Live lcpladvisory.com',
    about: 'LedgerLink Consultation Pvt Ltd is a premium tax and financial advisory firm offering expert GST, Income Tax, Accounting, and Compliance solutions to businesses and individuals.',
    challenge: 'The client needed a professional, trust-building online presence to attract businesses and individuals seeking reliable tax and compliance advisory services in Ahmedabad.',
    solution: 'Designed and developed a clean, conversion-focused website highlighting their services, expertise, and credibility — structured to generate leads and build client confidence.',
    tags: ['Web Design', 'HTML / CSS', 'Responsive Layout', 'SEO', 'UI/UX', 'Tax Industry'],
    deliverables: [
      'Responsive website design (mobile & desktop)',
      'Service pages for GST, Income Tax, Accounting & Compliance',
      'SEO-optimised content structure',
      'Lead generation with contact & inquiry sections',
      'Brand-consistent UI with professional, trustworthy feel',
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=900&q=80', title: 'Professional Web Presence', desc: 'Clean, trust-building website designed to attract businesses and individuals seeking reliable tax and compliance advisory services in Ahmedabad.' },
      { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80', title: 'Service Pages', desc: 'Dedicated pages for GST, Income Tax, Accounting & Compliance — each structured to clearly communicate expertise and drive enquiries.' },
      { url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=900&q=80', title: 'Responsive Design', desc: 'Fully responsive layout optimised for mobile and desktop — ensuring a seamless experience across all devices for potential clients.' },
      { url: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=900&q=80', title: 'Lead Generation', desc: 'Strategic contact and inquiry sections designed to convert visitors into consultation requests and qualified leads.' },
      { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80', title: 'SEO-Optimised Structure', desc: 'Content architecture built for search — keyword-rich headings, meta structure, and semantic HTML to improve local discovery in Ahmedabad.' },
      { url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=900&q=80', title: 'Brand-Consistent UI', desc: 'Professional, trustworthy visual identity that reflects the firm\'s credibility and positions LedgerLink as a premium advisory partner.' },
    ]
  },
  techvault: {
    title: 'Titan Fitness Club',
    subtitle: 'Gym Launch Campaign Creatives',
    category: 'Creative Design',
    type: 'Marketing Project',
    status: 'Completed',
    location: 'Vadodara, Gujarat',
    industry: 'Fitness & Wellness',
    year: '2026',
    metric: 'Completed',
    about: 'Titan Fitness Club is a local fitness studio focused on strength training and transformation programs.',
    challenge: 'The gym required bold and energetic promotional designs for its launch campaign to attract local memberships and increase visibility .',
    solution: 'Created a complete set of high-impact launch creatives including posters, banners, gym offer visuals, and branded marketing assets.',
    tags: ['Creative Design', 'Poster Design', 'Typography', 'Branding', 'Fitness Industry'],
    deliverables: [
      'Gym posters & banners',
      'Membership offer creatives',
      'Outdoor flex design',
      'Social media launch visuals',
      'Brand-focused typography system',
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80', title: 'Gym Posters & Banners', desc: 'Bold, energetic posters and banners designed to capture attention and communicate the power of Titan Fitness Club\'s brand.' },
      { url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=80', title: 'Membership Offer Creatives', desc: 'High-impact promotional visuals for membership packages — designed to drive sign-ups and communicate value instantly.' },
      { url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80', title: 'Outdoor Flex Design', desc: 'Large-format outdoor flex creatives built to command visibility at street level and attract footfall to the studio.' },
      { url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=900&q=80', title: 'Social Media Launch Visuals', desc: 'Eye-catching social media creatives built for the launch week campaign — consistent with the  brand identity.' },
      { url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&q=80', title: 'Brand Typography System', desc: 'A brand-focused typography system developed for Titan Fitness Club — bold, impactful, and consistent across every touchpoint.' },
      { url: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=900&q=80', title: 'Launch Campaign Overview', desc: 'Complete launch campaign package — all assets aligned to one visual language that builds brand recognition from day one.' },
    ]
  },
  retailmax: {
    title: 'Nexora Infrastructure',
    subtitle: 'Corporate Company Profile Design',
    category: 'Presentation Design',
    type: 'Corporate Design Project',
    status: 'Completed',
    location: 'Mumbai, Maharashtra',
    industry: 'Construction & Infrastructure',
    year: '2026',
    metric: 'Completed',
    about: 'Nexora Infrastructure is a construction and project management company handling residential and commercial developments.',
    challenge: 'The company needed a professional company profile and presentation materials for investor meetings and client pitches.',
    solution: 'Designed a modern corporate profile with clean layouts, structured service sections, and visually professional branding assets.',
    tags: ['Presentation Design', 'Corporate Branding', 'Brochure Design', 'Layout Design', 'Print Media'],
    deliverables: [
      'Company profile booklet',
      'Corporate brochure design',
      'Presentation deck visuals',
      'Business proposal layouts',
      'Print-ready branding assets',
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&q=80', title: 'Company Profile Booklet', desc: 'A professionally designed company profile booklet — structured to communicate Nexora\'s scale, services, and credibility at investor meetings.' },
      { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=80', title: 'Corporate Brochure Design', desc: 'Clean, high-impact brochure layouts presenting Nexora\'s construction and development projects with visual clarity.' },
      { url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=900&q=80', title: 'Presentation Deck Visuals', desc: 'Polished presentation slides designed for client pitches and investor meetings — modern, data-friendly, and on-brand.' },
      { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80', title: 'Business Proposal Layouts', desc: 'Structured proposal templates that make Nexora\'s service offerings and project capabilities easy to read and compelling to act on.' },
      { url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=900&q=80', title: 'Print-Ready Branding Assets', desc: 'All materials prepared as print-ready production files — exact colours, bleeds, and resolutions for professional printing.' },
    ]
  },
  nexahealth: {
    title: 'Spice Theory Kitchen',
    subtitle: 'Restaurant Menu & Packaging Design',
    category: 'Branding & Advertising Solutions',
    type: ' Branding Project',
    status: 'Completed',
    location: 'Ahmedabad, Gujarat',
    industry: 'Food & Beverage',
    year: '2026',
    metric: 'Completed',
    about: 'Spice Theory Kitchen is a modern food brand focused on premium Indian fusion meals and takeaway services.',
    challenge: 'The brand needed visually appealing menus and packaging that felt premium while maintaining readability and strong brand consistency.',
    solution: 'Designed a complete  branding system including menu layouts, takeaway packaging, and promotional print materials aligned with the restaurant\'s modern identity.',
    tags: ['Branding & Advertising Solutions', 'Packaging Design', 'Print Design', 'Typography', 'Food Industry'],
    deliverables: [
      'Menu card design',
      'Food packaging design',
      'Flyers & table-top creatives',
      'Brand typography & color styling',
      'Print-ready production files',
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=80', title: 'Menu Card Design', desc: 'Visually rich menu layouts designed to elevate the dining experience — premium feel with clear readability across all sections.' },
      { url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&q=80', title: 'Food Packaging Design', desc: 'Takeaway packaging crafted to be as impressive as the food inside — brand-consistent design that travels well and makes an impression.' },
      { url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=80', title: 'Flyers & Table-Top Creatives', desc: 'Promotional print materials and table-top creatives that bring the brand to life in-venue and attract new customers.' },
      { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=80', title: 'Brand Typography & Color Styling', desc: 'A cohesive typographic and colour system developed for Spice Theory Kitchen — modern, warm, and distinctly premium.' },
      { url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80', title: 'Print-Ready Production Files', desc: 'All creative assets delivered as fully print-ready files — exact specifications met for professional production and reproduction.' },
    ]
  },
  houseelira: {
    title: 'House of Elira',
    subtitle: 'Fashion Brand Photoshoot Direction',
    category: 'Content Production & Creative Direction',
    type: 'Creative Production Project',
    status: 'Completed',
    location: 'Surat, Gujarat',
    industry: 'Fashion & Apparel',
    year: '2026',
    metric: 'Completed',
    about: 'House of Elira is a boutique fashion label focused on ethnic and Indo-western collections for women.',
    challenge: 'The brand required premium visual content for catalogs, social media campaigns, and promotional marketing materials.',
    solution: 'Directed the visual style of the shoot, edited campaign assets, and developed a cohesive aesthetic aligned with the brand\'s target audience.',
    tags: ['Content Production', 'Creative Direction', 'Photo Editing', 'Campaign Styling', 'Fashion Branding'],
    deliverables: [
      'Campaign moodboards',
      'Photoshoot creative direction',
      'Edited promotional visuals',
      'Social media campaign assets',
      'Fashion catalog creatives',
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=900&q=80', title: 'Campaign Moodboards', desc: 'Curated moodboards that defined the visual direction of the shoot — mood, palette, styling, and composition references aligned with House of Elira\'s brand identity.' },
      { url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80', title: 'Photoshoot Creative Direction', desc: 'On-set creative direction ensuring every frame, angle, and styling choice reflected the premium ethnic and Indo-western aesthetic of the brand.' },
      { url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=900&q=80', title: 'Edited Promotional Visuals', desc: 'Post-production editing delivering polished, campaign-ready visuals — colour graded and retouched to a premium standard for catalog and marketing use.' },
      { url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80', title: 'Social Media Campaign Assets', desc: 'Platform-optimised creatives designed for Instagram, Facebook, and digital campaigns — each tailored to drive engagement and communicate the brand\'s premium positioning.' },
      { url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=80', title: 'Fashion Catalog Creatives', desc: 'Catalog layouts built to showcase the collection with elegance — structured for both print and digital distribution to buyers and end customers.' },
    ]
  },
  ahmdstartup: {
    title: 'Ahmedabad Startup Connect',
    subtitle: 'Event Branding & Promotional Design',
    category: 'Event Branding & Advertising Solutions',
    type: 'Event Branding Project',
    status: 'Completed',
    location: 'Ahmedabad, Gujarat',
    industry: 'Business & Networking',
    year: '2026',
    metric: 'Completed',
    about: 'Ahmedabad Startup Connect is a local networking event bringing together founders, marketers, creators, and entrepreneurs.',
    challenge: 'The event required a consistent visual identity across both offline and online promotional materials.',
    solution: 'Created a unified branding system including event posters, stage visuals, social media assets, and attendee creatives for a professional event experience.',
    tags: ['Event Branding', 'Creative Design', 'Stage Visuals', 'Print Media', 'Social Campaign Assets'],
    deliverables: [
      'Event poster design',
      'Stage & backdrop visuals',
      'Social media promotional assets',
      'Pass & badge designs',
      'Print-ready marketing creatives',
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=900&q=80', title: 'Event Poster Design', desc: 'High-impact event posters designed to generate buzz, communicate the event\'s value proposition, and drive registrations across both print and digital channels.' },
      { url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=900&q=80', title: 'Stage & Backdrop Visuals', desc: 'Large-format stage backdrops and environment visuals that created a professional, branded atmosphere for the event venue from every angle.' },
      { url: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=900&q=80', title: 'Social Media Promotional Assets', desc: 'A cohesive set of social creatives for pre-event, during-event, and post-event coverage — designed to build anticipation and amplify reach across platforms.' },
      { url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=900&q=80', title: 'Pass & Badge Designs', desc: 'Professionally designed attendee passes and badges that reinforced the event\'s visual identity and gave participants a premium, memorable keepsake.' },
      { url: 'https://images.unsplash.com/photo-1499914485622-a88fac536970?w=900&q=80', title: 'Print-Ready Marketing Creatives', desc: 'All promotional materials delivered as print-ready production files — ensuring accurate colour reproduction and professional output for every touchpoint.' },
    ]
  }
};

function openWorkDetail(id) {
  if (!id) return;
  try {
    sessionStorage.setItem('current_project_id', id);
    localStorage.setItem('current_project_id', id);
  } catch (_) {}

  // Determine target path: if running on port 5000, file:, or on pages ending in .html, use project.html so static servers don't 404
  const isDirect = (window.location.protocol === 'file:') ||
                   (window.location.port === '5000') ||
                   (window.location.pathname.endsWith('.html'));
  const target = isDirect ? 'project.html' : '/project';
  const projectUrl = `${target}?id=${encodeURIComponent(id)}`;

  const newWin = window.open(projectUrl, '_blank');
  if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
    window.location.href = projectUrl;
  }
}


/* ─ Case Study Detail Pages ─ */
const caseStudies = {
  'd2c-growth-playbook': {
    title: 'How Indian D2C Brands Can Scale from ₹5L to ₹50L Monthly Revenue in 6 Months',
    subtitle: 'The Exact Growth Blueprint That Delivered 10× Revenue for Our D2C Clients',
    category: 'Strategy',
    date: 'May 18, 2026',
    images: [
      { url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80', caption: 'Full-funnel D2C growth architecture — from acquisition to lifetime value optimisation.' },
      { url: 'https://images.unsplash.com/photo-1571867424488-4565932edb41?w=1200&q=80', caption: 'Revenue tracking dashboard showing the month-by-month growth trajectory of a 10× D2C client.' },
    ],
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Why Most Indian D2C Brands Plateau at ₹5–8L Per Month</h2>
<p>The graveyard of Indian D2C is full of brands that hit ₹5–8 lakh per month and never broke through. Not because their product was bad, but because they were using growth tactics designed for a brand already at ₹50L. The strategy required to go from ₹5L to ₹50L is entirely different from what got you to ₹5L — and most founders, agencies, and advisors fail to make that distinction.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The 3 Pillars of the 10× D2C Growth Blueprint</h2>
<p><strong style="color:#FF5C00;">Pillar 1 — Full-Funnel Paid Media Architecture.</strong> At ₹5L revenue, most brands are running a single campaign with one ad set and a broad audience. Scaling to ₹50L requires a structured three-layer funnel: Top-of-Funnel broad prospecting, Middle-of-Funnel engagement retargeting, and Bottom-of-Funnel cart recovery. Each layer has distinct KPIs, creative formats, and budget allocation rules. We typically allocate 50% of budget to TOF, 30% to MOF, and 20% to BOF — then shift toward BOF as retargeting audiences scale.</p>
<p><strong style="color:#FF5C00;">Pillar 2 — Retention and Repeat Purchase Flows.</strong> New customer acquisition is expensive. The fastest path to ₹50L is not acquiring more customers — it is increasing the purchase frequency of customers you already have. We implement a 6-email post-purchase series, WhatsApp loyalty nudges at days 14 and 30, and a subscription or replenishment offer at day 45. For consumable D2C categories — supplements, skincare, food — this alone can increase Customer Lifetime Value (CLTV) by 60–80%.</p>
<p><strong style="color:#FF5C00;">Pillar 3 — Conversion Rate Optimisation (CRO).</strong> Every percentage point of conversion rate improvement multiplies the return from your existing ad spend. A store converting at 1.8% that improves to 2.6% sees a 44% revenue increase with zero additional ad spend. We conduct a full store audit on every new D2C client, addressing page speed, trust signals, product page structure, checkout friction, and mobile UX. Indian mobile shoppers on 4G connections are particularly sensitive to load time — each additional second of load time costs approximately 20% in conversions.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Case Evidence: Three Brands, Three Journeys to 10×</h2>
<p>A Gujarati nutraceutical brand went from ₹4.2L to ₹44L per month in 22 weeks after implementing this framework — the breakthrough came from a WhatsApp replenishment sequence that recovered 34% of lapsed customers. A Mumbai-based skincare brand hit ₹52L in month 6, driven primarily by a carousel-format UGC campaign series that outperformed their existing polished photography by 3.8× on Meta. A Bangalore home goods brand achieved the 10× milestone through CRO alone — we improved their store conversion rate from 1.1% to 3.4% through mobile-first page redesign, resulting in ₹18L in additional monthly revenue from the same traffic volume. The common thread: none of these brands increased their ad budgets significantly. They unlocked growth by fixing the structure, not increasing the spend.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The D2C Growth Readiness Audit</h2>
<p>Before applying any of these frameworks, we conduct a comprehensive readiness audit covering: unit economics (are your margins healthy enough to support paid acquisition?), product-market fit signals (are organic reviews positive and repeat purchase rate above 20%?), and technical infrastructure (is your tracking, attribution, and analytics clean enough to make good decisions?). Brands that skip this step often scale problems rather than revenue. If you are ready to build the growth architecture that takes your D2C brand to ₹50L and beyond, reach out to The Sonic Media.</p>`
  },
  'whatsapp-marketing-2026': {
    title: 'WhatsApp Marketing in 2026: How to Generate 35% of Your Revenue from One Channel',
    subtitle: 'The Complete WhatsApp Business Strategy for Indian Brands — From Setup to Scale',
    category: 'Performance Marketing',
    date: 'May 5, 2026',
    images: [
      { url: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=1200&q=80', caption: 'WhatsApp Business API campaigns delivering 85%+ open rates — far above email and SMS benchmarks.' },
      { url: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=1200&q=80', caption: 'Automated WhatsApp flow architecture for a D2C brand generating ₹8L monthly from retention campaigns alone.' },
    ],
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Why WhatsApp Is India's Highest-ROI Marketing Channel in 2026</h2>
<p>With over 500 million active users in India, WhatsApp is not just a messaging app — it is the single most trusted communication platform in the country. While email open rates in India average 18–22% and SMS click-through rates languish at 2–4%, well-executed WhatsApp campaigns routinely achieve open rates of 85–92% and click-through rates of 25–40%. For brands that have built a WhatsApp audience, it is often the highest-ROAS channel in their entire marketing stack — outperforming Meta Ads, Google Ads, and email combined.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The 4-Stage WhatsApp Revenue Architecture</h2>
<p><strong style="color:#FF5C00;">Stage 1 — List Building.</strong> Your WhatsApp marketing is only as powerful as the audience you have built. The most effective opt-in methods for Indian brands are: post-purchase WhatsApp opt-in (convert buyers immediately after checkout), lead magnet campaigns on Meta with WhatsApp as the destination, and Click-to-WhatsApp ads — one of Meta's highest-converting ad formats in India, particularly for high-consideration products above ₹999.</p>
<p><strong style="color:#FF5C00;">Stage 2 — Automated Nurture Flows.</strong> The WhatsApp Business API enables sophisticated automation that most brands have not yet deployed. Essential flows include: a 3-message welcome series for new subscribers, a 5-message post-purchase series (order confirmation, shipping update, delivery confirmation, 3-day review request, 14-day repurchase nudge), and a winback campaign for customers who have not purchased in 45 days. These flows, once built, run on autopilot and generate revenue 24 hours a day.</p>
<p><strong style="color:#FF5C00;">Stage 3 — Broadcast Campaigns.</strong> Beyond automation, strategic broadcast campaigns for sales events, new product launches, and exclusive subscriber offers can generate extraordinary short-term revenue spikes. One of our FMCG clients generates ₹4–6L in 48 hours from a well-timed WhatsApp broadcast to their 12,000-subscriber list — a cost per rupee of revenue that no other channel can match.</p>
<p><strong style="color:#FF5C00;">Stage 4 — Conversational Commerce.</strong> The most advanced WhatsApp implementations use the channel as a full commerce interface — customers can browse, ask questions, receive personalised recommendations, and complete purchases entirely within WhatsApp. For Indian consumers who are comfortable with chat-based interactions, this removes enormous friction from the purchase journey.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The Compliance and Quality Framework You Cannot Ignore</h2>
<p>WhatsApp enforces strict quality guidelines through its Business API. Sending irrelevant or too-frequent messages leads to blocks, number bans, and quality rating downgrades that can permanently impair your sender reputation. The rules are: message only opted-in users, maintain a minimum 72-hour gap between promotional broadcasts, personalise with the recipient's name and relevant context, and always offer an easy opt-out. Brands that follow these guidelines see sustained deliverability and engagement. Those that don't are banned within weeks. At The Sonic Media, we manage end-to-end WhatsApp marketing infrastructure for clients — from API setup and flow architecture to creative, compliance, and performance optimisation.</p>`
  },
  'local-seo-domination': {
    title: 'How to Dominate Local Search in Your City and Become the #1 Brand on Google Maps',
    subtitle: 'The Step-by-Step Local SEO System for Indian Businesses — Clinics, Restaurants, Retailers, and Service Providers',
    category: 'SEO',
    date: 'Apr 22, 2026',
    images: [
      { url: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=1200&q=80', caption: 'Google Maps local pack results — the 3 positions that capture 60% of all local search clicks in India.' },
      { url: 'https://images.unsplash.com/photo-1432888622747-4eb9a8eMar07?w=1200&q=80', caption: 'Local SEO ranking factors analysis showing the weight of reviews, proximity, and on-page signals.' },
    ],
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">What Is Local SEO and Why Does It Matter More Than Ever in India?</h2>
<p>Local SEO is the practice of optimising your online presence to appear prominently when people in your city or neighbourhood search for businesses like yours on Google. In India, "near me" searches have grown by 500% in the last three years, and over 76% of people who conduct a local search visit a business within 24 hours. For clinics, restaurants, coaching centres, retailers, salons, and any service-based business, ranking in the Google Maps Local Pack — the top 3 results shown on maps — can be the single most impactful marketing investment you make.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The 6-Step Local SEO Domination System</h2>
<p><strong style="color:#FF5C00;">Step 1 — Google Business Profile Optimisation.</strong> Your Google Business Profile (GBP) is the foundation of local SEO. Businesses with fully completed, regularly updated profiles receive 7× more clicks than incomplete listings. Essentials: complete every field including business description, services, and attributes; upload 20+ high-quality photos; enable messaging and Q&A; and post weekly updates using the Posts feature. Most businesses in India have fundamentally incomplete GBP profiles — this alone creates a significant competitive advantage for those who do it properly.</p>
<p><strong style="color:#FF5C00;">Step 2 — Review Velocity and Quality Management.</strong> Google's local ranking algorithm weighs review quantity, recency, and quality heavily. A business with 200 reviews averaging 4.7 stars will consistently outrank a competitor with 30 reviews at 4.9 stars. Build a systematic review generation process: train front-of-house staff to ask for reviews at the point of maximum satisfaction, send a post-service WhatsApp with a direct review link, and respond to every review — positive and negative — within 24 hours. Review responses signal engagement and authority to Google's algorithm.</p>
<p><strong style="color:#FF5C00;">Step 3 — Local Keyword Strategy.</strong> Identify the exact queries your potential customers use — "[service] in [city]", "[service] near [neighbourhood]", and "[service] [city] + intent modifier" such as "best", "affordable", "24 hours". Build dedicated landing pages for each primary service-location combination you want to rank for. A multi-location business in Ahmedabad, for example, should have separate optimised pages for "dentist Navrangpura Ahmedabad", "dentist Satellite Ahmedabad", and so on.</p>
<p><strong style="color:#FF5C00;">Step 4 — Local Citation Building.</strong> Citations are mentions of your business Name, Address, and Phone number (NAP) across the web. Consistent NAP data across Justdial, Sulekha, IndiaMart, Yelp, Bing Places, Apple Maps, and industry directories signals credibility to Google. Inconsistent NAP data — even minor variations like "St." versus "Street" — can suppress local rankings significantly.</p>
<p><strong style="color:#FF5C00;">Step 5 — Localised On-Page SEO.</strong> Your website's location pages must include: embedded Google Maps, your full NAP in structured schema markup, locally relevant content that mentions neighbourhoods and landmarks, and internal links connecting all location pages to your main services hub. Page speed is critical — Indian local searchers are predominantly on mobile, and Google weights mobile page experience in local rankings.</p>
<p><strong style="color:#FF5C00;">Step 6 — Local Link Building.</strong> Earn backlinks from local news sites, city blogs, chamber of commerce listings, local event sponsorships, and partnerships with complementary non-competing businesses. A single link from a reputable local publication can significantly move local rankings. We have ranked clients in Ahmedabad's competitive dental and legal verticals within 45–60 days using this citation and link-building combination. Reach out to The Sonic Media to learn how we can do the same for your local business.</p>`
  },
  'video-content-roi': {
    title: 'Why Short-Form Video Delivers the Highest ROI of Any Marketing Channel in India',
    subtitle: 'Data from 1,200 Content Pieces Across 40 Client Accounts — The Definitive Guide to Video Marketing ROI in 2026',
    category: 'Social Media',
    date: 'Apr 8, 2026',
    images: [
      { url: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=1200&q=80', caption: 'Video content performance analysis across platforms — Reels, Shorts, and vertical video drive 4× the reach of static posts.' },
      { url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200&q=80', caption: 'Our in-house video production workflow — from brief to publish in under 48 hours for 40+ client brands.' },
    ],
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The Data Is In: Short-Form Video Has Won</h2>
<p>We analysed 1,200 pieces of content published across 40 client accounts over a 12-month period — a dataset representing categories from luxury fashion and FMCG to real estate, healthcare, and professional services. The finding was unambiguous: short-form vertical video (Reels, Shorts, TikTok-format content) consistently outperformed every other content format on every platform across every metric. Not by a small margin — by a factor of 3–7×.</p>
<p>The average Reel in our dataset reached 4.2× more unique accounts than the average static post from the same account. The average video ad on Meta achieved a cost-per-result 58% lower than the same budget deployed on static image ads. And the conversion rate from video-landing page journeys was 2.4× higher than from image-based ad journeys. The question is no longer whether short-form video works — it is why most brands are still not making enough of it, and how to make it work harder.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The 5 Elements of a High-ROI Short-Form Video</h2>
<p><strong style="color:#FF5C00;">1. The Hook (First 2 Seconds).</strong> If your video does not stop the scroll in the first two seconds, the rest of the production quality is irrelevant. The most effective hooks in the Indian market are: a bold text statement that challenges a common belief ("Your digital marketing agency is costing you money, not making it"), a visually surprising opening frame, and a direct question addressed to a specific audience ("Are you a Delhi restaurant owner losing customers to competitors?"). Hook strength correlates more strongly with completion rate than any other variable in our dataset.</p>
<p><strong style="color:#FF5C00;">2. The Value Delivery.</strong> After the hook, deliver the core value within 15–20 seconds. Indian audiences on mobile are highly efficient content consumers — they will drop a video the moment it stops being useful or interesting. Structure your videos with a clear premise, rapid delivery of the key insight or entertainment value, and a memorable conclusion. Avoid slow intros, lengthy disclaimers, or brand logos before value has been established.</p>
<p><strong style="color:#FF5C00;">3. Authentic Over Polished.</strong> One of the most counterintuitive findings in our dataset: smartphone-shot, authentic-feeling content consistently outperforms high-production-value content for conversion goals. For reach and brand awareness, production quality has a modest positive effect. For direct response — website visits, lead generation, purchases — authenticity and relatability outperform polish by 34% on average. Indian audiences are highly attuned to content that feels genuine versus content that feels like advertising.</p>
<p><strong style="color:#FF5C00;">4. Language and Cultural Fit.</strong> Videos in Hindi or a regional language relevant to the target audience outperform English-language videos by an average of 41% across our Indian client base. For D2C brands selling to Tier 2 and Tier 3 cities — arguably the largest growth opportunity in Indian e-commerce — vernacular content is not just preferred; it is often essential for meaningful engagement.</p>
<p><strong style="color:#FF5C00;">5. Call to Action with Friction Removal.</strong> Every commercial video needs a clear, specific call to action. The most effective CTAs in our dataset are link-in-bio (Instagram), swipe-up (Stories), and overlay CTA buttons (YouTube). Vague CTAs like "follow for more" consistently underperform specific CTAs like "comment 'GROWTH' and we'll send you the full guide." At The Sonic Media, we produce short-form video content at scale — 60+ pieces per month — for brands across India. If your current content strategy is not generating the reach, engagement, and revenue it should be, contact The Sonic Media.</p>`
  },
  'ecom-conversion-rate': {
    title: 'The E-Commerce CRO Checklist: 12 Changes That Doubled Our Clients\' Conversion Rates',
    subtitle: 'Conversion Rate Optimisation Is the Fastest Path to Revenue Growth — Without Increasing Ad Spend',
    category: 'Strategy',
    date: 'Mar 20, 2026',
    images: [
      { url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=80', caption: 'CRO audit heatmap showing where Indian mobile shoppers drop off — and the high-value opportunities most stores miss.' },
      { url: 'https://images.unsplash.com/photo-1556742031-c6961e8560b0?w=1200&q=80', caption: 'Before and after conversion rate data for a D2C fashion brand — from 0.9% to 3.1% in 8 weeks.' },
    ],
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The Most Overlooked Growth Lever in Indian E-Commerce</h2>
<p>Most Indian e-commerce brands are addicted to ad spend. When revenue is flat, the reflex response is to increase the Meta or Google budget. But if your store is converting at 1%, doubling your ad budget doubles your cost — not your profit. The more powerful lever is improving what happens after a visitor lands: Conversion Rate Optimisation (CRO). A store that converts 1% of its traffic and improves to 2% has effectively doubled its revenue from the same traffic volume and the same ad budget. We have conducted CRO audits on 140+ Indian e-commerce stores. These are the 12 highest-impact changes we implement every time.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The 12-Point CRO Checklist for Indian E-Commerce Stores</h2>
<p><strong style="color:#FF5C00;">1. Page Load Speed Below 2.5 Seconds on Mobile.</strong> Every additional second of load time costs approximately 20% in conversions for Indian mobile users on 4G. Compress all images (WebP format), enable lazy loading, minimise JavaScript, and use a CDN. This single change alone has improved conversion rates by 15–35% on slow stores.</p>
<p><strong style="color:#FF5C00;">2. Hero Section with a Clear Value Proposition.</strong> Your homepage hero must answer three questions in 5 seconds: What do you sell? Why is it better? What should I do next? Most Indian store homepages fail this test — they show a beautiful banner with no copy or a tagline so generic it could belong to any brand.</p>
<p><strong style="color:#FF5C00;">3. Product Page Trust Signals Above the Fold.</strong> Ratings, review counts, in-stock status, delivery timelines, and return policy must all appear above the fold on product pages. Indian consumers make trust assessments in the first 3 seconds of a product page visit. If they cannot see social proof and logistics clarity immediately, they leave.</p>
<p><strong style="color:#FF5C00;">4. UGC and Video Reviews on Product Pages.</strong> Video testimonials from real Indian customers — especially in regional languages — increase product page conversion rates by 28–45% in our testing. Text reviews are useful; video reviews are transformative.</p>
<p><strong style="color:#FF5C00;">5. Sticky Add-to-Cart Button on Mobile.</strong> A persistent CTA button visible at all times as the user scrolls through a product page is one of the simplest and highest-return CRO changes available. Implementation time: 2 hours. Average conversion impact: +12%.</p>
<p><strong style="color:#FF5C00;">6. Size Guide and Fit Assist.</strong> For apparel and footwear — the highest-return-rate categories in Indian e-commerce — a clear, visual size guide reduces purchase hesitation and return rates simultaneously. Returns cost Indian brands 18–25% of gross revenue in logistics and processing costs.</p>
<p><strong style="color:#FF5C00;">7. Urgency and Scarcity Signals.</strong> "Only 3 left in stock" and "Offer ends in 4:22:11" are two of the most powerful conversion accelerators in Indian e-commerce — when true. Artificial scarcity is immediately detected by Indian consumers and destroys trust. Authentic urgency signals — genuine low-stock alerts, actual flash sale countdowns — consistently lift conversion by 18–30%.</p>
<p><strong style="color:#FF5C00;">8. Multiple Payment Options Including UPI and EMI.</strong> Any store not offering UPI, PhonePe, Google Pay, and EMI options for orders above ₹2,000 is leaving a significant percentage of their addressable market on the table. UPI adoption among Indian e-commerce shoppers reached 72% in 2024.</p>
<p><strong style="color:#FF5C00;">9. Cart Abandonment Recovery via WhatsApp and Email.</strong> The average Indian e-commerce store abandons 72% of carts. A three-message sequence — immediate WhatsApp notification, 4-hour email with product imagery, 24-hour message with a modest incentive — can recover 20–35% of abandoned carts. This is pure incremental revenue from intent that already exists.</p>
<p><strong style="color:#FF5C00;">10. Exit Intent Pop-Up with a Compelling Offer.</strong> An exit-intent overlay capturing email or WhatsApp with a first-purchase discount converts 5–12% of otherwise-leaving visitors into leads. This builds your owned audience for future remarketing at a cost far below paid media CPL benchmarks.</p>
<p><strong style="color:#FF5C00;">11. Post-Purchase Upsell.</strong> The moment immediately after purchase — the thank-you page — is the highest-intent moment in any customer journey. An intelligently placed post-purchase upsell (a complementary product at a special "already checkout" price) converts at 15–25% and adds meaningful AOV with zero additional ad spend.</p>
<p><strong style="color:#FF5C00;">12. Store Search Optimisation.</strong> 40% of Indian e-commerce shoppers who use on-site search convert at 4× the rate of non-searchers. Ensure your store's search function is fast, typo-tolerant, and returns relevant results. A broken or slow search experience is one of the highest-impact revenue leaks we encounter in audits. Implement these 12 changes methodically, track the impact of each, and you will almost certainly see your conversion rate double within 60–90 days. If you want The Sonic Media to conduct a comprehensive CRO audit of your store, contact us today.</p>`
  },
  'influencer-selection': {
    title: 'How to Select the Right Influencer for Your Brand — and Avoid Costly Mistakes',
    subtitle: 'The Data-Driven Influencer Vetting Framework That Separates High-ROI Creators from Expensive Mistakes',
    category: 'Performance Marketing',
    date: 'Mar 3, 2026',
    images: [
      { url: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=1200&q=80', caption: 'Influencer performance analysis — the metrics that actually predict sales, not just reach.' },
      { url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&q=80', caption: 'Creator vetting process used by The Sonic Media — 12-point audit before every campaign recommendation.' },
    ],
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The Follower Count Trap That Costs Indian Brands Crores</h2>
<p>Every week, we speak to Indian brand owners who have spent ₹5–20 lakhs on influencer campaigns and seen zero measurable return. The pattern is almost always identical: they selected creators based on follower count and aesthetic appeal, paid a significant fee, received "reach" numbers in the post-campaign report, and had no way to attribute a single sale to the investment. Influencer marketing done wrong is one of the most expensive and least accountable forms of spending in digital marketing. Done right, it is one of the highest-ROI channels available — particularly for Indian D2C brands where social proof and community trust are the primary purchase drivers.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The 12-Point Influencer Vetting Framework</h2>
<p><strong style="color:#FF5C00;">1. Audience Authenticity Score.</strong> Request audience demographics from the creator and verify using tools like HypeAuditor or Social Blade. A creator with 200K followers but 40% bot-driven engagement is worth far less than a creator with 30K highly engaged, authentic followers. Red flags: sudden follower spikes, engagement rate below 1.5% on Instagram, comment sections filled with generic emoji responses.</p>
<p><strong style="color:#FF5C00;">2. Engagement Rate vs Category Benchmark.</strong> Engagement rates vary by category and audience size. A fashion micro-influencer should have 4–8% engagement; a mega-influencer (1M+) achieving 1.5% engagement may actually be performing above benchmark. Always compare against category and size norms — not absolute numbers.</p>
<p><strong style="color:#FF5C00;">3. Audience-Brand Alignment.</strong> Ask for a screenshot of the creator's audience demographics: age, gender, location, and interests. An influencer with 500K followers who are 70% male aged 35–50 is the wrong partner for a women's ethnic wear brand, regardless of their content quality. Audience fit is non-negotiable.</p>
<p><strong style="color:#FF5C00;">4. Past Brand Campaign Performance.</strong> Ask the creator for analytics from their last 3–5 paid brand collaborations: reach, saves, shares, click-through rate, and any available conversion data. Creators who cannot or will not share this data are either inexperienced or have poor results to hide.</p>
<p><strong style="color:#FF5C00;">5. Content Quality and Brand Safety Audit.</strong> Review the last 90 days of the creator's content. Is the production quality consistent with your brand standards? Have they promoted competing or brand-inappropriate products? One problematic past post can create significant reputational risk if your campaign goes viral in the wrong direction.</p>
<p><strong style="color:#FF5C00;">6. Response Rate and Professionalism.</strong> How quickly did the creator or their management respond to your initial outreach? How clear and professional were their terms and deliverables communication? A creator who takes 2 weeks to reply to a brief and submits inconsistent deliverable descriptions will be a difficult campaign partner regardless of their reach.</p>
<p><strong style="color:#FF5C00;">7. Micro vs Macro Strategy.</strong> Our campaign data consistently shows that micro-influencers (10K–100K followers) deliver 3–5× the conversion rate of macro-influencers (500K+) at 20–30% of the cost. For most Indian D2C brands with budgets under ₹10L, a strategy of 10–20 highly targeted micro-influencers will almost always outperform 1–2 mega-influencer placements. Reach out to The Sonic Media to access our curated network of 2,000+ verified Indian influencers, organised by category, city, audience profile, and past campaign performance.</p>`
  },
  'brand-launch-india': {
    title: 'How to Launch a Brand in India in 90 Days: The Zero-to-Authority Playbook',
    subtitle: 'The Exact Launch Sequence for Indian Market Entry — From Brand Identity to First ₹10L Revenue',
    category: 'Branding',
    date: 'Mar 18, 2026',
    images: [
      { url: 'https://images.unsplash.com/photo-1559526324-593bc073d938?w=1200&q=80', caption: 'Brand launch command centre — coordinating identity, digital infrastructure, and go-to-market across all touchpoints.' },
      { url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80', caption: 'The 90-day brand launch timeline — 12 milestones that turn a new brand into a market presence.' },
    ],
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Why Most Indian Brand Launches Fail in the First 90 Days</h2>
<p>The failure pattern for new Indian brand launches is almost always the same: a beautiful logo, a Shopify store, and a social media account that posts inconsistently for three months with declining organic reach and zero paid media strategy. By month 4, the founder is questioning everything. The product was never the problem — the launch strategy was. After executing 30+ brand launches across categories including FMCG, fashion, wellness, technology, and professional services, we have developed a 90-day playbook that consistently takes new brands from zero digital presence to ₹10L+ in monthly revenue and 10,000+ engaged audience members.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The 90-Day Launch Sequence: Month by Month</h2>
<p><strong style="color:#FF5C00;">Month 1 — Foundation (Days 1–30).</strong> The first month is entirely about building the infrastructure correctly. Brand identity: logo, colour palette, typography, photography style, and tone of voice — all decisions made with the target Indian consumer in mind, not the founder's personal taste. Digital infrastructure: a fast, conversion-optimised website (not just a beautiful one), professional Google Business Profile, and fully set-up business accounts on Instagram, Facebook, and LinkedIn. SEO foundation: keyword research, metadata optimisation, schema markup, and a content calendar for the next 12 months. Most brands skip or rush the foundation phase and spend months 2 and 3 fixing problems that could have been avoided. We do not allow this.</p>
<p><strong style="color:#FF5C00;">Month 2 — Activation (Days 31–60).</strong> Month 2 is where the brand goes live and begins building its audience. Content strategy execution: 3 Reels per week, 1 long-form educational post, and 5–7 Stories per day. The content mix in the first 30 days of going live should be 70% educational or entertaining (audience building) and 30% commercial (direct sales). Paid media launch: a modest test budget of ₹20,000–₹50,000 across Meta to identify top-performing audiences and creative formats before scaling. Influencer seeding: gifting product to 15–20 micro-influencers in the target category for organic content creation, building social proof before significant ad spend begins. PR and link building: 3–5 press features or backlinks from relevant Indian publications to establish domain authority from launch.</p>
<p><strong style="color:#FF5C00;">Month 3 — Scale (Days 61–90).</strong> By month 3, you have data — which content resonates, which audience segments respond, which products are converting. Month 3 is about scaling what is working. Increase paid media spend by 3–5× based on winning audiences and creatives identified in month 2. Launch email and WhatsApp capture sequences to begin building owned audience. Implement retention flows for the first purchasers acquired in months 1 and 2. Introduce a referral or advocacy programme to convert satisfied early customers into brand ambassadors. The goal by day 90 is not perfection — it is momentum. A brand with 8,000 Instagram followers, 1,500 WhatsApp subscribers, ₹10L in monthly revenue, and improving unit economics has everything it needs to scale aggressively in months 4–12.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The One Mistake That Kills Launches Before They Start</h2>
<p>Launching before the unit economics work. If your product margin cannot support a cost of customer acquisition (CAC) below ₹400–600 (the approximate benchmark for Indian D2C via paid social), no amount of marketing excellence will make the business profitable. Before investing in a brand launch, validate that your product-market fit is real, your margins are healthy, and your fulfilment infrastructure can handle rapid order volume growth. The Sonic Media offers a pre-launch readiness audit that assesses all of these factors before we recommend investing in a full launch programme. If you are planning a brand launch in India in 2026 or 2026, contact us to begin the conversation.</p>`
  },
  'google-ads-india': {
    title: 'Google Ads for Indian Businesses: The Structure That Delivers 12× ROAS Consistently',
    subtitle: 'Why 60% of Indian Businesses Waste Their Google Ads Budget — and the Exact Campaign Structure That Fixes It',
    category: 'SEO',
    date: 'Mar 28, 2026',
    images: [
      { url: 'https://images.unsplash.com/photo-1587440871875-191322ee64b0?w=1200&q=80', caption: 'Google Ads campaign architecture for high-ROAS performance — the account structure used across all our client campaigns.' },
      { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80', caption: 'ROAS performance data showing the impact of campaign restructuring — from 2.1× to 12.4× in 10 weeks.' },
    ],
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The Google Ads Problem Most Indian Businesses Face</h2>
<p>Google Ads is, on paper, the ideal channel for intent-based marketing in India: people searching "buy running shoes Mumbai" or "digital marketing agency Ahmedabad" have already decided they want what you offer. The conversion intent is built into the search. Yet the average Indian SME running Google Ads independently reports a ROAS of 1.5–2.5× — barely above breakeven when management time is factored in. The problem is almost never the platform. It is the structure of how campaigns are built, managed, and optimised. In our experience auditing 200+ Google Ads accounts across India, we find the same five structural errors in the vast majority of accounts — errors that collectively waste between 40% and 70% of the advertising budget.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The 5 Most Expensive Google Ads Mistakes in India</h2>
<p><strong style="color:#FF5C00;">Mistake 1 — Broad Match Keywords Without Negative Lists.</strong> Running campaigns with broad match keywords without an extensive negative keyword list is the number one budget drain in Indian Google Ads accounts. We have found clients spending 35–60% of their budget on irrelevant searches — a healthcare brand appearing for "health insurance" searches, a fashion retailer paying for "fashion history" research queries. Build negative keyword lists before a single rupee is spent.</p>
<p><strong style="color:#FF5C00;">Mistake 2 — Single Campaign for All Products or Services.</strong> Lumping all products into a single campaign means Google's algorithm optimises for average performance rather than best performance. Separate campaigns by product category, search intent (informational vs transactional), and audience temperature (new visitors vs retargeting). Granular campaign structure gives you control — and control gives you efficiency.</p>
<p><strong style="color:#FF5C00;">Mistake 3 — Generic Landing Pages.</strong> Sending Google Ads traffic to a generic homepage or product category page destroys Quality Score, increases cost-per-click, and drops conversion rate. Every significant keyword cluster should have a dedicated landing page that mirrors the ad copy, loads in under 2 seconds, and has a single clear CTA. This change alone has improved ROAS by 40–80% in multiple audit engagements.</p>
<p><strong style="color:#FF5C00;">Mistake 4 — Ignoring Search Terms Reports.</strong> The search terms report shows you exactly what queries triggered your ads. Reviewing this weekly and adding irrelevant terms to your negative keyword list is the most impactful 30-minute activity in Google Ads management. Brands that do not do this routinely find 20–40% of their budget allocated to queries that can never convert.</p>
<p><strong style="color:#FF5C00;">Mistake 5 — No Retargeting Campaign.</strong> A user who clicks your Google Ad, visits your website, and does not convert is your warmest possible prospect. Most Indian advertisers let this audience disappear. A well-structured Google Display and Search retargeting campaign targeting previous website visitors converts at 3–5× the rate of cold prospecting and at a fraction of the cost-per-acquisition.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The Campaign Structure That Delivers 12× ROAS</h2>
<p>After fixing the five errors above, the account structure we implement is: a Brand campaign protecting your own branded queries, a Competitor campaign targeting high-intent competitor searches, a Product/Service campaign using exact and phrase match keywords organised by theme, a Smart Shopping campaign for e-commerce clients with performance-optimised product feeds, and a Retargeting campaign for warm audiences. Combined with weekly optimisation, monthly landing page testing, and quarterly strategy reviews, this structure has delivered consistent ROAS of 8–14× across diverse Indian verticals including healthcare, real estate, education, e-commerce, and professional services. If you are currently running Google Ads without this structure, you are very likely leaving significant revenue on the table. Contact The Sonic Media for a Google Ads audit — we will identify exactly where your budget is being wasted and what the restructured account could achieve.</p>`
  },
  'retention-marketing': {
    title: 'Retention Marketing in 2026: How to Turn One-Time Buyers Into Lifelong Brand Advocates',
    subtitle: 'The Customer Retention Playbook That Increases CLTV by 80% — Without a Single Additional Rupee in Ad Spend',
    category: 'Technology',
    date: 'Mar 12, 2026',
    images: [
      { url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80', caption: 'Customer lifetime value modelling — the data architecture behind a 80% CLTV improvement for a repeat-purchase D2C brand.' },
      { url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&q=80', caption: 'Retention flow automation dashboard showing the 6 lifecycle touchpoints that drive repeat purchase behaviour.' },
    ],
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The Acquisition Trap: Why Most Indian Brands Are Building on Sand</h2>
<p>Here is a number that should change how you think about marketing: acquiring a new customer in India costs, on average, 5–7× more than retaining an existing one. Yet most Indian brands allocate 80–90% of their marketing budget to acquisition and less than 10% to retention. The result is a business that must constantly refill a leaking bucket — growing ad costs, rising CPMs, and increasing competitive pressure combine to make new customer acquisition more expensive every year. The brands building durable, compounding growth in India in 2026 are the ones that have solved retention. They spend on acquisition to grow the base, but they grow profit from the base they already have.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">What Does Retention Marketing Actually Mean?</h2>
<p>Retention marketing is the full set of strategies, communications, and experiences designed to increase the likelihood that a customer who has purchased once will purchase again — and eventually become a brand advocate who refers others. It encompasses post-purchase communication, loyalty programmes, personalised recommendations, community building, and the overall quality of the customer experience between transactions.</p>
<p>The key metric retention marketing improves is Customer Lifetime Value (CLTV): the total revenue a customer generates over their relationship with your brand. A customer with a ₹1,500 average order value who purchases twice is worth ₹3,000. The same customer with a retention programme in place who purchases 6 times over 18 months is worth ₹9,000 — with progressively lower cost of service as familiarity with your brand reduces customer support burden and return rates.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The 6 Core Retention Flows Every Indian Brand Needs</h2>
<p><strong style="color:#FF5C00;">Flow 1 — Post-Purchase Welcome Series (Day 0–7).</strong> The period immediately after a first purchase is the most critical window for retention. A 3-message sequence combining an order confirmation with brand story, a shipping update with product education, and a delivery confirmation with usage guide or care instructions sets the tone for a high-value ongoing relationship. Brands that execute this well see second-purchase rates 2.4× higher than brands that send only transactional notifications.</p>
<p><strong style="color:#FF5C00;">Flow 2 — Product Education and Engagement (Day 7–30).</strong> Within the first 30 days, your goal is to ensure the customer gets maximum value from their purchase. For physical products: how-to content, styling guides, recipe inspiration, or care instructions. For services: onboarding sequences, success milestones, and feature discovery. Customers who achieve early success with your product have 3× higher retention rates than those who do not.</p>
<p><strong style="color:#FF5C00;">Flow 3 — Review and Advocacy Request (Day 14–21).</strong> The optimal window for a review request is 14–21 days post-purchase — after the customer has had meaningful experience with the product but while the purchase is still top of mind. A WhatsApp message with a direct Google or platform review link, personalised with the product name, converts at 18–35%. Positive reviews feed back into your acquisition funnel as social proof, creating a compounding flywheel effect.</p>
<p><strong style="color:#FF5C00;">Flow 4 — Replenishment and Repeat Purchase Nudge (Day 30–60).</strong> For consumable products — supplements, skincare, food, cleaning products — build a replenishment reminder flow timed to the product's typical consumption cycle. If your product lasts 30 days, send a WhatsApp reminder at day 25 with a repurchase link. If bundled with a subscription offer, this flow alone can increase repeat purchase rate from 20% to 55% within three months.</p>
<p><strong style="color:#FF5C00;">Flow 5 — Loyalty and VIP Programme (Ongoing).</strong> A simple points-based loyalty programme that rewards purchases, reviews, and referrals with redeemable credits increases both purchase frequency and basket size. For Indian consumers, the feeling of being a "VIP customer" with exclusive access or early product releases is a powerful emotional driver of loyalty — far more powerful than the financial value of the points themselves.</p>
<p><strong style="color:#FF5C00;">Flow 6 — Winback Campaign (Day 60–90 of Inactivity).</strong> For customers who have not purchased within 60–90 days (the threshold varies by category and purchase cycle), a reactivation campaign with a personalised "we miss you" message and a time-limited offer can recover 15–30% of lapsed customers. The cost of reactivating a lapsed customer is typically 80% lower than acquiring a new equivalent customer. Implementing these six flows for clients across FMCG, fashion, wellness, and technology, The Sonic Media has consistently delivered CLTV improvements of 60–85% within 6 months — without any increase in acquisition spend. If you are ready to stop rebuilding your customer base every month and start compounding growth from the base you have already won, contact us today.</p>`
  }
};

window.caseStudies = caseStudies;

function openCaseStudy(id) {
  if (!id) return;
  try {
    sessionStorage.setItem('current_case_id', id);
    localStorage.setItem('current_case_id', id);
  } catch (_) {}
  const isDirect = (window.location.protocol === 'file:') ||
                   (window.location.port === '5000') ||
                   (window.location.pathname.endsWith('.html'));
  const target = isDirect ? 'case-study.html' : '/case-study';
  const csUrl = `${target}?id=${encodeURIComponent(id)}`;
  const newWin = window.open(csUrl, '_blank');
  if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
    window.location.href = csUrl;
  }
}

function _legacyOpenCaseStudy(id) {
  let cs = caseStudies[id];
  if (!cs) {
    const found = (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.casestudies && PAGE_DATA.casestudies.items) ? PAGE_DATA.casestudies.items.find(i => i.id === id) : null;
    if (found) {
      cs = {
        title: found.title,
        subtitle: found.excerpt,
        category: found.catLabel || found.cat,
        date: found.date,
        images: [{ url: found.img, caption: found.title }],
        articleHtml: `<p>${found.excerpt}</p>`
      };
    }
  }
  if (!cs) return;
  const win = window.open('', '_blank');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${cs.title} — The Sonic Media</title>
<meta name="description" content="${cs.subtitle}">
<link rel="icon" type="image/jpeg" href="${cs.images[0].url.split('?')[0]}?w=32&h=32&fit=crop">
<meta property="og:type" content="article">
<meta property="og:site_name" content="The Sonic Media">
<meta property="og:title" content="${cs.title}">
<meta property="og:description" content="${cs.subtitle}">
<meta property="og:image" content="${cs.images[0].url.replace(/w=\d+/,'w=1200')}&h=630&fit=crop">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${cs.title}">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@thesonicmedia">
<meta name="twitter:title" content="${cs.title}">
<meta name="twitter:description" content="${cs.subtitle}">
<meta name="twitter:image" content="${cs.images[0].url.replace(/w=\d+/,'w=1200')}&h=630&fit=crop">
<meta name="robots" content="index, follow">
<meta name="author" content="The Sonic Media">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://thesonicmedia.com/casestudies#${id}",
      "headline": "${cs.title.replace(/"/g,'\\"')}",
      "description": "${cs.subtitle.replace(/"/g,'\\"')}",
      "image": {
        "@type": "ImageObject",
        "url": "${cs.images[0].url}",
        "width": 1200,
        "height": 630
      },
      "author": {
        "@type": "Organization",
        "name": "The Sonic Media",
        "url": "https://thesonicmedia.com"
      },
      "publisher": {
        "@type": "Organization",
        "name": "The Sonic Media",
        "logo": {
          "@type": "ImageObject",
          "url": "https://res.cloudinary.com/dq2nrpky0/image/upload/v1779787887/favicon_oalxfi.png"
        }
      },
      "datePublished": "${cs.date}",
      "dateModified": "${cs.date}",
      "mainEntityOfPage": "https://thesonicmedia.com/casestudies",
      "articleSection": "${cs.category}",
      "keywords": "${cs.category}, case study, digital marketing India, The Sonic Media"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {"@type":"ListItem","position":1,"name":"Home","item":"https://thesonicmedia.com/"},
        {"@type":"ListItem","position":2,"name":"Case Studies","item":"https://thesonicmedia.com/casestudies"},
        {"@type":"ListItem","position":3,"name":"${cs.title.replace(/"/g,'\\"')}"}
      ]
    }
  ]
}
<\/script>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html{font-size:16px;scroll-behavior:smooth;}
body{font-family:'DM Sans',sans-serif;background:#080808;color:#F5F0EB;line-height:1.7;min-height:100vh;}
.cs-nav{position:sticky;top:0;z-index:100;background:rgba(8,8,8,.93);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.06);padding:0 48px;height:68px;display:flex;align-items:center;justify-content:space-between;}
.cs-brand{display:flex;align-items:center;gap:10px;font-family:'Syne',sans-serif;font-size:14px;font-weight:800;letter-spacing:.04em;color:#F5F0EB;}
.cs-brand-mark{width:34px;height:34px;border-radius:8px;background:#FF5C00;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:17px;color:#fff;}
.cs-close{padding:8px 20px;border-radius:50px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(245,240,235,.6);font-family:'Syne',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;}
.cs-close:hover{background:rgba(255,92,0,.15);border-color:rgba(255,92,0,.35);color:#FF5C00;}
.cs-hero{padding:90px 72px 72px;background:#0f0f0f;position:relative;overflow:hidden;}
.cs-hero::before{content:'';position:absolute;top:0;right:0;width:600px;height:600px;background:radial-gradient(circle,rgba(255,92,0,.07) 0%,transparent 70%);pointer-events:none;}
.cs-eyebrow{display:inline-flex;align-items:center;gap:10px;font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:#FF5C00;margin-bottom:20px;}
.cs-eyebrow::before{content:'';width:22px;height:1.5px;background:#FF5C00;}
.cs-h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(48px,7vw,100px);line-height:.92;letter-spacing:.02em;margin-bottom:16px;}
.cs-h1 span{color:#FF5C00;}
.cs-meta{font-family:'Syne',sans-serif;font-size:12px;font-weight:600;letter-spacing:.1em;color:#666;text-transform:uppercase;}
.cs-body{max-width:960px;margin:0 auto;padding:72px 72px 100px;}
.cs-img-wrap{border-radius:16px;overflow:hidden;margin-bottom:14px;aspect-ratio:16/9;background:#161616;}
.cs-img-wrap img{width:100%;height:100%;object-fit:cover;display:block;}
.cs-img-cap{font-family:'Syne',sans-serif;font-size:12px;font-weight:600;color:rgba(245,240,235,.4);letter-spacing:.06em;margin-bottom:40px;padding-left:4px;}
.cs-article{font-size:17px;line-height:1.9;color:rgba(245,240,235,.72);font-weight:300;padding:44px;border-radius:16px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);}
.cs-article::first-letter{font-family:'Bebas Neue',sans-serif;font-size:72px;line-height:.8;float:left;margin-right:12px;margin-top:6px;color:#FF5C00;}
.cs-footer{border-top:1px solid rgba(255,255,255,.05);padding:32px 72px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;}
.cs-footer-copy{font-size:13px;color:#666;}
.cs-footer-copy span{color:#FF5C00;}
.cs-back{display:inline-flex;align-items:center;gap:8px;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:#FF5C00;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:gap .25s;}
.cs-back:hover{gap:14px;}
.cs-cta-band{background:#0f0f0f;border-top:1px solid rgba(255,92,0,.15);border-bottom:1px solid rgba(255,92,0,.15);padding:64px 72px;text-align:center;position:relative;overflow:hidden;}
.cs-cta-band::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;height:300px;background:radial-gradient(ellipse,rgba(255,92,0,.09) 0%,transparent 70%);pointer-events:none;}
.cs-cta-eyebrow{display:inline-flex;align-items:center;gap:10px;font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:#FF5C00;margin-bottom:18px;}
.cs-cta-eyebrow::before{content:'';width:22px;height:1.5px;background:#FF5C00;}
.cs-cta-h{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,5vw,68px);line-height:.95;letter-spacing:.02em;color:#F5F0EB;margin-bottom:16px;}
.cs-cta-h span{color:#FF5C00;}
.cs-cta-p{font-size:15px;line-height:1.75;color:rgba(245,240,235,.55);font-weight:300;max-width:480px;margin:0 auto 36px;}
.cs-cta-btn{display:inline-flex;align-items:center;gap:10px;background:#FF5C00;color:#fff;padding:16px 38px;border-radius:50px;font-family:'Syne',sans-serif;font-size:14px;font-weight:700;letter-spacing:.04em;text-decoration:none;position:relative;overflow:hidden;box-shadow:0 0 30px rgba(255,92,0,.4);transition:all .3s;}
.cs-cta-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);transform:translateX(-100%);transition:transform .5s;}
.cs-cta-btn:hover::before{transform:translateX(100%);}
.cs-cta-btn:hover{transform:translateY(-3px);box-shadow:0 0 50px rgba(255,92,0,.65);}
@media(max-width:768px){.cs-nav,.cs-footer{padding-left:20px;padding-right:20px;}.cs-hero{padding:60px 20px 48px;}.cs-body{padding:40px 20px 80px;}.cs-article{padding:28px;}.cs-cta-band{padding:48px 24px;}}
</style>
</head>
<body>
<nav class="cs-nav">
  <div class="cs-brand"><img src="https://res.cloudinary.com/dq2nrpky0/image/upload/v1779787887/favicon_oalxfi.png" alt="The Sonic Media Logo" style="width:34px;height:34px;object-fit:contain;flex-shrink:0;" />THE SONIC MEDIA</div>
  <button class="cs-close" onclick="window.close()" style="display:inline-flex;align-items:center;gap:6px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>Close</button>
</nav>
<div class="cs-hero">
  <h1 class="cs-h1">${cs.title.split(' ').slice(0,5).join(' ')}<br><span>${cs.title.split(' ').slice(5).join(' ')}</span></h1>
  <div class="cs-meta">${cs.date} &nbsp;·&nbsp; The Sonic Media &nbsp;·&nbsp; ${cs.category}</div>
</div>
<div class="cs-body">
  <div class="cs-img-wrap"><img src="${cs.images[0].url}" alt="${cs.title}"></div>
  <div class="cs-img-cap">${cs.images[0].caption}</div>
  <div class="cs-img-wrap"><img src="${cs.images[1].url}" alt="${cs.subtitle}"></div>
  <div class="cs-img-cap">${cs.images[1].caption}</div>
  <div class="cs-article">${cs.body}</div>
</div>
<div class="cs-cta-band">
  <div class="cs-cta-eyebrow">Ready to Grow?</div>
  <div class="cs-cta-h">Work With <span>The Sonic Media</span></div>
  <p class="cs-cta-p">Let's build your brand's next growth chapter together — strategy, content, performance, and technology under one roof.</p>
  <a class="cs-cta-btn" href="https://thesonicmedia.com" onclick="window.opener && window.opener.navigate && window.opener.navigate('contact'); this.href='javascript:void(0)'; return false;" target="_self">Get a Strategy Call →</a>
</div>
<div class="cs-footer">
  <div class="cs-footer-copy">© 2026 <span>The Sonic Media</span>. All rights reserved.</div>
  <span class="cs-back" onclick="window.close()">← Back to Website</span>
</div>
</body>
</html>`;
  win.document.write(html);
  win.document.close();
}

/* ═══════════════════════════════════════════════════
   BLOG ARTICLES — FULL CONTENT (SEO/AEO/GEO OPTIMISED)
═══════════════════════════════════════════════════ */
const blogArticles = {
  'blog-google-ai-seo': {
    cat: 'SEO',
    date: 'May 2026',
    readTime: '7 min read',
    title: 'How Google AI Overviews Are Changing SEO in India — And What to Do About It',
    subtitle: 'Ranking #1 is no longer enough. Here is how to adapt your SEO strategy for the AI-first search era.',
    img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
    imgCap: 'Google AI Overviews now appear above organic results, changing how users interact with search.',
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">What Are Google AI Overviews?</h2>
<p>Google AI Overviews (formerly Search Generative Experience) are AI-generated summaries that now appear at the very top of search results for millions of queries. For Indian users searching everything from "best digital marketing agency in Ahmedabad" to "how to run Facebook ads in India," the AI answer often answers the question before a single organic result is clicked.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Why This Matters for Indian Businesses</h2>
<p>Search behaviour in India is shifting fast. With over 700 million internet users, the majority now browse via mobile and expect instant answers. AI Overviews cater exactly to that behaviour — pulling structured, authoritative answers directly into the search result. If your content is not the source Google's AI draws from, you are effectively invisible.</p>
<p>Studies show that clicks on organic results drop significantly when an AI Overview is present. The businesses winning in 2026 are those whose content is being cited inside the AI Overview itself — not just ranking below it.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">5 Steps to Optimise for AI Overviews (AEO) in 2026</h2>
<p><strong style="color:#FF5C00;">1. Answer Questions Directly.</strong> Structure your content so the first 2–3 sentences directly answer the query. Google's AI wants a concise, accurate answer it can surface. Use the inverted pyramid: conclusion first, detail second.</p>
<p><strong style="color:#FF5C00;">2. Use Structured Data (Schema Markup).</strong> FAQ schema, HowTo schema, and Article schema all signal to Google that your content is structured and citable. This is non-negotiable for AEO in 2026.</p>
<p><strong style="color:#FF5C00;">3. Build Topical Authority.</strong> Instead of writing one-off blog posts, build content clusters. A hub page on "Meta Ads for India" supported by 8–10 related articles creates topical authority that signals expertise to Google's AI.</p>
<p><strong style="color:#FF5C00;">4. Target GEO (Generative Engine Optimisation).</strong> Optimise for AI tools like ChatGPT, Perplexity, and Google Gemini — not just classic Google. These tools prioritise sources with strong backlink profiles, clear brand mentions, and E-E-A-T signals.</p>
<p><strong style="color:#FF5C00;">5. Publish Original Research and Data.</strong> AI models are trained to cite unique data points. Publishing original case studies, survey results, or proprietary frameworks makes your content highly citable across all AI search platforms.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The Bottom Line</h2>
<p>SEO in 2026 is no longer about gaming an algorithm — it is about becoming the most trustworthy, structured, and authoritative source in your niche. Brands that adapt to AI-first search will capture the traffic others lose. At The Sonic Media, we have already updated our SEO frameworks for every client to target AI Overviews, Perplexity, and Gemini — and the results are compounding. Reach out to learn how we can do the same for your brand.</p>`
  },

  'blog-meta-roas': {
    cat: 'Performance Marketing',
    date: 'May 2026',
    readTime: '8 min read',
    title: 'How to Achieve 10× ROAS on Meta Ads for Indian D2C Brands in 2026',
    subtitle: 'The exact ad structure, audience strategy, and creative framework we use to generate outsized returns for D2C clients across India.',
    img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
    imgCap: 'Meta Ads remain the highest-ROI paid channel for Indian D2C brands when run with the right structure.',
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Why Most Indian Brands Fail on Meta Ads</h2>
<p>The average Indian D2C brand running Meta Ads achieves a ROAS (Return on Ad Spend) of 2–3×. The brands we work with consistently hit 8–14×. The difference is not budget — it is structure. Most businesses run campaigns with the wrong objective, the wrong creative format, and zero retargeting architecture. This guide breaks down exactly what we do differently.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Step 1: Build a 3-Layer Funnel</h2>
<p><strong style="color:#FF5C00;">Top of Funnel (TOF):</strong> Run broad awareness campaigns targeting interests and lookalike audiences at 1–3% similarity. Use short-form video (15–30 seconds) optimised for mobile-first viewing. Your goal here is reach and brand recall — not direct sales.</p>
<p><strong style="color:#FF5C00;">Middle of Funnel (MOF):</strong> Retarget users who watched 50%+ of your video, visited your website, or engaged with your Instagram. Use carousel ads and UGC testimonials to build trust and answer objections.</p>
<p><strong style="color:#FF5C00;">Bottom of Funnel (BOF):</strong> Retarget add-to-cart and checkout abandoners with dynamic product ads, urgency-based copy, and strong offers. This is where 80% of your ROAS comes from.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Step 2: Creative Is the New Targeting</h2>
<p>Meta's algorithm has become so powerful that creative quality matters more than audience targeting. A scroll-stopping hook in the first 2 seconds, authentic UGC over polished production, and direct-response copywriting consistently outperform expensive brand films for D2C conversion goals.</p>
<p>For Indian audiences specifically: local language (Hindi, Gujarati, Tamil) creatives outperform English by an average of 34% in our tests. Price anchoring ("₹999 instead of ₹2,499") and social proof ("10,000+ happy customers") are the two highest-converting creative elements we have identified.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Step 3: Optimise the Landing Experience</h2>
<p>A great ad sending traffic to a slow or generic website is money wasted. Every campaign we run is paired with a custom landing page that matches the ad creative, loads in under 2 seconds, and has a single clear call-to-action. Page speed alone can improve conversion rates by 40% for Indian mobile users on 4G connections.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The Result</h2>
<p>When you combine a properly structured funnel, high-quality localised creative, and an optimised landing experience, 10× ROAS becomes an achievable baseline — not a rare win. Our client RetailMax achieved 18× ROAS within 60 days using this exact framework. If you are ready to see similar results, contact The Sonic Media today.</p>`
  },

  'blog-brand-trust': {
    cat: 'Branding',
    date: 'Apr 2026',
    readTime: '6 min read',
    title: 'What Makes Indian Consumers Trust a Brand Online? The 2026 Playbook',
    subtitle: 'Trust is the most valuable currency a brand can earn. Here is exactly what builds it — and what destroys it — for Indian digital consumers.',
    img: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&q=80',
    imgCap: 'Brand trust drives repeat purchase, referrals, and premium pricing power across all markets.',
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Why Trust Is the #1 Marketing Asset in India</h2>
<p>India is one of the world's most sceptical e-commerce markets. With online fraud and counterfeit products remaining persistent concerns, Indian consumers do extensive research before purchasing from a brand they have not bought from before. Trust is not a soft metric — it directly determines conversion rates, repeat purchase frequency, and your ability to charge premium prices.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The 5 Pillars of Digital Brand Trust for Indian Consumers</h2>
<p><strong style="color:#FF5C00;">1. Social Proof at Scale.</strong> Ratings, reviews, and testimonials from real customers remain the single most powerful trust signal. For Indian audiences, video testimonials in regional languages are 2× more persuasive than written reviews in English.</p>
<p><strong style="color:#FF5C00;">2. Transparent Communication.</strong> Clear pricing, visible return policies, and upfront delivery timelines reduce purchase anxiety. Brands that hide fees or bury policies in fine print suffer disproportionately high cart abandonment rates in India.</p>
<p><strong style="color:#FF5C00;">3. Consistent Visual Identity.</strong> A coherent brand identity — consistent fonts, colours, photography style, and tone of voice — across your website, social media, packaging, and ads signals legitimacy and investment. Inconsistent branding reads as untrustworthy.</p>
<p><strong style="color:#FF5C00;">4. Founder and Team Visibility.</strong> Indian consumers respond strongly to the human element behind a brand. Founder-led content, behind-the-scenes storytelling, and visible team profiles significantly boost trust, particularly for homegrown brands competing with large established players.</p>
<p><strong style="color:#FF5C00;">5. Third-Party Validation.</strong> Press features, industry awards, partnership logos, and influencer endorsements from credible voices all serve as trust proxies. Even a single feature in a reputable publication can measurably lift conversion rates.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">What Destroys Brand Trust Instantly</h2>
<p>A slow or broken website, no visible contact information, fake reviews that look obviously templated, and inconsistent social media posting all send immediate distrust signals to Indian consumers. Your brand is judged in milliseconds — and first impressions compound over time. Invest in trust-building as a foundational business strategy, not an afterthought.</p>`
  },

  'blog-reels-algorithm': {
    cat: 'Social Media',
    date: 'Apr 2026',
    readTime: '6 min read',
    title: 'Instagram Reels Algorithm 2026: How to Get Organic Reach Without Paid Ads',
    subtitle: 'The Instagram algorithm has changed dramatically. Here is the exact content strategy we use to generate 5× average engagement for our clients.',
    img: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&q=80',
    imgCap: 'Instagram Reels remain the highest-reach organic content format in 2026 when created with the right structure.',
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">How the Instagram Algorithm Works in 2026</h2>
<p>Instagram's algorithm in 2026 prioritises four core signals: watch time (how long people watch your Reel), saves (do people bookmark it?), shares (do they send it to friends?), and replays (do they watch it again?). Likes and comments are secondary. Understanding this hierarchy changes everything about how you should create content.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The Winning Reel Structure</h2>
<p><strong style="color:#FF5C00;">Hook (0–2 seconds):</strong> Your opening must stop the scroll. Text overlays with a bold claim, a surprising visual, or a direct question outperform cinematic openers. "Here is why your ads are failing" beats a slow brand intro every time.</p>
<p><strong style="color:#FF5C00;">Value Delivery (2–20 seconds):</strong> Deliver real, actionable value fast. Lists, numbered steps, and quick tips perform best. The viewer should feel they learned something within the first 10 seconds.</p>
<p><strong style="color:#FF5C00;">CTA (Final 3 seconds):</strong> End with a clear call to action — "Save this for later," "Share with your founder friend," or "Follow for more." Prompting saves and shares directly signals to the algorithm that this content is worth distributing.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Posting Frequency and Timing</h2>
<p>For Indian audiences, posting 4–5 Reels per week consistently outperforms posting 1–2 high-production pieces. The algorithm rewards consistency. Peak engagement windows for Indian users are 7–9 AM, 12–1 PM, and 8–10 PM IST. Use Instagram Insights to confirm your specific audience's peak times.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The Content Mix That Works</h2>
<p>Our clients achieve the highest organic reach with a 40-30-30 content mix: 40% educational (tips, how-tos, industry insights), 30% social proof (results, testimonials, case studies), and 30% brand personality (behind-the-scenes, founder stories, culture). This balance builds both reach and trust simultaneously — the two engines of sustainable organic growth.</p>`
  },

  'blog-website-conversion': {
    cat: 'Web Development',
    date: 'Mar 2026',
    readTime: '5 min read',
    title: 'Why Your Website Gets Traffic But Zero Leads — And How to Fix It Today',
    subtitle: 'Traffic without conversion is just vanity. These are the exact fixes that turn visitors into paying clients.',
    img: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&q=80',
    imgCap: 'Most websites lose over 97% of their visitors without capturing a single lead.',
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The Conversion Problem Most Businesses Do Not See</h2>
<p>The average website converts 1–3% of its visitors. For Indian B2B and service businesses, this number can be even lower. If you are getting 1,000 visitors per month but only 5–10 leads, the problem is almost never the traffic source — it is the website experience itself. Here are the most common conversion killers we find during our website audits.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The 7 Most Common Conversion Killers</h2>
<p><strong style="color:#FF5C00;">1. No Clear Above-the-Fold CTA.</strong> A visitor should know exactly what to do within 5 seconds of landing on your homepage. If your call-to-action is buried below the fold or generic ("Learn More"), you are losing leads immediately.</p>
<p><strong style="color:#FF5C00;">2. Slow Page Speed.</strong> Every additional second of load time reduces conversions by 7% on average. For Indian mobile users on variable network speeds, this impact is amplified. A website that loads in 2 seconds converts dramatically better than one that takes 5.</p>
<p><strong style="color:#FF5C00;">3. Missing Trust Signals.</strong> No client logos, no testimonials, no team photos, no visible contact number. Without trust signals, visitors have no reason to engage with your brand.</p>
<p><strong style="color:#FF5C00;">4. Generic Copy.</strong> "We deliver quality solutions with a passion for excellence" says nothing. Specific, outcome-focused copy ("We helped 50+ Ahmedabad businesses double their leads in 90 days") converts infinitely better.</p>
<p><strong style="color:#FF5C00;">5. Too Many Options.</strong> Giving visitors too many choices (8 service pages, 4 CTAs, multiple pop-ups) leads to decision paralysis. Simplify your navigation and focus each page on a single conversion goal.</p>
<p><strong style="color:#FF5C00;">6. No Mobile Optimisation.</strong> Over 70% of Indian web traffic is mobile. If your website does not look and function perfectly on a smartphone, you are failing the majority of your audience.</p>
<p><strong style="color:#FF5C00;">7. No Lead Capture Mechanism.</strong> Not every visitor is ready to buy today. Without a lead magnet, newsletter signup, or free consultation offer, you lose 97%+ of your traffic permanently. Capture intent at every stage of the journey.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Quick Wins You Can Implement This Week</h2>
<p>Add a click-to-call button in your mobile header. Replace generic hero copy with a specific outcome statement. Add 3–5 genuine client testimonials with photos. Install a heatmap tool (like Hotjar) to see exactly where visitors drop off. These four changes alone have increased lead generation by 40–80% for businesses we have worked with.</p>`
  },

  'blog-ai-content': {
    cat: 'Content Production',
    date: 'Mar 2026',
    readTime: '7 min read',
    title: 'How We Use AI to Produce 60+ Pieces of Content Per Month Without Losing Quality',
    subtitle: 'AI does not replace creative strategy — it amplifies it. Here is our exact workflow for scaling content production without sacrificing brand voice.',
    img: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&q=80',
    imgCap: 'Our AI-assisted content production system allows us to scale output by 4× while maintaining brand quality standards.',
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The Content Scaling Problem</h2>
<p>Every growing brand faces the same tension: audiences demand more content, more frequently, across more platforms — but content quality cannot drop. Hiring a larger team is expensive and slow. That is why we built an AI-assisted content production system that allows us to produce 60+ pieces of content per month for each client, across Instagram, LinkedIn, blog, email, and YouTube — without a drop in quality.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Our 5-Stage AI Content Workflow</h2>
<p><strong style="color:#FF5C00;">Stage 1 — Strategy (Human-Led):</strong> A human content strategist defines the monthly content pillars, key messages, and audience targets. AI does not set strategy — it executes it. This stage cannot be automated.</p>
<p><strong style="color:#FF5C00;">Stage 2 — Ideation (AI-Assisted):</strong> We use AI to generate 50–100 content ideas per pillar in minutes. Our strategists then curate the best 20–30 based on audience relevance, search demand, and brand fit.</p>
<p><strong style="color:#FF5C00;">Stage 3 — First Drafts (AI-Generated):</strong> AI generates first drafts for blog posts, social captions, and email copy using detailed brand briefs and tone-of-voice guidelines we have built for each client. These drafts are typically 60–70% of the final product.</p>
<p><strong style="color:#FF5C00;">Stage 4 — Human Editing (Quality Gate):</strong> Every AI-generated piece passes through a human editor who adds specific client examples, real data points, brand personality, and Indian market nuance that AI cannot generate. This is where quality is preserved.</p>
<p><strong style="color:#FF5C00;">Stage 5 — Repurposing (AI-Assisted):</strong> A single long-form blog post becomes 5 social captions, 1 email newsletter, 3 Reel scripts, and 2 LinkedIn posts — all via AI-assisted repurposing guided by human oversight. This is where the 60+ pieces per month becomes achievable.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">What AI Cannot Do (And Never Will)</h2>
<p>AI cannot create original thought leadership, genuine founder stories, real client results, or culturally resonant humour for your specific Indian audience. The brands that will win with AI are those who use it to scale execution while keeping humans in charge of strategy, authenticity, and quality. If you use AI to replace thinking entirely, the result will look exactly like what it is: generic, hollow, and forgettable.</p>`
  },

  'blog-local-seo': {
    cat: 'SEO',
    date: 'Mar 2026',
    readTime: '8 min read',
    title: 'Local SEO for Indian Businesses: How to Rank #1 on Google Maps in Your City',
    subtitle: 'Local search is the highest-intent traffic a business can capture. Here is the complete playbook for dominating Google Maps in any Indian city.',
    img: 'https://images.unsplash.com/photo-1432888622747-4eb9a8eMar07?w=1200&q=80',
    imgCap: 'Google Maps rankings drive direct calls, walk-ins, and high-intent website visits for local Indian businesses.',
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Why Local SEO Is the Highest-ROI Marketing Channel for Indian SMBs</h2>
<p>When someone searches "digital marketing agency near me" or "best dentist in Ahmedabad," they are ready to buy. Local search intent is among the highest of any marketing channel — and yet most Indian businesses treat their Google Business Profile as an afterthought. Ranking in the top 3 of the Google Maps "Local Pack" can triple inbound leads without spending a rupee on ads.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Step 1: Claim and Fully Optimise Your Google Business Profile</h2>
<p>Ensure every section of your Google Business Profile is 100% complete: business name, category (choose the most specific primary category), address, phone number, website, hours, and services. Add 10–15 high-quality photos of your office, team, work, and products. Profiles with complete information and photos receive 7× more clicks than incomplete listings.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Step 2: Generate and Respond to Reviews Strategically</h2>
<p>Google Maps rankings are heavily influenced by review quantity, recency, and response rate. Set up a systematic process to ask every satisfied customer for a Google review. Respond to every review — both positive and negative — within 24 hours. Businesses with 50+ reviews and a 4.5+ rating consistently outrank competitors with fewer reviews in the Google Local Pack.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Step 3: Build Local Citations Consistently</h2>
<p>Your business name, address, and phone number (NAP) must be consistent across all directories: JustDial, Sulekha, IndiaMart, Yellow Pages India, and industry-specific directories. Inconsistent NAP data confuses Google and suppresses your local rankings. Audit and clean up all existing listings before building new ones.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Step 4: Create Location-Specific Landing Pages</h2>
<p>If you serve multiple areas (e.g., Ahmedabad, Surat, Vadodara), create individual optimised landing pages for each city. Each page should feature city-specific content, local customer testimonials, and location-specific service descriptions. This signals to Google that you serve each area with genuine expertise and relevance.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Step 5: Post Weekly on Google Business Profile</h2>
<p>Google Posts (updates, offers, and events published directly to your Google Business Profile) are read by fewer than 5% of businesses in India — making them a significant competitive advantage for those who use them. Post weekly updates about your services, offers, and case studies to signal to Google that your business is active and relevant.</p>`
  },

  'blog-ecom-launch': {
    cat: 'E-Commerce',
    date: 'Mar 2026',
    readTime: '9 min read',
    title: 'E-Commerce Launch Checklist 2026: 30 Things to Do Before Going Live in India',
    subtitle: 'Launching an online store without this checklist is launching blind. Cover every base before your first sale.',
    img: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1200&q=80',
    imgCap: 'A successful e-commerce launch requires technical, marketing, and operational readiness working in parallel.',
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Why Most Indian E-Commerce Launches Fail in the First 90 Days</h2>
<p>We have audited over 100 Indian e-commerce launches and the pattern is consistent: brands spend 80% of their energy on product and design, and 20% on the marketing and operational infrastructure that actually drives sales. This checklist covers everything you need to go live with confidence — technically, commercially, and operationally.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Technical Checklist (Pre-Launch)</h2>
<p><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Mobile-first design tested on Android and iOS across multiple screen sizes. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Page speed under 3 seconds on 4G (test with Google PageSpeed Insights). <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>SSL certificate active (HTTPS). <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>All payment gateways tested (Razorpay, PayU, UPI, COD). <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>GST-compliant invoicing configured. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Inventory management system integrated. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Returns and refund workflow tested end-to-end. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Meta Pixel and Google Analytics 4 installed and verified. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>404 error pages redirected. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Sitemap submitted to Google Search Console.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Marketing Checklist (Pre-Launch)</h2>
<p><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Pre-launch email waitlist built (minimum 500 subscribers before launch). <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Social media profiles complete with 15+ posts published. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Google Shopping feed submitted and approved. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Meta Ads account created, verified, and tested with a ₹500 campaign. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Brand influencer partnerships confirmed for launch week. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Press release prepared for launch day. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Launch offer or limited-time discount defined. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>WhatsApp broadcast list built from existing contacts. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Launch-day email sequence written and scheduled. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Retargeting audiences built in Meta and Google.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Operational Checklist (Pre-Launch)</h2>
<p><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Courier partnerships established (Shiprocket, Delhivery, or direct). <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Packaging branded and tested for transit damage. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Customer support email and WhatsApp number active. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Response time target set (under 4 hours for all queries). <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Refund policy clearly stated and legally reviewed. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>GSTIN and business registration documents ready. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>First 30 days inventory buffer stocked. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Team roles defined for post-launch order management. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>Post-purchase review collection system automated. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>30/60/90-day success metrics defined before launch day.</p>
<p>Launching with all 30 boxes checked is the difference between a brand that gains momentum on day one and one that spends its first three months firefighting. The Sonic Media helps brands across India prepare for successful e-commerce launches — reach out to get started.</p>`
  },

  'blog-influencer-roi': {
    cat: 'Influencer Marketing',
    date: 'Mar 2026',
    readTime: '6 min read',
    title: 'Influencer Marketing ROI: How to Pick the Right Creator and Measure Real Results',
    subtitle: 'Follower counts mean nothing. Here is how to identify high-ROI creators and measure the results that actually matter for your brand.',
    img: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
    imgCap: 'The right influencer partnership can generate 10× the return of a paid ad campaign — when chosen and measured correctly.',
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The Influencer Marketing Myth Most Brands Believe</h2>
<p>Many brands equate large follower counts with large results. This is categorically false. We have run influencer campaigns for brands across India and the data is consistent: a nano-influencer (10K–50K followers) with a highly engaged, niche audience consistently outperforms a mega-influencer (1M+ followers) for direct-response results. Understanding why requires understanding how influencer audiences actually behave.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The 5 Metrics That Actually Predict Influencer ROI</h2>
<p><strong style="color:#FF5C00;">1. Engagement Rate (ER):</strong> Calculate as (Likes + Comments + Saves) ÷ Followers × 100. For Indian creators, a strong ER is 3%+ for macro and 6%+ for nano/micro. Anything below 1% signals a disengaged or purchased audience.</p>
<p><strong style="color:#FF5C00;">2. Audience Authenticity:</strong> Use tools like HypeAuditor or Modash to check for fake followers and bot engagement. Indian influencer market has particularly high rates of purchased followers — always verify before contracting.</p>
<p><strong style="color:#FF5C00;">3. Content-to-Audience Alignment:</strong> Does the creator's existing content, tone, and audience demographics genuinely align with your product? A fitness creator promoting financial services will see low conversion regardless of engagement rate.</p>
<p><strong style="color:#FF5C00;">4. Story Views to Follower Ratio:</strong> Instagram Stories are where real purchase intent is captured. A creator whose Stories consistently reach 8–12% of their followers has a highly engaged, trust-based audience that converts.</p>
<p><strong style="color:#FF5C00;">5. Past Brand Partnership Performance:</strong> Ask for data from previous collaborations. Strong creators should be able to share swipe-up rates, promo code redemptions, or campaign-attributed sales from past brand deals.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">How to Measure Campaign ROI</h2>
<p>Set unique tracking links (UTM parameters) and unique promo codes for every creator. Measure: reach, engagement rate on sponsored content, website clicks, promo code redemptions, and attributed sales. Do not measure success solely by reach or impressions — they are vanity metrics. The real questions are: How many people clicked? How many purchased? What was the cost per acquisition versus your paid channel benchmarks?</p>
<p>When measured correctly, the right influencer partnerships achieve CPAs 30–60% lower than equivalent Meta or Google campaigns — making them one of the highest-ROI acquisition channels available to Indian brands today.</p>`
  },

  'blog-whatsapp-marketing': {
    cat: 'Strategy',
    date: 'Mar 2026',
    readTime: '7 min read',
    title: 'WhatsApp Marketing for Indian Brands: The Complete Strategy Guide for 2026',
    subtitle: 'WhatsApp is India\'s most used app. Here is how to use it as a serious marketing and sales channel — without getting blocked.',
    img: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&q=80',
    imgCap: 'With 500+ million active users in India, WhatsApp is the most direct and personal marketing channel available to Indian brands.',
    body: `<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">Why WhatsApp Is India\'s Most Underutilised Marketing Channel</h2>
<p>India has over 500 million WhatsApp users. The average Indian opens WhatsApp 23–30 times per day. WhatsApp messages have a 98% open rate compared to 20–25% for email. And yet, most Indian brands treat WhatsApp as an informal communication tool rather than a structured marketing and sales channel. In 2026, that is a significant missed opportunity.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">WhatsApp Business API vs. WhatsApp Business App: Which One Do You Need?</h2>
<p>The free WhatsApp Business App is suited for businesses with fewer than 50 messages per day. The WhatsApp Business API (accessed via approved Business Service Providers like Interakt, AiSensy, or Wati) is essential for any brand sending broadcast messages to more than a few hundred contacts, running automated flows, or integrating WhatsApp with their CRM. For serious marketing at scale, the API is non-negotiable.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The 4 Most Effective WhatsApp Marketing Strategies for Indian Brands</h2>
<p><strong style="color:#FF5C00;">1. Abandoned Cart Recovery:</strong> Automatically trigger a WhatsApp message (with image and direct payment link) within 30 minutes of a customer abandoning their cart. Indian brands report 35–55% cart recovery rates via WhatsApp — far above email.</p>
<p><strong style="color:#FF5C00;">2. Post-Purchase Nurture Sequences:</strong> Build automated WhatsApp sequences that send order confirmations, delivery updates, usage tips, and review requests. This builds loyalty and reduces customer support load simultaneously.</p>
<p><strong style="color:#FF5C00;">3. Broadcast Campaigns for Offers and Launches:</strong> Build an opt-in WhatsApp list through your website, Instagram bio, and checkout flow. Broadcast new product launches, exclusive offers, and seasonal sales to opted-in subscribers. With 98% open rates, even a 5% conversion rate delivers exceptional ROI.</p>
<p><strong style="color:#FF5C00;">4. Click-to-WhatsApp Ads:</strong> Run Meta Ads with a "Send WhatsApp Message" CTA. These ads start a conversation in WhatsApp directly, skipping the landing page entirely. For Indian audiences, this format consistently achieves 40–60% lower CPL than website conversion campaigns.</p>
<h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F5F0EB;margin:32px 0 14px;">The Golden Rule: Consent First, Always</h2>
<p>Sending unsolicited WhatsApp messages is the fastest way to get your number blocked and your API access revoked. Always collect explicit opt-in consent before messaging. Build your list through genuine value exchange — exclusive content, early access, or member-only offers. Consent-based WhatsApp marketing performs 10× better than blast campaigns and builds long-term brand equity instead of eroding it.</p>`
  }
};

window.blogArticles = blogArticles;

function openBlogArticle(id) {
  if (!id) return;
  try {
    sessionStorage.setItem('current_article_id', id);
    localStorage.setItem('current_article_id', id);
  } catch (_) {}
  const isDirect = (window.location.protocol === 'file:') ||
                   (window.location.port === '5000') ||
                   (window.location.pathname.endsWith('.html'));
  const target = isDirect ? 'article.html' : '/article';
  const artUrl = `${target}?id=${encodeURIComponent(id)}`;
  const newWin = window.open(artUrl, '_blank');
  if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
    window.location.href = artUrl;
  }
}

function _legacyOpenBlogArticle(id) {
  let art = blogArticles[id];
  if (!art) {
    const found = (typeof PAGE_DATA !== 'undefined' && PAGE_DATA.journal && PAGE_DATA.journal.posts) ? PAGE_DATA.journal.posts.find(p => p.id === id) : null;
    if (found) {
      art = {
        title: found.title,
        subtitle: found.title,
        category: found.cat,
        readTime: found.time || '5 min read',
        date: found.date || '2026',
        img: found.thumb || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
        imgCap: found.title,
        body: found.content ? `<p>${found.content.replace(/\n/g, '</p><p>')}</p>` : `<p>${found.title}</p>`
      };
    }
  }
  if (!art) return;
  const win = window.open('', '_blank');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${art.title} — The Sonic Media Journal</title>
<meta name="description" content="${art.subtitle}">
<link rel="icon" type="image/jpeg" href="${art.img}&w=32&h=32&fit=crop">
<meta property="og:type" content="article">
<meta property="og:site_name" content="The Sonic Media">
<meta property="og:title" content="${art.title}">
<meta property="og:description" content="${art.subtitle}">
<meta property="og:image" content="${art.img.replace('w=1200','w=1200')}&h=630&fit=crop">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${art.title} — The Sonic Media Journal">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@thesonicmedia">
<meta name="twitter:title" content="${art.title}">
<meta name="twitter:description" content="${art.subtitle}">
<meta name="twitter:image" content="${art.img.replace('w=1200','w=1200')}&h=630&fit=crop">
<meta name="twitter:label1" content="Reading time">
<meta name="twitter:data1" content="${art.readTime}">
<meta name="twitter:label2" content="Category">
<meta name="twitter:data2" content="${art.cat}">
<meta name="robots" content="index, follow">
<meta name="author" content="The Sonic Media">
<meta name="article:published_time" content="${art.date}">
<meta name="article:section" content="${art.cat}">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://thesonicmedia.com/journal#${art.id || id}",
      "headline": "${art.title.replace(/"/g,'\\"')}",
      "description": "${art.subtitle.replace(/"/g,'\\"')}",
      "image": {
        "@type": "ImageObject",
        "url": "${art.img}",
        "width": 1200,
        "height": 630
      },
      "author": {
        "@type": "Organization",
        "name": "The Sonic Media",
        "url": "https://thesonicmedia.com"
      },
      "publisher": {
        "@type": "Organization",
        "name": "The Sonic Media",
        "logo": {
          "@type": "ImageObject",
          "url": "https://res.cloudinary.com/dq2nrpky0/image/upload/v1779787887/favicon_oalxfi.png"
        }
      },
      "datePublished": "${art.date}",
      "dateModified": "${art.date}",
      "mainEntityOfPage": "https://thesonicmedia.com/journal",
      "articleSection": "${art.cat}",
      "keywords": "${art.cat}, digital marketing India, The Sonic Media"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {"@type":"ListItem","position":1,"name":"Home","item":"https://thesonicmedia.com/"},
        {"@type":"ListItem","position":2,"name":"Journal","item":"https://thesonicmedia.com/journal"},
        {"@type":"ListItem","position":3,"name":"${art.title.replace(/"/g,'\\"')}"}
      ]
    }
  ]
}
<\/script>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html{font-size:16px;scroll-behavior:smooth;}
body{font-family:'DM Sans',sans-serif;background:#080808;color:#F5F0EB;line-height:1.7;min-height:100vh;}
.cs-nav{position:sticky;top:0;z-index:100;background:rgba(8,8,8,.93);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.06);padding:0 48px;height:68px;display:flex;align-items:center;justify-content:space-between;}
.cs-brand{display:flex;align-items:center;gap:10px;font-family:'Syne',sans-serif;font-size:14px;font-weight:800;letter-spacing:.04em;color:#F5F0EB;}
.cs-brand-mark{width:34px;height:34px;border-radius:8px;background:#FF5C00;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:17px;color:#fff;}
.cs-close{padding:8px 20px;border-radius:50px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(245,240,235,.6);font-family:'Syne',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;}
.cs-close:hover{background:rgba(255,92,0,.15);border-color:rgba(255,92,0,.35);color:#FF5C00;}
.cs-hero{padding:90px 72px 72px;background:#0f0f0f;position:relative;overflow:hidden;}
.cs-hero::before{content:'';position:absolute;top:0;right:0;width:600px;height:600px;background:radial-gradient(circle,rgba(255,92,0,.07) 0%,transparent 70%);pointer-events:none;}
.cs-eyebrow{display:inline-flex;align-items:center;gap:10px;font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:#FF5C00;margin-bottom:20px;}
.cs-eyebrow::before{content:'';width:22px;height:1.5px;background:#FF5C00;}
.cs-h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(40px,6vw,88px);line-height:.92;letter-spacing:.02em;margin-bottom:20px;max-width:900px;}
.cs-h1 span{color:#FF5C00;}
.cs-subtitle{font-size:18px;line-height:1.7;color:rgba(245,240,235,.6);max-width:700px;font-weight:300;margin-bottom:20px;}
.cs-meta{font-family:'Syne',sans-serif;font-size:12px;font-weight:600;letter-spacing:.1em;color:#666;text-transform:uppercase;}
.cs-body{max-width:860px;margin:0 auto;padding:72px 72px 100px;}
.cs-img-wrap{border-radius:16px;overflow:hidden;margin-bottom:14px;aspect-ratio:16/9;background:#161616;}
.cs-img-wrap img{width:100%;height:100%;object-fit:cover;display:block;}
.cs-img-cap{font-family:'Syne',sans-serif;font-size:12px;font-weight:600;color:rgba(245,240,235,.4);letter-spacing:.06em;margin-bottom:44px;padding-left:4px;}
.cs-article{font-size:17px;line-height:1.9;color:rgba(245,240,235,.75);font-weight:300;padding:44px;border-radius:16px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);}
.cs-article::first-letter{font-family:'Bebas Neue',sans-serif;font-size:72px;line-height:.8;float:left;margin-right:12px;margin-top:6px;color:#FF5C00;}
.cs-article p{margin-bottom:20px;}
.cs-cta{margin-top:60px;padding:40px;border-radius:16px;background:rgba(255,92,0,.08);border:1px solid rgba(255,92,0,.2);text-align:center;}
.cs-cta-title{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;margin-bottom:10px;}
.cs-cta-p{font-size:14px;color:rgba(245,240,235,.6);margin-bottom:24px;}
.cs-cta-btn{display:inline-flex;align-items:center;gap:8px;background:#FF5C00;color:#fff;padding:14px 32px;border-radius:50px;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;letter-spacing:.04em;text-decoration:none;transition:all .3s;box-shadow:0 0 30px rgba(255,92,0,.35);}
.cs-cta-btn:hover{box-shadow:0 0 50px rgba(255,92,0,.6);transform:translateY(-2px);}
.cs-footer{border-top:1px solid rgba(255,255,255,.05);padding:32px 72px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;}
.cs-footer-copy{font-size:13px;color:#666;}
.cs-footer-copy span{color:#FF5C00;}
.cs-back{display:inline-flex;align-items:center;gap:8px;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:#FF5C00;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:gap .25s;}
.cs-back:hover{gap:14px;}
@media(max-width:768px){.cs-nav,.cs-footer{padding-left:20px;padding-right:20px;}.cs-hero{padding:80px 20px 48px;}.cs-body{padding:32px 20px 80px;}.cs-article{padding:24px;font-size:15px;}.cs-cta{padding:28px 20px;}}
</style>
</head>
<body>
<nav class="cs-nav">
  <div class="cs-brand"><img src="https://res.cloudinary.com/dq2nrpky0/image/upload/v1779787887/favicon_oalxfi.png" alt="The Sonic Media Logo" style="width:34px;height:34px;object-fit:contain;flex-shrink:0;" />THE SONIC MEDIA</div>
  <button class="cs-close" onclick="window.close()" style="display:inline-flex;align-items:center;gap:6px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>Close</button>
</nav>
<div class="cs-hero">
  <div class="cs-eyebrow">Journal · ${art.cat}</div>
  <h1 class="cs-h1">${art.title}</h1>
  <p class="cs-subtitle">${art.subtitle}</p>
  <div class="cs-meta">${art.date} &nbsp;·&nbsp; The Sonic Media &nbsp;·&nbsp; ${art.readTime}</div>
</div>
<div class="cs-body">
  <div class="cs-img-wrap"><img src="${art.img}" alt="${art.title}" loading="lazy"></div>
  <div class="cs-img-cap">${art.imgCap}</div>
  <div class="cs-article">${art.body}</div>
  <div class="cs-cta">
    <div class="cs-cta-title">Ready to Grow Your Brand in India?</div>
    <p class="cs-cta-p">The Sonic Media has helped 500+ brands across India achieve outsized growth through data-driven strategy, cinematic content, and technology that converts.</p>
    <a href="#" onclick="window.close();if(window.opener&&window.opener.navigate)window.opener.navigate('contact');" class="cs-cta-btn">Work With The Sonic Media →</a>
  </div>
</div>
<div class="cs-footer">
  <div class="cs-footer-copy">© 2026 <span>The Sonic Media</span>. All rights reserved.</div>
  <span class="cs-back" onclick="window.close()">← Back to Website</span>
</div>
</body>
</html>`;
  win.document.write(html);
  win.document.close();
}

function openLegalPage(type) {
  const data = legalContent[type];
  if (!data) return;

  // Remove any existing modal
  const existing = document.getElementById('legal-modal-overlay');
  if (existing) existing.remove();

  const titleWords = data.title.split(' ');
  const titleHtml = titleWords.map((w, i) => i === titleWords.length - 1 ? '<span style="color:#FF5C00">' + w + '</span>' : w).join(' ');
  const sectionsHtml = data.sections.map(s => `
    <div style="margin-bottom:32px;padding:28px 32px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);">
      <h2 style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:#FF5C00;margin-bottom:12px;letter-spacing:.02em;">${s.heading}</h2>
      <p style="font-size:14px;line-height:1.85;color:rgba(245,240,235,.65);font-weight:300;">${s.body}</p>
    </div>`).join('');

  const overlay = document.createElement('div');
  overlay.id = 'legal-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;overflow-x:hidden;padding:32px 16px;cursor:none;-webkit-overflow-scrolling:touch;';
  overlay.innerHTML = `
    <div id="legal-modal-box" style="background:#0f0f0f;border:1px solid rgba(255,255,255,.08);border-radius:20px;max-width:820px;width:100%;position:relative;overflow:visible;box-shadow:0 40px 100px rgba(0,0,0,.7);">
      <!-- Modal nav -->
      <div style="position:sticky;top:0;z-index:10;background:rgba(15,15,15,.95);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.06);padding:0 32px;height:60px;display:flex;align-items:center;justify-content:space-between;border-radius:20px 20px 0 0;">
        <div style="display:flex;align-items:center;gap:10px;font-family:'Syne',sans-serif;font-size:13px;font-weight:800;letter-spacing:.04em;color:#F5F0EB;">
          <img src="https://res.cloudinary.com/dq2nrpky0/image/upload/v1779787887/favicon_oalxfi.png" alt="The Sonic Media Logo" style="width:30px;height:30px;object-fit:contain;flex-shrink:0;" />
          THE SONIC MEDIA
        </div>
        <button onclick="document.getElementById('legal-modal-overlay').remove();" style="display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:50px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(245,240,235,.6);font-family:'Syne',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;" onmouseover="this.style.background='rgba(255,92,0,.15)';this.style.borderColor='rgba(255,92,0,.35)';this.style.color='#FF5C00'" onmouseout="this.style.background='rgba(255,255,255,.06)';this.style.borderColor='rgba(255,255,255,.1)';this.style.color='rgba(245,240,235,.6)'"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>Close</button>
      </div>
      <!-- Hero -->
      <div style="padding:60px 40px 40px;border-bottom:1px solid rgba(255,255,255,.06);">
        <div style="display:inline-flex;align-items:center;gap:8px;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:#FF5C00;margin-bottom:18px;">
          <span style="display:inline-block;width:20px;height:1.5px;background:#FF5C00;"></span>Legal
        </div>
        <h1 style="font-family:'Bebas Neue',sans-serif;font-size:clamp(42px,6vw,78px);line-height:.95;letter-spacing:.02em;margin-bottom:16px;">${titleHtml}</h1>
        <div style="font-size:13px;color:#666;font-family:'Syne',sans-serif;font-weight:500;letter-spacing:.05em;">Last updated: ${data.lastUpdated} &nbsp;·&nbsp; The Sonic Media, Ahmedabad, Gujarat, India</div>
      </div>
      <!-- Sections -->
      <div style="padding:40px 40px 20px;">${sectionsHtml}</div>
      <!-- Footer -->
      <div style="border-top:1px solid rgba(255,255,255,.05);padding:24px 40px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div style="font-size:13px;color:#666;">© 2026 <span style="color:#FF5C00;">The Sonic Media</span>. All rights reserved.</div>
        <span onclick="document.getElementById('legal-modal-overlay').remove();" style="display:inline-flex;align-items:center;gap:8px;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:#FF5C00;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;">← Back</span>
      </div>
    </div>`;

  // Close on backdrop click
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { overlay.remove(); }
  });

  // Prevent scroll from leaking through to the page behind
  overlay.addEventListener('wheel', function(e) { e.stopPropagation(); }, { passive: true });
  overlay.addEventListener('touchmove', function(e) { e.stopPropagation(); }, { passive: true });

  document.body.appendChild(overlay);
  // Do NOT set body overflow:hidden — that blocks scrolling inside the overlay
}

/* ═══════════════════════════════════════════════════
   PAGE DATA — SINGLE SOURCE OF TRUTH
   Edit here once → updates BOTH homepage previews
   AND the inner pages automatically on load.
═══════════════════════════════════════════════════ */
const PAGE_DATA = {

  about: {
    tag: 'Who We Are',
    headingPrefix: 'We Are The ',
    headingHighlight: 'Growth Engine',
    headingSuffix: ' Your Brand Needs',
    body: 'Born in Ahmedabad, built for the world. The Sonic Media is a premium digital agency that transforms ambitious brands into cultural movements. We combine relentless strategy, cinematic creativity, and technology that converts — to deliver results that sound impossible, until you work with us.',
    body2: 'Founded in 2019 with a vision to redefine what a digital agency could be, we have grown from a small team of passionate marketers into a full-service powerhouse trusted by 500+ brands across India and internationally.',
    imgSrc: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=900&q=80',
    badgeN: '6+',
    badgeL: 'Years<br>of Excellence',
    floatLabel: 'Happy Clients',
    floatVal: '500+',
    pills: [
      { icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--orange);"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`, label: 'Data-Driven Strategy' },
      { icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--orange);"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`, label: 'Cinematic Content' },
      { icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--orange);"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`, label: 'Premium Web Dev' },
      { icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--orange);"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`, label: 'Mobile Apps' },
      { icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--orange);"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`, label: 'Performance Marketing' },
      { icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--orange);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`, label: 'SEO Mastery' },
    ],
    homeBtnText: 'Learn More About Us →',
    pageBtnText: 'Work With Us →',
  },

  portfolio: {
    eyebrow: 'Featured Work',
    titleMain: 'Results',
    titleSub: 'That',
    titleEm: 'Speak',
    tagline: 'Every project is a movement. Every number is a brand that changed.',
    /* ── EDIT WORKS HERE — changes reflect on BOTH homepage & Portfolio page ── */
    works: [
      {
        id: 'luxefashion',
        num: '01',
        cat: 'Web Design & Development',
        name: 'LedgerLink Consultation — Tax & Financial Advisory Website',
        tags: ['Web Design', 'HTML / CSS', 'SEO'],
        img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80',
        metricVal: 'Live',
        metricLbl: 'lcpladvisory.com',
      },
      {
        id: 'techvault',
        num: '02',
        cat: 'Creative Design',
        name: 'Titan Fitness Club — Gym Launch Campaign Creatives',
        tags: ['Poster Design', 'Branding', 'Print Media'],
        img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
        metricVal: 'Done',
        metricLbl: 'Launch Delivered',
      },
      {
        id: 'retailmax',
        num: '03',
        cat: 'Presentation Design',
        name: 'Nexora Infrastructure — Corporate Company Profile Design',
        tags: ['Corporate Branding', 'Brochure', 'Print Media'],
        img: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
        metricVal: 'Done',
        metricLbl: 'Profile Delivered',
      },
      {
        id: 'nexahealth',
        num: '04',
        cat: 'Branding & Advertising Solutions',
        name: 'Spice Theory Kitchen — Restaurant Menu & Packaging Design',
        tags: ['Menu Design', 'Packaging', 'Print Design'],
        img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
        metricVal: 'Done',
        metricLbl: 'Brand Delivered',
      },
      /* ── Portfolio page gets these extra 2 rows as well ── */
      {
        id: 'houseelira',
        num: '05',
        cat: 'Content Production & Creative Direction',
        name: 'House of Elira — Fashion Brand Photoshoot Direction',
        tags: ['Creative Direction', 'Photo Editing', 'Fashion Branding'],
        img: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=80',
        metricVal: 'Done',
        metricLbl: 'Campaign Delivered',
      },
      {
        id: 'ahmdstartup',
        num: '06',
        cat: 'Event Branding & Promotional Design',
        name: 'Ahmedabad Startup Connect — Event Branding & Visual Identity',
        tags: ['Event Branding', 'Stage Visuals', 'Print Media'],
        img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80',
        metricVal: 'Done',
        metricLbl: 'Event Delivered',
      },
    ],
  },

  casestudies: {
    tag: 'Case Studies',
    titleMain: 'Insights & ',
    titleSpan: 'Ideas',
    /* ── EDIT CASE STUDY CARDS HERE — changes reflect on BOTH homepage & Case Studies page ── */
    items: [
      { id: 'd2c-growth-playbook',   img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',  cat: 'strategy',     catLabel: 'Strategy',     date: 'May 18, 2026', title: 'How Indian D2C Brands Can Scale from ₹5L to ₹50L Monthly Revenue in 6 Months',    excerpt: 'The exact growth blueprint — paid media architecture, retention flows, and CRO — that took three of our D2C clients to 10× revenue without increasing their ad budget.' },
      { id: 'whatsapp-marketing-2026', img: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600&q=80', cat: 'performance',  catLabel: 'Performance',  date: 'May 5, 2026',  title: 'WhatsApp Marketing in 2026: How to Generate 35% of Your Revenue from One Channel',  excerpt: 'Most Indian brands treat WhatsApp as a customer support tool. The best ones use it as their highest-ROAS sales channel. Here is the complete strategy.' },
      { id: 'local-seo-domination',  img: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=600&q=80',  cat: 'seo',          catLabel: 'SEO',          date: 'Apr 22, 2026', title: 'How to Dominate Local Search in Your City and Become the #1 Brand on Google Maps',  excerpt: 'Local SEO is the most underutilised growth channel for Indian businesses. This is the step-by-step system we use to rank clients at the top of local search in 60 days.' },
      { id: 'video-content-roi',     img: 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=600&q=80',  cat: 'social',       catLabel: 'Social Media', date: 'Apr 8, 2026',  title: 'Why Short-Form Video Delivers the Highest ROI of Any Marketing Channel in India',    excerpt: 'We analysed 1,200 pieces of content across 40 client accounts. The data is unambiguous: Reels, Shorts, and vertical video now outperform every other format for reach, engagement, and conversion.' },
      { id: 'ecom-conversion-rate',  img: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&q=80',  cat: 'strategy',     catLabel: 'Strategy',     date: 'Mar 20, 2026', title: 'The E-Commerce CRO Checklist: 12 Changes That Doubled Our Clients\' Conversion Rates', excerpt: 'Conversion Rate Optimisation is the fastest way to grow revenue without spending more on ads. These are the 12 highest-impact fixes we implement on every new client store.' },
      { id: 'influencer-selection',  img: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=600&q=80',  cat: 'performance',  catLabel: 'Performance',  date: 'Mar 3, 2026',  title: 'How to Select the Right Influencer for Your Brand — and Avoid Costly Mistakes',       excerpt: 'Follower count is the most misleading metric in influencer marketing. Here is the data-driven framework we use to identify creators who actually drive sales, not just views.' },
      { id: 'brand-launch-india',    img: 'https://images.unsplash.com/photo-1559526324-593bc073d938?w=600&q=80',  cat: 'branding',     catLabel: 'Branding',     date: 'Mar 18, 2026', title: 'How to Launch a Brand in India in 90 Days: The Zero-to-Authority Playbook',           excerpt: 'Launching a new brand in one of the world\'s most competitive markets requires a very specific sequence of moves. This is the exact launch strategy we have refined across 30+ brand launches.' },
      { id: 'google-ads-india',      img: 'https://images.unsplash.com/photo-1587440871875-191322ee64b0?w=600&q=80',  cat: 'seo',          catLabel: 'SEO',          date: 'Mar 28, 2026', title: 'Google Ads for Indian Businesses: The Structure That Delivers 12× ROAS Consistently',  excerpt: 'Google Ads remains the most cost-efficient paid channel for high-intent buyers in India — if you structure campaigns correctly. Most businesses waste 60% of their Google Ads budget on these avoidable mistakes.' },
      { id: 'retention-marketing',   img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80',  cat: 'technology',   catLabel: 'Technology',   date: 'Mar 12, 2026', title: 'Retention Marketing in 2026: How to Turn One-Time Buyers Into Lifelong Brand Advocates', excerpt: 'Acquiring a new customer costs 5–7× more than retaining an existing one. The brands that win in 2026 are those that invest as heavily in keeping customers as in winning them.' },
    ],
  },

  future: {
    tag: "What's Next",
    titleMain: 'The ',
    titleSpan: 'Future',
    titleSuffix: " We're<br>Building Towards",
    pageTag: 'Future Vision',
    /* ── EDIT ALL FUTURE VISION PANELS HERE — home shows first 4, page shows all 10 ── */
    panels: [
      {
        tag: 'In Development', btnColor: 'var(--orange)', btnTextColor: '#fff',
        img: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80', alt: 'Autonomous Brand Intelligence Systems',
        title: 'Autonomous Brand Intelligence Systems',
        desc: "Brands that operate like living organisms — AI-driven ecosystems that continuously monitor global consumer behavior, cultural movements, and digital conversations in real time, so campaigns evolve automatically.",
        detail: {
          subtitle: 'Brands That Operate Like Living Organisms',
          body: "In the next 50 years, the world's most powerful brands will function less like companies and more like intelligent living systems. Instead of waiting for marketers to analyze reports manually, AI-driven ecosystems will continuously monitor global consumer behavior, cultural movements, purchasing psychology, economic shifts, and digital conversations in real time.\n\nFuture campaigns will evolve automatically. If audience attention drops, the system will instantly redesign messaging. If a new trend emerges in another country, campaigns will adapt before competitors even notice it. If emotional engagement changes, visuals, tone, offers, and storytelling will transform dynamically across every platform.\n\nAdvertising will no longer be static. It will become self-learning, predictive, and adaptive.\n\nOur long-term vision is to build autonomous brand intelligence systems where strategy, creativity, media buying, analytics, and optimization work together through machine intelligence — creating brands that continuously evolve with human behavior and market shifts.\n\nThe future agency will not just manage brands. It will engineer intelligent brand ecosystems capable of scaling themselves globally.",
          bullets: ['Real-time campaign self-optimization', 'Predictive trend detection across markets', 'Autonomous media buying & budget reallocation', 'Dynamic visual and messaging transformation'],
        },
      },
      {
        tag: 'Coming Soon', btnColor: '#7DD6FF', btnTextColor: '#121212',
        img: 'https://images.unsplash.com/photo-1617802690992-15d93263d3a9?w=800&q=80', alt: 'Immersive AR/VR Brand Universes',
        title: 'Immersive AR/VR Brand Universes',
        desc: "From marketing campaigns to entire digital worlds — consumers will walk through brands, not just watch them, as AR, VR, and spatial computing become mainstream.",
        detail: {
          subtitle: 'From Marketing Campaigns to Entire Digital Worlds',
          body: "The future consumer will not experience brands through screens alone. They will walk through them.\n\nAs AR glasses, VR environments, neural interfaces, and spatial computing become mainstream, brands will evolve into immersive worlds where audiences interact with products, stories, communities, and experiences in real time.\n\nInstead of watching a fashion ad, consumers may enter a fully interactive virtual city designed entirely around the brand identity. Instead of scrolling through product photos, users may test products holographically inside their homes through augmented reality. Instead of passive advertising, audiences will become participants inside dynamic storytelling environments.\n\nOur vision is to create cinematic brand universes where storytelling, commerce, entertainment, gaming, and social interaction exist together as one seamless immersive ecosystem.\n\nThe agencies of the future will not simply create content. They will architect digital realities.",
          bullets: ['Interactive virtual brand cities', 'AR holographic product try-ons at home', 'Immersive dynamic storytelling environments', 'Seamless blend of commerce, gaming & entertainment'],
        },
      },
      {
        tag: 'In Research', btnColor: '#FFA0B0', btnTextColor: '#121212',
        img: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80', alt: 'Emotionally Intelligent Marketing',
        title: 'Emotionally Intelligent Marketing',
        desc: "Marketing that understands human psychology in real time — using AI to analyze voice patterns, facial micro-expressions, and biometric signals to dynamically evolve campaigns based on emotion.",
        detail: {
          subtitle: 'Marketing That Understands Human Psychology in Real Time',
          body: "Future technology will move beyond clicks and impressions. It will understand emotion itself.\n\nAdvanced AI systems will analyze human reactions through voice patterns, facial micro-expressions, biometric signals, behavioral movements, engagement timing, and neural-response technologies. Campaigns will dynamically evolve based on emotional response instead of traditional metrics alone.\n\nImagine a future where a campaign changes its tone depending on a viewer's emotional state. Music, colors, and visuals shift automatically based on audience psychology. Storytelling adapts differently for every individual in real time. AI predicts emotional fatigue before audiences disengage.\n\nOur vision is to build emotionally intelligent branding systems that combine neuroscience, machine learning, behavioral analysis, and cinematic storytelling to create stronger human connection than traditional advertising ever could.\n\nFuture brands will not just communicate. They will emotionally synchronize with their audiences.",
          bullets: ['Real-time facial micro-expression analysis', 'Dynamic tone, visuals & music adaptation', 'AI prediction of emotional fatigue', 'Biometric engagement measurement'],
        },
      },
      {
        tag: 'Coming Soon', btnColor: '#FFA17B', btnTextColor: '#121212',
        img: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&q=80', alt: 'Spatial Computing & Holographic Advertising',
        title: 'Spatial Computing & Holographic Advertising',
        desc: "The end of flat screens — cities become interactive storytelling environments where holographic campaigns respond to human movement, weather, mood, and live events in public spaces.",
        detail: {
          subtitle: 'The End of Flat Screens',
          body: "The future of advertising will escape the limits of phones, laptops, and billboards.\n\nAs spatial computing and holographic projection technologies evolve, cities themselves will become interactive storytelling environments. Public spaces, buildings, retail stores, transportation systems, and entertainment venues will transform into intelligent advertising ecosystems capable of responding to human movement and interaction.\n\nConsumers may walk through holographic campaigns in real-world environments, interact with floating 3D products before purchasing, experience AI-generated storytelling integrated directly into urban spaces, and engage with advertisements that react to weather, mood, crowd density, or live events.\n\nOur future vision is to pioneer spatial storytelling systems that blend architecture, digital media, AI, and cinematic design into next-generation advertising experiences.\n\nThe future agency will design experiences for entire cities — not just screens.",
          bullets: ['Holographic campaigns in real-world public spaces', 'Floating 3D interactive product experiences', 'AI storytelling integrated into urban architecture', 'Ads that react to weather, crowd & live events'],
        },
      },
      {
        tag: 'In Development', btnColor: '#C4B5FD', btnTextColor: '#121212',
        img: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80', alt: 'AI Cinematic Production Ecosystems',
        title: 'AI Cinematic Production Ecosystems',
        desc: "Infinite creative production at global scale — AI systems generating hyper-realistic cinematic videos, multilingual campaigns, virtual actors, and millions of personalized experiences within minutes.",
        detail: {
          subtitle: 'Infinite Creative Production at Global Scale',
          body: "The future of content creation will experience an industrial revolution driven by artificial intelligence.\n\nAI-powered production systems will generate hyper-realistic cinematic videos, multilingual campaigns, virtual actors, synthetic voiceovers, dynamic visual effects, and personalized storytelling experiences within minutes instead of months.\n\nBrands will no longer produce one advertisement for millions of people. They will generate millions of personalized cinematic experiences for individual consumers simultaneously.\n\nEntire global campaigns may become fully adaptive — different storylines for different personalities, region-specific visual worlds generated instantly, personalized product narratives based on user behavior, and AI-generated films evolving continuously after launch.\n\nOur vision is to build intelligent cinematic production ecosystems where creativity scales infinitely without sacrificing artistic quality.\n\nThe future creative agency will function more like a global entertainment technology studio than a traditional marketing company.",
          bullets: ['Millions of personalized cinematic experiences', 'Multilingual campaigns generated in minutes', 'Virtual actors & synthetic voiceovers at scale', 'AI films that evolve continuously post-launch'],
        },
      },
      {
        tag: 'In Development', btnColor: '#6EE7B7', btnTextColor: '#121212',
        img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80', alt: 'Human + Machine Creative Civilization',
        title: 'Human + Machine Creative Civilization',
        desc: "AI will not replace creativity — it will expand the limits of human imagination. The future belongs to hybrid intelligence where machine speed amplifies human emotion, philosophy, and artistic instinct.",
        detail: {
          subtitle: 'The Evolution of Human Creativity',
          body: "Artificial intelligence will not replace creativity. It will expand the limits of human imagination.\n\nMachines will master speed, prediction, simulation, optimization, and large-scale execution. Humans will continue to lead emotion, philosophy, artistic instinct, storytelling, cultural understanding, and visionary thinking.\n\nThe future belongs to hybrid intelligence. Creative agencies of the next century may include AI strategists predicting cultural movements, virtual creative directors collaborating with humans, intelligent design systems generating millions of visual possibilities instantly, brain-computer interfaces accelerating creative ideation, and human imagination amplified by machine-scale execution.\n\nOur vision is to build a future where technology does not reduce human creativity — it elevates it into something exponentially more powerful.\n\nThe agencies that dominate the future will not think like service companies. They will think like innovation civilizations shaping the future of communication itself.",
          bullets: ['AI strategists predicting cultural movements', 'Virtual creative directors co-creating with humans', 'Brain-computer interfaces for accelerated ideation', 'Human vision amplified by machine-scale execution'],
        },
      },
      {
        tag: 'In Research', btnColor: '#FDE68A', btnTextColor: '#121212',
        img: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80', alt: 'Neural Interface Marketing',
        title: 'Neural Interface Marketing',
        desc: "The future beyond screens and devices — brand experiences that adapt to attention levels, emotional engagement, and subconscious interest through brain-computer interfaces and neural feedback.",
        detail: {
          subtitle: 'The Future Beyond Screens and Devices',
          body: "In the next era of technology, interaction may move beyond phones, keyboards, and even voice commands. Neural interfaces and brain-computer technologies could allow humans to interact with digital systems through thought, emotion, and cognitive signals alone.\n\nMarketing will fundamentally transform. Instead of users searching for products manually, intelligent systems may understand intent before actions are taken. Brand experiences could adapt based on attention levels, emotional engagement, subconscious interest, or mental focus in real time.\n\nImagine advertisements reacting to human thought patterns, digital experiences personalized through neural feedback, brand storytelling synchronized directly with emotional response, and interfaces where consumers interact with virtual environments using cognition instead of touch.\n\nOur vision is to explore the intersection of neuroscience, communication, and intelligent media to prepare brands for a world where technology becomes an extension of human consciousness itself.\n\nThe future of branding may not live on screens. It may live inside experience itself.",
          bullets: ['Ads reacting to human thought patterns', 'Neural feedback-driven personalization', 'Intent detection before conscious action', 'Cognitive interaction replacing touch & voice'],
        },
      },
      {
        tag: 'Coming Soon', btnColor: '#F9A8D4', btnTextColor: '#121212',
        img: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80', alt: 'Synthetic Influencers & Digital Humans',
        title: 'Synthetic Influencers & Digital Humans',
        desc: "The rise of AI-powered personalities — hyper-realistic digital humans capable of hosting launches, building emotional relationships, and generating personalized conversations at global scale, 24/7.",
        detail: {
          subtitle: 'The Rise of AI-Powered Personalities',
          body: "The future creator economy may not be powered only by humans. Hyper-realistic digital humans, synthetic influencers, and AI-generated personalities could become major cultural figures capable of interacting with audiences 24/7 across every language, platform, and market.\n\nThese entities may host live product launches autonomously, build emotional relationships with audiences, generate personalized conversations at global scale, and adapt appearance, personality, and storytelling dynamically for different cultures.\n\nFuture campaigns may feature digital brand ambassadors that never age, never sleep, and continuously evolve through machine learning and audience interaction.\n\nOur vision is to pioneer the future of synthetic storytelling by building intelligent digital personalities capable of becoming long-term brand ecosystems rather than short-term campaigns.\n\nThe future celebrity may not be born. It may be designed.",
          bullets: ['Autonomous 24/7 product launch hosting', 'Emotionally resonant AI personalities at scale', 'Multilingual, multi-culture adaptive avatars', 'Brand ambassadors that never age or sleep'],
        },
      },
      {
        tag: '2026 & Beyond', btnColor: '#A3E635', btnTextColor: '#121212',
        img: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80', alt: 'Predictive Culture Engineering',
        title: 'Predictive Culture Engineering',
        desc: "Predicting culture before it exists — advanced ML systems analyzing billions of behavioral signals to forecast cultural movements years in advance, engineering attention rather than following it.",
        detail: {
          subtitle: 'Predicting Culture Before It Exists',
          body: "Most brands react to trends after they become popular. Future agencies will predict them before they emerge.\n\nAdvanced machine learning systems will continuously analyze billions of behavioral signals across social platforms, commerce systems, entertainment consumption, search behavior, global conversations, and emotional engagement patterns to forecast future cultural movements years in advance.\n\nThe future of marketing will not simply follow attention. It will engineer it.\n\nBrands may soon detect emerging aesthetics before they go mainstream, predict consumer desires before demand exists, simulate future audience behavior using AI modeling, and design products, campaigns, and experiences based on projected cultural evolution.\n\nOur long-term vision is to build predictive cultural intelligence systems capable of identifying future market psychology before competitors recognize it.\n\nThe brands that dominate tomorrow will be the ones that understand the future before society arrives there.",
          bullets: ['Cultural trend forecasting years in advance', 'Consumer desire prediction before demand exists', 'AI behavioral simulation modeling', 'Proactive campaign design from projected culture'],
        },
      },
      {
        tag: 'In Development', btnColor: '#93C5FD', btnTextColor: '#121212',
        img: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80', alt: 'Intelligent Global Media Ecosystems',
        title: 'Intelligent Global Media Ecosystems',
        desc: "A fully connected advertising intelligence network — every digital surface, wearable, vehicle, and environment working as one synchronized infrastructure that understands context, location, and intent in real time.",
        detail: {
          subtitle: 'A Fully Connected Advertising Intelligence Network',
          body: "Future advertising ecosystems may operate like intelligent planetary networks where every digital surface, wearable device, vehicle, environment, and connected system becomes part of one synchronized communication infrastructure.\n\nMedia will no longer exist in isolated channels. Cars, homes, smart glasses, public environments, entertainment systems, retail stores, and personal AI assistants may all work together through interconnected data ecosystems that understand context, location, behavior, and intent in real time.\n\nThis creates a future where campaigns move seamlessly across physical and digital environments, AI adjusts communication depending on surroundings and context, personalized storytelling follows users intelligently across ecosystems, and advertising becomes integrated into everyday environments invisibly and naturally.\n\nOur vision is to prepare brands for a world where communication becomes ambient, connected, and continuously adaptive through intelligent media infrastructure.\n\nThe future agency will not buy media space. It will orchestrate intelligent global attention systems.",
          bullets: ['Seamless cross-environment campaign continuity', 'Context-aware AI communication adjustment', 'Ambient advertising integrated into daily life', 'Orchestration of planetary attention networks'],
        },
      },
    ],
  },

  journal: {
    tag: 'Journal',
    titleMain: 'Fresh ',
    titleSpan: 'Reads',
    posts: [
      { num: '01', id: 'blog-google-ai-seo', title: 'How Google AI Overviews Are Changing SEO in India — And What to Do About It', cat: 'SEO', time: '7 min read', date: 'May 2026' },
      { num: '02', id: 'blog-meta-roas', title: 'How to Achieve 10× ROAS on Meta Ads for Indian D2C Brands in 2026', cat: 'Performance', time: '8 min read', date: 'May 2026' },
      { num: '03', id: 'blog-brand-trust', title: 'What Makes Indian Consumers Trust a Brand Online? The 2026 Playbook', cat: 'Branding', time: '6 min read', date: 'Apr 2026' },
      { num: '04', id: 'blog-reels-algorithm', title: 'Instagram Reels Algorithm 2026: How to Get Organic Reach Without Paid Ads', cat: 'Social Media', time: '6 min read', date: 'Apr 2026' },
      { num: '05', id: 'blog-website-conversion', title: 'Why Your Website Gets Traffic But Zero Leads — And How to Fix It Today', cat: 'Web Dev', time: '5 min read', date: 'Mar 2026' },
      { num: '06', id: 'blog-ai-content', title: 'How We Use AI to Produce 60+ Pieces of Content Per Month Without Losing Quality', cat: 'Content', time: '7 min read', date: 'Mar 2026' },
      { num: '07', id: 'blog-local-seo', title: 'Local SEO for Indian Businesses: How to Rank #1 on Google Maps in Your City', cat: 'SEO', time: '8 min read', date: 'Mar 2026' },
      { num: '08', id: 'blog-ecom-launch', title: 'E-Commerce Launch Checklist 2026: 30 Things to Do Before Going Live in India', cat: 'E-Commerce', time: '9 min read', date: 'Mar 2026' },
      { num: '09', id: 'blog-influencer-roi', title: 'Influencer Marketing ROI: How to Pick the Right Creator and Measure Real Results', cat: 'Influencer', time: '6 min read', date: 'Mar 2026' },
      { num: '10', id: 'blog-whatsapp-marketing', title: 'WhatsApp Marketing for Indian Brands: The Complete Strategy Guide for 2026', cat: 'Strategy', time: '7 min read', date: 'Mar 2026' },
    ],
  },
};

function renderPageData() {
  const D = PAGE_DATA;

  /* ── ABOUT ── */
  const ab = D.about;
  const pillsHTML = ab.pills.map(p => `<div class="pill"><span class="pi" style="display:inline-flex;align-items:center;">${p.icon}</span>${p.label}</div>`).join('');

  // Home about
  setEl('home-about-tag', ab.tag);
  setEl('home-about-h2', `${ab.headingPrefix}<span id="home-about-h2-span">${ab.headingHighlight}</span>${ab.headingSuffix}`);
  setEl('home-about-p', ab.body);
  setEl('home-about-pills', pillsHTML);
  setEl('home-about-btn', ab.homeBtnText);
  setAttr('home-about-img', 'src', ab.imgSrc);
  setEl('home-about-badge-n', ab.badgeN);
  setEl('home-about-badge-l', ab.badgeL);
  setEl('home-about-float-label', ab.floatLabel);
  setEl('home-about-float-val', ab.floatVal);

  // Page about
  setEl('page-about-tag', ab.tag);
  setEl('page-about-h2', `${ab.headingPrefix}<span id="page-about-h2-span">${ab.headingHighlight}</span>${ab.headingSuffix}`);
  setEl('page-about-p1', ab.body);
  setEl('page-about-p2', ab.body2);
  setEl('page-about-pills', pillsHTML);
  setEl('page-about-btn', ab.pageBtnText);
  setAttr('page-about-img', 'src', ab.imgSrc);
  setEl('page-about-badge-n', ab.badgeN);
  setEl('page-about-badge-l', ab.badgeL);
  setEl('page-about-float-label', ab.floatLabel);
  setEl('page-about-float-val', ab.floatVal);

  /* ── PORTFOLIO ── */
  const pt = D.portfolio;
  setEl('home-portfolio-eyebrow', pt.eyebrow);
  setEl('home-portfolio-title', `${pt.titleMain}<br>${pt.titleSub} <em id="home-portfolio-title-em">${pt.titleEm}</em>`);
  setEl('home-portfolio-tagline', pt.tagline);

  setEl('page-portfolio-eyebrow', pt.eyebrow);
  setEl('page-portfolio-title', `${pt.titleMain}<br>${pt.titleSub} <em>${pt.titleEm}</em>`);
  setEl('page-portfolio-tagline', pt.tagline);

  const PORT_CAT_ICON = {
    'Web Design & Development': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    'Web Design': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    'Creative Design': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="#FF5C00"/><circle cx="17.5" cy="10.5" r=".5" fill="#FF5C00"/><circle cx="8.5" cy="7.5" r=".5" fill="#FF5C00"/><circle cx="6.5" cy="12.5" r=".5" fill="#FF5C00"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"/></svg>`,
    'Presentation Design': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
    'Branding & Advertising Solutions': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    'Branding': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    'Content Production & Creative Direction': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`,
    'Content Production': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`,
    'Event Branding & Promotional Design': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`,
    'Event Branding': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`,
    'UI/UX Design': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
    'Mobile App Development': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
    'Social Media Marketing': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  };
  const DEFAULT_PORT_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>`;
  function buildWorkRow(w) {
    const tagsHTML = w.tags.map(t => `<span class="fw-row-tag">${t}</span>`).join('');
    const portIcon = PORT_CAT_ICON[w.cat] || DEFAULT_PORT_ICON;
    return `<div class="fw-row" onclick="openWorkDetail('${w.id}')">
      <div class="fw-row-num" style="position:relative;">${w.num}
        <div style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);width:26px;height:26px;border-radius:6px;background:rgba(255,92,0,.12);border:1px solid rgba(255,92,0,.2);display:flex;align-items:center;justify-content:center;line-height:0;" title="${w.cat}">${portIcon}</div>
      </div>
      <div class="fw-row-info">
        <div>
          <div class="fw-row-cat">${w.cat}</div>
          <div class="fw-row-name">${w.name}</div>
        </div>
        <div class="fw-row-tags">${tagsHTML}</div>
      </div>
      <div class="fw-row-photo"><img src="${w.img}" alt="${w.name}" loading="lazy"></div>
      <div class="fw-row-metric">
        <div class="fw-row-val">${w.metricVal}</div>
        <div class="fw-row-lbl">${w.metricLbl}</div>
        <div class="fw-row-arrow">↗</div>
      </div>
    </div>`;
  }

  /* ── Build Milestone Cards for the Pinned Horizontal Timeline ── */
  function buildTimelineMilestone(w, isTop) {
    const tagsHTML = (w.tags || []).map(t => `<span class="smc-tag">${t}</span>`).join('');
    const portIcon = PORT_CAT_ICON[w.cat] || DEFAULT_PORT_ICON;
    const isLive = String(w.metricVal || '').toLowerCase() === 'live';
    return `<div class="sonic-milestone-item ${isTop ? 'top' : 'bottom'}" data-id="${w.id}">
      <div class="sonic-stem-anchor ${isTop ? 'top' : 'bottom'}">
        ${isTop ? `<div class="sonic-stem-line jl-${w.id}"></div><div class="sonic-stem-dot jd-${w.id}"></div>` : `<div class="sonic-stem-dot jd-${w.id}"></div><div class="sonic-stem-line jl-${w.id}"></div>`}
      </div>
      <div class="sonic-milestone-card card-${w.id}" onclick="openWorkDetail('${w.id}')">
        <div class="smc-top">
          <span class="smc-num">${w.num}</span>
          <span class="smc-cat" title="${w.cat}">${portIcon} <span>${w.cat}</span></span>
          <span class="smc-arrow">↗</span>
        </div>
        <h3 class="smc-title title-${w.id}">${w.name}</h3>
        <div class="smc-img-box">
          <img src="${w.img}" alt="${w.name}" loading="lazy">
          <span class="smc-badge ${isLive ? 'live' : ''}">
            <span class="smc-badge-dot"></span>
            ${w.metricVal} · ${w.metricLbl}
          </span>
        </div>
        <div class="smc-tags description-${w.id}">${tagsHTML}</div>
      </div>
    </div>`;
  }

  const topMilestones = pt.works.filter((_, idx) => idx % 2 === 0).map(w => buildTimelineMilestone(w, true)).join('');
  const bottomMilestones = pt.works.filter((_, idx) => idx % 2 !== 0).map(w => buildTimelineMilestone(w, false)).join('');

  setEl('portfolio-timeline-top', topMilestones);
  setEl('portfolio-timeline-bottom', bottomMilestones);
  setEl('home-portfolio-timeline-top', topMilestones);
  setEl('home-portfolio-timeline-bottom', bottomMilestones);
  const countEl = document.getElementById('portfolio-timeline-count');
  if (countEl) countEl.textContent = `${pt.works.length} PROJECTS · 2023–2026`;

  /* Home shows first 4 works, Portfolio page shows all */
  const homeWorks = pt.works.slice(0, 4).map(buildWorkRow).join('');
  const pageWorks = pt.works.map(buildWorkRow).join('');
  setEl('home-portfolio-list', homeWorks);
  setEl('page-portfolio-list', pageWorks);

  setTimeout(initTimelineAnimations, 80);

  /* ── CASE STUDIES ── */
  const cs = D.casestudies;
  setEl('home-casestudies-tag', cs.tag);
  setEl('home-casestudies-title', `${cs.titleMain}<span id="home-casestudies-title-span">${cs.titleSpan}</span>`);

  const CS_CAT_ICON = {
    'strategy': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z"/></svg>`,
    'performance': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>`,
    'seo': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    'social': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    'branding': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="#FF5C00"/><circle cx="17.5" cy="10.5" r=".5" fill="#FF5C00"/><circle cx="8.5" cy="7.5" r=".5" fill="#FF5C00"/><circle cx="6.5" cy="12.5" r=".5" fill="#FF5C00"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"/></svg>`,
    'technology': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`
  };
  const DEFAULT_CS_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`;
  function buildJcard(item, readLabel) {
    const catIcon = CS_CAT_ICON[item.cat] || DEFAULT_CS_ICON;
    return `<div class="jcard" onclick="openCaseStudy('${item.id}')" style="cursor:pointer;" data-cat="${item.cat}">
      <div class="jcard-img" style="position:relative;"><img src="${item.img}" alt="${item.title}" loading="lazy">` +
      `<div style="position:absolute;top:10px;left:10px;width:32px;height:32px;border-radius:8px;background:rgba(8,8,8,.75);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;line-height:0;" title="${item.catLabel}">${catIcon}</div>` +
      `</div>
      <div class="jcard-body">
        <div class="jcard-meta"><div class="jcard-cat">${item.catLabel}</div><div class="jcard-date">${item.date}</div></div>
        <div class="jcard-title">${item.title}</div>
        <div class="jcard-excerpt">${item.excerpt}</div>
        <div class="jcard-read">${readLabel || 'Read Full Case Study →'}</div>
      </div>
    </div>`;
  }

  /* Home shows first 3 case study cards */
  setEl('home-casestudies-grid', cs.items.slice(0, 4).map(i => buildJcard(i, 'Read Full Case Study →')).join(''));
  /* Page shows all 9 */
  setEl('page-casestudies-grid', cs.items.map(i => buildJcard(i, 'Read Article →')).join(''));

  /* ── FUTURE VISION ── */
  const fv = D.future;

  const svgDot = (fill) => `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none"><path fill="${fill}" d="M5 2c0 1.105-1.895 2-3 2a2 2 0 1 1 0-4c1.105 0 3 .895 3 2ZM11 3.5c0 1.105-.895 3-2 3s-2-1.895-2-3a2 2 0 1 1 4 0ZM6 9a2 2 0 1 1-4 0c0-1.105.895-3 2-3s2 1.895 2 3Z"/></svg>`;

  const FV_ICONS = [
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>`,
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4h-2a2 2 0 0 0-2-2 2 2 0 0 0-2 2H7a4 4 0 0 1-4-4v-2z"/><circle cx="8" cy="12" r="1.5" fill="#FF5C00"/><circle cx="16" cy="12" r="1.5" fill="#FF5C00"/></svg>`,
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`,
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a9 9 0 0 1 9 9c0 3.1-1.6 5.8-4 7.4V20a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1.6C4.6 16.8 3 14.1 3 11a9 9 0 0 1 9-9z"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>`,
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`
  ];
  const DEFAULT_FV_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  function buildFvPanel(p, index, linkTarget) {
    const fvIcon = FV_ICONS[index] || DEFAULT_FV_ICON;
    return `
      <div class="fv-arch__info" id="fv-panel-${index}">
        <div class="fv-content">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
            <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,92,0,.12);border:1px solid rgba(255,92,0,.25);display:flex;align-items:center;justify-content:center;line-height:0;flex-shrink:0;">${fvIcon}</div>
            <div class="section-tag" style="margin-bottom:0;">${p.tag}</div>
          </div>
          <h2 class="fv-header">${p.title}</h2>
          <p class="fv-desc">${p.desc}</p>
          <div style="display:flex;align-items:center;gap:0;flex-wrap:wrap;">
            <button class="fv-detail-btn" onclick="openFvDetail(${index})">Full Details ↗</button>
          </div>
        </div>
      </div>`;
  }

  function buildFvImg(p, index, total) {
    return `<div class="fv-img-wrapper" data-fv-index="${total - index}">
      <img src="${p.img}" alt="${p.title}" loading="lazy" />
    </div>`;
  }

  function buildFvPagePanel(p, index) {
    const fvIcon = FV_ICONS[index] || DEFAULT_FV_ICON;
    return `
      <div class="fv-arch__info" id="fv-page-panel-${index}">
        <div class="fv-content">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
            <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,92,0,.12);border:1px solid rgba(255,92,0,.25);display:flex;align-items:center;justify-content:center;line-height:0;flex-shrink:0;">${fvIcon}</div>
            <div class="section-tag" style="margin-bottom:0;">${p.tag}</div>
          </div>
          <h2 class="fv-header">${p.title}</h2>
          <p class="fv-desc">${p.desc}</p>
          <div style="display:flex;align-items:center;gap:0;flex-wrap:wrap;">
            <button class="fv-detail-btn" onclick="openFvDetail(${index})">Full Details ↗</button>
          </div>
        </div>
      </div>`;
  }

  function buildFvPageImg(p, index, total) {
    return `<div class="fv-img-wrapper fv-img-wrapper--page" data-fv-index="${total - index}">
      <img src="${p.img}" alt="${p.title}" loading="lazy" />
    </div>`;
  }

  /* Home: first 4 panels */
  const homePanels = fv.panels.slice(0, 4);
  setEl('home-fv-left',  homePanels.map((p, i) => buildFvPanel(p, i, 'future')).join(''));
  setEl('home-fv-right', homePanels.map((p, i) => buildFvImg(p, i, homePanels.length)).join(''));

  /* Future page: all 10 panels */
  const allPanels = fv.panels;
  setEl('page-fv-left',  allPanels.map((p, i) => buildFvPagePanel(p, i)).join(''));
  setEl('page-fv-right', allPanels.map((p, i) => buildFvPageImg(p, i, allPanels.length)).join(''));

  /* ── JOURNAL ── */
  const jnl = D.journal;
  const BLOG_THUMB = {
    'blog-google-ai-seo':      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=80&q=80',
    'blog-meta-roas':          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=80&q=80',
    'blog-brand-trust':        'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=80&q=80',
    'blog-reels-algorithm':    'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=80&q=80',
    'blog-website-conversion': 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=80&q=80',
    'blog-ai-content':         'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=80&q=80',
    'blog-local-seo':          'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=80&q=80',
    'blog-ecom-launch':        'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=80&q=80',
    'blog-influencer-roi':     'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=80&q=80',
    'blog-whatsapp-marketing': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=80&q=80',
  };
  const CAT_ICON = {
    'SEO': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    'Performance': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>`,
    'Branding': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="#FF5C00"/><circle cx="17.5" cy="10.5" r=".5" fill="#FF5C00"/><circle cx="8.5" cy="7.5" r=".5" fill="#FF5C00"/><circle cx="6.5" cy="12.5" r=".5" fill="#FF5C00"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"/></svg>`,
    'Social Media': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    'Web Dev': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    'Content': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`,
    'E-Commerce': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
    'Influencer': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    'Strategy': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z"/></svg>`
  };
  const DEFAULT_CAT_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
  const buildBlogItem = p => {
    const thumb = p.thumb || BLOG_THUMB[p.id] || '';
    const icon  = CAT_ICON[p.cat] || DEFAULT_CAT_ICON;
    const thumbHtml = thumb
      ? `<div style="flex-shrink:0;width:64px;height:64px;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.08);position:relative;">` +
        `<img src="${thumb}" alt="${p.title}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">` +
        `<div style="position:absolute;bottom:4px;right:4px;width:20px;height:20px;border-radius:50%;background:rgba(8,8,8,.75);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;line-height:0;" title="${p.cat}">${icon}</div>` +
        `</div>`
      : `<div style="flex-shrink:0;width:64px;height:64px;border-radius:10px;background:rgba(255,92,0,.1);border:1px solid rgba(255,92,0,.2);display:flex;align-items:center;justify-content:center;line-height:0;" title="${p.cat}">${icon}</div>`;
    return `<div class="blog-item" style="display:flex;gap:16px;align-items:flex-start;">` +
      thumbHtml +
      `<div class="blog-info" style="flex:1;min-width:0;"><div class="bt">${p.title}</div><div class="bm"><span>${p.cat}</span>· ${p.time} · ${p.date}</div>` +
      `<div style="margin-top:8px;"><a href="#" onclick="openBlogArticle('${p.id}');return false;" style="display:inline-flex;align-items:center;gap:6px;font-family:var(--font-heading);font-size:11px;font-weight:700;color:var(--orange);letter-spacing:.06em;text-transform:uppercase;text-decoration:none;transition:gap .25s;" onmouseover="this.style.gap='12px'" onmouseout="this.style.gap='6px'">Read Full Article →</a></div>` +
      `</div></div>`;
  };
  const homePostsHTML = jnl.posts.slice(0, 5).map(buildBlogItem).join('');
  const allPostsHTML  = jnl.posts.map(buildBlogItem).join('');

  setEl('home-journal-tag', jnl.tag);
  setEl('home-journal-title', `${jnl.titleMain}<span id="home-journal-span">${jnl.titleSpan}</span>`);
  setEl('home-journal-list', homePostsHTML);

  setEl('page-journal-tag', jnl.tag);
  setEl('page-journal-title', `${jnl.titleMain}<span id="page-journal-span">${jnl.titleSpan}</span>`);
  setEl('page-journal-list', allPostsHTML);

  /* ── HERO SCHEMA HYDRATION ── */
  if (D.hero) {
    const h = D.hero;
    const heroEyebrow = document.querySelector('.hero-eyebrow');
    if (heroEyebrow && h.eyebrow) heroEyebrow.textContent = h.eyebrow;
    const heroH1 = document.querySelector('.hero-h1');
    if (heroH1) {
      heroH1.innerHTML = `
        <span class="line">${h.headline1 || "WE DON'T JUST"}</span>
        <span class="line">${h.headlineHighlight || "MARKET."}</span>
        <span class="line"><span class="or">${h.headline3 || "WE DOMINATE."}</span></span>
      `;
    }
    const heroSub = document.querySelector('.hero-sub');
    if (heroSub && h.subheadline) heroSub.textContent = h.subheadline;
  }

  /* ── ABOUT SCHEMA HYDRATION ── */
  if (D.about) {
    const ab = D.about;
    const abHeading = document.querySelector('.about-heading, #about h2');
    if (abHeading && (ab.headingPrefix || ab.headingHighlight)) {
      abHeading.innerHTML = `${ab.headingPrefix || ''}<span class="or">${ab.headingHighlight || ''}</span>${ab.headingSuffix || ''}`;
    }
    const abBody = document.querySelector('.about-desc, .about-body');
    if (abBody && ab.body) abBody.textContent = ab.body;
    const abImg = document.querySelector('.about-img img');
    if (abImg && ab.imgSrc) abImg.src = ab.imgSrc;
  }

  /* ── SERVICES SCHEMA HYDRATION ── */
  if (D.services) {
    const sv = D.services;
    const svTag = document.querySelector('#services .section-tag, .svc-tag');
    if (svTag && sv.eyebrow) svTag.textContent = sv.eyebrow;
    const svTitle = document.querySelector('#services h2, .svc-title');
    if (svTitle && sv.titleMain) {
      svTitle.innerHTML = `${sv.titleMain} <span class="or">${sv.titleSpan || ''}</span>`;
    }
  }

  /* ── TSM SCHEMA HYDRATION ── */
  if (D.tsm) {
    const tsm = D.tsm;
    const tsmTag = document.querySelector('#tsmCaption .section-tag, .tsm-tag');
    if (tsmTag && tsm.tag) tsmTag.textContent = tsm.tag;
    const tsmTitle = document.querySelector('#tsmCaption h2, .tsm-title');
    if (tsmTitle && tsm.title) tsmTitle.textContent = tsm.title;
    const tsmDesc = document.querySelector('#tsmCaption p, .tsm-desc');
    if (tsmDesc && tsm.desc) tsmDesc.textContent = tsm.desc;
  }

  /* ── CONTACT SCHEMA HYDRATION ── */
  if (D.contact) {
    const ct = D.contact;
    const ctTag = document.querySelector('#contact .section-tag, .contact-tag');
    if (ctTag && ct.eyebrow) ctTag.textContent = ct.eyebrow;
    const ctTitle = document.querySelector('#contact h2, .contact-title');
    if (ctTitle && ct.title) ctTitle.textContent = ct.title;
    const ctTagline = document.querySelector('#contact p, .contact-sub');
    if (ctTagline && ct.tagline) ctTagline.textContent = ct.tagline;
  }
}

function setEl(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
function setAttr(id, attr, val) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(attr, val);
}

/* ═══════════════════════════════════════════════════
   SONIC MEDIA — SUPABASE LIVE CONTENT SYNC
   Syncs live edits from Supabase for all Schemas: Portfolio, Case Studies, Journal, Hero, About, etc.
   Fallback to instant embedded PAGE_DATA if offline.
═══════════════════════════════════════════════════ */
async function syncSonicMediaSupabase() {
  const SUPABASE_URL = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.URL) || window.SUPABASE_URL || '';
  const SUPABASE_ANON = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.ANON_KEY) || window.SUPABASE_ANON || '';
  const headers = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON };

  const CACHE_VERSION = 'tsm_v2';
  const CACHE_KEY = 'tsm_supabase_cache';

  // ── Helper Data Transformers ──
  // Drafts/unpublished items must NEVER appear on the public site unless explicitly in ?preview=true or Live CMS mode
  const isPreviewMode = window.location.search.includes('preview=true');
  const isCmsActive = window.sessionStorage?.getItem('sonic_cms_active') === 'true';

  function isVisibleItem(item) {
    if (isPreviewMode || isCmsActive) return true;
    return !item.status || item.status === 'published';
  }

  // If preview mode is requested, show subtle preview indicator
  if (isPreviewMode && typeof document !== 'undefined' && !document.getElementById('sonicPreviewGridBanner')) {
    const b = document.createElement('div');
    b.id = 'sonicPreviewGridBanner';
    b.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:rgba(20,20,20,0.94);backdrop-filter:blur(10px);border:1px solid rgba(245,158,11,0.5);color:#F5F0EB;font-family:sans-serif;font-size:12px;font-weight:600;padding:10px 18px;border-radius:30px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 30px rgba(0,0,0,0.6);';
    b.innerHTML = '<span style="color:#fbbf24;">👁️ Admin Preview Mode: Draft items visible</span><a href="' + window.location.pathname + '" style="color:#FF5C00;text-decoration:underline;margin-left:6px;font-size:11px;">Exit Preview</a>';
    document.body.appendChild(b);
  }

  function applyPortfolioData(portfolioData) {
    if (!Array.isArray(portfolioData) || portfolioData.length === 0) return false;
    const filtered = portfolioData.filter(isVisibleItem);
    PAGE_DATA.portfolio.works = filtered.map(item => {
      if (item.details && typeof item.details === 'object' && Object.keys(item.details).length > 0) {
        workDetails[item.id] = Object.assign({}, workDetails[item.id] || {}, item.details);
      } else if (!workDetails[item.id]) {
        workDetails[item.id] = {
          title: item.name,
          subtitle: item.cat,
          category: item.cat,
          type: 'Client Project',
          status: item.metric_val || 'Completed',
          location: 'India',
          industry: item.cat,
          year: '2026',
          metric: (item.metric_val || '') + ' ' + (item.metric_lbl || ''),
          about: item.name,
          challenge: 'Delivering modern, high-impact digital solutions tailored to client objectives.',
          solution: 'Tailored strategy, end-to-end design, and flawless execution by The Sonic Media.',
          tags: Array.isArray(item.tags) ? item.tags : [item.cat],
          deliverables: ['Strategy & Architecture', 'Execution & Delivery'],
          images: [{ url: item.img, title: item.name, desc: item.name }]
        };
      }
      return {
        id: item.id,
        num: item.num,
        cat: item.cat,
        name: item.name,
        tags: Array.isArray(item.tags) ? item.tags : [],
        img: item.img,
        metricVal: item.metric_val || '',
        metricLbl: item.metric_lbl || ''
      };
    });
    return true;
  }

  function applyCaseData(caseData) {
    if (!Array.isArray(caseData) || caseData.length === 0) return false;
    const filtered = caseData.filter(isVisibleItem);
    PAGE_DATA.casestudies.items = filtered.map(item => {
      if (item.details && typeof item.details === 'object' && Object.keys(item.details).length > 0) {
        caseStudies[item.id] = Object.assign({}, caseStudies[item.id] || {}, item.details);
      } else {
        caseStudies[item.id] = Object.assign({}, caseStudies[item.id] || {}, {
          title: item.title,
          subtitle: item.excerpt,
          category: item.cat_label || item.cat,
          date: item.date,
          images: [{ url: item.img, caption: item.title }],
          body: item.content || item.body || item.excerpt
        });
      }
      return {
        id: item.id,
        img: item.img,
        cat: item.cat,
        catLabel: item.cat_label,
        date: item.date,
        title: item.title,
        excerpt: item.excerpt
      };
    });
    return true;
  }

  function applyJournalData(journalData) {
    if (!Array.isArray(journalData) || journalData.length === 0) return false;
    const filtered = journalData.filter(isVisibleItem);
    PAGE_DATA.journal.posts = filtered.map(item => {
      if (item.details && typeof item.details === 'object' && Object.keys(item.details).length > 0) {
        blogArticles[item.id] = Object.assign({}, blogArticles[item.id] || {}, item.details);
      } else {
        blogArticles[item.id] = Object.assign({}, blogArticles[item.id] || {}, {
          title: item.title,
          subtitle: item.title,
          category: item.cat,
          readTime: item.read_time,
          date: item.date,
          img: item.thumb_url,
          body: item.content ? `<p>${item.content.replace(/\n/g, '</p><p>')}</p>` : `<p>${item.title}</p>`
        });
      }
      return {
        id: item.id,
        num: item.num,
        title: item.title,
        cat: item.cat,
        time: item.read_time,
        date: item.date,
        thumb: item.thumb_url
      };
    });
    return true;
  }

  function applyContentData(siteContentData) {
    if (!Array.isArray(siteContentData) || siteContentData.length === 0) return false;
    siteContentData.forEach(item => {
      if (item.key && item.data) {
        if (PAGE_DATA[item.key]) {
          Object.assign(PAGE_DATA[item.key], item.data);
        } else {
          PAGE_DATA[item.key] = item.data;
        }
      }
    });
    return true;
  }

  // ── Step 1: Instant Stale-While-Revalidate Cache Hydration (0ms Load Time) ──
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      const isFresh = cached && cached.version === CACHE_VERSION && (Date.now() - (cached.ts || 0) < 24 * 60 * 60 * 1000);
      if (isFresh) {
        if (cached.portfolio && Array.isArray(cached.portfolio)) applyPortfolioData(cached.portfolio);
        if (cached.cases && Array.isArray(cached.cases)) applyCaseData(cached.cases);
        if (cached.journal && Array.isArray(cached.journal)) applyJournalData(cached.journal);
        if (cached.content && Array.isArray(cached.content)) applyContentData(cached.content);
        renderPageData();
      }
    }
  } catch (e) {
    console.debug('Cache hydration notice:', e);
  }

  // ── Step 2: Resilient Fail-Safe Live Fetch from Supabase (Per-Page & Targeted Columns) ──
  try {
    const fetchSafe = async (url, { timeout = 8000, retries = 1 } = {}) => {
      const separator = url.includes('?') ? '&' : '?';
      const noCacheUrl = `${url}${separator}_t=${Date.now()}`;
      for (let attempt = 0; attempt <= retries; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeout);
        try {
          const res = await fetch(noCacheUrl, { 
            headers: {
              ...headers,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }, 
            cache: 'no-cache',
            signal: ctrl.signal 
          });
          if (res.ok) return await res.json();
          if (res.status < 500 && res.status !== 429) return null;
        } catch (_) {
          // Retry on network timeout or transient error
        } finally {
          clearTimeout(timer);
        }
      }
      return null;
    };

    const updateCacheKey = (key, data) => {
      try {
        let cur = {};
        try { cur = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (_) {}
        cur.version = CACHE_VERSION;
        cur.ts = Date.now();
        cur[key] = data;
        localStorage.setItem(CACHE_KEY, JSON.stringify(cur));
      } catch (_) {}
    };

    // Determine current page context so we only fetch what the page displays
    const path = window.location.pathname.toLowerCase();
    const isHome = path === '/' || path === '' || path.endsWith('/index.html') || path.endsWith('/index');
    const isPortfolio = path.includes('portfolio') || path.includes('studio');
    const isCases = path.includes('casestudies') || path.includes('case-studies');
    const isJournal = path.includes('journal');

    const fetches = [];

    // 1. Portfolio list: only request card columns (cuts payload by 90%)
    if (isHome || isPortfolio) {
      fetches.push(
        fetchSafe(`${SUPABASE_URL}/rest/v1/portfolio_items?select=id,num,cat,name,tags,img,metric_val,metric_lbl,display_order,status&order=display_order.asc`).then(data => {
          if (data && applyPortfolioData(data)) {
            updateCacheKey('portfolio', data);
            renderPageData();
            if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
          }
        })
      );
    }

    // 2. Case studies list: only request card columns
    if (isHome || isCases) {
      fetches.push(
        fetchSafe(`${SUPABASE_URL}/rest/v1/case_studies?select=id,img,cat,cat_label,date,title,excerpt,tags,display_order,status&order=display_order.asc`).then(data => {
          if (data && applyCaseData(data)) {
            updateCacheKey('cases', data);
            renderPageData();
          }
        })
      );
    }

    // 3. Journal list: only request card columns (cuts from ~69KB to ~2KB)
    if (isHome || isJournal) {
      fetches.push(
        fetchSafe(`${SUPABASE_URL}/rest/v1/journal_posts?select=id,num,title,cat,read_time,date,thumb_url,tags,display_order,status&order=display_order.asc`).then(data => {
          if (data && applyJournalData(data)) {
            updateCacheKey('journal', data);
            renderPageData();
          }
        })
      );
    }

    // 4. Site Content (headers, eyebrows, taglines)
    fetches.push(
      fetchSafe(`${SUPABASE_URL}/rest/v1/site_content?select=*`).then(data => {
        if (data && applyContentData(data)) {
          updateCacheKey('content', data);
          renderPageData();
        }
      })
    );

    await Promise.allSettled(fetches);
  } catch (err) {
    console.debug('Sonic Media offline fallback:', err);
  }
}

// ── Real-Time Multi-Tab Sync with Admin Panel ──
// Immediately re-syncs public website when admin publishes, unpublishes, or modifies content in another tab
if (typeof window !== 'undefined') {
  window.addEventListener('storage', function (e) {
    if (e.key === 'tsm_cache_invalidated_at' || e.key === 'tsm_supabase_cache') {
      try { localStorage.removeItem('tsm_supabase_cache'); } catch (_) {}
      syncSonicMediaSupabase();
    }
  });

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('sonic_media_cms');
      bc.onmessage = function (msg) {
        if (msg && msg.data && msg.data.type === 'cache_invalidated') {
          try { localStorage.removeItem('tsm_supabase_cache'); } catch (_) {}
          syncSonicMediaSupabase();
        }
      };
    } catch (_) {}
  }
}

// Apply stored visual live customizations if present
function applySonicLiveCustomEdits() {
  try {
    const raw = localStorage.getItem('tsm_live_custom_edits');
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

// Automatically load Sonic Live CMS engine for admins or on edit request / Ctrl+Shift+E shortcut
(function loadSonicLiveCms() {
  function injectCmsScript(autoOpen = false) {
    if (document.getElementById('sonic-cms-script')) {
      if (autoOpen && window._sonicCmsToggleMode && !document.body.classList.contains('sonic-cms-active')) {
        window._sonicCmsToggleMode();
      }
      return;
    }
    const script = document.createElement('script');
    script.id = 'sonic-cms-script';
    const isServices = window.location.pathname.includes('/services/');
    script.src = (isServices ? '../' : '') + 'assets/js/sonic-live-cms.js';
    script.defer = true;
    if (autoOpen) {
      script.onload = () => {
        if (window._sonicCmsToggleMode && !document.body.classList.contains('sonic-cms-active')) {
          window._sonicCmsToggleMode();
        }
      };
    }
    document.body.appendChild(script);
  }

  const hasAdminSession = !!(window.sessionStorage?.getItem('sonicmedia_admin_session') || window.localStorage?.getItem('sonicmedia_admin_session'));
  const wantsEdit = window.location.search.includes('live_edit') || window.location.search.includes('edit=') || window.location.search.includes('cms=');
  const isCmsActive = window.sessionStorage?.getItem('sonic_cms_active') === 'true';

  if (hasAdminSession || wantsEdit || isCmsActive) {
    injectCmsScript();
  }

  // Global activation shortcut: Ctrl+Shift+E or Cmd+Shift+E
  window.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
      e.preventDefault();
      try {
        window.sessionStorage.setItem('sonic_cms_active', 'true');
        window.sessionStorage.removeItem('sonic_cms_disabled');
      } catch (_) {}
      injectCmsScript(true);
    }
  });
})();

// ── Resilient Application Bootstrapper ──
// Runs immediately if DOM is already ready, or listens for DOMContentLoaded
function bootSonicApp() {
  renderPageData();
  applySonicLiveCustomEdits();
  syncSonicMediaSupabase();
  if (typeof buildFutureVisionSplit === 'function' && document.getElementById('futureSplitSection')) {
    buildFutureVisionSplit({
      sectionId:    'futureSplitSection',
      archSelector: '#futureSplitSection .fv-arch',
      rightSelector:'#home-fv-right',
      imgSelector:  '#futureSplitSection .fv-img-wrapper'
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootSonicApp);
} else {
  bootSonicApp();
}
(function initCtaZoom() {
  function tryZoomInit() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      setTimeout(tryZoomInit, 100);
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    const zoomContainer = document.querySelector('.cta-zoom-container');
    const zoomWrapper   = document.querySelector('.cta-zoom-wrapper');
    if (!zoomContainer || !zoomWrapper) return;

    gsap.timeline({
      scrollTrigger: {
        trigger: zoomWrapper,
        start: 'top top',
        end: 'bottom bottom',
        pin: zoomContainer,
        scrub: 1.4,
        anticipatePin: 1,
      }
    })
    .to('.czoom-item[data-layer="3"]', { opacity: 1, z: 850,  ease: 'power1.inOut' }, 0)
    .to('.czoom-item[data-layer="2"]', { opacity: 1, z: 640,  ease: 'power1.inOut' }, 0)
    .to('.czoom-item[data-layer="1"]', { opacity: 1, z: 420,  ease: 'power1.inOut' }, 0)
    .to('.cta-zoom-heading',           { opacity: 0.92, z: 60, ease: 'power1.inOut' }, 0);
  }
  tryZoomInit();
})();

/* ═══════════════════════════════════════════════════
   HOME COVERFLOW — GSAP ScrollTrigger
═══════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════
   SHARED COVERFLOW FACTORY
   Builds any hcf-style scroll-coverflow given config
═══════════════════════════════════════════════════ */
const SVC_CARDS_DATA = [
  { img: 'https://res.cloudinary.com/dq2nrpky0/image/upload/v1779741219/WD_jx3eks.jpg', cat: '01 · Web Dev',        title: 'Website Development',          page: 'svc-web'     },
  { img: 'https://res.cloudinary.com/dq2nrpky0/image/upload/v1779741213/MAD_azrevs.jpg', cat: '02 · Mobile',      title: 'Mobile App Development',       page: 'svc-app'     },
  { img: 'https://res.cloudinary.com/dq2nrpky0/image/upload/v1779741220/SEO_ttjawk.jpg', cat: '03 · Search',      title: 'Search Engine Optimization',   page: 'svc-seo'     },
  { img: 'https://res.cloudinary.com/dq2nrpky0/image/upload/v1779741952/SMM_ts1one.jpg', cat: '04 · Social',      title: 'Social Media Management',      page: 'svc-smm'     },
  { img: 'https://res.cloudinary.com/dq2nrpky0/image/upload/v1779741212/PM_aviamw.jpg', cat: '05 · Ads',            title: 'Performance Marketing',        page: 'svc-perf'    },
  { img: 'https://res.cloudinary.com/dq2nrpky0/image/upload/v1779741221/IM_pev5ba.jpg', cat: '06 · Influencer',     title: 'Influencer Marketing',         page: 'svc-inf'     },
  { img: 'https://res.cloudinary.com/dq2nrpky0/image/upload/v1779741212/EM_ptuofv.jpg', cat: '07 · E-Commerce',     title: 'E-Commerce Marketing',         page: 'svc-ecom'    },
  { img: 'https://res.cloudinary.com/dq2nrpky0/image/upload/v1779741212/PV_twlw1w.jpg', cat: '08 · Content',     title: 'Content Production',           page: 'svc-content' },
  { img: 'https://res.cloudinary.com/dq2nrpky0/image/upload/v1779741210/BD_djg0wp.jpg', cat: '09 · Branding',       title: 'Branding & Advertising Solutions',   page: 'svc-brand'   },
  { img: 'https://res.cloudinary.com/dq2nrpky0/image/upload/v1779741213/AI_d2vdpn.jpg', cat: '10 · AI',          title: 'AI Doodling / Editing',        page: 'svc-ai'      },
];


const FUTURE_CARDS_DATA = [
  { img: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80', cat: 'In Development', title: 'AI-Powered Marketing',        page: null },
  { img: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&q=80', cat: 'Coming Soon',    title: 'Web3 Brand Experiences',      page: null },
  { img: 'https://images.unsplash.com/photo-1617802690992-15d93263d3a9?w=600&q=80', cat: 'In Development', title: 'AR/VR Brand Worlds',          page: null },
  { img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80', cat: '2026 Launch',       title: 'Sonic Intelligence Platform', page: null },
  { img: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=600&q=80', cat: '2026–2026',      title: 'Global Expansion',            page: null },
  { img: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&q=80', cat: '2026 Launch',    title: 'Creator Economy Hub',         page: null },
  { img: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80', cat: 'In Development', title: 'AI-Powered Marketing',        page: null },
  { img: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&q=80', cat: 'Coming Soon',    title: 'Web3 Brand Experiences',      page: null },
  { img: 'https://images.unsplash.com/photo-1617802690992-15d93263d3a9?w=600&q=80', cat: 'In Development', title: 'AR/VR Brand Worlds',          page: null },
  { img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80', cat: '2026 Launch',       title: 'Sonic Intelligence Platform', page: null },
];

function buildCoverflowInstance({ listId, galleryId, wrapperId, cardsData, showHint }) {
  const list = document.getElementById(listId);
  const gallery = document.getElementById(galleryId);
  if (!list || !gallery) return;

  const totalCards = cardsData.length;
  for (let c = 0; c < totalCards; c++) {
    const d = cardsData[c];
    const faceHTML = (reflection) => `
      <div class="hcf-card-face">
        <img src="${d.img}" alt="${d.title}" loading="lazy">
        <div class="hcf-card-info">
          <span class="hcf-card-cat">${d.cat}</span>
          <h3 class="hcf-card-title">${d.title}</h3>
        </div>
        <div class="hcf-card-overlay${reflection ? ' hcf-card-overlay--refl' : ''}"></div>
      </div>`;

    const li = document.createElement('li');
    li.className = 'hcf-card';
    if (d.page) li.style.cursor = 'pointer';
    if (d.page) li.addEventListener('click', () => navigate(d.page));
    li.innerHTML = `
      <div class="hcf-card-inner">${faceHTML(false)}</div>
      <div class="hcf-card-reflection" aria-hidden="true">${faceHTML(true)}</div>`;
    list.appendChild(li);
  }

  let hint = null;
  if (showHint) {
    hint = document.createElement('div');
    hint.className = 'hcf-scroll-hint';
    hint.innerHTML = '<span>Scroll</span><div class="hcf-scroll-hint-arrow"></div>';
    gallery.appendChild(hint);
  }

  function tryInit() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      setTimeout(tryInit, 100);
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    const cards     = Array.from(list.querySelectorAll('.hcf-card'));
    const N         = cards.length;
    const SPACING   = 1 / N;

    const OVERLAP   = Math.ceil(1 / SPACING);
    const START_T   = N * SPACING + 0.5;
    const LOOP_TIME = (N + OVERLAP) * SPACING + 1;

    const RAW = gsap.timeline({ paused: true });
    const LOOP = gsap.timeline({
      paused: true,
      repeat: -1,
      onRepeat() { this._time === this._dur && (this._tTime += this._dur - 0.01); }
    });

    gsap.set(cards, { xPercent: 5000, opacity: 0, scale: 0 });

    const L = N + OVERLAP * 2;
    for (let i = 0; i < L; i++) {
      const card = cards[i % N];
      const t    = i * SPACING;
      RAW
        .fromTo(card, { opacity: 0 }, { opacity: 1, delay: 0.25, duration: 0.25, yoyo: true, repeat: 1, ease: 'none', immediateRender: false }, t)
        .fromTo(card, { scale: 0   }, { scale: 1,   zIndex: 100, duration: 0.5,  yoyo: true, repeat: 1, ease: 'none', immediateRender: false }, t)
        .fromTo(card, { xPercent: 400 }, { xPercent: -400, duration: 1, ease: 'none', immediateRender: false }, t);
      if (i <= N) LOOP.add('label' + i, t);
    }

    RAW.time(START_T);
    LOOP
      .to(RAW, { time: LOOP_TIME, duration: LOOP_TIME - START_T, ease: 'none' })
      .fromTo(RAW, { time: OVERLAP * SPACING + 1 }, { time: START_T, duration: START_T - (OVERLAP * SPACING + 1), immediateRender: false, ease: 'none' });

    // Build the exact LOOP.totalTime for each card's peak (centre of its RAW window)
    // Each card peaks at RAW time = i*SPACING + 0.5 (centre of its 1-unit animation).
    // We map those RAW times → LOOP totalTime values, then snap to that array.
    const loopDur = LOOP.duration();
    const seg1Dur = LOOP_TIME - START_T;          // duration of first LOOP segment
    const seg2Dur = START_T - (OVERLAP * SPACING + 1); // duration of second LOOP segment
    const totalLoopDur = seg1Dur + seg2Dur;

    function rawToLoopTotal(rawT) {
      // Segment 1: RAW goes from START_T → LOOP_TIME
      if (rawT >= START_T && rawT <= LOOP_TIME) {
        return (rawT - START_T) / (LOOP_TIME - START_T) * seg1Dur;
      }
      // Segment 2: RAW goes from OVERLAP*SPACING+1 → START_T
      const seg2Start = OVERLAP * SPACING + 1;
      if (rawT >= seg2Start && rawT <= START_T) {
        return seg1Dur + (rawT - seg2Start) / (START_T - seg2Start) * seg2Dur;
      }
      return 0;
    }

    // Collect snap points: one per card, at the RAW midpoint of each card's window
    const snapTimes = [];
    for (let i = OVERLAP; i < OVERLAP + N; i++) {
      const peakRaw = i * SPACING + 0.5;
      snapTimes.push(rawToLoopTotal(peakRaw));
    }
    snapTimes.sort((a, b) => a - b);

    const snapToLoopTime = gsap.utils.snap(snapTimes);
    const snapToProgress = val => snapToLoopTime(val * totalLoopDur) / totalLoopDur;

    const scrub = gsap.to(LOOP, { totalTime: 0, duration: 0.4, ease: 'power2.out', paused: true });

    ScrollTrigger.create({
      trigger: '#' + wrapperId,
      start: 'top top',
      end: 'bottom bottom',
      pin: '#' + galleryId,
      snap: {
        snapTo: snapToProgress,
        duration: { min: 0.3, max: 0.5 },
        delay: 0.15,
        ease: 'power1.inOut',
      },
      onUpdate(self) {
        scrub.vars.totalTime = snapToLoopTime(self.progress * totalLoopDur);
        scrub.invalidate().restart();
      }
    });

    if (hint) {
      let hinted = false;
      ScrollTrigger.create({
        trigger: '#' + wrapperId,
        start: 'top+=10 top',
        onEnter() {
          if (!hinted) {
            gsap.to(hint, { opacity: 0, duration: 0.5 });
            hinted = true;
          }
        }
      });
    }
  }

  tryInit();
}

// ── Home Services coverflow (below bento) ──
buildCoverflowInstance({
  listId:    'homeSvcList',
  galleryId: 'homeSvcGallery',
  wrapperId: 'homeSvcScrollWrapper',
  cardsData: SVC_CARDS_DATA,
  showHint:  true,
});

// ── Services page coverflow — lazy-init when page becomes visible ──
(function initPageServicesCoverflow() {
  let svcPageInited = false;

  function maybeInitSvc() {
    if (svcPageInited) return;
    const pg = document.getElementById('page-services');
    if (!pg || !pg.classList.contains('active')) return;
    svcPageInited = true;
    buildCoverflowInstance({
      listId:    'pageSvcList',
      galleryId: 'pageSvcGallery',
      wrapperId: 'pageSvcScrollWrapper',
      cardsData: SVC_CARDS_DATA,
      showHint:  true,
    });
    if (typeof ScrollTrigger !== 'undefined') {
      setTimeout(() => ScrollTrigger.refresh(), 100);
    }
  }

  // Hook into navigate
  window._addNavHook(function(page) {
    if (page === 'services') {
      requestAnimationFrame(() => setTimeout(maybeInitSvc, 50));
    }
  });

  document.addEventListener('DOMContentLoaded', () => setTimeout(maybeInitSvc, 200));
})();

/* ═══════════════════════════════════════════════════
   THOUGHT VESSEL — SCROLL REVEAL ANIMATION
═══════════════════════════════════════════════════ */

// Swaps a <video>'s <source> to a device-specific URL (data-mobile-src /
// data-desktop-src) if present, reloading and resuming playback as needed.
function setResponsiveVideoSrc(vid, isMobile) {
  if (!vid) return;
  const source = vid.querySelector('source[data-mobile-src]');
  if (!source) return;

  const target = isMobile
    ? source.dataset.mobileSrc
    : (source.dataset.desktopSrc || source.getAttribute('src'));

  if (!target || source.getAttribute('src') === target) return;

  const wasPlaying = !vid.paused;
  const t = vid.currentTime;
  source.setAttribute('src', target);
  vid.load();
  if (wasPlaying) {
    vid.addEventListener('loadedmetadata', function resume() {
      vid.removeEventListener('loadedmetadata', resume);
      try { vid.currentTime = t; } catch (e) {}
      vid.play().catch(() => {});
    });
  }
}

(function initThoughtVessel() {
  function tryTVInit() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      setTimeout(tryTVInit, 100);
      return;
    }

    const vc         = document.getElementById('tsm-vc');
    const vid        = document.getElementById('tsm-vid');
    const darkOv     = document.getElementById('tsm-dark-overlay');
    const overlay    = document.getElementById('tsmVidOverlay');
    const caption    = document.getElementById('tsmCaption');
    const ovContent  = document.getElementById('tsmOvContent');

    if (!vc || !vid) return;

    const isMobile = window.innerWidth <= 768;
    const initSize = isMobile ? '72vw' : '320px';
    const expandW  = '100%';
    const expandH  = '100%';

    setResponsiveVideoSrc(vid, isMobile);

    gsap.set(vc,        { width: initSize, height: initSize, borderRadius: '16px', borderColor: 'rgba(255,92,0,0.18)' });
    gsap.set(vid,       { scale: 1 });
    gsap.set(darkOv,    { backgroundColor: 'rgba(0,0,0,0)' });
    gsap.set(overlay,   { clipPath: 'inset(100% 0 0 0)' });
    if (caption)   gsap.set(caption,   { transform: 'translateY(30px)' });
    if (ovContent) gsap.set(ovContent, { filter: 'blur(10px)', transform: 'scale(1.1)' });

    vid.play().catch(() => {});


    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#tsmScrollSection',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
        onEnter: () => vid.play()
      }
    });

    tl
      /* 1. Expand box — small square → wide cinematic rectangle */
      .to(vc, {
        width: expandW,
        height: expandH,
        borderRadius: '0px',
        borderColor: 'transparent',
        ease: 'expo.out',
        duration: 0.5
      }, 0)
      /* 2. Subtle scale on the video itself */
      .to(vid, {
        scale: 1.08,
        ease: 'expo.out',
        duration: 0.5
      }, 0)
      /* 3. Dark overlay darkens */
      .to(darkOv, {
        backgroundColor: 'rgba(0,0,0,0.45)',
        ease: 'power3.inOut',
        duration: 0.5
      }, 0)
      /* 4. Reveal the text overlay panel */
      .to(overlay, {
        clipPath: 'inset(0% 0 0 0)',
        ease: 'expo.out',
        duration: 0.3
      }, 0.4)
      /* 5. Caption slides in */
      .to(caption, {
        transform: 'translateY(0)',
        ease: 'expo.out',
        duration: 0.3
      }, 0.45)
      /* 6. Main content unblurs */
      .to(ovContent, {
        filter: 'blur(0px)',
        transform: 'scale(1)',
        ease: 'expo.out',
        duration: 0.4
      }, 0.45);
  }

  tryTVInit();
})();

/* ═══════════════════════════════════════════════════
   THOUGHT VESSEL — ABOUT PAGE VERSION
═══════════════════════════════════════════════════ */
(function initAboutThoughtVessel() {
  function buildAboutTV() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      setTimeout(buildAboutTV, 100);
      return;
    }

    const pg = document.getElementById('page-about');
    if (!pg || !pg.classList.contains('active')) return;

    const vc        = document.getElementById('ab-tsm-vc');
    const vid       = document.getElementById('ab-tsm-vid');
    const darkOv    = document.getElementById('ab-tsm-dark-overlay');
    const overlay   = document.getElementById('abTsmVidOverlay');
    const caption   = document.getElementById('abTsmCaption');
    const ovContent = document.getElementById('abTsmOvContent');

    if (!vc || !vid) return;

    // Kill any stale ScrollTriggers for this section before rebuilding
    ScrollTrigger.getAll().forEach(st => {
      const t = st.trigger || (st.vars && st.vars.trigger);
      if (!t) return;
      const el = typeof t === 'string' ? document.querySelector(t) : t;
      if (el && el.id === 'abTsmScrollSection') st.kill();
    });

    // Set initial state — small square
    const _abIsMob = window.innerWidth <= 768;
    const _abInitSize = _abIsMob ? '72vw' : '320px';

    setResponsiveVideoSrc(vid, _abIsMob);

    gsap.set(vc,        { width: _abInitSize, height: _abInitSize, borderRadius: '16px', borderColor: 'rgba(255,92,0,0.18)' });
    gsap.set(vid,       { scale: 1 });
    gsap.set(darkOv,    { backgroundColor: 'rgba(0,0,0,0)' });
    gsap.set(overlay,   { clipPath: 'inset(100% 0 0 0)' });
    if (caption)   gsap.set(caption,   { transform: 'translateY(30px)' });
    if (ovContent) gsap.set(ovContent, { filter: 'blur(10px)', transform: 'scale(1.1)' });

    vid.play().catch(() => {});

    gsap.timeline({
      scrollTrigger: {
        trigger: '#abTsmScrollSection',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
        onEnter: () => vid.play()
      }
    })
    .to(vc, {
      width: '100%',
      height: '100%',
      borderRadius: '0px',
      borderColor: 'transparent',
      ease: 'expo.out',
      duration: 0.5
    }, 0)
    .to(vid, {
      scale: 1.08,
      ease: 'expo.out',
      duration: 0.5
    }, 0)
    .to(darkOv, {
      backgroundColor: 'rgba(0,0,0,0.45)',
      ease: 'power3.inOut',
      duration: 0.5
    }, 0)
    .to(overlay, {
      clipPath: 'inset(0% 0 0 0)',
      ease: 'expo.out',
      duration: 0.3
    }, 0.4)
    .to(caption, {
      transform: 'translateY(0)',
      ease: 'expo.out',
      duration: 0.3
    }, 0.45)
    .to(ovContent, {
      filter: 'blur(0px)',
      transform: 'scale(1)',
      ease: 'expo.out',
      duration: 0.4
    }, 0.45);

    ScrollTrigger.refresh();
  }

  // Hook into navigate
  window._addNavHook(function(page) {
    if (page === 'about') {
      requestAnimationFrame(() => setTimeout(buildAboutTV, 80));
    }
  });

  // In case the page loads directly on about
  document.addEventListener('DOMContentLoaded', () => setTimeout(buildAboutTV, 200));
})();

/* ═══════════════════════════════════════════════════
   FUTURE VISION — PINNED SPLIT-SCREEN MASK REVEAL
   Shared builder used by both home section and the
   standalone Future & Vision page.
═══════════════════════════════════════════════════ */
function buildFutureVisionSplit({ sectionId, archSelector, rightSelector, imgSelector }) {
  function tryFVInit() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      setTimeout(tryFVInit, 100);
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    const fvImgWrappers = gsap.utils.toArray(imgSelector);
    if (!fvImgWrappers.length) return;

    // Kill any pre-existing ScrollTriggers scoped to this section's images before rebuilding
    ScrollTrigger.getAll().forEach(st => {
      const t = st.trigger || (st.vars && st.vars.trigger);
      if (!t) return;
      const el = typeof t === 'string' ? document.querySelector(t) : t;
      if (el && el.closest && el.closest('#' + sectionId)) st.kill();
    });

    const fvBgColors = ['#0f0a00', '#001a2e', '#1a000a', '#1a0800', '#0a001a', '#001a10', '#0f1a00', '#1a0010', '#001010', '#0a0a1a'];

    fvImgWrappers.forEach(el => {
      const order = el.getAttribute('data-fv-index');
      if (order) el.style.zIndex = order;
    });

    const imgs = fvImgWrappers.map(w => w.querySelector('img'));

    ScrollTrigger.matchMedia({
      '(min-width: 769px)': function () {
        const mainTl = gsap.timeline({
          scrollTrigger: {
            trigger: archSelector,
            start: 'top 72px',
            end: 'bottom bottom',
            pin: rightSelector,
            scrub: true,
            anticipatePin: 1
          }
        });

        gsap.set(imgs, { clipPath: 'inset(0)', objectPosition: '0px 0%', willChange: 'clip-path, object-position', backfaceVisibility: 'hidden', transform: 'translateZ(0)' });

        imgs.forEach((_, index) => {
          const currentImg = imgs[index];
          const nextImg    = imgs[index + 1] || null;
          const sectionTl  = gsap.timeline();

          if (nextImg) {
            sectionTl
              .to('#' + sectionId, {
                backgroundColor: fvBgColors[index],
                duration: 1.5,
                ease: 'power2.inOut'
              }, 0)
              .to(currentImg, {
                clipPath: 'inset(0px 0px 100%)',
                objectPosition: '0px 60%',
                duration: 1.5,
                ease: 'none'
              }, 0)
              .to(nextImg, {
                objectPosition: '0px 40%',
                duration: 1.5,
                ease: 'none'
              }, 0);
          }
          mainTl.add(sectionTl);
        });
      },

      '(max-width: 768px)': function () {
        gsap.set(imgs, { objectPosition: '0px 60%' });
        imgs.forEach((image, index) => {
          gsap.timeline({
            scrollTrigger: {
              trigger: image,
              start: 'top-=70% top+=50%',
              end: 'bottom+=200% bottom',
              scrub: true
            }
          })
          .to(image, { objectPosition: '0px 30%', duration: 5, ease: 'none' })
          .to('#' + sectionId, { backgroundColor: fvBgColors[index], duration: 1.5, ease: 'power2.inOut' });
        });
      }
    });
  }
  tryFVInit();
}

/* ═══════════════════════════════════════════════════
   CTA PERSPECTIVE ZOOM — GSAP ScrollTrigger
═══════════════════════════════════════════════════ */

// ── Future & Vision page: same animation after inner hero ──
(function initPageFutureVisionSplit() {
  let pageInited = false;

  function maybeInit() {
    if (!document.getElementById('page-future') ||
        !document.getElementById('page-future').classList.contains('active')) return;
    // Panels must exist (renderPageData already ran at DOMContentLoaded)
    if (!document.querySelector('.fv-img-wrapper--page')) return;

    // Kill any stale ScrollTriggers for the future page before rebuilding
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.getAll().forEach(st => {
        const t = st.trigger || (st.vars && st.vars.trigger);
        if (!t) return;
        const el = typeof t === 'string' ? document.querySelector(t) : t;
        if (el && el.closest && el.closest('#page-future')) st.kill();
      });
    }

    // Reset image clip-path so they are fully visible before animation re-attaches
    document.querySelectorAll('.fv-img-wrapper--page img').forEach(img => {
      img.style.clipPath = '';
    });

    pageInited = true;
    buildFutureVisionSplit({
      sectionId:    'futureSplitSectionPage',
      archSelector: '#fvArchPage',
      rightSelector:'#page-fv-right',
      imgSelector:  '.fv-img-wrapper--page'
    });
    if (typeof ScrollTrigger !== 'undefined') {
      setTimeout(() => ScrollTrigger.refresh(), 100);
    }
  }

  window._addNavHook(function(page) {
    if (page === 'future') {
      // Always reset so images re-initialise each visit
      pageInited = false;
      requestAnimationFrame(() => setTimeout(maybeInit, 50));
    }
  });

  document.addEventListener('DOMContentLoaded', () => setTimeout(maybeInit, 200));
})();

/* ═══════════════════════════════════════════════════
   MOBILE SWIPE CAROUSEL — SERVICES
═══════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════
   MOBILE SWIPE CAROUSEL — SERVICES (shared factory)
   Both the home page and the services page use this
   exact same ring-carousel implementation — just
   pointed at different element IDs — so behavior is
   guaranteed identical, not merely similar.
═══════════════════════════════════════════════════ */
function buildMobSvcCarousel(ids) {
  var track   = document.getElementById(ids.trackId);
  var outer   = document.getElementById(ids.outerId);
  var dotsEl  = document.getElementById(ids.dotsId);
  var prevBtn = ids.prevId ? document.getElementById(ids.prevId) : null;
  var nextBtn = ids.nextId ? document.getElementById(ids.nextId) : null;
  if (!track || !outer || !dotsEl) return null;

  var cards = SVC_CARDS_DATA;
  var n = cards.length;
  if (!n) return null;

  /* Only the n real cards ever exist in the DOM — no clones. Each
     card's screen position is the shortest signed distance (mod n)
     between its own index and a single floating "virtualIndex". That
     distance is inherently circular, so card 10 and card 1 are always
     exactly one spacing apart in both directions — there is no seam,
     no clone, and therefore nothing to silently jump or snap back to. */
  track.innerHTML = cards.map(function(c, i) {
    return '<div class="mob-svc-card" data-idx="' + i + '">' +
      '<div class="mob-svc-card-inner-wrap">' +
        '<div class="mob-svc-card-img"><img src="' + (c.img || 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80') + '" alt="' + c.title + '" loading="lazy"></div>' +
        '<div class="mob-svc-card-grad"></div>' +
        '<div class="mob-svc-card-body">' +
          '<div class="mob-svc-card-title">' + c.title + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  dotsEl.innerHTML = cards.map(function(_, i) {
    return '<div class="mob-svc-dot' + (i===0?' active':'') + '" data-idx="' + i + '"></div>';
  }).join('');

  var cardEls = Array.prototype.slice.call(track.querySelectorAll('.mob-svc-card'));
  var dotEls  = Array.prototype.slice.call(dotsEl.querySelectorAll('.mob-svc-dot'));

  var virtualIndex = 0;     /* continuous "position" — never bounded */
  var cardSpacing  = 0;     /* px between card centers */
  var dragging = false, axisLock = null, startX = 0, startY = 0, startVirtual = 0;
  var rafScheduled = false;

  function measure() {
    var first = cardEls[0];
    cardSpacing = first.offsetWidth;       /* unaffected by the scale() transform */
    outer.style.height = first.offsetHeight + 'px';
  }

  function shortestDelta(i, idxFloat) {
    var d = i - idxFloat;
    d = ((d % n) + n) % n;
    if (d > n / 2) d -= n;
    return d;
  }

  function render() {
    rafScheduled = false;
    cardEls.forEach(function(el, i) {
      var d = shortestDelta(i, virtualIndex);
      var absD = Math.abs(d);
      var scale = Math.max(0.78, 1.05 - absD * 0.20);
      var opacity = Math.max(0.3, 1 - absD * 0.55);
      el.style.transform = 'translate(-50%, -50%) translateX(' + (d * cardSpacing).toFixed(2) + 'px) scale(' + scale.toFixed(3) + ')';
      el.style.opacity = opacity.toFixed(3);
      el.style.zIndex = String(100 - Math.round(absD * 10));
      el.classList.toggle('active', absD < 0.001);
    });
  }

  function scheduleRender() {
    if (!rafScheduled) { rafScheduled = true; requestAnimationFrame(render); }
  }

  function setActiveDot() {
    var real = ((Math.round(virtualIndex) % n) + n) % n;
    dotEls.forEach(function(el, i){ el.classList.toggle('active', i === real); });
  }

  function setTransition(on) {
    cardEls.forEach(function(el) {
      el.style.transition = on ? 'transform 0.45s cubic-bezier(0.22,1,0.36,1), opacity 0.45s' : 'none';
    });
  }

  function animateTo(target) {
    setTransition(true);
    virtualIndex = target;
    scheduleRender();
    setActiveDot();
    setTimeout(function() {
      /* Folding the index by a multiple of n once it's settled is
         mathematically invisible (shortestDelta is unaffected by it)
         — it just keeps the number from growing forever. */
      virtualIndex = ((virtualIndex % n) + n) % n;
      setTransition(false);
    }, 460);
  }

  function goTo(realIdx) {
    var current = Math.round(virtualIndex);
    var currentReal = ((current % n) + n) % n;
    var diff = ((realIdx - currentReal + n / 2) % n + n) % n - n / 2;
    animateTo(current + diff);
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    axisLock = null;
    startX = e.clientX; startY = e.clientY;
    startVirtual = virtualIndex;
    setTransition(false);
    try { outer.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function onPointerMove(e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    if (axisLock === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      axisLock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (axisLock === 'y') return; /* let the page scroll vertically as normal */
    if (axisLock === 'x') e.preventDefault();
    virtualIndex = startVirtual - dx / cardSpacing;
    scheduleRender();
    setActiveDot();
  }
  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    animateTo(axisLock === 'x' ? Math.round(virtualIndex) : Math.round(startVirtual));
    axisLock = null;
  }

  /* Tapping the already-active card navigates to its detail page. */
  track.addEventListener('click', function(e) {
    if (dragging) return;
    var card = e.target.closest('.mob-svc-card');
    if (!card) return;
    var idx = parseInt(card.dataset.idx, 10);
    var real = ((Math.round(virtualIndex) % n) + n) % n;
    if (idx === real && cards[idx] && cards[idx].page) {
      navigate(cards[idx].page);
    } else {
      goTo(idx);
    }
  });

  outer.style.touchAction = 'pan-y';
  outer.addEventListener('pointerdown', onPointerDown);
  outer.addEventListener('pointermove', onPointerMove, { passive: false });
  outer.addEventListener('pointerup', onPointerUp);
  outer.addEventListener('pointercancel', onPointerUp);

  dotsEl.addEventListener('click', function(e){
    var dot = e.target.closest('.mob-svc-dot');
    if (dot) goTo(parseInt(dot.dataset.idx, 10));
  });
  if (prevBtn) prevBtn.addEventListener('click', function(){ animateTo(Math.round(virtualIndex) - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function(){ animateTo(Math.round(virtualIndex) + 1); });

  window.addEventListener('resize', function(){ measure(); scheduleRender(); }, { passive: true });

  requestAnimationFrame(function() { measure(); render(); });
  /* Outer may still be display:none (ancestor toggled by media-query JS)
     on first build — re-measure once layout has settled. */
  setTimeout(function(){ measure(); render(); }, 300);

  return { remeasure: function(){ measure(); scheduleRender(); } };
}

// ── Home page instance ──
(function initMobSvcCarousel() {
  function build() {
    if (typeof SVC_CARDS_DATA === 'undefined') { setTimeout(build, 150); return; }
    buildMobSvcCarousel({
      trackId: 'mobSvcTrack', outerId: 'mobSvcTrackOuter', dotsId: 'mobSvcDots',
      prevId: 'mobSvcPrev', nextId: 'mobSvcNext'
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();

/* ═══════════════════════════════════════════════════
   SERVICES PAGE — MOBILE SWIPE CAROUSEL
   Exactly the same carousel as the home page (same
   buildMobSvcCarousel factory), pointed at the
   services-page-scoped IDs so both can coexist in the
   DOM without colliding.
═══════════════════════════════════════════════════ */
(function initPageMobSvcCarousel() {
  var instance = null;

  function build() {
    if (typeof SVC_CARDS_DATA === 'undefined') { setTimeout(build, 150); return; }
    var track = document.getElementById('pageMobSvcTrack');
    if (!track) return;
    instance = buildMobSvcCarousel({
      trackId: 'pageMobSvcTrack', outerId: 'pageMobSvcTrackOuter', dotsId: 'pageMobSvcDots',
      prevId: 'pageMobSvcPrev', nextId: 'pageMobSvcNext'
    });
  }

  /* Show carousel and hide coverflow when services page activates on mobile */
  function maybeShow() {
    if (window.innerWidth > 768) return;
    var carousel = document.getElementById('pageMobSvcCarousel');
    var coverflow = document.getElementById('pageSvcScrollWrapper');
    if (carousel) carousel.style.display = 'flex';
    if (coverflow) coverflow.style.display = 'none';
    if (!instance) build();
    else instance.remeasure();
  }

  /* Hook into navigate */
  window._addNavHook(function(page) {
    if (page === 'services') {
      requestAnimationFrame(function(){ setTimeout(maybeShow, 60); });
    }
  });

  document.addEventListener('DOMContentLoaded', function(){ setTimeout(maybeShow, 300); });
  window.addEventListener('resize', function(){
    var carousel = document.getElementById('pageMobSvcCarousel');
    var coverflow = document.getElementById('pageSvcScrollWrapper');
    var pg = document.getElementById('page-services');
    if (!pg || !pg.classList.contains('active')) return;
    if (window.innerWidth <= 768) {
      if (carousel) carousel.style.display = 'flex';
      if (coverflow) coverflow.style.display = 'none';
      if (!instance) build();
    } else {
      if (carousel) carousel.style.display = 'none';
      if (coverflow) coverflow.style.display = '';
    }
  });
})();

/* ═══════════════════════════════════════════════════
   MOBILE FUTURE VISION — Card Stack Renderer
═══════════════════════════════════════════════════ */
(function initMobFvCards() {
  function buildCardsHTML(panels) {
    return panels.map(function(p, i) {
      return '<div class="fv-mobile-card">' +
        '<div class="fv-mobile-card-img"><img src="' + p.img + '" alt="' + p.title + '" loading="lazy"></div>' +
        '<div class="fv-mobile-card-body">' +
          '<div class="fv-mobile-card-tag">' + (p.tag || 'Vision') + '</div>' +
          '<div class="fv-mobile-card-title">' + p.title + '</div>' +
          '<div class="fv-mobile-card-desc">' + (p.desc || '') + '</div>' +
          '<button class="fv-mobile-card-btn" onclick="openFvDetail(' + i + ')">Learn More &#8594;</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ── Home page mobile FV ── */
  function buildMobFv() {
    if (window.innerWidth > 768) return;
    if (typeof PAGE_DATA === 'undefined') { setTimeout(buildMobFv, 200); return; }
    var container = document.getElementById('home-fv-mobile');
    if (!container || container.dataset.built) return;
    container.dataset.built = '1';
    container.style.display = 'grid';
    var desktop = document.getElementById('fvContainer');
    if (desktop) desktop.style.display = 'none';
    var hdr = document.getElementById('fv-home-header');
    if (hdr) hdr.style.position = 'relative';
    var panels = (PAGE_DATA.future && PAGE_DATA.future.panels) ? PAGE_DATA.future.panels.slice(0, 4) : [];
    container.innerHTML = buildCardsHTML(panels);
  }

  /* ── Future Vision page mobile FV (all panels) ── */
  function buildPageMobFv() {
    if (window.innerWidth > 768) return;
    if (typeof PAGE_DATA === 'undefined') { setTimeout(buildPageMobFv, 200); return; }
    var container = document.getElementById('page-fv-mobile');
    if (!container || container.dataset.built) return;
    container.dataset.built = '1';
    container.style.display = 'grid';
    var desktop = document.getElementById('fvContainerPage');
    if (desktop) desktop.style.display = 'none';
    var hdr = document.getElementById('fv-page-header');
    if (hdr) hdr.style.position = 'relative';
    var panels = (PAGE_DATA.future && PAGE_DATA.future.panels) ? PAGE_DATA.future.panels : [];
    container.innerHTML = buildCardsHTML(panels);
  }

  function buildAll() {
    buildMobFv();
    buildPageMobFv();
  }

  document.addEventListener('DOMContentLoaded', function(){ setTimeout(buildAll, 350); });

  window.addEventListener('resize', function(){
    if (window.innerWidth > 768) {
      /* restore desktop versions */
      var desktopHome = document.getElementById('fvContainer');
      if (desktopHome) desktopHome.style.display = '';
      var mobHome = document.getElementById('home-fv-mobile');
      if (mobHome) { mobHome.style.display='none'; mobHome.dataset.built=''; mobHome.innerHTML=''; }

      var desktopPage = document.getElementById('fvContainerPage');
      if (desktopPage) desktopPage.style.display = '';
      var mobPage = document.getElementById('page-fv-mobile');
      if (mobPage) { mobPage.style.display='none'; mobPage.dataset.built=''; mobPage.innerHTML=''; }
    } else {
      buildAll();
    }
  });

  /* Also rebuild page FV when navigating to future page on mobile */
  window._addNavHook(function(page) {
    if (page === 'future' && window.innerWidth <= 768) {
      requestAnimationFrame(function(){ setTimeout(buildPageMobFv, 100); });
    }
  });
})();

/* ═══════════════════════════════════════════════════
   PREMIUM SCROLL ANIMATION ENGINE
═══════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════
   PREMIUM SCROLL ANIMATION ENGINE
   Linear / Stripe aesthetic — lightweight & elegant
═══════════════════════════════════════════════════ */
(function PremiumAnimations() {

  /* ── 1. Lenis Buttery Smooth Scroll ── */
  window.lenis = null;
  function initLenis() {
    if (typeof Lenis === 'undefined') { setTimeout(initLenis, 80); return; }
    // Destroy previous instance if re-init
    if (window.lenis) { window.lenis.destroy(); }
    window.lenis = new Lenis({
      duration: 1.4,
      easing: t => 1 - Math.pow(1 - t, 4), // quartic ease-out — very silky
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      smoothTouch: false,
      touchMultiplier: 1.6,
      infinite: false,
      lerp: 0.08,
    });

    // Sync GSAP ScrollTrigger with Lenis
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      window.lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(time => window.lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
      // GSAP ticker drives Lenis — no separate RAF loop needed
      return;
    }

    // RAF loop (fallback when GSAP is not available)
    function raf(time) {
      window.lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }
  initLenis();

  /* ── 2. IntersectionObserver Reveal System ── */
  const IO_OPTIONS = { threshold: 0.08, rootMargin: '0px 0px -32px 0px' };

  let revealObserver;
  function initRevealObserver() {
    if (revealObserver) revealObserver.disconnect();
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('sr-visible');
          revealObserver.unobserve(entry.target);
          // Trigger image reveal if inside
          const img = entry.target.querySelector('.about-img-wrap');
          if (img) img.classList.add('img-revealed');
        }
      });
    }, IO_OPTIONS);

    // Auto-add animation classes to common elements
    autoAnnotate();

    document.querySelectorAll(
      '.sr-fade-up, .sr-fade-in, .sr-blur-in, .sr-scale-up, .sr-slide-left, .sr-slide-right, .sr-clip-up'
    ).forEach(el => revealObserver.observe(el));
  }

  /* ── 3. Auto-Annotate Elements With Reveal Classes ── */
  function autoAnnotate() {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;

    // Section tags → clip-up
    activePage.querySelectorAll('.section-tag:not(.sr-annotated)').forEach((el, i) => {
      el.classList.add('sr-clip-up', 'sr-annotated');
    });

    // Section titles → fade-up
    activePage.querySelectorAll('.section-title:not(.sr-annotated)').forEach(el => {
      el.classList.add('sr-fade-up', 'sr-d1', 'sr-annotated');
    });

    // Paragraphs in sections (not hero) → fade-up
    activePage.querySelectorAll(
      '.about-p, .studio-p, .cta-p, .inner-hero-p, .portfolio-sub, .fw-tagline:not(.sr-annotated)'
    ).forEach(el => {
      el.classList.add('sr-fade-up', 'sr-d2', 'sr-annotated');
    });

    // Cards — staggered scale-up
    activePage.querySelectorAll('.jcard:not(.sr-annotated)').forEach((el, i) => {
      el.classList.add('sr-scale-up', `sr-d${Math.min(i % 3 + 1, 8)}`, 'sr-annotated');
    });
    activePage.querySelectorAll('.fv-card:not(.sr-annotated)').forEach((el, i) => {
      el.classList.add('sr-scale-up', `sr-d${Math.min(i % 3 + 1, 8)}`, 'sr-annotated');
    });
    activePage.querySelectorAll('.studio-card:not(.sr-annotated)').forEach((el, i) => {
      el.classList.add('sr-fade-up', `sr-d${Math.min(i % 3 + 1, 8)}`, 'sr-annotated');
    });

    // Stats → blur-in for premium feel
    activePage.querySelectorAll(
      '.hero-stat, .fw-stat-cell:not(.sr-annotated), .cs-stat-item:not(.sr-annotated)'
    ).forEach((el, i) => {
      el.classList.add('sr-blur-in', `sr-d${Math.min(i + 1, 8)}`, 'sr-annotated');
    });

    // About section columns
    activePage.querySelectorAll('.about-visual:not(.sr-annotated)').forEach(el => {
      el.classList.add('sr-slide-left', 'sr-annotated');
    });
    activePage.querySelectorAll('.about-text:not(.sr-annotated)').forEach(el => {
      el.classList.add('sr-slide-right', 'sr-annotated');
    });

    // Portfolio rows → fade up staggered
    activePage.querySelectorAll('.fw-row:not(.sr-annotated)').forEach((el, i) => {
      el.classList.add('sr-fade-up', `sr-d${Math.min(i + 1, 8)}`, 'sr-annotated');
    });

    // About image reveal
    activePage.querySelectorAll('.about-img-wrap:not(.sr-annotated)').forEach(el => {
      el.classList.add('sr-annotated');
    });

    // Footer top
    activePage.querySelectorAll('.footer-top:not(.sr-annotated)').forEach(el => {
      el.classList.add('sr-annotated');
      new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          el.classList.add('ft-visible');
        }
      }, { threshold: 0.15 }).observe(el);
    });

    // Inner page hero
    activePage.querySelectorAll('.inner-hero:not(.sr-annotated)').forEach(el => {
      el.classList.add('sr-annotated');
      // Trigger with a slight delay for page transition
      requestAnimationFrame(() => setTimeout(() => el.classList.add('ih-visible'), 60));
    });
  }

  /* ── 4. About Image Clip-Path Reveal ── */
  const imgIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('img-revealed');
        imgIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });

  function observeImages() {
    document.querySelectorAll('.about-img-wrap:not(.img-observed)').forEach(el => {
      el.classList.add('img-observed');
      imgIO.observe(el);
    });
  }

  /* ── 5. Subtle Parallax on Hero Orb & Noise ── */
  function initParallax() {
    const orb      = document.querySelector('.hero-orb');
    const noise    = document.querySelector('.hero-noise');
    const heroLeft = document.querySelector('.hero-left');

    let ticking = false;
    let lastY = 0;

    function applyParallax(y) {
      if (orb)      orb.style.transform   = `translateY(${y * 0.22}px)`;
      if (noise)    noise.style.transform = `translateY(${y * 0.07}px)`;
      if (heroLeft) heroLeft.style.transform = `translateY(${y * 0.06}px)`;

      // Multi-layer section parallax
      document.querySelectorAll('.services-bg-glow').forEach(el => {
        el.style.transform = `translateX(-50%) translateY(${y * 0.05}px)`;
      });
      document.querySelectorAll('.inner-hero::before').forEach(el => {
        el.style.transform = `translate(-50%, calc(-50% + ${y * 0.04}px))`;
      });
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      lastY = window.pageYOffset;
      if (!ticking) {
        requestAnimationFrame(() => applyParallax(lastY));
        ticking = true;
      }
    }, { passive: true });
  }
  initParallax();

  /* ── 6. Section-Tag line re-init ── */
  // The CSS handles it via sr-visible parent, so section-tags inside
  // sr-visible parents animate their ::before. Reset visible ones instantly.
  function fixSectionTagLines() {
    document.querySelectorAll('.section-tag').forEach(el => {
      // If not inside any animated wrapper, show immediately
      const animated = el.closest('.sr-fade-up, .sr-clip-up, .sr-blur-in, .sr-scale-up');
      if (!animated) {
        el.style.setProperty('--line-visible', '1');
      }
    });
  }

  /* ── 7. Stat Number Count-Up ── */
  function parseNum(str) {
    const m = str.match(/([\d,]+)/);
    return m ? parseInt(m[1].replace(/,/g, ''), 10) : 0;
  }
  function formatNum(n, originalStr) {
    const hasPlus  = originalStr.includes('+');
    const hasK     = originalStr.toLowerCase().includes('k');
    const hasPct   = originalStr.includes('%');
    const prefix   = originalStr.match(/^[^0-9,]*/)?.[0] ?? '';
    const suffix   = originalStr.match(/[^0-9,+%kK]*$/)?.[0] ?? '';
    let   val      = hasK ? Math.round(n / 1000) + 'K' : n.toLocaleString();
    return prefix + val + (hasPct ? '%' : '') + (hasPlus ? '+' : '');
  }
  function animateCount(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const original = el.textContent.trim();
    const target   = parseNum(original);
    if (!target) return;
    const duration = 1400;
    const start    = performance.now();
    function tick(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out quart
      const eased    = 1 - Math.pow(1 - progress, 4);
      el.textContent = formatNum(Math.round(eased * target), original);
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = original; // Snap to exact original
    }
    requestAnimationFrame(tick);
  }

  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll(
        '.hero-stat .num, .fw-stat-big, .cs-stat-num, .sf-n, .about-badge-circle .n'
      ).forEach(animateCount);
      countIO.unobserve(e.target);
    });
  }, { threshold: 0.4 });

  function observeCounters() {
    document.querySelectorAll(
      '.hero-stats, .fw-stat-strip, .cs-stat-row, .studio-floats, .about-badge-circle'
    ).forEach(el => countIO.observe(el));
  }

  /* ── 8. Keyboard / focus accessibility ── */
  document.addEventListener('keydown', e => {
    if (e.key === 'Tab') document.body.classList.add('using-keyboard');
  });
  document.addEventListener('mousedown', () => {
    document.body.classList.remove('using-keyboard');
  });

  /* ── 9. Page Transition Animation ── */
  const pageOverlay = document.createElement('div');
  pageOverlay.id = 'pg-transition';
  Object.assign(pageOverlay.style, {
    position: 'fixed', inset: '0', zIndex: '999999',
    background: 'var(--black)',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.38s cubic-bezier(0.22, 1, 0.36, 1)'
  });
  document.body.appendChild(pageOverlay);

  // Page transition via hook
  window._addNavHook(function(page) {
    // Flash overlay
    pageOverlay.style.opacity = '0.45';
    setTimeout(() => {
      autoAnnotate();
      initRevealObserver();
      observeImages();
      observeCounters();
      pageOverlay.style.opacity = '0';
    }, 230);
  });

  /* ── 10. Initial boot ── */
  function boot() {
    autoAnnotate();
    initRevealObserver();
    observeImages();
    observeCounters();
    fixSectionTagLines();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Re-run on dynamic content (MutationObserver for rendered data)
  const mutationObs = new MutationObserver(() => {
    autoAnnotate();
    initRevealObserver();
    observeImages();
    observeCounters();
  });
  mutationObs.observe(document.body, { childList: true, subtree: true });

})();

/* ═══════════════════════════════════════════════════
   FOOTER INJECTOR
   Reads the shared-footer-tpl <template> embedded in
   this page and clones it into every .page-footer-slot.
   To update the footer: edit assets/footer.html (the
   master), then run the build script to sync all pages.
═══════════════════════════════════════════════════ */
(function() {
  function injectFooters() {
    var tpl = document.getElementById('shared-footer-tpl');
    if (!tpl) return;
    document.querySelectorAll('.page-footer-slot').forEach(function(slot) {
      slot.replaceWith(tpl.content.cloneNode(true));
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFooters);
  } else {
    injectFooters();
  }
  // Re-inject when navigate() activates a new page
  window._addNavHook(function(page) {
    requestAnimationFrame(injectFooters);
  });
})();

/* ═══════════════════════════════════════════════════
   FOOTER ENQUIRY — WEB3FORMS SUBMISSION
   Validates mobile/email input, submits to Web3Forms,
   gives inline feedback on the button.
═══════════════════════════════════════════════════ */
window.tsmFooterEnquiry = function(e) {
  if (e) e.preventDefault();

  var input = document.getElementById('footer-enquiry-input');
  var btn   = document.getElementById('footer-enquiry-btn');
  if (!input || !btn) return;

  var val = (input.value || '').trim();
  if (!val) {
    input.focus();
    input.style.borderColor = '#ff5c00';
    setTimeout(function() { input.style.borderColor = ''; }, 1500);
    return;
  }

  // Detect email vs phone
  var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  var isPhone = /^[0-9+\-\s()]{7,15}$/.test(val);

  if (!isEmail && !isPhone) {
    input.style.borderColor = '#ff5c00';
    input.placeholder = 'ENTER A VALID EMAIL OR MOBILE NUMBER';
    setTimeout(function() {
      input.style.borderColor = '';
      input.placeholder = 'ENTER YOUR MOBILE NUMBER OR MAIL ID';
    }, 2500);
    return;
  }

  // Build submission payload
  var subject  = isEmail
    ? 'Footer Enquiry — ' + val
    : 'Footer Enquiry — Mobile: ' + val;
  var message  = isEmail
    ? 'New footer enquiry.\n\nEmail: ' + val + '\n\nSource page: ' + window.location.href
    : 'New footer enquiry.\n\nMobile: ' + val + '\n\nSource page: ' + window.location.href;
  var fromName = 'Footer Enquiry';
  var emailField = isEmail ? val : 'noreply@thesonicmedia.com';

  btn.textContent = 'Sending…';
  btn.disabled = true;

  fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_key: '66f90d59-83e7-4136-8823-1bfeb38deb41',
      subject:    subject,
      from_name:  fromName,
      email:      emailField,
      message:    message
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(result) {
    if (result.success) {
      btn.textContent = '✓ Sent!';
      btn.style.background = '#16a34a';
      btn.style.color = '#fff';
      input.value = '';
      input.placeholder = 'ENTER YOUR MOBILE NUMBER OR MAIL ID';
      setTimeout(function() {
        btn.textContent = 'Enquiry';
        btn.style.background = '';
        btn.style.color = '';
        btn.disabled = false;
      }, 4000);
    } else {
      throw new Error(result.message || 'Submission failed');
    }
  })
  .catch(function() {
    btn.textContent = 'Enquiry';
    btn.disabled = false;
    alert('Submission failed. Please email us at info@thesonicmedia.com');
  });
};

// Also trigger on Enter key in the footer input (event delegation — works after footer injection)
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && e.target && e.target.id === 'footer-enquiry-input') {
    window.tsmFooterEnquiry(e);
  }
});

/* ═══════════════════════════════════════════════════
   WEEKLY NEWSLETTER — WEB3FORMS SUBMISSION
   Uses the same Web3Forms access key as the Footer
   Enquiry form so every subscription is delivered the
   same way enquiries are.
═══════════════════════════════════════════════════ */
window.tsmNewsletterSubmit = function(e) {
  if (e) e.preventDefault();

  var nameInput  = document.getElementById('nl-name-input');
  var emailInput = document.getElementById('nl-email-input');
  var btn        = document.getElementById('nl-submit-btn');
  if (!nameInput || !emailInput || !btn) return;

  var name  = (nameInput.value || '').trim();
  var email = (emailInput.value || '').trim();

  if (!name) {
    nameInput.focus();
    nameInput.style.borderColor = '#ff5c00';
    setTimeout(function() { nameInput.style.borderColor = ''; }, 1500);
    return;
  }

  var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!isEmail) {
    emailInput.focus();
    emailInput.style.borderColor = '#ff5c00';
    emailInput.placeholder = 'ENTER A VALID EMAIL ADDRESS';
    setTimeout(function() {
      emailInput.style.borderColor = '';
      emailInput.placeholder = 'Your email address';
    }, 2500);
    return;
  }

  var subject = 'Weekly Newsletter Subscription — ' + name;
  var message = 'New newsletter subscription.\n\nName: ' + name + '\nEmail: ' + email + '\n\nSource page: ' + window.location.href;
  var originalText = btn.textContent;

  btn.textContent = 'Sending…';
  btn.disabled = true;

  fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_key: '66f90d59-83e7-4136-8823-1bfeb38deb41',
      subject:    subject,
      from_name:  name,
      email:      email,
      message:    message
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(result) {
    if (result.success) {
      btn.textContent = '✓ Subscribed!';
      btn.style.background = '#16a34a';
      btn.style.color = '#fff';
      nameInput.value = '';
      emailInput.value = '';
      setTimeout(function() {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.style.color = '';
        btn.disabled = false;
      }, 4000);
    } else {
      throw new Error(result.message || 'Submission failed');
    }
  })
  .catch(function() {
    btn.textContent = originalText;
    btn.disabled = false;
    alert('Subscription failed. Please email us at info@thesonicmedia.com');
  });
};

/* ═══════════════════════════════════════════════════
   FUTURE VISION DETAIL MODAL
═══════════════════════════════════════════════════ */
(function(){
  window.openFvDetail = function(index) {
    const panels = (typeof PAGE_DATA !== 'undefined') ? PAGE_DATA.future.panels : [];
    const p = panels[index];
    if (!p || !p.detail) return;
    const d = p.detail;

    const bulletsHtml = (d.bullets || []).map(b => `
      <div style="display:flex;align-items:flex-start;gap:14px;padding:16px 20px;border-radius:12px;background:rgba(255,92,0,.06);border:1px solid rgba(255,92,0,.15);margin-bottom:12px;">
        <span style="width:8px;height:8px;border-radius:50%;background:#FF5C00;flex-shrink:0;margin-top:6px;box-shadow:0 0 8px rgba(255,92,0,.5);"></span>
        <span style="font-family:'Syne',sans-serif;font-size:14px;font-weight:600;color:#F5F0EB;line-height:1.6;">${b}</span>
      </div>`).join('');

    const bodyParas = (d.body || '').split('\n\n').filter(Boolean).map((para, i) =>
      `<p style="margin-bottom:24px;${i === 0 ? 'font-size:18px;color:rgba(245,240,235,.8);' : ''}">${para}</p>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${p.title} — Future Vision — The Sonic Media</title>
<meta name="description" content="${p.desc}">
<link rel="icon" type="image/jpeg" href="${p.img.split('?')[0]}?w=32&h=32&fit=crop">
<meta property="og:type" content="article">
<meta property="og:site_name" content="The Sonic Media">
<meta property="og:title" content="${p.title} — The Sonic Media Future Vision">
<meta property="og:description" content="${p.desc}">
<meta property="og:image" content="${p.img.replace(/w=\d+/,'w=1200')}&h=630&fit=crop">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${p.title}">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@thesonicmedia">
<meta name="twitter:title" content="${p.title} — The Sonic Media Future Vision">
<meta name="twitter:description" content="${p.desc}">
<meta name="twitter:image" content="${p.img.replace(/w=\d+/,'w=1200')}&h=630&fit=crop">
<meta name="robots" content="index, follow">
<meta name="author" content="The Sonic Media">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://thesonicmedia.com/future#${index}",
      "headline": "${p.title.replace(/"/g,'\\"')}",
      "description": "${p.desc.replace(/"/g,'\\"')}",
      "image": {
        "@type": "ImageObject",
        "url": "${p.img}",
        "width": 1200,
        "height": 630
      },
      "author": {
        "@type": "Organization",
        "name": "The Sonic Media",
        "url": "https://thesonicmedia.com"
      },
      "publisher": {
        "@type": "Organization",
        "name": "The Sonic Media",
        "logo": {
          "@type": "ImageObject",
          "url": "https://res.cloudinary.com/dq2nrpky0/image/upload/v1779787887/favicon_oalxfi.png"
        }
      },
      "mainEntityOfPage": "https://thesonicmedia.com/future",
      "articleSection": "Future Vision",
      "keywords": "${p.tag}, future of marketing, AI marketing, The Sonic Media"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {"@type":"ListItem","position":1,"name":"Home","item":"https://thesonicmedia.com/"},
        {"@type":"ListItem","position":2,"name":"Future Vision","item":"https://thesonicmedia.com/future"},
        {"@type":"ListItem","position":3,"name":"${p.title.replace(/"/g,'\\"')}"}
      ]
    }
  ]
}
<\/script>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html{font-size:16px;scroll-behavior:smooth;}
body{font-family:'DM Sans',sans-serif;background:#080808;color:#F5F0EB;line-height:1.7;min-height:100vh;}
.fv-nav{position:sticky;top:0;z-index:100;background:rgba(8,8,8,.93);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.06);padding:0 48px;height:68px;display:flex;align-items:center;justify-content:space-between;}
.fv-brand{display:flex;align-items:center;gap:10px;font-family:'Syne',sans-serif;font-size:14px;font-weight:800;letter-spacing:.04em;color:#F5F0EB;}
.fv-brand-mark{width:34px;height:34px;border-radius:8px;background:#FF5C00;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:17px;color:#fff;flex-shrink:0;}
.fv-close{padding:8px 20px;border-radius:50px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(245,240,235,.6);font-family:'Syne',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;}
.fv-close:hover{background:rgba(255,92,0,.15);border-color:rgba(255,92,0,.35);color:#FF5C00;}
.fv-hero{padding:90px 72px 72px;background:#0f0f0f;position:relative;overflow:hidden;}
.fv-hero::before{content:'';position:absolute;top:0;right:0;width:600px;height:600px;background:radial-gradient(circle,rgba(255,92,0,.07) 0%,transparent 70%);pointer-events:none;}
.fv-eyebrow{display:inline-flex;align-items:center;gap:10px;font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:#FF5C00;margin-bottom:20px;}
.fv-eyebrow::before{content:'';width:22px;height:1.5px;background:#FF5C00;}
.fv-h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(48px,7vw,100px);line-height:.92;letter-spacing:.02em;margin-bottom:16px;}
.fv-h1 span{color:#FF5C00;}
.fv-meta{font-family:'Syne',sans-serif;font-size:12px;font-weight:600;letter-spacing:.1em;color:#666;text-transform:uppercase;}
.fv-body{max-width:960px;margin:0 auto;padding:72px 72px 100px;}
.fv-img-wrap{border-radius:16px;overflow:hidden;margin-bottom:14px;aspect-ratio:16/9;background:#161616;}
.fv-img-wrap img{width:100%;height:100%;object-fit:cover;display:block;}
.fv-img-cap{font-family:'Syne',sans-serif;font-size:12px;font-weight:600;color:rgba(245,240,235,.4);letter-spacing:.06em;margin-bottom:40px;padding-left:4px;}
.fv-subtitle{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#FF5C00;margin-bottom:24px;letter-spacing:.02em;}
.fv-article{font-size:17px;line-height:1.9;color:rgba(245,240,235,.72);font-weight:300;padding:44px;border-radius:16px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);margin-bottom:40px;}
.fv-article::first-letter{font-family:'Bebas Neue',sans-serif;font-size:72px;line-height:.8;float:left;margin-right:12px;margin-top:6px;color:#FF5C00;}
.fv-bullets-title{font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:#FF5C00;margin-bottom:20px;display:flex;align-items:center;gap:12px;}
.fv-bullets-title::before{content:'';width:28px;height:1.5px;background:#FF5C00;}
.fv-footer{border-top:1px solid rgba(255,255,255,.05);padding:32px 72px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;}
.fv-footer-copy{font-size:13px;color:#666;}
.fv-footer-copy span{color:#FF5C00;}
.fv-back{display:inline-flex;align-items:center;gap:8px;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:#FF5C00;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:gap .25s;}
.fv-back:hover{gap:14px;}
.fv-cta-band{background:#0f0f0f;border-top:1px solid rgba(255,92,0,.15);border-bottom:1px solid rgba(255,92,0,.15);padding:64px 72px;text-align:center;position:relative;overflow:hidden;}
.fv-cta-band::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;height:300px;background:radial-gradient(ellipse,rgba(255,92,0,.09) 0%,transparent 70%);pointer-events:none;}
.fv-cta-eyebrow{display:inline-flex;align-items:center;gap:10px;font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:#FF5C00;margin-bottom:18px;}
.fv-cta-eyebrow::before{content:'';width:22px;height:1.5px;background:#FF5C00;}
.fv-cta-h{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,5vw,68px);line-height:.95;letter-spacing:.02em;color:#F5F0EB;margin-bottom:16px;}
.fv-cta-h span{color:#FF5C00;}
.fv-cta-p{font-size:15px;line-height:1.75;color:rgba(245,240,235,.55);font-weight:300;max-width:480px;margin:0 auto 36px;}
.fv-cta-btn{display:inline-flex;align-items:center;gap:10px;background:#FF5C00;color:#fff;padding:16px 38px;border-radius:50px;font-family:'Syne',sans-serif;font-size:14px;font-weight:700;letter-spacing:.04em;text-decoration:none;position:relative;overflow:hidden;box-shadow:0 0 30px rgba(255,92,0,.4);transition:all .3s;}
.fv-cta-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);transform:translateX(-100%);transition:transform .5s;}
.fv-cta-btn:hover::before{transform:translateX(100%);}
.fv-cta-btn:hover{transform:translateY(-3px);box-shadow:0 0 50px rgba(255,92,0,.65);}
@media(max-width:768px){.fv-nav,.fv-footer{padding-left:20px;padding-right:20px;}.fv-hero{padding:60px 20px 48px;}.fv-body{padding:40px 20px 80px;}.fv-article{padding:28px;}.fv-cta-band{padding:48px 24px;}}
</style>
</head>
<body>
<nav class="fv-nav">
  <div class="fv-brand"><img src="https://res.cloudinary.com/dq2nrpky0/image/upload/v1779787887/favicon_oalxfi.png" alt="The Sonic Media Logo" style="width:34px;height:34px;object-fit:contain;flex-shrink:0;" />THE SONIC MEDIA</div>
  <button class="fv-close" onclick="window.close()" style="display:inline-flex;align-items:center;gap:6px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>Close</button>
</nav>
<div class="fv-hero">
  <div class="fv-eyebrow">Future Vision · ${p.tag}</div>
  <h1 class="fv-h1">${p.title.split(' ').slice(0,4).join(' ')}<br><span>${p.title.split(' ').slice(4).join(' ')}</span></h1>
  <div class="fv-meta">The Sonic Media &nbsp;·&nbsp; ${d.subtitle || p.tag}</div>
</div>
<div class="fv-body">
  <div class="fv-img-wrap"><img src="${p.img}" alt="${p.title}"></div>
  <div class="fv-img-cap">${d.subtitle || p.title}</div>
  <div class="fv-subtitle">${d.subtitle || ''}</div>
  <div class="fv-article">${bodyParas}</div>
  ${bulletsHtml ? `<div class="fv-bullets-title">Key Highlights</div>${bulletsHtml}` : ''}
</div>
<div class="fv-cta-band">
  <div class="fv-cta-eyebrow">Ready to Build the Future?</div>
  <div class="fv-cta-h">Work With <span>The Sonic Media</span></div>
  <p class="fv-cta-p">Let's build your brand's next growth chapter together — strategy, content, performance, and technology under one roof.</p>
  <a class="fv-cta-btn" href="https://thesonicmedia.com" onclick="window.opener && window.opener.navigate && window.opener.navigate('contact'); this.href='javascript:void(0)'; return false;" target="_self">Start Your Project →</a>
</div>
<div class="fv-footer">
  <div class="fv-footer-copy">© 2026 <span>The Sonic Media</span>. All rights reserved.</div>
  <span class="fv-back" onclick="window.close()">← Back to Website</span>
</div>
</body>
</html>`;
    // Use a Blob URL so the page has a real URL that survives browser refresh
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const newTab = window.open(blobUrl, '_blank');
    // Revoke the blob URL after the tab has loaded to free memory
    if (newTab) {
      newTab.addEventListener('load', function() {
        URL.revokeObjectURL(blobUrl);
      }, { once: true });
    }
  };

  // Keep closeFvDetail as no-op for any residual references
  window.closeFvDetail = function() {};
})();


/* ═══════════════════════════════════════════════════
   MOBILE VIDEO LOOP FIX
═══════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════
   MOBILE VIDEO LOOP FIX
   On iOS/Android, the `loop` attribute can be silently
   ignored when the browser restricts autoplay or when
   GSAP manages the element. Force a restart on 'ended'.
═══════════════════════════════════════════════════ */
(function fixMobileVideoLoop() {
  /**
   * Attempts to play a video and handles Low Power Mode / autoplay restrictions
   * gracefully by showing a poster-frame fallback with a tap-to-play overlay.
   *
   * Strategy:
   *  1. Try autoplay as normal (works on most browsers/conditions).
   *  2. If the play() promise rejects (Low Power Mode, aggressive autoplay
   *     policy, etc.), show a lightweight tap-to-play UI anchored to the video.
   *  3. On first user tap anywhere on the page, attempt playback again — this
   *     satisfies the "user gesture" requirement that Low Power Mode enforces.
   *  4. Keep the loop/ended fallback for browsers that ignore the `loop` attr.
   */
  function ensureLoop(videoEl) {
    if (!videoEl) return;

    // Force-restart when the 'loop' attribute is silently ignored
    videoEl.addEventListener('ended', function() {
      videoEl.currentTime = 0;
      videoEl.play().catch(function(){});
    });

    // Resume after tab becomes visible again
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible' && videoEl.paused) {
        videoEl.play().catch(function(){});
      }
    });

    // --- Low Power Mode graceful fallback ---
    var playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(function(err) {
        // Only handle NotAllowedError (autoplay blocked) — rethrow others
        if (err && err.name !== 'NotAllowedError') return;

        // Ensure the video has a poster so something meaningful is shown
        if (!videoEl.hasAttribute('poster') && videoEl.dataset.poster) {
          videoEl.setAttribute('poster', videoEl.dataset.poster);
        }

        // Inject a subtle tap-to-play overlay if one doesn't already exist
        var wrapper = videoEl.parentElement;
        if (wrapper && !wrapper.querySelector('.tsm-tap-to-play')) {
          var overlay = document.createElement('button');
          overlay.className = 'tsm-tap-to-play';
          overlay.setAttribute('aria-label', 'Tap to play video');
          overlay.innerHTML =
            '<span class="tsm-ttp-circle">' +
              '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                '<circle cx="14" cy="14" r="14" fill="rgba(255,92,0,0.85)"/>' +
                '<polygon points="11,8 22,14 11,20" fill="#fff"/>' +
              '</svg>' +
            '</span>';

          // Position relative to wrapper
          var wPos = getComputedStyle(wrapper).position;
          if (wPos === 'static') { wrapper.style.position = 'relative'; }

          Object.assign(overlay.style, {
            position: 'absolute',
            inset: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.25)',
            border: 'none',
            cursor: 'pointer',
            zIndex: '10',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            transition: 'opacity 0.3s'
          });

          function dismissOverlay() {
            videoEl.play().then(function() {
              overlay.style.opacity = '0';
              setTimeout(function() {
                if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
              }, 300);
            }).catch(function(){});
          }

          overlay.addEventListener('click', dismissOverlay);

          // Also attempt resume on any user gesture on the page (first touch/click)
          function onFirstGesture() {
            document.removeEventListener('touchstart', onFirstGesture, { once: true });
            document.removeEventListener('click',      onFirstGesture, { once: true });
            if (videoEl.paused) { dismissOverlay(); }
          }
          document.addEventListener('touchstart', onFirstGesture, { once: true, passive: true });
          document.addEventListener('click',      onFirstGesture, { once: true });

          wrapper.appendChild(overlay);
        }
      });
    }
    // --- end Low Power Mode fallback ---
  }

  function initVideoLoops() {
    // (a) Full-width showreel video after hero section on home page
    ensureLoop(document.getElementById('homeShowreel'));
    // (b) About section scroll-reveal video preview
    ensureLoop(document.getElementById('ab-tsm-vid'));
    // Also cover the home thought-vessel video
    ensureLoop(document.getElementById('tsm-vid'));
    // Hero mobile background videos (inline autoplay, no id — select by class)
    var heroBgVideos = document.querySelectorAll('.hero-mobile-bg video');
    heroBgVideos.forEach(function(v) { ensureLoop(v); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVideoLoops);
  } else {
    initVideoLoops();
  }
})();

/* ═══════════════════════════════════════════════════════════════
   MEET THE CO-FOUNDERS — Cinematic GSAP ScrollTrigger sequence
   Two full-screen (100vh) panels. Each photo slides in from off-
   screen (left panel's image from the left, right panel's image
   from the right), while copy fades + rises into place. A slow
   parallax drift continues on the photo for the remainder of the
   panel's scroll life. Respects prefers-reduced-motion.
═══════════════════════════════════════════════════════════════ */
(function initFoundersCinematic() {
  function boot() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      setTimeout(boot, 80);
      return;
    }
    var section = document.getElementById('foundersCinematic');
    if (!section) return; // not on this page

    gsap.registerPlugin(ScrollTrigger);

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Kill any stale instances from a prior init (e.g. hot nav / resize rebuild)
    ScrollTrigger.getAll().forEach(function (st) {
      if (st.vars && st.vars.id && st.vars.id.indexOf('fc-') === 0) st.kill();
    });

    var panels = section.querySelectorAll('.fc-panel');

    panels.forEach(function (panel, i) {
      var media = panel.querySelector('.fc-media');
      var copy  = panel.querySelector('.fc-copy');
      var index = panel.querySelector('.fc-index');
      var role  = panel.querySelector('.fc-role');
      var name  = panel.querySelector('.fc-name');
      var bio   = panel.querySelector('.fc-bio');
      var glow  = panel.querySelector('.fc-glow');
      var fromLeft = media.classList.contains('fc-media-left');

      if (reduceMotion) {
        gsap.set([media, copy], { clearProps: 'all' });
        return;
      }

      // ── Entrance timeline: plays once as the panel arrives ──
      var tl = gsap.timeline({
        scrollTrigger: {
          id: 'fc-enter-' + i,
          trigger: panel,
          start: 'top 75%',
          end: 'top 20%',
          toggleActions: 'play none none reverse'
        }
      });

      tl.fromTo(media,
        { xPercent: fromLeft ? -120 : 120, opacity: 0, scale: 1.04 },
        { xPercent: 0, opacity: 1, scale: 1, duration: 1.3, ease: 'power4.out' },
        0
      );

      if (glow) {
        tl.fromTo(glow, { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power2.out' }, 0.1);
      }

      [index, role, name, bio].forEach(function (el, idx) {
        if (!el) return;
        tl.fromTo(el,
          { y: 46, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' },
          0.18 + idx * 0.1
        );
      });

      // ── Slow continuous parallax while the panel is in view ──
      gsap.to(media, {
        yPercent: -6,
        ease: 'none',
        scrollTrigger: {
          id: 'fc-parallax-' + i,
          trigger: panel,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });

      gsap.to(copy, {
        yPercent: 4,
        ease: 'none',
        scrollTrigger: {
          id: 'fc-parallax-copy-' + i,
          trigger: panel,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    });

    ScrollTrigger.refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 150); });
  } else {
    setTimeout(boot, 150);
  }
})();


