'use strict';

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function verifyPreviewInheritance() {
  console.log('=== Verifying New Tab Preview Inheritance ===\n');

  // 1. Verify migrateSection cleans up fragmented and rogue negative offsets
  const regSource = fs.readFileSync('assets/js/section-registry.js', 'utf8');
  const vm = require('vm');
  const windowObject = {
    DOMPurify: { sanitize: val => String(val) },
    document: { documentElement: { clientWidth: 1440 }, querySelectorAll: () => [] }
  };
  windowObject.window = windowObject;
  const context = { window: windowObject, self: windowObject, document: windowObject.document, console, URL, setTimeout, clearTimeout, requestAnimationFrame: cb => cb(), cancelAnimationFrame: () => {} };
  vm.createContext(context);
  vm.runInContext(regSource, context);
  const registry = windowObject.SectionRegistry;

  const dirtySection = {
    id: 'sec_rich_dirty',
    type: 'rich_text',
    content: {
      heading: 'Strategic Deep Dive',
      subheading: 'Corrupted duplicate text that repeats in body...',
      body: '<p>Corrupted duplicate text that repeats in body... Cuneiform is one of the oldest surviving forms...</p>'
    },
    settings: {
      offsetX: -320,
      elementOffsets: {
        'text-0': { x: -280, y: 10 },
        'text-1': { x: -300, y: 20 },
        'p-0': { x: -150, y: 0 },
        'heading': { x: 0, y: 0 }
      },
      responsive: {
        mobile: {
          elementOffsets: {
            'text-0': { x: -100, y: 0 }
          }
        }
      }
    }
  };

  const migrated = registry.migrateSection(dirtySection);
  assert.strictEqual(migrated.settings.elementOffsets['text-0'], undefined, 'migrateSection must purge fragmented text-0 offset');
  assert.strictEqual(migrated.settings.elementOffsets['text-1'], undefined, 'migrateSection must purge fragmented text-1 offset');
  assert.strictEqual(migrated.settings.elementOffsets['p-0'], undefined, 'migrateSection must purge fragmented p-0 offset');
  assert.strictEqual(migrated.settings.responsive.mobile.elementOffsets['text-0'], undefined, 'migrateSection must purge fragmented offsets in responsive overrides');
  console.log('✓ SectionRegistry.migrateSection auto-healing of fragmented offsets verified');

  // 2. Launch headless Chrome to verify project.html layout in preview mode
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9447',
    '--window-size=1440,900',
    '--user-data-dir=' + path.resolve('scratch/chrome-test-inheritance'),
    'http://localhost:5000/admin-builder.html'
  ]);

  let targets = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      targets = await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:9447/json', res => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
          });
        });
        req.on('error', reject);
      });
      if (targets && targets.length > 0) break;
    } catch (_) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  assert(targets && targets.length > 0, 'Chrome target must be running on port 9447');
  const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('5000')) || targets[0];
  assert(pageTarget, 'Chrome page target must be found');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let idCounter = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = idCounter++;
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await new Promise(r => ws.addEventListener('open', r));
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });

  const liveDraft = {
    id: 'legalbuddy',
    name: 'Legal Buddy',
    publication_status: 'draft',
    sections: [
      {
        id: 'sec_rich_live',
        type: 'rich_text',
        visible: true,
        content: {
          heading: 'Strategic Deep Dive',
          body: '<p>Cuneiform is one of the oldest surviving forms of writing. It was used in Mesopotamia to compose a tremendous number of texts on clay tablets, thousands of which survive to the present day.</p><p>Greek scribes developed other approaches to organizing text, although the earliest Greek and Latin documents were written in solid blocks of capital letters with little to no spacing, paragraph breaks, or punctuation.</p><p>The paragraphos was introduced by scribes in the 4th century AD as a line placed beside a block of text.</p>'
        },
        settings: {
          maxWidth: '100%',
          cardStyle: true,
          fontSize: '16',
          spacing: 'standard'
        }
      }
    ]
  };

  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('tsm_draft_legalbuddy', ${JSON.stringify(JSON.stringify(liveDraft))});
      localStorage.setItem('tsm_live_preview_snapshot', ${JSON.stringify(JSON.stringify(liveDraft))});
      localStorage.setItem('sonicmedia_admin_session', JSON.stringify({ access_token: 'valid_mock_token' }));
    `
  });

  // Navigate to New Tab preview: project.html?id=legalbuddy&preview=true
  await send('Page.navigate', { url: 'http://localhost:5000/project.html?id=legalbuddy&preview=true' });
  // Wait for page to finish loading and mounting dynamic sections
  for (let i = 0; i < 30; i++) {
    const check = await send('Runtime.evaluate', {
      expression: '!!(document.querySelector(".sec-page-surface") && document.querySelector(".sec-heading"))',
      returnByValue: true
    });
    if (check && check.result && check.result.value === true) break;
    await new Promise(r => setTimeout(r, 200));
  }

  const layoutMetrics = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const dyn = document.getElementById('projectDynamicSectionsContainer');
        const surface = document.querySelector('.sec-page-surface');
        const sec = document.querySelector('.sec-block');
        const card = document.querySelector('#projectDynamicSectionsContainer .wd-full-card, .sec-block .wd-full-card');
        const heading = document.querySelector('.sec-heading');
        const body = document.querySelector('.wd-article-body');

        const rDyn = dyn ? dyn.getBoundingClientRect() : null;
        const rSurf = surface ? surface.getBoundingClientRect() : null;
        const rSec = sec ? sec.getBoundingClientRect() : null;
        const rCard = card ? card.getBoundingClientRect() : null;
        const rHeading = heading ? heading.getBoundingClientRect() : null;
        const rBody = body ? body.getBoundingClientRect() : null;

        const csSec = sec ? window.getComputedStyle(sec) : null;
        const csSurf = surface ? window.getComputedStyle(surface) : null;
        const csCard = card ? window.getComputedStyle(card) : null;

        return {
          windowWidth: window.innerWidth,
          dynLeft: rDyn ? Math.round(rDyn.left) : null,
          dynWidth: rDyn ? Math.round(rDyn.width) : null,
          surfaceLeft: rSurf ? Math.round(rSurf.left) : null,
          surfaceWidth: rSurf ? Math.round(rSurf.width) : null,
          secLeft: rSec ? Math.round(rSec.left) : null,
          secWidth: rSec ? Math.round(rSec.width) : null,
          secTransform: csSec ? csSec.transform : null,
          cardLeft: rCard ? Math.round(rCard.left) : null,
          cardWidth: rCard ? Math.round(rCard.width) : null,
          cardOverflow: csCard ? csCard.overflow : null,
          headingLeft: rHeading ? Math.round(rHeading.left) : null,
          headingWidth: rHeading ? Math.round(rHeading.width) : null,
          bodyLeft: rBody ? Math.round(rBody.left) : null,
          bodyWidth: rBody ? Math.round(rBody.width) : null,
          headingText: heading ? heading.textContent.trim() : null,
          secInnerHtml: document.querySelector('.sec-inner') ? document.querySelector('.sec-inner').innerHTML.substring(0, 300) : null
        };
      })()
    `,
    returnByValue: true
  });

  const m = layoutMetrics.result.value;
  console.log('Layout Metrics in New Tab Preview:', JSON.stringify(m, null, 2));

  assert.strictEqual(m.headingText, 'Strategic Deep Dive', 'Heading text must be "Strategic Deep Dive"');
  assert(m.cardLeft !== null, 'Card element (.wd-full-card) must be rendered');
  assert.strictEqual(m.cardOverflow, 'visible', 'Card overflow must be "visible" to prevent text clipping');
  assert(m.headingLeft > m.cardLeft, `Heading (${m.headingLeft}px) must be inside card left edge (${m.cardLeft}px)`);
  assert(m.bodyLeft > m.cardLeft, `Body (${m.bodyLeft}px) must be inside card left edge (${m.cardLeft}px)`);
  assert(m.headingLeft + m.headingWidth <= m.cardLeft + m.cardWidth + 10, 'Heading must fit inside card right edge');
  assert(m.bodyLeft + m.bodyWidth <= m.cardLeft + m.cardWidth + 10, 'Body must fit inside card right edge');
  assert(m.secTransform === 'none' || m.secTransform === 'matrix(1, 0, 0, 1, 0, 0)', 'Section transform must be neutralized without offset shifts');

  console.log('✓ New Tab preview correctly inherits centered layout, sharp typography, and zero coordinate clipping');

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/preview_inheritance_verified.png', Buffer.from(shot.data, 'base64'));
  console.log('✓ Screenshot saved to scratch/preview_inheritance_verified.png');

  ws.close();
  chrome.kill();
  console.log('\n=======================================');
  console.log('ALL PREVIEW INHERITANCE TESTS PASSED');
  console.log('=======================================');
}

verifyPreviewInheritance().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
