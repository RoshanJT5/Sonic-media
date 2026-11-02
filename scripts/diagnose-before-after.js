const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const tmpDir = path.join(os.tmpdir(), 'chrome_diag_' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromePort = 9224;

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

  await sendCommand('Page.navigate', { url: 'http://localhost:5000/' });
  await sleep(1000);

  const mockAdminSession = {
    access_token: 'mock-test-admin-token',
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    user: { id: 'admin-user', email: 'admin@thesonicmedia.com' }
  };

  const initialDraft = {
    id: 'test-ba-diag',
    name: 'Test BA Diag',
    contentType: 'portfolio',
    sections: [
      {
        id: 'sec_ba_test',
        type: 'before_after',
        content: {
          heading: 'Brand Transformation: Before & After',
          beforeUrl: 'https://images.unsplash.com/photo-1542744094-3a31727560fa?w=1000&q=80',
          beforeLabel: 'Original Identity',
          afterUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&q=80',
          afterLabel: 'Redesigned Modern Platform'
        },
        settings: {
          aspectRatio: '9:16',
          sliderDirection: 'horizontal'
        }
      }
    ],
    updatedAt: Date.now()
  };

  await evalExpr(`
    localStorage.setItem('sonicmedia_admin_session', ${JSON.stringify(JSON.stringify(mockAdminSession))});
    localStorage.setItem('tsm_draft_test-ba-diag', ${JSON.stringify(JSON.stringify(initialDraft))});
  `);

  await sendCommand('Page.navigate', { url: 'http://localhost:5000/admin-builder.html?id=test-ba-diag' });

  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const ready = await evalExpr(`typeof window.state !== 'undefined' && Array.isArray(window.state.sections) && window.state.sections.length > 0`);
    if (ready) break;
  }

  await sleep(1000);

  const diag = await evalExpr(`
    (() => {
      const secEl = document.getElementById('canvas_sec_sec_ba_test');
      const baContainer = secEl?.querySelector('.sec-ba-container');
      const beforeFrame = secEl?.querySelector('.sec-ba-before');
      const afterFrame = secEl?.querySelector('.sec-ba-after');
      const beforeImg = beforeFrame?.querySelector('img');
      const afterImg = afterFrame?.querySelector('img');
      const wrap = baContainer?.parentElement;

      function getInfo(el) {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        return {
          tagName: el.tagName,
          className: el.className,
          rect: { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom },
          computed: {
            position: cs.position,
            display: cs.display,
            width: cs.width,
            height: cs.height,
            paddingTop: cs.paddingTop,
            overflow: cs.overflow,
            transform: cs.transform
          },
          inlineStyle: el.getAttribute('style')
        };
      }

      return {
        secEl: getInfo(secEl),
        wrap: getInfo(wrap),
        baContainer: getInfo(baContainer),
        beforeFrame: getInfo(beforeFrame),
        afterFrame: getInfo(afterFrame),
        beforeImg: getInfo(beforeImg),
        afterImg: getInfo(afterImg),
        activeSelected: secEl?.classList.contains('active-selected')
      };
    })()
  `);

  console.log('DIAGNOSTICS BEFORE SELECTION:\n', JSON.stringify(diag, null, 2));

  // Now select the section (as in admin builder when user clicks section)
  await evalExpr(`
    selectSection('sec_ba_test');
  `);
  await sleep(1000);

  const diagSelected = await evalExpr(`
    (() => {
      const secEl = document.getElementById('canvas_sec_sec_ba_test');
      const baContainer = secEl?.querySelector('.sec-ba-container');
      const beforeFrame = secEl?.querySelector('.sec-ba-before');
      const afterFrame = secEl?.querySelector('.sec-ba-after');
      const beforeImg = beforeFrame?.querySelector('img');
      const afterImg = afterFrame?.querySelector('img');
      const wrap = baContainer?.parentElement;

      function getInfo(el) {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        return {
          tagName: el.tagName,
          className: el.className,
          rect: { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom },
          computed: {
            position: cs.position,
            display: cs.display,
            width: cs.width,
            height: cs.height,
            paddingTop: cs.paddingTop,
            overflow: cs.overflow,
            transform: cs.transform
          },
          inlineStyle: el.getAttribute('style')
        };
      }

      return {
        secEl: getInfo(secEl),
        wrap: getInfo(wrap),
        baContainer: getInfo(baContainer),
        beforeFrame: getInfo(beforeFrame),
        afterFrame: getInfo(afterFrame),
        beforeImg: getInfo(beforeImg),
        afterImg: getInfo(afterImg),
        activeSelected: secEl?.classList.contains('active-selected')
      };
    })()
  `);

  console.log('\nDIAGNOSTICS AFTER SELECTION:\n', JSON.stringify(diagSelected, null, 2));

  ws.close();
  chromeProcess.kill();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

run().catch(console.error);
