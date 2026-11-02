const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('=== VERIFYING INPUT FOCUS & CURSOR PERSISTENCE IN ADMIN PANEL ===\n');

  const tmpDir = path.join(os.tmpdir(), 'chrome_focus_e2e_' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromePort = 9231;

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
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || a.description).join(' ');
      if (text.includes('[restoreActiveElementFocus]')) console.log('    BROWSER LOG:', text);
    }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const reqId = id++;
      pending.set(reqId, { resolve, reject });
      ws.send(JSON.stringify({ id: reqId, method, params }));
    });
  }

  await new Promise(resolve => ws.onopen = resolve);

  await send('Page.enable');
  await send('Runtime.enable');

  try {
    console.log('1. Setting up mock admin session in localStorage and navigating to builder...');
    await send('Page.navigate', { url: 'http://localhost:5000/' });
    await sleep(1000);

    const mockAdminSession = {
      access_token: 'mock-test-admin-token',
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      user: { id: 'admin-user', email: 'admin@thesonicmedia.com' }
    };

    const initialDraft = {
      id: 'test-focus-project',
      name: 'Focus Persistence E2E Test',
      contentType: 'portfolio',
      sections: [
        {
          id: 'sec_test_heading',
          type: 'heading',
          content: {
            text: 'Crafting the sonic media',
            subtitle: 'Strategic digital branding'
          },
          settings: {
            fontSize: '36',
            fontFamily: "'Outfit', sans-serif"
          }
        }
      ],
      updatedAt: Date.now()
    };

    await send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('sonicmedia_admin_session', ${JSON.stringify(JSON.stringify(mockAdminSession))});
        localStorage.setItem('tsm_draft_test-focus-project', ${JSON.stringify(JSON.stringify(initialDraft))});
      `
    });

    const targetUrl = 'http://localhost:5000/admin-builder.html?id=test-focus-project';
    await send('Page.navigate', { url: targetUrl });

    for (let i = 0; i < 40; i++) {
      await sleep(400);
      const ready = await send('Runtime.evaluate', {
        expression: `typeof window.state !== 'undefined' && Array.isArray(window.state.sections) && window.state.sections.length > 0`,
        returnByValue: true
      });
      if (ready.result?.value) break;
    }
    await sleep(1200);

    console.log('2. Ensuring Heading section is selected and properties are visible...');
    await send('Runtime.evaluate', {
      expression: `
        selectSection('sec_test_heading');
        renderProperties();
      `
    });
    await sleep(600);

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Heading Text textarea focus persistence during thinking pause (>1200ms)
    // ─────────────────────────────────────────────────────────────
    console.log('3. Testing Heading Text textarea focus persistence during 1.8s thinking pause...');
    const t1Initial = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const ta = document.querySelector('textarea.prop-textarea[data-field="text"]');
          if (!ta) {
            return {
              success: false,
              reason: 'Heading textarea not found',
              selectedSectionId: state.selectedSectionId,
              sectionTypes: (state.sections || []).map(s => s.type),
              allTextareas: Array.from(document.querySelectorAll('textarea')).map(t => ({
                class: t.className,
                field: t.getAttribute('data-field'),
                val: t.value.slice(0, 30)
              })),
              propBodySnippet: (document.getElementById('propertiesBody')?.innerHTML || '').slice(0, 300)
            };
          }
          ta.focus();
          ta.value = 'Crafting the sonic media';
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          return {
            success: true,
            isFocused: document.activeElement === ta,
            val: ta.value
          };
        })()
      `
    });
    console.log('t1Initial result:', t1Initial.result.value);
    assert.strictEqual(t1Initial.result.value.success, true, 'Heading textarea should exist');
    assert.strictEqual(t1Initial.result.value.isFocused, true, 'Heading textarea should be actively focused');
    console.log('   ✓ Heading textarea focused and text typed ("Crafting the sonic media")');

    console.log('   Waiting 1800ms (thinking pause, exceeds 1200ms auto-draft backup timer)...');
    await sleep(1800);

    const t1AfterPause = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const ta = document.querySelector('textarea.prop-textarea[data-field="text"]');
          return {
            isFocused: document.activeElement === ta,
            activeTag: document.activeElement ? document.activeElement.tagName : 'NONE',
            activeField: document.activeElement ? document.activeElement.getAttribute('data-field') : null,
            val: ta ? ta.value : null
          };
        })()
      `
    });
    assert.strictEqual(t1AfterPause.result.value.isFocused, true, 'Heading textarea MUST retain focus after 1800ms thinking pause');
    console.log('   ✓ Focus retained! Cursor did NOT disappear after pause.');

    // Continue typing without re-clicking
    console.log('   Continuing to type immediately without clicking...');
    const t1Continued = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const ta = document.activeElement;
          if (!ta || ta.tagName !== 'TEXTAREA') return { success: false };
          ta.value += ' - Next Level';
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          return { success: true, val: ta.value, isFocused: document.activeElement === ta };
        })()
      `
    });
    assert.strictEqual(t1Continued.result.value.success, true, 'Active textarea was typed into continuously');
    assert.strictEqual(t1Continued.result.value.isFocused, true, 'Textarea still actively focused');
    console.log('   ✓ Seamless continuous typing verified:', t1Continued.result.value.val);

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Subtitle / Description input field focus persistence
    // ─────────────────────────────────────────────────────────────
    console.log('\n4. Testing Subtitle / Description input focus persistence during thinking pause...');
    const t2Initial = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const inp = document.querySelector('input.prop-input[oninput*="subtitle"]');
          if (!inp) return { success: false, reason: 'Subtitle input not found' };
          inp.focus();
          inp.value = 'Designing iconic digital brands';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          return {
            success: true,
            isFocused: document.activeElement === inp,
            val: inp.value
          };
        })()
      `
    });
    assert.strictEqual(t2Initial.result.value.success, true, 'Subtitle input should exist');
    assert.strictEqual(t2Initial.result.value.isFocused, true, 'Subtitle input must be focused');
    console.log('   ✓ Subtitle input focused and typed');

    console.log('   Waiting 1800ms thinking pause...');
    await sleep(1800);

    const t2AfterPause = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const inp = document.querySelector('input.prop-input[oninput*="subtitle"]');
          return {
            isFocused: document.activeElement === inp,
            activeTag: document.activeElement ? document.activeElement.tagName : 'NONE'
          };
        })()
      `
    });
    assert.strictEqual(t2AfterPause.result.value.isFocused, true, 'Subtitle input MUST retain focus after pause');
    console.log('   ✓ Subtitle input retained focus! Cursor did not disappear.');

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Project Listing Drawer inputs (cardName, cardCategory, cardOrder)
    // ─────────────────────────────────────────────────────────────
    console.log('\n5. Testing Project Listing drawer inputs focus persistence...');
    await send('Runtime.evaluate', {
      expression: `window.switchLeftTab('card');`
    });
    await sleep(300);

    const t3Title = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const nameInput = document.getElementById('cardName');
          if (!nameInput) return { success: false, reason: 'cardName not found' };
          nameInput.focus();
          nameInput.value = 'Awesome Project 2026';
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          return { success: true, isFocused: document.activeElement === nameInput };
        })()
      `
    });
    assert.strictEqual(t3Title.result.value.success, true, 'cardName should exist');
    assert.strictEqual(t3Title.result.value.isFocused, true, 'cardName must be focused');

    console.log('   Waiting 1800ms thinking pause on cardName...');
    await sleep(1800);

    const t3TitleAfter = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const nameInput = document.getElementById('cardName');
          return { isFocused: document.activeElement === nameInput };
        })()
      `
    });
    assert.strictEqual(t3TitleAfter.result.value.isFocused, true, 'cardName MUST retain focus after pause');
    console.log('   ✓ cardName retained focus!');

    const t3Cat = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const catInput = document.getElementById('cardCategory');
          if (!catInput) return { success: false, reason: 'cardCategory not found' };
          catInput.focus();
          catInput.value = 'Brand Identity & Web';
          catInput.dispatchEvent(new Event('input', { bubbles: true }));
          return { success: true, isFocused: document.activeElement === catInput };
        })()
      `
    });
    assert.strictEqual(t3Cat.result.value.isFocused, true, 'cardCategory must be focused');

    console.log('   Waiting 1800ms thinking pause on cardCategory...');
    await sleep(1800);

    const t3CatAfter = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const catInput = document.getElementById('cardCategory');
          return { isFocused: document.activeElement === catInput };
        })()
      `
    });
    assert.strictEqual(t3CatAfter.result.value.isFocused, true, 'cardCategory MUST retain focus after pause');
    console.log('   ✓ cardCategory retained focus!');

    // ─────────────────────────────────────────────────────────────
    // TEST 4: renderProperties() with active focus preservation
    // ─────────────────────────────────────────────────────────────
    console.log('\n6. Testing renderProperties() direct invocation with active input focus preservation...');
    await send('Runtime.evaluate', {
      expression: `
        window.switchLeftTab('structure');
        selectSection('sec_test_heading');
        renderProperties();
      `
    });
    await sleep(300);

    const t4Render = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const ta = document.querySelector('textarea.prop-textarea[data-field="text"]');
          ta.focus();
          ta.setSelectionRange(5, 10);
          const startBefore = ta.selectionStart;
          const endBefore = ta.selectionEnd;
          const focusInfoBefore = window.saveActiveElementFocus(document.getElementById('propertiesBody'));

          // Explicitly call renderProperties while user has active selection/focus in textarea
          renderProperties();

          const newTa = document.querySelector('textarea.prop-textarea[data-field="text"]');
          return {
            focusInfoBefore,
            isFocused: document.activeElement === newTa,
            activeTag: document.activeElement?.tagName,
            activeField: document.activeElement?.getAttribute('data-field'),
            selectionStart: newTa ? newTa.selectionStart : null,
            selectionEnd: newTa ? newTa.selectionEnd : null,
            expectedStart: startBefore,
            expectedEnd: endBefore
          };
        })()
      `
    });
    console.log('t4Render value:', t4Render.result.value);
    assert.strictEqual(t4Render.result.value.isFocused, true, 'renderProperties must restore focus to active input');
    assert.strictEqual(t4Render.result.value.selectionStart, 5, 'Selection start must be preserved');
    assert.strictEqual(t4Render.result.value.selectionEnd, 10, 'Selection end must be preserved');
    console.log('   ✓ renderProperties preserved active focus and selection range [5, 10] perfectly!');

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Broadcast / storage event guard while actively typing
    // ─────────────────────────────────────────────────────────────
    console.log('\n7. Testing incoming sync guard when input is actively focused...');
    const t5Sync = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const ta = document.querySelector('textarea.prop-textarea[data-field="text"]');
          ta.focus();
          ta.value = 'Protected Local Editing';

          // Simulate incoming storage event from external source
          const storageEvent = new StorageEvent('storage', {
            key: 'tsm_draft_test-focus-project',
            newValue: JSON.stringify({
              sections: [{ id: 'sec_remote', type: 'heading', content: { text: 'Remote overwrite' } }],
              updatedAt: Date.now() + 5000
            })
          });
          window.dispatchEvent(storageEvent);

          return {
            isFocused: document.activeElement === ta,
            val: ta.value
          };
        })()
      `
    });
    assert.strictEqual(t5Sync.result.value.isFocused, true, 'Input must NOT lose focus on background storage event');
    assert.strictEqual(t5Sync.result.value.val, 'Protected Local Editing', 'Local typing was protected from remote clobbering');
    console.log('   ✓ Input focus and active typing were 100% protected against background clobbering!');

    console.log('\n=======================================================');
    console.log('🎉 ALL TESTS PASSED! Input focus and cursor caret NEVER disappear.');
    console.log('=======================================================');

  } finally {
    ws.close();
    chromeProcess.kill();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) { }
  }
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
