const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('=== VERIFYING TEXT ALIGNMENT BUTTON TWO-WAY SYNCHRONIZATION ===\n');

  // ── Part 1: Static Code Analysis ──
  console.log('1. Checking admin-builder.html source code...');
  const html = fs.readFileSync(path.join(__dirname, '..', 'admin-builder.html'), 'utf8');

  // Verify floating toolbar buttons
  assert(html.includes('id="wdpadBtnAlignLeft"'), 'Floating toolbar missing wdpadBtnAlignLeft');
  assert(html.includes('id="wdpadBtnAlignCenter"'), 'Floating toolbar missing wdpadBtnAlignCenter');
  assert(html.includes('id="wdpadBtnAlignRight"'), 'Floating toolbar missing wdpadBtnAlignRight');
  assert(html.includes('id="wdpadBtnAlignJustify"'), 'Floating toolbar missing wdpadBtnAlignJustify');
  console.log('  ✓ Floating toolbar contains Left (⇤), Center (⇋), Right (⇥), and Justify (≡) buttons');

  // Verify right panel alignment buttons in element toolkit
  assert(html.includes("onclick=\"window.updateActiveElementStyle('textAlign', 'left'); renderProperties();\""), 'Element toolkit missing Left button wire');
  assert(html.includes("onclick=\"window.updateActiveElementStyle('textAlign', 'center'); renderProperties();\""), 'Element toolkit missing Center button wire');
  assert(html.includes("onclick=\"window.updateActiveElementStyle('textAlign', 'right'); renderProperties();\""), 'Element toolkit missing Right button wire');
  assert(html.includes("onclick=\"window.updateActiveElementStyle('textAlign', 'justify'); renderProperties();\""), 'Element toolkit missing Justify button wire');
  console.log('  ✓ Right panel element properties toolkit wired for Left, Center, Right, Justify');

  // Verify wdpadExecuteCommand alignment implementation
  assert(html.includes("window.updateActiveElementStyle('textAlign', align, false)"), 'wdpadExecuteCommand must call updateActiveElementStyle');
  assert(html.includes("updateSetting('textAlign', align)"), 'wdpadExecuteCommand must handle textarea updateSetting');
  console.log('  ✓ wdpadExecuteCommand properly calls updateActiveElementStyle and updateSetting');

  // Verify wdpadUpdateActiveButtonStates active class toggles
  assert(html.includes("btnAl.classList.toggle('active', detectedAlign === 'left')"), 'wdpadUpdateActiveButtonStates missing btnAl toggle');
  assert(html.includes("btnAc.classList.toggle('active', detectedAlign === 'center')"), 'wdpadUpdateActiveButtonStates missing btnAc toggle');
  assert(html.includes("btnAr.classList.toggle('active', detectedAlign === 'right')"), 'wdpadUpdateActiveButtonStates missing btnAr toggle');
  assert(html.includes("btnAj.classList.toggle('active', detectedAlign === 'justify')"), 'wdpadUpdateActiveButtonStates missing btnAj toggle');
  console.log('  ✓ wdpadUpdateActiveButtonStates detects and synchronizes active alignment state');

  // ── Part 2: End-to-End Browser Automation via Chrome CDP ──
  console.log('\n2. Starting Headless Chrome for live interaction testing...');

  const tmpDir = path.join(os.tmpdir(), 'chrome_align_e2e_' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromePort = 9232;

  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${chromePort}`,
    `--user-data-dir=${tmpDir}`,
    'http://localhost:5000/'
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
    chromeProcess.kill();
    throw new Error('Could not connect to Chrome debugging port');
  }

  const targets = await (await fetch(`http://127.0.0.1:${chromePort}/json/list`)).json();
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let id = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await new Promise(resolve => ws.onopen = resolve);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error('Eval exception: ' + JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  }

  console.log('  Setting up mock admin session and test draft project...');
  await send('Page.navigate', { url: 'http://localhost:5000/' });
  await sleep(1000);

  const mockAdminSession = {
    access_token: 'mock-test-admin-token',
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    user: { id: 'admin-user', email: 'admin@thesonicmedia.com' }
  };

  const initialDraft = {
    id: 'test-align-project',
    name: 'Alignment Wire Test',
    contentType: 'portfolio',
    sections: [
      {
        id: 'sec_test_align',
        type: 'heading',
        content: {
          text: 'Sonic Media Branding',
          subtitle: 'Leading the future of agency design'
        },
        settings: {
          fontSize: '48',
          fontFamily: "'Syne', sans-serif",
          textAlign: 'left'
        }
      }
    ],
    updatedAt: Date.now()
  };

  await evaluate(`
    localStorage.setItem('sonicmedia_admin_session', ${JSON.stringify(JSON.stringify(mockAdminSession))});
    localStorage.setItem('tsm_draft_test-align-project', ${JSON.stringify(JSON.stringify(initialDraft))});
  `);

  const targetUrl = 'http://localhost:5000/admin-builder.html?id=test-align-project';
  console.log('  Navigating to:', targetUrl);
  await send('Page.navigate', { url: targetUrl });

  for (let i = 0; i < 40; i++) {
    await sleep(400);
    const ready = await evaluate(`typeof window.state !== 'undefined' && Array.isArray(window.state.sections) && window.state.sections.length > 0`);
    if (ready) break;
  }
  await sleep(1000);

  // Select the heading section and heading element on the canvas
  const setupResult = await evaluate(`
    (() => {
      selectSection('sec_test_align');
      renderCanvas();
      renderProperties();

      const secEl = document.getElementById('canvas_sec_sec_test_align');
      const headingEl = secEl ? secEl.querySelector('h1, h2, h3, .sec-heading') : null;
      if (headingEl) {
        const sec = state.sections[0];
        const cand = { el: headingEl, key: 'heading', label: 'Heading', type: 'heading' };
        selectElementAdjustmentBox(headingEl, cand, sec, sec.id, document.getElementById('builderCanvas'));
        renderProperties();
      }

      if (typeof window.wdpadUpdateActiveButtonStates === 'function') {
        window.wdpadUpdateActiveButtonStates();
      }

      return {
        selectedSectionId: state.selectedSectionId,
        selectedElementKey: state.selectedElementKey,
        hasMiniKit: !!document.getElementById('wdpadMiniKit'),
        hasRightPanelProps: !!document.getElementById('propertiesBody')
      };
    })()
  `);
  console.log('  Setup result:', setupResult);

  // ── Test 1: Click Floating Toolbar "Center" (⇋) -> check right panel updates to Center and text centers ──
  console.log('\n  --- Test Step 1: Click Floating Toolbar "Center" (⇋) ---');
  const test1 = await evaluate(`
    (() => {
      const diag = {
        hasWdpadState: !!window.wdpadState,
        wdpadState: window.wdpadState ? { activeType: window.wdpadState.activeType, field: window.wdpadState.field, secId: window.wdpadState.secId } : null,
        hasSelectedEl: !!state.selectedElementEl,
        selectedElementCand: state.selectedElementCand,
        selectedElementSectionId: state.selectedElementSectionId,
        selectedSectionId: state.selectedSectionId,
        secFound: !!getSectionById(state.selectedElementSectionId || state.selectedSectionId)
      };
      
      const btnAc = document.getElementById('wdpadBtnAlignCenter');
      if (btnAc) {
        btnAc.click();
      } else {
        window.wdpadExecuteCommand('justifyCenter');
      }

      diag.isFloatingCenterActive = document.getElementById('wdpadBtnAlignCenter')?.classList.contains('active');
      const rightPanelBtns = Array.from(document.querySelectorAll('#propertiesBody button'));
      diag.allRightBtnTexts = rightPanelBtns.map(b => b.textContent.trim());
      const centerBtn = rightPanelBtns.find(b => b.textContent.trim() === 'Center');
      diag.isRightPanelCenterActive = centerBtn ? (centerBtn.classList.contains('btn-primary') || centerBtn.classList.contains('active')) : false;
      diag.elTextAlign = state.selectedElementEl ? state.selectedElementEl.style.textAlign : null;
      diag.headingCompTextAlign = state.selectedElementEl ? window.getComputedStyle(state.selectedElementEl).textAlign : null;
      return diag;
    })()
  `);
  console.log('  Test 1 diagnostic:', test1);
  assert.strictEqual(test1.isFloatingCenterActive, true, 'Floating Center button must be active');
  assert.strictEqual(test1.isRightPanelCenterActive, true, 'Right panel Center button must be active');
  assert.strictEqual(test1.elTextAlign, 'center', 'Element style textAlign must be center');
  console.log('  ✓ Floating toolbar Center button correctly centered element and synchronized right panel inspector!');

  // ── Test 2: Click Right Panel "Right" button -> check floating toolbar updates to Right (⇥) ──
  console.log('\n  --- Test Step 2: Click Right Panel "Right" button ---');
  const test2 = await evaluate(`
    (() => {
      const rightPanelBtns = Array.from(document.querySelectorAll('#propertiesBody button'));
      const rightBtn = rightPanelBtns.find(b => b.textContent.trim() === 'Right');
      if (rightBtn) {
        rightBtn.click();
      } else {
        window.updateActiveElementStyle('textAlign', 'right');
        renderProperties();
      }
      // Check states
      const isFloatingRightActive = document.getElementById('wdpadBtnAlignRight')?.classList.contains('active');
      const isFloatingCenterActive = document.getElementById('wdpadBtnAlignCenter')?.classList.contains('active');
      const curRightBtn = Array.from(document.querySelectorAll('#propertiesBody button')).find(b => b.textContent.trim() === 'Right');
      const isRightPanelRightActive = curRightBtn ? (curRightBtn.classList.contains('btn-primary') || curRightBtn.classList.contains('active')) : false;
      const elTextAlign = state.selectedElementEl ? state.selectedElementEl.style.textAlign : null;
      return { isFloatingRightActive, isFloatingCenterActive, isRightPanelRightActive, elTextAlign };
    })()
  `);
  console.log('  Test 2 result:', test2);
  assert.strictEqual(test2.isFloatingRightActive, true, 'Floating Right button must be active');
  assert.strictEqual(test2.isFloatingCenterActive, false, 'Floating Center button must no longer be active');
  assert.strictEqual(test2.isRightPanelRightActive, true, 'Right panel Right button must be active');
  assert.strictEqual(test2.elTextAlign, 'right', 'Element style textAlign must be right');
  console.log('  ✓ Right panel Right button correctly set element alignment and synchronized floating toolbar!');

  // ── Test 3: Click Floating Toolbar "Justify" (≡) -> check right panel updates to Justify ──
  console.log('\n  --- Test Step 3: Click Floating Toolbar "Justify" (≡) ---');
  const test3 = await evaluate(`
    (() => {
      const btnAj = document.getElementById('wdpadBtnAlignJustify');
      if (btnAj) {
        btnAj.click();
      } else {
        window.wdpadExecuteCommand('justifyFull');
      }
      // Check states
      const isFloatingJustifyActive = document.getElementById('wdpadBtnAlignJustify')?.classList.contains('active');
      const rightPanelBtns = Array.from(document.querySelectorAll('#propertiesBody button'));
      const justifyBtn = rightPanelBtns.find(b => b.textContent.trim() === 'Justify');
      const isRightPanelJustifyActive = justifyBtn ? (justifyBtn.classList.contains('btn-primary') || justifyBtn.classList.contains('active')) : false;
      const elTextAlign = state.selectedElementEl ? state.selectedElementEl.style.textAlign : null;
      return { isFloatingJustifyActive, isRightPanelJustifyActive, elTextAlign };
    })()
  `);
  console.log('  Test 3 result:', test3);
  assert.strictEqual(test3.isFloatingJustifyActive, true, 'Floating Justify button must be active');
  assert.strictEqual(test3.isRightPanelJustifyActive, true, 'Right panel Justify button must be active');
  assert.strictEqual(test3.elTextAlign, 'justify', 'Element style textAlign must be justify');
  console.log('  ✓ Floating toolbar Justify button correctly set element alignment and synchronized right panel inspector!');

  // ── Test 4: Click Right Panel "Left" button -> check floating toolbar updates to Left (⇤) ──
  console.log('\n  --- Test Step 4: Click Right Panel "Left" button ---');
  const test4 = await evaluate(`
    (() => {
      const rightPanelBtns = Array.from(document.querySelectorAll('#propertiesBody button'));
      const leftBtn = rightPanelBtns.find(b => b.textContent.trim() === 'Left');
      if (leftBtn) {
        leftBtn.click();
      } else {
        window.updateActiveElementStyle('textAlign', 'left');
        renderProperties();
      }
      // Check states
      const isFloatingLeftActive = document.getElementById('wdpadBtnAlignLeft')?.classList.contains('active');
      const isFloatingJustifyActive = document.getElementById('wdpadBtnAlignJustify')?.classList.contains('active');
      const curLeftBtn = Array.from(document.querySelectorAll('#propertiesBody button')).find(b => b.textContent.trim() === 'Left');
      const isRightPanelLeftActive = curLeftBtn ? (curLeftBtn.classList.contains('btn-primary') || curLeftBtn.classList.contains('active')) : false;
      const elTextAlign = state.selectedElementEl ? state.selectedElementEl.style.textAlign : null;
      return { isFloatingLeftActive, isFloatingJustifyActive, isRightPanelLeftActive, elTextAlign };
    })()
  `);
  console.log('  Test 4 result:', test4);
  assert.strictEqual(test4.isFloatingLeftActive, true, 'Floating Left button must be active');
  assert.strictEqual(test4.isFloatingJustifyActive, false, 'Floating Justify button must no longer be active');
  assert.strictEqual(test4.isRightPanelLeftActive, true, 'Right panel Left button must be active');
  assert.strictEqual(test4.elTextAlign, 'left', 'Element style textAlign must be left');
  console.log('  ✓ Right panel Left button correctly set element alignment and synchronized floating toolbar!');

  // Clean up
  ws.close();
  chromeProcess.kill();
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (_) { }

  console.log('\n======================================================');
  console.log('🎉 ALL TESTS PASSED: Bi-directional Text Alignment synchronization');
  console.log('   between Floating Selection Toolbar and Right Panel is 100% verified!');
  console.log('======================================================\n');
}

run().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
