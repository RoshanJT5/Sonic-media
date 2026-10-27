'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('assets/js/section-registry.js', 'utf8');
const windowObject = {
  DOMPurify: { sanitize: val => String(val) },
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
vm.runInContext(source, context);
const registry = windowObject.SectionRegistry;

// 1. Test text_image default (image right, text left)
const textImgSec = registry.createSection('text_image');
assert.strictEqual(textImgSec.settings.imagePosition, 'right', 'Default imagePosition must be right');
const renderRight = registry.renderSection(textImgSec, { viewport: 'desktop', isPublic: false });
assert(renderRight.includes('sec-text-col'), 'Must include sec-text-col');
assert(renderRight.includes('sec-img-col'), 'Must include sec-img-col');
// In textCol + imgCol order, sec-text-col should appear before sec-img-col
const textPosR = renderRight.indexOf('sec-text-col');
const imgPosR = renderRight.indexOf('sec-img-col');
assert(textPosR < imgPosR, 'In default mode, text column must precede image column');

// 2. Test text_image swapped (image left, text right)
textImgSec.settings.imagePosition = 'left';
const renderLeft = registry.renderSection(textImgSec, { viewport: 'desktop', isPublic: false });
const textPosL = renderLeft.indexOf('sec-text-col');
const imgPosL = renderLeft.indexOf('sec-img-col');
assert(imgPosL < textPosL, 'In swapped mode, image column must precede text column');

// 3. Test public rendering for Live Preview & New Tab
const publicRenderLeft = registry.renderSection(textImgSec, { viewport: 'desktop', isPublic: true });
const pubTextPosL = publicRenderLeft.indexOf('sec-text-col');
const pubImgPosL = publicRenderLeft.indexOf('sec-img-col');
assert(pubImgPosL < pubTextPosL, 'In public swapped mode, image column must precede text column');

// 4. Test serialization roundtrip retains imagePosition
const serialized = registry.serializeSections([textImgSec]);
assert.strictEqual(serialized[0].settings.imagePosition, 'left', 'Serialized section must retain imagePosition');
const migrated = registry.migrateSection(serialized[0]);
assert.strictEqual(migrated.settings.imagePosition, 'left', 'Migrated section must retain imagePosition');

// 5. Test admin-builder.html has swapSectionCards and setSectionCardArrangement
const builderCode = fs.readFileSync('admin-builder.html', 'utf8');
assert(builderCode.includes('window.swapSectionCards'), 'admin-builder.html must export swapSectionCards');
assert(builderCode.includes('window.setSectionCardArrangement'), 'admin-builder.html must export setSectionCardArrangement');
assert(builderCode.includes('Swap Card Positions'), 'admin-builder.html must include Swap Card Positions UI');

console.log('✓ All Card Interchange & Swap tests PASSED successfully!');
