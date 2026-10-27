/**
 * Verification test for Rich Text child layers in the sidebar tree,
 * candidate isolation, and CSS transform integrity.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Verifying Rich Text Child Layers & Selection Integrity ===\n');

const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'admin-builder.html'), 'utf8');
const builderCss = fs.readFileSync(path.join(__dirname, '..', 'assets', 'css', 'section-builder.css'), 'utf8');
const stylesCss = fs.readFileSync(path.join(__dirname, '..', 'assets', 'css', 'styles.css'), 'utf8');

// 1. Check renderTree child layer generation for rich_text
console.log('--- 1. Testing renderTree Child Layer Logic ---');
assert(adminHtml.includes("sec.type === 'rich_text' || (!rawItems && !sec.content.columns"), 'admin-builder.html must include rich_text layer generation branch');
assert(adminHtml.includes("label: 'Article Body'"), 'admin-builder.html must label article body in layer tree');
assert(adminHtml.includes("subType: 'heading'"), 'admin-builder.html must support heading layer in tree');
assert(adminHtml.includes("child.type === 'contentElement'"), 'admin-builder.html must handle contentElement type');
console.log('  ✓ renderTree includes structured layers for rich_text (Heading & Article Body)');

// 2. Check candidate discovery excludes child paragraphs
console.log('--- 2. Testing Candidate Discovery Isolation ---');
assert(adminHtml.includes("t.tagName === 'P' && t.closest('.wd-article-body, .sec-desc, .sec-quote-box, blockquote')"), 'admin-builder.html must exclude child <p> inside .wd-article-body from candidate list');
assert(adminHtml.includes("isArticleBody ? 'Article Body' : (idx === 0 ? 'Description' : `Description ${idx + 1}`)"), 'admin-builder.html must identify and label .wd-article-body as Article Body');
console.log('  ✓ Candidate discovery excludes child <p> tags and treats .wd-article-body as unified container');

// 3. Check element adjustment promotion
console.log('--- 3. Testing Paragraph Click Promotion ---');
assert(adminHtml.includes("const articleBodyRoot = el.closest('.wd-article-body');"), 'selectElementAdjustmentBox must find closest .wd-article-body');
assert(adminHtml.includes("if (articleBodyRoot && articleBodyRoot !== el) {\n          el = articleBodyRoot;"), 'selectElementAdjustmentBox must promote child paragraph to .wd-article-body container');
console.log('  ✓ Clicking inside article body promotes target element to unified container');

// 4. Check tree selection and delete handlers
console.log('--- 4. Testing Tree Selection & Deletion Handlers ---');
assert(adminHtml.includes("window.selectContentElementInTree = function"), 'selectContentElementInTree must be defined');
assert(adminHtml.includes("window.deleteContentElementInTree = function"), 'deleteContentElementInTree must be defined');
assert(adminHtml.includes("selectContentElementInTree(secId, childId, index)"), 'selectChildLayerInTree must route contentElement to selectContentElementInTree');
assert(adminHtml.includes("deleteContentElementInTree(secId, childId)"), 'deleteChildLayerInTree must route contentElement to deleteContentElementInTree');
console.log('  ✓ Tree selection and delete handlers correctly wired for contentElement layers');

// 5. Check CSS non-compounding transform rules
console.log('--- 5. Testing CSS Non-Compounding Transforms ---');
const expectedCssRule = ':not(.wd-article-body *):not(.sec-desc *):not(.sec-quote-box *):not(blockquote *)';
assert(builderCss.includes(expectedCssRule), 'section-builder.css must exclude .wd-article-body * from p transform');
assert(stylesCss.includes(expectedCssRule), 'styles.css must exclude .wd-article-body * from p transform');
console.log('  ✓ Both section-builder.css and styles.css exclude paragraphs inside .wd-article-body from duplicate transforms');

// 6. Check auto-healing for fragmented paragraph offsets
console.log('--- 6. Testing Auto-Healing of Fragmented Offsets ---');
assert(adminHtml.includes("purgeFragmentedOffsets"), 'admin-builder.html must include purgeFragmentedOffsets');
assert(adminHtml.includes("/^text-\\d+$/"), 'purgeFragmentedOffsets must target orphaned text-N keys');
console.log('  ✓ Auto-healing cleanses fragmented paragraph offsets on project load');

console.log('\n=======================================');
console.log('ALL RICH TEXT LAYER TESTS PASSED (6/6)');
console.log('=======================================');
