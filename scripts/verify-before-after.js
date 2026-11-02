// Automated Verification Test for Before / After Comparison Feature
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('Testing Before / After Comparison Feature...');

// 1. Verify CSS styles in section-builder.css
const cssPath = path.join(__dirname, '..', 'assets', 'css', 'section-builder.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

if (!cssContent.includes('.sec-ba-container')) {
  throw new Error('FAIL: .sec-ba-container missing in section-builder.css');
}
if (!cssContent.includes('.sec-ba-container[data-direction="vertical"]')) {
  throw new Error('FAIL: data-direction="vertical" missing in section-builder.css');
}
if (!cssContent.includes('.sec-ba-handle')) {
  throw new Error('FAIL: .sec-ba-handle missing in section-builder.css');
}
console.log('✓ section-builder.css contains all required before/after styles');

// 2. Verify section-registry.js renderer & interactive logic
const registryPath = path.join(__dirname, '..', 'assets', 'js', 'section-registry.js');
const registryCode = fs.readFileSync(registryPath, 'utf8');

// Set up minimal browser-like sandbox
const sandbox = {
  window: {},
  document: {
    createElement: () => ({ style: {}, setAttribute: () => {} }),
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  navigator: {},
  console: console
};
sandbox.window = sandbox;
sandbox.global = sandbox;

vm.createContext(sandbox);
vm.runInContext(registryCode, sandbox);

const SectionRegistry = sandbox.SectionRegistry;
if (!SectionRegistry) {
  throw new Error('FAIL: SectionRegistry not defined');
}

const baDef = SectionRegistry.get('before_after');
if (!baDef) {
  throw new Error('FAIL: before_after not registered in SectionRegistry');
}

// Test 1: Default 16:9 Horizontal render
const defaultSec = {
  id: 'test_ba_1',
  type: 'before_after',
  content: {
    heading: 'Transformation 16:9',
    beforeUrl: 'https://example.com/before.jpg',
    beforeLabel: 'Original',
    afterUrl: 'https://example.com/after.jpg',
    afterLabel: 'Modern'
  },
  settings: {
    aspectRatio: '16:9',
    sliderDirection: 'horizontal'
  }
};

const html169 = baDef.render(defaultSec, { isPublic: true });
if (!html169.includes('padding-top:56.25%')) {
  throw new Error('FAIL: 16:9 ratio did not produce padding-top:56.25%');
}
if (!html169.includes('clip-path: polygon(0 0, var(--pos, 50%) 0, var(--pos, 50%) 100%, 0 100%)')) {
  throw new Error('FAIL: Horizontal slider did not produce X-axis polygon clip-path');
}
if (!html169.includes('data-direction="horizontal"')) {
  throw new Error('FAIL: data-direction="horizontal" attribute missing');
}
if (!html169.includes('◀▶')) {
  throw new Error('FAIL: Horizontal handle knob icon ◀▶ missing');
}
console.log('✓ 16:9 Landscape Horizontal render verified');

// Test 2: 9:16 Vertical render
const portraitSec = {
  id: 'test_ba_2',
  type: 'before_after',
  content: {
    heading: 'Mobile Flyer Transformation',
    beforeUrl: 'https://example.com/poster-before.jpg',
    afterUrl: 'https://example.com/poster-after.jpg'
  },
  settings: {
    aspectRatio: '9:16',
    sliderDirection: 'vertical'
  }
};

const html916 = baDef.render(portraitSec, { isPublic: true });
if (!html916.includes('padding-top:177.78%')) {
  throw new Error('FAIL: 9:16 ratio did not produce padding-top:177.78%');
}
if (!html916.includes('clip-path: polygon(0 0, 100% 0, 100% var(--pos, 50%), 0 var(--pos, 50%))')) {
  throw new Error('FAIL: Vertical slider did not produce Y-axis polygon clip-path');
}
if (!html916.includes('data-direction="vertical"')) {
  throw new Error('FAIL: data-direction="vertical" attribute missing');
}
if (!html916.includes('▲▼')) {
  throw new Error('FAIL: Vertical handle knob icon ▲▼ missing');
}
if (!html916.includes('max-width:460px')) {
  throw new Error('FAIL: 9:16 ratio default width 460px missing');
}
console.log('✓ 9:16 Portrait Vertical render verified');

// Test 3: Empty placeholders
const emptySec = {
  id: 'test_ba_3',
  type: 'before_after',
  content: {
    heading: 'Empty Test',
    beforeUrl: '',
    afterUrl: ''
  },
  settings: {
    aspectRatio: '16:9'
  }
};
const htmlEmpty = baDef.render(emptySec, { isPublic: false, isSelected: true });
if (!htmlEmpty.includes('Before Image') || !htmlEmpty.includes('After Image')) {
  throw new Error('FAIL: Empty image placeholders missing');
}
console.log('✓ Empty image fallback placeholders verified');

// 3. Verify admin-builder.html inspector & helpers
const builderPath = path.join(__dirname, '..', 'admin-builder.html');
const builderHtml = fs.readFileSync(builderPath, 'utf8');

if (!builderHtml.includes('setBeforeAfterRatio')) {
  throw new Error('FAIL: setBeforeAfterRatio function missing in admin-builder.html');
}
if (!builderHtml.includes('setBeforeAfterDirection')) {
  throw new Error('FAIL: setBeforeAfterDirection function missing in admin-builder.html');
}
if (!builderHtml.includes('uploadBeforeAfterAsset')) {
  throw new Error('FAIL: uploadBeforeAfterAsset function missing in admin-builder.html');
}
if (!builderHtml.includes('Aspect Ratio Format')) {
  throw new Error('FAIL: Aspect Ratio Format control missing in admin-builder.html inspector');
}
if (!builderHtml.includes('Slider Comparison Direction')) {
  throw new Error('FAIL: Slider Comparison Direction control missing in admin-builder.html inspector');
}
if (!builderHtml.includes("if (img.closest('.sec-ba-container')) return;")) {
  throw new Error('FAIL: initImagePanHandlers exclusion for .sec-ba-container missing');
}
console.log('✓ admin-builder.html inspector controls and helpers verified');

console.log('\nAll Before / After Comparison tests passed successfully! 🎉');
