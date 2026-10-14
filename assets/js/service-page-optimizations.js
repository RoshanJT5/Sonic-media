/* ═══════════════════════════════════════════════════
   SERVICE PAGE PERFORMANCE OPTIMIZATIONS
   Auto-applied to all service pages for smoother scrolling
═══════════════════════════════════════════════════ */

(function() {
  'use strict';

  // 1. Lazy load videos for better initial performance
  function lazyLoadVideos() {
    const videos = document.querySelectorAll('video[data-src]');
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const video = entry.target;
          const source = video.querySelector('source[data-src]') || video;
          if (source.dataset.src) {
            source.src = source.dataset.src;
            video.load();
            video.play().catch(() => {});
            videoObserver.unobserve(video);
          }
        }
      });
    }, { rootMargin: '50px' });

    videos.forEach(video => videoObserver.observe(video));
  }

  // 2. Optimize GSAP ScrollTrigger settings
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    // Use less expensive scroller proxy
    gsap.config({ 
      force3D: true,
      nullTargetWarn: false
    });
    
    ScrollTrigger.config({ 
      limitCallbacks: true,
      syncInterval: 150 // Reduce update frequency
    });

    // Batch similar ScrollTrigger animations
    ScrollTrigger.batch('.wsv-test-card, .wsv-cap-card, .reveal', {
      onEnter: batch => gsap.to(batch, {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        duration: 0.6,
        ease: 'power2.out',
        overwrite: 'auto'
      }),
      start: 'top 85%',
      once: true
    });
  }

  // 3. Throttle expensive mousemove handlers
  let tiltTimeout;
  document.addEventListener('mousemove', function(e) {
    clearTimeout(tiltTimeout);
    tiltTimeout = setTimeout(() => {
      const cards = document.querySelectorAll('.wsv-cap-card:hover, .wsv-hcard:hover');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
      });
    }, 20);
  }, { passive: true });

  // 4. Optimize canvas animations on service pages
  function optimizeCanvasAnimations() {
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Enable hardware acceleration hints
        ctx.imageSmoothingEnabled = false;
        
        // Use lower resolution on mobile
        if (window.innerWidth < 768) {
          canvas.style.transform = 'scale(1.2)';
          canvas.style.transformOrigin = 'center';
          canvas.width = canvas.offsetWidth * 0.7;
          canvas.height = canvas.offsetHeight * 0.7;
        }
      }
    });
  }

  // 5. Reduce particle/animation complexity on lower-end devices
  function detectPerformanceMode() {
    // Detect lower-end devices
    const isLowEnd = navigator.hardwareConcurrency <= 4 || 
                     /Android|webOS|BlackBerry/i.test(navigator.userAgent);
    
    if (isLowEnd) {
      document.body.classList.add('low-performance-mode');
      
      // Reduce particle counts
      document.querySelectorAll('.ai-particle').forEach((p, i) => {
        if (i % 2 !== 0) p.remove();
      });
      
      // Simplify blur effects
      document.querySelectorAll('[style*="blur"]').forEach(el => {
        const currentStyle = el.style.filter || el.style.backdropFilter;
        const reducedBlur = currentStyle.replace(/blur\((\d+)px\)/, (match, val) => {
          return `blur(${Math.max(4, val / 2)}px)`;
        });
        if (el.style.filter) el.style.filter = reducedBlur;
        if (el.style.backdropFilter) el.style.backdropFilter = reducedBlur;
      });
    }
  }

  // 6. Pause videos when out of viewport
  // (Videos inside .ai-vw-cell are click-to-play only and must never be
  // auto-played by this scroll-based optimization.)
  function setupVideoOptimization() {
    const videos = document.querySelectorAll('video:not(.ai-vw-cell video)');
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.25 });

    videos.forEach(video => {
      video.setAttribute('playsinline', '');
      video.setAttribute('preload', 'metadata');
      videoObserver.observe(video);
    });
  }

  // 7. Debounce window resize handlers
  let resizeTimer;
  const originalResize = window.onresize;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    }, 250);
  }, { passive: true });

  // 8. Add CSS performance class for optimizations
  function addPerformanceStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* GPU-accelerated transforms */
      .wsv-chip, .wsv-hcard, .wsv-cap-card, .ai-tcard {
        transform: translate3d(0, 0, 0);
        backface-visibility: hidden;
      }
      
      /* Optimize animations on low-end devices */
      .low-performance-mode .ai-particle,
      .low-performance-mode .ai-orb,
      .low-performance-mode .wsv-hcard-shadow {
        display: none !important;
      }
      
      .low-performance-mode [style*="blur"] {
        filter: none !important;
        backdrop-filter: none !important;
      }
      
      /* Reduce animation complexity */
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
      
      /* Optimize will-change usage */
      .wsv-hcard:hover,
      .wsv-cap-card:hover {
        will-change: transform;
      }
      
      .wsv-hcard:not(:hover),
      .wsv-cap-card:not(:hover) {
        will-change: auto;
      }
    `;
    document.head.appendChild(style);
  }

  // 9. Initialize Lenis smooth scroll with optimizations
  function initOptimizedLenis() {
    if (typeof Lenis === 'undefined') return;
    
    window.lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.5,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Connect Lenis to GSAP ScrollTrigger
    if (typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }
  }

  // 10. Reduce complexity of floating animations
  function optimizeFloatingAnimations() {
    const floatingElements = document.querySelectorAll('[class*="float"], .wsv-chip');
    floatingElements.forEach((el, i) => {
      // Stagger animation start to reduce simultaneous calculations
      el.style.animationDelay = `${i * 0.15}s`;
      
      // Use simpler easing
      el.style.animationTimingFunction = 'ease-in-out';
    });
  }

  // Initialize all optimizations
  function init() {
    // Run immediately
    addPerformanceStyles();
    detectPerformanceMode();
    
    // Run after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        lazyLoadVideos();
        setupVideoOptimization();
        optimizeCanvasAnimations();
        optimizeFloatingAnimations();
        
        // Init Lenis after a brief delay
        setTimeout(initOptimizedLenis, 100);
      });
    } else {
      lazyLoadVideos();
      setupVideoOptimization();
      optimizeCanvasAnimations();
      optimizeFloatingAnimations();
      setTimeout(initOptimizedLenis, 100);
    }
  }

  init();

})();

/* ── Tablet orientation: treat portrait tablet as mobile for canvas resolution ── */
(function patchServicePageTabletOrientation() {
  var orig = window.innerWidth;
  /* Override the canvas resolution check to respect tablet-portrait mode */
  document.addEventListener('DOMContentLoaded', function() {
    var canvases = document.querySelectorAll('canvas');
    canvases.forEach(function(canvas) {
      var isTabletPortrait = window._tabletOrientationAdapter
        ? window._tabletOrientationAdapter.isTabletPortrait()
        : (window.innerWidth >= 768 && window.innerWidth <= 1024 && window.innerHeight > window.innerWidth);
      if (isTabletPortrait) {
        var ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.style.transform = 'scale(1.2)';
          canvas.style.transformOrigin = 'center';
          canvas.width  = canvas.offsetWidth  * 0.7;
          canvas.height = canvas.offsetHeight * 0.7;
        }
      }
    });
  });
})();
