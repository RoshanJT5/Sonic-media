'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// 1. Test SectionRegistry serialization with custom containers
const regSource = fs.readFileSync('assets/js/section-registry.js', 'utf8');
const windowObject = {
  DOMPurify: { sanitize: value => String(value) },
  document: { documentElement: { clientWidth: 1440 }, querySelectorAll: () => [] }
};
windowObject.window = windowObject;
const context = {
  window: windowObject,
  self: windowObject,
  document: windowObject.document,
  console,
  URL,
  setTimeout,
  clearTimeout,
  requestAnimationFrame: cb => cb(),
  cancelAnimationFrame: () => {}
};
vm.createContext(context);
vm.runInContext(regSource, context);
const registry = windowObject.SectionRegistry;

const testSection = registry.createSection('heading');
testSection.settings.customContainers = [
  {
    id: 'cnt_123',
    type: 'container',
    content: { heading: 'New Container Heading', text: 'Live preview body text' },
    position: { x: 50, y: 100 },
    width: '450px'
  }
];

// Test serialize
const serialized = registry.serializeSections([testSection]);
assert(Array.isArray(serialized), 'Serialized must be an array');
assert(serialized[0].settings.customContainers, 'settings.customContainers must exist in serialized output');
assert.strictEqual(serialized[0].settings.customContainers.length, 1, 'settings.customContainers must contain 1 container');
assert.strictEqual(serialized[0].settings.customContainers[0].id, 'cnt_123');
assert.strictEqual(serialized[0].settings.customContainers[0].content.heading, 'New Container Heading');

// JSON round-trip (which happens during localStorage.setItem)
const jsonStr = JSON.stringify(serialized);
const parsed = JSON.parse(jsonStr);
assert(parsed[0].settings.customContainers, 'JSON parse must retain settings.customContainers');
assert.strictEqual(parsed[0].settings.customContainers[0].content.heading, 'New Container Heading');

// Test migrateSection round-trip
const migrated = registry.migrateSection(parsed[0]);
assert(migrated.settings.customContainers, 'Migrated must retain customContainers');
assert.strictEqual(migrated.settings.customContainers[0].id, 'cnt_123');

console.log('✓ SectionRegistry serialization round-trip with customContainers verified successfully');

// 2. Verify all preview consumer files have resolveLocalDraft and BroadcastChannel setup
for (const file of ['project.html', 'case-study.html', 'article.html']) {
  const content = fs.readFileSync(file, 'utf8');
  assert(content.includes('resolveLocalDraft'), `${file} must contain resolveLocalDraft`);
  assert(content.includes('sonicmedia_preview_sync'), `${file} must contain sonicmedia_preview_sync channel`);
  assert(content.includes('TSM_REQUEST_LIVE_PREVIEW_DATA'), `${file} must request live preview data`);
  assert(content.includes('TSM_PREVIEW_SYNC'), `${file} must handle TSM_PREVIEW_SYNC`);
  assert(content.includes("tsm_live_preview_snapshot"), `${file} must check tsm_live_preview_snapshot`);
  console.log(`✓ ${file} verified for instant preview hydration & sync`);
}

// 3. Verify admin-builder.html flushes and broadcasts
const builderContent = fs.readFileSync('admin-builder.html', 'utf8');
assert(builderContent.includes('flushCanvasDomToState'), 'admin-builder.html must include flushCanvasDomToState');
assert(builderContent.includes('broadcastPreviewSync'), 'admin-builder.html must include broadcastPreviewSync');
assert(builderContent.includes('tsm_live_preview_snapshot'), 'admin-builder.html must save tsm_live_preview_snapshot');
assert(builderContent.includes('TSM_REQUEST_LIVE_PREVIEW_DATA'), 'admin-builder.html must listen for TSM_REQUEST_LIVE_PREVIEW_DATA');
console.log('✓ admin-builder.html verified for canvas flushing and live broadcast');

console.log('\nAll sync verification tests PASSED!');
