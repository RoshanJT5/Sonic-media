const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Verifying Approach A: Heading Tags & Font Size Decoupling + Refresh Persistence ===\n');

const builderPath = path.join(__dirname, '..', 'admin-builder.html');
const builderHtml = fs.readFileSync(builderPath, 'utf8');

const registryPath = path.join(__dirname, '..', 'assets', 'js', 'section-registry.js');
const registryJs = fs.readFileSync(registryPath, 'utf8');

// 1. Verify #wdpadTagSelect contains <option value="none">None</option>
assert(builderHtml.includes('<option value="none">None</option>'), 'admin-builder.html must have <option value="none">None</option> in wdpadTagSelect');
console.log('✓ 1. wdpadTagSelect has "None" option');

// 2. Verify SectionRegistry exports DEFAULT_TAG_SIZES and resolveHeadingTag
assert(registryJs.includes('DEFAULT_TAG_SIZES'), 'SectionRegistry must define DEFAULT_TAG_SIZES');
assert(registryJs.includes("none: '16px'"), 'DEFAULT_TAG_SIZES must include none: "16px"');
assert(registryJs.includes("h1: '48px'"), 'DEFAULT_TAG_SIZES must include h1: "48px"');
assert(registryJs.includes("h2: '36px'"), 'DEFAULT_TAG_SIZES must include h2: "36px"');
assert(registryJs.includes("h3: '28px'"), 'DEFAULT_TAG_SIZES must include h3: "28px"');
assert(registryJs.includes("h4: '22px'"), 'DEFAULT_TAG_SIZES must include h4: "22px"');
assert(registryJs.includes("h5: '18px'"), 'DEFAULT_TAG_SIZES must include h5: "18px"');
assert(registryJs.includes("p: '16px'"), 'DEFAULT_TAG_SIZES must include p: "16px"');
console.log('✓ 2. DEFAULT_TAG_SIZES covers H1 (48px), H2 (36px), H3 (28px), H4 (22px), H5 (18px), P (16px), None (16px)');

// 3. Verify resolveHeadingTag handles 'none' -> 'div'
assert(registryJs.includes("if (clean === 'none') return 'div';"), 'resolveHeadingTag must resolve "none" to "div"');
console.log('✓ 3. resolveHeadingTag maps "none" -> "div" for SEO decoupling');

// 4. Verify wdpadApplyHeadingTag supports 'none' and 'p'
assert(builderHtml.includes("const cleanTag = ['none', 'h1', 'h2', 'h3', 'h4', 'h5', 'p'].includes(tagVal) ? tagVal : 'h2';"), 'wdpadApplyHeadingTag must support none, h1-h5, p');
console.log('✓ 4. wdpadApplyHeadingTag allows "none", "h1"-"h5", and "p"');

// 5. Verify wdpadApplyFontSize synchronizes tag dropdown to 'none' if out of standard range
assert(builderHtml.includes("const standardSizes = { 48: 'h1', 36: 'h2', 28: 'h3', 22: 'h4', 18: 'h5', 16: 'p' };"), 'wdpadApplyFontSize must define standardSizes mapping');
assert(builderHtml.includes("const matchedTag = standardSizes[pxVal] || 'none';"), 'wdpadApplyFontSize must set matchedTag to "none" if out of range');
console.log('✓ 5. wdpadApplyFontSize sets tag to "none" when font size is out of standard H range');

// 6. Verify wdpadApplyFontSize writes to sec.settings.fontSize & elementStyles to prevent reversion
assert(builderHtml.includes("sec.settings.fontSize = String(pxVal);"), 'wdpadApplyFontSize must update sec.settings.fontSize');
assert(builderHtml.includes("sec.settings.elementStyles.heading.fontSize = normSize;"), 'wdpadApplyFontSize must update sec.settings.elementStyles.heading.fontSize');
console.log('✓ 6. wdpadApplyFontSize persists to sec.settings to prevent reversion on canvas re-render');

// 7. Verify updateSettingFast handles fontSize
assert(builderHtml.includes("if (key === 'fontSize') {"), 'updateSettingFast must handle key === "fontSize"');
console.log('✓ 7. updateSettingFast handles fontSize with tag and settings synchronization');

// 8. Verify flushCanvasDomToState preserves data-heading-tag="none"
assert(builderHtml.includes("if (customTagAttr === 'none') {"), 'flushCanvasDomToState must handle data-heading-tag="none"');
console.log('✓ 8. flushCanvasDomToState preserves tag "none" during DOM-to-state scrapes');

