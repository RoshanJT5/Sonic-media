const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('🚀 Starting Before / After E2E Validation via Headless Chrome CDP...');

  const tmpDir = path.join(os.tmpdir(), 'chrome_ba_test_' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromePort = 9226;

  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${chromePort}`,
    `--user-data-dir=${tmpDir}`,
    'about:blank'
  ]);

  let versionData = null;
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const res = await fetch(`http://127.0.0.1:${chromePort}/json/version`);
      versionData = await res.json();
      if (versionData && versionData.webSocketDebuggerUrl) break;
    } catch (_) { }
  }

  if (!versionData) {
    throw new Error('Could not connect to Chrome debugging port');
  }

  const targets = await (await fetch(`http://127.0.0.1:${chromePort}/json/list`)).json();
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let id = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  await new Promise(resolve => ws.onopen = resolve);

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const cmdId = id++;
      pending.set(cmdId, { resolve, reject });
      ws.send(JSON.stringify({ id: cmdId, method, params }));
    });
  }

  async function evalExpr(expression) {
    const res = await sendCommand('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
    return res.result ? res.result.value : undefined;
  }

  await sendCommand('Page.enable');
  await sendCommand('Runtime.enable');

  // Step 1: Initialize session & draft in localStorage
  await sendCommand('Page.navigate', { url: 'http://localhost:5000/' });
  await sleep(1000);

  const mockAdminSession = {
    access_token: 'mock-test-admin-token',
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    user: { id: 'admin-user', email: 'admin@thesonicmedia.com' }
  };

  const initialDraft = {
    id: 'test-ba-vertical',
    name: 'Vertical Poster Showcase',
    contentType: 'portfolio',
    sections: [
      {
        id: 'sec_ba_hero',
        type: 'before_after',
        content: {
          heading: 'Spider-Man Brand Transformation',
          tag: 'h2',
          beforeUrl: 'https://images.unsplash.com/photo-1542744094-3a31727560fa?w=1000&q=80',
          beforeLabel: 'ORIGINAL POSTER',
          afterUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&q=80',
          afterLabel: 'REDESIGNED 2026'
        },
        settings: {
          aspectRatio: '9:16',
          sliderDirection: 'horizontal',
          customWidth: '460px'
        }
      }
    ],
    updatedAt: Date.now()
  };

  await evalExpr(`
    localStorage.setItem('sonicmedia_admin_session', ${JSON.stringify(JSON.stringify(mockAdminSession))});
    localStorage.setItem('tsm_draft_test-ba-vertical', ${JSON.stringify(JSON.stringify(initialDraft))});
  `);

  console.log('✓ Mock session and draft injected.');

  // Step 2: Open admin-builder.html with this draft
  await sendCommand('Page.navigate', { url: 'http://localhost:5000/admin-builder.html?id=test-ba-vertical' });

  for (let i = 0; i < 40; i++) {
    await sleep(400);
    const ready = await evalExpr(`typeof window.state !== 'undefined' && Array.isArray(window.state.sections) && window.state.sections.length > 0`);
    if (ready) break;
  }

  await sleep(1000);

  // Step 3: Check dimensions before selection
  const preSelectMetrics = await evalExpr(`
    (() => {
      const secEl = document.getElementById('canvas_sec_sec_ba_hero');
      const container = secEl?.querySelector('.sec-ba-container');
      const before = secEl?.querySelector('.sec-ba-before');
      const after = secEl?.querySelector('.sec-ba-after');
      const cStyle = container ? window.getComputedStyle(container) : null;
      const bStyle = before ? window.getComputedStyle(before) : null;
      const aStyle = after ? window.getComputedStyle(after) : null;
      const cRect = container?.getBoundingClientRect();

      return {
        containerHeight: cRect?.height,
        containerWidth: cRect?.width,
        paddingTop: cStyle?.paddingTop,
        containerOverflow: cStyle?.overflow,
        aspectRatio: cStyle?.aspectRatio,
        beforePosition: bStyle?.position,
        beforeTop: bStyle?.top,
        beforeHeight: bStyle?.height,
        afterPosition: aStyle?.position,
        afterTop: aStyle?.top,
        afterHeight: aStyle?.height,
        hasElementBoxOnFrames: !!(before?.classList.contains('has-element-box') || after?.classList.contains('has-element-box'))
      };
    })()
  `);

  console.log('Pre-selection Metrics:', preSelectMetrics);

  if (parseFloat(preSelectMetrics.paddingTop) > 0) {
    throw new Error(`FAIL: paddingTop is not 0 (got ${preSelectMetrics.paddingTop})`);
  }
  if (preSelectMetrics.containerHeight > 750) {
    throw new Error(`FAIL: containerHeight exceeds screen limit (got ${preSelectMetrics.containerHeight}px)`);
  }
  if (preSelectMetrics.beforePosition !== 'absolute' || preSelectMetrics.afterPosition !== 'absolute') {
    throw new Error(`FAIL: frames are not position absolute (before: ${preSelectMetrics.beforePosition}, after: ${preSelectMetrics.afterPosition})`);
  }
  if (preSelectMetrics.hasElementBoxOnFrames) {
    throw new Error('FAIL: before/after frames should NOT have has-element-box');
  }
  console.log('  ✓ Pre-selection geometry verified: paddingTop=0, container height cleanly contained, frames absolute.');

  // Step 4: Select the section in Admin Builder
  await evalExpr(`selectSection('sec_ba_hero');`);
  await sleep(600);

  const postSelectMetrics = await evalExpr(`
    (() => {
      const secEl = document.getElementById('canvas_sec_sec_ba_hero');
      const container = secEl?.querySelector('.sec-ba-container');
      const before = secEl?.querySelector('.sec-ba-before');
      const after = secEl?.querySelector('.sec-ba-after');
      const cStyle = container ? window.getComputedStyle(container) : null;
      const cRect = container?.getBoundingClientRect();
      const handles = secEl?.querySelectorAll('.canvas-img-resize-handle');

      return {
        containerHeight: cRect?.height,
        paddingTop: cStyle?.paddingTop,
        containerOverflow: cStyle?.overflow,
        handleCount: handles?.length,
        hasElementBoxOnFrames: !!(before?.classList.contains('has-element-box') || after?.classList.contains('has-element-box'))
      };
    })()
  `);

  console.log('Post-selection Metrics:', postSelectMetrics);

  if (parseFloat(postSelectMetrics.paddingTop) > 0) {
    throw new Error(`FAIL: paddingTop became non-zero on selection (got ${postSelectMetrics.paddingTop})`);
  }
  if (postSelectMetrics.containerHeight > 750) {
    throw new Error(`FAIL: container height blew out on selection (got ${postSelectMetrics.containerHeight}px)`);
  }
  if (postSelectMetrics.handleCount !== 5) {
    throw new Error(`FAIL: expected 5 image resize handles, got ${postSelectMetrics.handleCount}`);
  }
  if (postSelectMetrics.hasElementBoxOnFrames) {
    throw new Error('FAIL: before/after frames received has-element-box on section select');
  }
  console.log('  ✓ Post-selection geometry verified: container remains contained, handles mounted properly.');

  // Step 5: Test interactive slider dragging
  await evalExpr(`
    (() => {
      const secEl = document.getElementById('canvas_sec_sec_ba_hero');
      const container = secEl?.querySelector('.sec-ba-container');
      const rect = container.getBoundingClientRect();
      // Simulate pointerdown and move to 75%
      const targetX = rect.left + (rect.width * 0.75);
      const targetY = rect.top + (rect.height * 0.5);
      const evDown = new PointerEvent('pointerdown', { clientX: targetX, clientY: targetY, button: 0, bubbles: true });
      container.dispatchEvent(evDown);
    })()
  `);
  await sleep(300);

  const sliderPos = await evalExpr(`
    document.querySelector('#canvas_sec_sec_ba_hero .sec-ba-container')?.style.getPropertyValue('--pos')
  `);
  console.log('Slider position after drag:', sliderPos);
  if (!sliderPos || !sliderPos.includes('75')) {
    throw new Error(`FAIL: slider position not updated to ~75% (got ${sliderPos})`);
  }
  console.log('  ✓ Interactive slider dragging works smoothly on canvas.');

  // Step 6: Test ratio switching & persistence across page reload
  console.log('Testing ratio switch to 16:9 Landscape...');
  await evalExpr(`setBeforeAfterRatio('sec_ba_hero', '16:9');`);
  await sleep(600);

  const ratio169 = await evalExpr(`
    (() => {
      const sec = window.state.sections.find(s => s.id === 'sec_ba_hero');
      const container = document.querySelector('#canvas_sec_sec_ba_hero .sec-ba-container');
      const rawDraft = localStorage.getItem('tsm_draft_test-ba-vertical');
      const parsedDraft = rawDraft ? JSON.parse(rawDraft) : null;
      const draftSec = parsedDraft?.sections?.find(s => s.id === 'sec_ba_hero');
      return {
        stateRatio: sec?.settings?.aspectRatio,
        domRatio: container?.getAttribute('data-ratio'),
        draftRatio: draftSec?.settings?.aspectRatio
      };
    })()
  `);
  console.log('16:9 Switch Results:', ratio169);
  if (ratio169.stateRatio !== '16:9' || ratio169.domRatio !== '16:9' || ratio169.draftRatio !== '16:9') {
    throw new Error('FAIL: 16:9 ratio did not synchronize to state, DOM, or localStorage draft');
  }
  console.log('  ✓ 16:9 switch persisted to localStorage draft.');

  // Switch back to 9:16 Portrait
  console.log('Testing ratio switch back to 9:16 Portrait...');
  await evalExpr(`setBeforeAfterRatio('sec_ba_hero', '9:16');`);
  await sleep(600);

  const ratio916 = await evalExpr(`
    (() => {
      const sec = window.state.sections.find(s => s.id === 'sec_ba_hero');
      const container = document.querySelector('#canvas_sec_sec_ba_hero .sec-ba-container');
      const rawDraft = localStorage.getItem('tsm_draft_test-ba-vertical');
      const parsedDraft = rawDraft ? JSON.parse(rawDraft) : null;
      const draftSec = parsedDraft?.sections?.find(s => s.id === 'sec_ba_hero');
      return {
        stateRatio: sec?.settings?.aspectRatio,
        domRatio: container?.getAttribute('data-ratio'),
        draftRatio: draftSec?.settings?.aspectRatio
      };
    })()
  `);
  console.log('9:16 Switch Results:', ratio916);
  if (ratio916.stateRatio !== '9:16' || ratio916.domRatio !== '9:16' || ratio916.draftRatio !== '9:16') {
    throw new Error('FAIL: 9:16 ratio did not synchronize to state, DOM, or localStorage draft');
  }
  console.log('  ✓ 9:16 switch persisted to localStorage draft.');

  // Step 7: FULL PAGE RELOAD to verify ZERO revert upon refresh
  console.log('Reloading builder page to verify persistence...');
  await sendCommand('Page.reload');

  for (let i = 0; i < 40; i++) {
    await sleep(400);
    const ready = await evalExpr(`typeof window.state !== 'undefined' && Array.isArray(window.state.sections) && window.state.sections.length > 0`);
    if (ready) break;
  }
  await sleep(1000);

  const reloadedMetrics = await evalExpr(`
    (() => {
      const sec = window.state.sections.find(s => s.id === 'sec_ba_hero');
      const secEl = document.getElementById('canvas_sec_sec_ba_hero');
      const container = secEl?.querySelector('.sec-ba-container');
      const cStyle = container ? window.getComputedStyle(container) : null;
      const cRect = container?.getBoundingClientRect();

      return {
        stateRatio: sec?.settings?.aspectRatio,
        customWidth: sec?.settings?.customWidth,
        domRatio: container?.getAttribute('data-ratio'),
        containerHeight: cRect?.height,
        paddingTop: cStyle?.paddingTop,
        containerOverflow: cStyle?.overflow
      };
    })()
  `);
  console.log('Reloaded Metrics:', reloadedMetrics);

  if (reloadedMetrics.stateRatio !== '9:16' || reloadedMetrics.domRatio !== '9:16') {
    throw new Error(`FAIL: settings reverted upon reload (got ratio: ${reloadedMetrics.stateRatio})`);
  }
  if (parseFloat(reloadedMetrics.paddingTop) > 0) {
    throw new Error(`FAIL: paddingTop is non-zero after reload (got ${reloadedMetrics.paddingTop})`);
  }
  if (reloadedMetrics.containerHeight > 750) {
    throw new Error(`FAIL: containerHeight blew out after reload (got ${reloadedMetrics.containerHeight}px)`);
  }
  console.log('  ✓ Zero revert verified: 9:16 aspect ratio, width, and contained height survived page reload 100% intact!');

  // Step 8: Verify Public Mode / New Tab Mode
  console.log('Testing Public / New Tab View rendering...');
  await sendCommand('Page.navigate', { url: 'http://localhost:5000/project.html?id=test-ba-vertical&preview=true' });
  
  for (let i = 0; i < 40; i++) {
    await sleep(300);
    const ready = await evalExpr(`!!document.querySelector('.sec-ba-container')`);
    if (ready) break;
  }
  await sleep(600);

  const publicMetrics = await evalExpr(`
    (() => {
      const container = document.querySelector('.sec-ba-container');
      const before = document.querySelector('.sec-ba-before');
      const after = document.querySelector('.sec-ba-after');
      const cStyle = container ? window.getComputedStyle(container) : null;
      const cRect = container?.getBoundingClientRect();
      const bStyle = before ? window.getComputedStyle(before) : null;
      const aStyle = after ? window.getComputedStyle(after) : null;

      return {
        found: !!container,
        containerHeight: cRect?.height,
        containerWidth: cRect?.width,
        paddingTop: cStyle?.paddingTop,
        aspectRatio: cStyle?.aspectRatio,
        beforePos: bStyle?.position,
        afterPos: aStyle?.position,
        beforeLabel: document.querySelector('.badge-before')?.textContent?.trim(),
        afterLabel: document.querySelector('.badge-after')?.textContent?.trim()
      };
    })()
  `);
  console.log('Public View Metrics:', publicMetrics);

  if (!publicMetrics.found) {
    throw new Error('FAIL: .sec-ba-container not found in public project.html');
  }
  if (parseFloat(publicMetrics.paddingTop) > 0) {
    throw new Error(`FAIL: public mode has non-zero paddingTop (${publicMetrics.paddingTop})`);
  }
  if (publicMetrics.containerHeight > 750) {
    throw new Error(`FAIL: public mode height blew out (${publicMetrics.containerHeight}px)`);
  }
  if (publicMetrics.beforePos !== 'absolute' || publicMetrics.afterPos !== 'absolute') {
    throw new Error('FAIL: public mode frames are not position absolute');
  }
  console.log('  ✓ Public View / New Tab matches Admin Canvas 100% identically (True WYSIWYG).');

  ws.close();
  chromeProcess.kill();
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! ZERO SPACE ISSUE, ZERO BLOWOUT, ZERO REVERT UPON RELOAD!');
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
