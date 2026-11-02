const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('=== VERIFYING FONT SIZE SLIDER SMOOTHNESS & CONTINUOUS KEYBOARD NAVIGATION ===\n');

  const tmpDir = path.join(os.tmpdir(), 'chrome_font_e2e_' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromePort = 9230;

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
      const reqId = id++;
      pending.set(reqId, { resolve, reject });
      ws.send(JSON.stringify({ id: reqId, method, params }));
    });
  }

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');

  const mockAdminSession = {
    access_token: 'mock-test-admin-token',
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    user: { id: 'admin-user', email: 'admin@thesonicmedia.com' }
  };

  const initialDraft = {
    id: 'test-font-verify',
    name: 'Font Smoothness E2E Test',
    contentType: 'portfolio',
    sections: [
      {
        id: 'sec_ba_test',
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
          fontSize: '48px'
        }
      }
    ],
    updatedAt: Date.now()
  };

  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('sonicmedia_admin_session', ${JSON.stringify(JSON.stringify(mockAdminSession))});
      localStorage.setItem('tsm_draft_test-font-verify', ${JSON.stringify(JSON.stringify(initialDraft))});
    `
  });

  await send('Page.navigate', { url: 'http://localhost:5000/admin-builder.html?id=test-font-verify' });

  for (let i = 0; i < 40; i++) {
    await sleep(400);
    const ready = await send('Runtime.evaluate', {
      expression: `typeof window.state !== 'undefined' && Array.isArray(window.state.sections) && window.state.sections.length > 0`,
      returnByValue: true
    });
    if (ready.result?.value) break;
  }
  await sleep(1200);

  // 1. Select the heading
  const selectRes = await send('Runtime.evaluate', {
    expression: `(function() {
      const heading = document.querySelector('#canvas_sec_sec_ba_test .sec-heading, #canvas_sec_sec_ba_test h1, #canvas_sec_sec_ba_test h2, #canvas_sec_sec_ba_test h3');
      if (!heading) return { error: 'heading element not found' };
      heading.click();
      return {
        selected: !!state.selectedElementEl,
        candKey: state.selectedElementCand?.key,
        numInputExists: !!document.getElementById('elFontSizeNum'),
        rangeSliderExists: !!document.getElementById('elFontSizeRange'),
        labelExists: !!document.getElementById('elFontSizeVal'),
        initialNumVal: document.getElementById('elFontSizeNum')?.value,
        initialRangeVal: document.getElementById('elFontSizeRange')?.value,
        initialLabelText: document.getElementById('elFontSizeVal')?.textContent
      };
    })()`,
    returnByValue: true
  });

  console.log('1. Element Selection & Toolkit Initialization:');
  console.log(selectRes.result.value);
  assert(selectRes.result.value.selected, 'Heading must be selected');
  assert(selectRes.result.value.numInputExists, 'elFontSizeNum must exist');
  assert(selectRes.result.value.rangeSliderExists, 'elFontSizeRange must exist');
  assert.strictEqual(selectRes.result.value.initialNumVal, '48', 'Initial font size must be 48');
  console.log('✓ Heading selected and initial Font Size is 48px\n');

  // 2. Test Clicking "Font Size" label directly -> must focus #elFontSizeNum
  const labelClickRes = await send('Runtime.evaluate', {
    expression: `(function() {
      const label = document.querySelector('label[for="elFontSizeNum"]');
      if (!label) return { error: 'label not found' };
      label.click();
      return {
        focusedId: document.activeElement ? document.activeElement.id : null,
        isNumFocused: document.activeElement === document.getElementById('elFontSizeNum')
      };
    })()`,
    returnByValue: true
  });
  console.log('2. Clicking "Font Size" Label Focus Test:');
  console.log(labelClickRes.result.value);
  assert(labelClickRes.result.value.isNumFocused, 'Clicking label must focus #elFontSizeNum');
  console.log('✓ Label click instantly focuses number input\n');

  // 3. Test continuous keyboard ArrowUp: 10 times in a row without pause
  console.log('3. Testing Continuous Keyboard ArrowUp (10 consecutive presses):');
  for (let i = 1; i <= 10; i++) {
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
    await sleep(50);
  }

  const afterTenUps = await send('Runtime.evaluate', {
    expression: `(function() {
      const num = document.getElementById('elFontSizeNum');
      const range = document.getElementById('elFontSizeRange');
      const label = document.getElementById('elFontSizeVal');
      const canvasHeading = document.querySelector('#canvas_sec_sec_ba_test .sec-heading, #canvas_sec_sec_ba_test h1, #canvas_sec_sec_ba_test h2, #canvas_sec_sec_ba_test h3');
      return {
        activeId: document.activeElement ? document.activeElement.id : null,
        isStillFocused: document.activeElement === num,
        numVal: num ? num.value : null,
        rangeVal: range ? range.value : null,
        labelText: label ? label.textContent : null,
        canvasFontSize: canvasHeading ? canvasHeading.style.fontSize : null
      };
    })()`,
    returnByValue: true
  });
  console.log(afterTenUps.result.value);
  assert(afterTenUps.result.value.isStillFocused, 'Number input must STAY focused across 10 continuous presses');
  assert.strictEqual(afterTenUps.result.value.numVal, '58', 'Font size must increment from 48 to 58 (48 + 10)');
  assert.strictEqual(afterTenUps.result.value.rangeVal, '58', 'Slider must sync to 58');
  assert.strictEqual(afterTenUps.result.value.labelText, '58px', 'Label must show 58px');
  assert.strictEqual(afterTenUps.result.value.canvasFontSize, '58px', 'Canvas live heading must update to 58px');
  console.log('✓ 10 continuous ArrowUp presses: perfectly incremented 48 -> 58 without single focus loss!\n');

  // 4. Test Shift + ArrowDown: jumps by 5
  console.log('4. Testing Shift + ArrowDown (big step = 5):');
  await send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key: 'ArrowDown',
    code: 'ArrowDown',
    windowsVirtualKeyCode: 40,
    modifiers: 8 // Shift modifier
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'ArrowDown',
    code: 'ArrowDown',
    windowsVirtualKeyCode: 40
  });
  await sleep(100);

  const afterShiftDown = await send('Runtime.evaluate', {
    expression: `(function() {
      const num = document.getElementById('elFontSizeNum');
      return {
        isStillFocused: document.activeElement === num,
        numVal: num?.value,
        labelText: document.getElementById('elFontSizeVal')?.textContent
      };
    })()`,
    returnByValue: true
  });
  console.log(afterShiftDown.result.value);
  assert.strictEqual(afterShiftDown.result.value.numVal, '53', '58 - 5 must equal 53');
  console.log('✓ Shift + ArrowDown stepped down by 5 to 53px cleanly!\n');

  // 5. Test Range Slider Dragging (Simulation of live slider moves)
  console.log('5. Testing Range Slider Dragging & Smooth Updates:');
  const sliderMoves = [54, 56, 58, 60, 62, 64, 66, 68, 70, 72];
  for (const targetVal of sliderMoves) {
    await send('Runtime.evaluate', {
      expression: `(function() {
        const range = document.getElementById('elFontSizeRange');
        range.value = ${targetVal};
        range.dispatchEvent(new Event('input', { bubbles: true }));
      })()`
    });
    await sleep(20);
  }

  // Commit at 72px
  await send('Runtime.evaluate', {
    expression: `(function() {
      const range = document.getElementById('elFontSizeRange');
      range.dispatchEvent(new Event('change', { bubbles: true }));
    })()`
  });
  await sleep(500);

  const afterSliderDrag = await send('Runtime.evaluate', {
    expression: `(function() {
      const num = document.getElementById('elFontSizeNum');
      const range = document.getElementById('elFontSizeRange');
      const label = document.getElementById('elFontSizeVal');
      const canvasHeading = document.querySelector('#canvas_sec_sec_ba_test .sec-heading, #canvas_sec_sec_ba_test h1, #canvas_sec_sec_ba_test h2, #canvas_sec_sec_ba_test h3');
      const savedDraft = JSON.parse(localStorage.getItem('tsm_draft_test-font-verify') || '{}');
      const secInDraft = savedDraft.sections ? savedDraft.sections[0] : null;
      return {
        numVal: num?.value,
        rangeVal: range?.value,
        labelText: label?.textContent,
        canvasFontSize: canvasHeading?.style.fontSize,
        savedFontSize: secInDraft?.settings?.fontSize || secInDraft?.settings?.elementStyles?.heading?.fontSize
      };
    })()`,
    returnByValue: true
  });
  console.log(afterSliderDrag.result.value);
  assert.strictEqual(afterSliderDrag.result.value.numVal, '72', 'Number input must sync to 72');
  assert.strictEqual(afterSliderDrag.result.value.rangeVal, '72', 'Range slider must stay at 72');
  assert.strictEqual(afterSliderDrag.result.value.labelText, '72px', 'Label must show 72px');
  assert.strictEqual(afterSliderDrag.result.value.canvasFontSize, '72px', 'Canvas live heading must be 72px');
  assert.strictEqual(afterSliderDrag.result.value.savedFontSize, '72px', 'Draft saved locally must persist 72px');
  console.log('✓ Slider smoothly dragged across 10 steps to 72px with automatic local draft persistence!\n');

  // 6. Test Line Height and Letter Spacing continuous arrows
  console.log('6. Testing Line Height and Letter Spacing keydown handlers:');
  const otherTypoTest = await send('Runtime.evaluate', {
    expression: `(function() {
      const lhNum = document.getElementById('elLineHeightNum');
      const lsNum = document.getElementById('elLetterSpacingNum');
      if (!lhNum || !lsNum) return { error: 'Line height or letter spacing controls not found' };

      // Test Line Height ArrowUp
      lhNum.focus();
      const lhInitial = parseFloat(lhNum.value);
      const eUp = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
      lhNum.dispatchEvent(eUp);
      const lhAfter = parseFloat(lhNum.value);

      // Test Letter Spacing ArrowUp
      lsNum.focus();
      const lsInitial = parseFloat(lsNum.value);
      const eUp2 = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
      lsNum.dispatchEvent(eUp2);
      const lsAfter = parseFloat(lsNum.value);

      return {
        lhInitial,
        lhAfter,
        lsInitial,
        lsAfter,
        lhStepped: lhAfter > lhInitial,
        lsStepped: lsAfter > lsInitial
      };
    })()`,
    returnByValue: true
  });
  console.log(otherTypoTest.result.value);
  assert(otherTypoTest.result.value.lhStepped, 'Line height must increment on ArrowUp');
  assert(otherTypoTest.result.value.lsStepped, 'Letter spacing must increment on ArrowUp');
  console.log('✓ Line Height and Letter Spacing keydown steppers operate flawlessly!\n');

  console.log('🎉 ALL TESTS PASSED! Font slider is buttery smooth and keyboard navigation is continuous!');

  ws.close();
  chromeProcess.kill();
}

run().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