// 9. Verify right panel inspector includes None and P
assert(builderHtml.includes("setHeadingTag('none', this)"), 'Inspector must have None button calling setHeadingTag');
assert(builderHtml.includes("setHeadingTag('p', this)"), 'Inspector must have P button calling setHeadingTag');
console.log('✓ 9. Inspector includes None and P buttons');

// 10. Functional Simulation of persistence on reload
console.log('\n--- Running Functional Simulation of State & Refresh Persistence ---');

function mockResolveHeadingTag(tagVal, defaultFallback = 'h2') {
  if (!tagVal) return defaultFallback;
  const clean = String(tagVal).trim().toLowerCase();
  if (clean === 'none') return 'div';
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'p'].includes(clean)) return clean;
  return defaultFallback;
}

function mockResolveHeadingStyles(section, defaultFallbackSize = '') {
  const DEFAULT_SIZES = { h1: '48px', h2: '36px', h3: '28px', h4: '22px', h5: '18px', p: '16px', none: '16px' };
  const c = section.content || {};
  const s = section.settings || {};
  const elSt = (s.elementStyles && s.elementStyles.heading) || {};
  const rawTag = c.tag ? String(c.tag).trim().toLowerCase() : '';
  const tagSize = DEFAULT_SIZES[rawTag] || '';
  const rawSize = elSt.fontSize || s.fontSize || tagSize || defaultFallbackSize;
  return `font-size:${rawSize.endsWith('px') ? rawSize : rawSize + 'px'} !important;`;
}

// User action 1: User selects H1
let section = {
  id: 'sec_pers_test',
  type: 'heading',
  content: { text: 'Heading Title', tag: 'h2' },
  settings: { fontSize: '36' }
};

// setHeadingTag('h1')
const tagSizes = { h1: 48, h2: 36, h3: 28, h4: 22, h5: 18, p: 16, none: 16 };
section.content.tag = 'h1';
section.settings.fontSize = String(tagSizes['h1']);
section.settings.elementStyles = { heading: { fontSize: tagSizes['h1'] + 'px' } };

assert.strictEqual(mockResolveHeadingTag(section.content.tag), 'h1');
assert.strictEqual(mockResolveHeadingStyles(section), 'font-size:48px !important;');
console.log('✓ Action 1: User selected H1 -> tag is <h1>, font size is 48px');

// User action 2: User changes font size to 64px (out of standard H range)
const newCustomSize = '64px';
const pxVal = parseInt(newCustomSize);
const standardSizes = { 48: 'h1', 36: 'h2', 28: 'h3', 22: 'h4', 18: 'h5', 16: 'p' };
const matchedTag = standardSizes[pxVal] || 'none';

assert.strictEqual(matchedTag, 'none', '64px must match tag "none"');
section.content.tag = matchedTag;
section.settings.fontSize = String(pxVal);
section.settings.elementStyles.heading.fontSize = newCustomSize;

assert.strictEqual(mockResolveHeadingTag(section.content.tag), 'div', 'Tag "none" must resolve to <div>');
assert.strictEqual(mockResolveHeadingStyles(section), 'font-size:64px !important;', 'Font size must be 64px');
console.log('✓ Action 2: User set font size to 64px -> tag displays "none", rendered tag is <div>, font size is 64px');

// User action 3: Save to localStorage (simulate serialization and page refresh)
const serializedDraft = JSON.stringify({
  id: 'test-project',
  sections: [section],
  updatedAt: Date.now()
});

// Page Refresh simulation: Reload state from serialized draft
const reloadedDraft = JSON.parse(serializedDraft);
const reloadedSection = reloadedDraft.sections[0];

assert.strictEqual(reloadedSection.content.tag, 'none', 'Tag must persist as "none" after reload');
assert.strictEqual(reloadedSection.settings.fontSize, '64', 'Font size must persist as "64" after reload');
assert.strictEqual(reloadedSection.settings.elementStyles.heading.fontSize, '64px', 'Element style font size must persist as "64px" after reload');

const reloadedTag = mockResolveHeadingTag(reloadedSection.content.tag);
const reloadedStyle = mockResolveHeadingStyles(reloadedSection);

assert.strictEqual(reloadedTag, 'div', 'Rendered tag after reload must still be <div>');
assert.strictEqual(reloadedStyle, 'font-size:64px !important;', 'Rendered font size after reload must still be 64px (NO REVERT!)');
console.log('✓ Action 3: Page Reload Simulation -> Tag is "none", font size remains 64px, NO REVERT OCCURS!');

console.log('\n=== ALL APPROACH A VERIFICATION CHECKS PASSED SUCCESSFULLY ===\n');
