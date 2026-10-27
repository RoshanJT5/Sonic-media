/**
 * Verification test for Rich Text & Paragraph ghost glitch fix
 * Validates global-level prevention, migration auto-healing, ampersand decoding, and deletion purity.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- 1. Testing SectionRegistry rich_text Defaults & Guard ---');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/section-registry.js'), 'utf8');
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
  requestAnimationFrame: callback => callback(),
  cancelAnimationFrame: () => {}
};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'assets/js/section-registry.js' });

const SectionRegistry = windowObject.SectionRegistry;
if (!SectionRegistry) {
  throw new Error('SectionRegistry was not initialized.');
}

// Test A: createDefault creates clean section without ghost subheading
const cleanRichText = SectionRegistry.createSection('rich_text');
if (cleanRichText.content.subheading !== '') {
  throw new Error(`Expected cleanRichText subheading to be empty, got: "${cleanRichText.content.subheading}"`);
}
const renderedCleanHtml = SectionRegistry.renderSection(cleanRichText, { viewport: 'desktop', isPublic: true, index: 0 });
if (renderedCleanHtml.includes('sec-subheading')) {
  throw new Error('Clean rich_text rendered unexpected sec-subheading element.');
}
console.log('  ✓ Newly created rich_text has empty subheading and renders no ghost.');

// Test B: Corrupted section with duplicated body text in subheading is guarded in render
const corruptedSection = SectionRegistry.createSection('rich_text');
const longBody = '<p>Over an intensive 14-week engagement, The Sonic Media partnered closely with the executive team to completely reconstruct the digital presence.</p>';
corruptedSection.content.body = longBody;
corruptedSection.content.subheading = longBody; // The ghost bug!

const renderedCorrupted = SectionRegistry.renderSection(corruptedSection, { viewport: 'desktop', isPublic: true, index: 0 });
if (renderedCorrupted.includes('sec-subheading')) {
  throw new Error('Render guard failed: sec-subheading was rendered even though it is a duplicate of body!');
}
console.log('  ✓ Render guard correctly suppressed duplicate ghost sec-subheading.');

// Test C: Migration auto-healing purges duplicate subheading from model
const migrated = SectionRegistry.migrateSection(corruptedSection);
if (migrated.content.subheading !== '') {
  throw new Error(`migrateSection failed to purge duplicate subheading, got: "${migrated.content.subheading}"`);
}
console.log('  ✓ migrateSection successfully purged corrupted ghost subheading to empty string.');

// Test D: Legitimate distinct subheading is preserved and rendered
const legitimateSection = SectionRegistry.createSection('rich_text');
legitimateSection.content.heading = 'Case Study Overview';
legitimateSection.content.subheading = 'A high-impact narrative on strategic brand transformation';
legitimateSection.content.body = '<p>Detailed article copy here.</p>';

const renderedLegitimate = SectionRegistry.renderSection(legitimateSection, { viewport: 'desktop', isPublic: true, index: 0 });
if (!renderedLegitimate.includes('sec-subheading') || !renderedLegitimate.includes('A high-impact narrative on strategic brand transformation')) {
  throw new Error('Legitimate distinct subheading was incorrectly suppressed.');
}
console.log('  ✓ Legitimate distinct subheading renders correctly.');

console.log('--- 2. Testing Ampersand Entity Decoding ---');
const ampersandSection = SectionRegistry.createSection('rich_text');
ampersandSection.content.heading = 'In-Depth Case Study &amp; Story';
const renderedAmpHtml = SectionRegistry.renderSection(ampersandSection, { viewport: 'desktop', isPublic: true, index: 0 });

// Must render "In-Depth Case Study &amp; Story" in HTML markup (which browser displays as "In-Depth Case Study & Story"), NOT &amp;amp;
if (renderedAmpHtml.includes('&amp;amp;')) {
  throw new Error('Ampersand was double-escaped to &amp;amp; !');
}
if (!renderedAmpHtml.includes('In-Depth Case Study &amp; Story')) {
  throw new Error(`Ampersand heading was not formatted correctly: ${renderedAmpHtml}`);
}
console.log('  ✓ Ampersand in heading decoded and escaped cleanly without &amp;amp; glitch.');

console.log('--- 3. Verifying admin-builder.html Code Safety ---');
const builderHtml = fs.readFileSync(path.join(__dirname, '../admin-builder.html'), 'utf8');

// Check that isDesc sync in syncCanvasTextToModel does NOT copy to subtitle/subheading
const descSyncMatch = builderHtml.match(/isDesc\s*\)\s*\{([\s\S]*?)(?=\}\s*else)/);
if (descSyncMatch) {
  const descBlock = descSyncMatch[1];
  if (descBlock.includes('sec.content.subtitle') || descBlock.includes('sec.content.subheading')) {
    throw new Error('syncCanvasTextToModel still contains sec.content.subtitle / subheading in isDesc branch!');
  }
}
console.log('  ✓ syncCanvasTextToModel does not contaminate subtitle/subheading on description sync.');

// Check that initCanvasDirectTextEditing description branch does NOT copy to subtitle/subheading
const directTextMatch = builderHtml.match(/el\.matches\('\.sec-desc,\s*\.wd-article-body,\s*p,\s*\.hero-desc'\)\s*\{([\s\S]*?)(?=\}\s*else)/);
if (directTextMatch) {
  const dtBlock = directTextMatch[1];
  if (dtBlock.includes('sec.content.subtitle') || dtBlock.includes('sec.content.subheading')) {
    throw new Error('initCanvasDirectTextEditing still sets subtitle/subheading when editing description/body!');
  }
}
console.log('  ✓ initCanvasDirectTextEditing does not contaminate subtitle/subheading on body edit.');

// Check that updateActiveElementContent isText branch does NOT copy to subtitle/subheading
const activeElemMatch = builderHtml.match(/isText\s*\)\s*\{([\s\S]*?)(?=\}\s*else\s*if\s*\(\s*field\s*===)/);
if (activeElemMatch) {
  const aeBlock = activeElemMatch[1];
  if (aeBlock.includes('sec.content.subtitle') || aeBlock.includes('sec.content.subheading')) {
    throw new Error('updateActiveElementContent still sets subtitle/subheading when isText is true!');
  }
}
console.log('  ✓ updateActiveElementContent does not contaminate subtitle/subheading.');

// Check that builderDeleteTarget clears all body/description fields simultaneously
const deleteDescMatch = builderHtml.match(/\/\/\s*18\.\s*Section-level Descriptions[\s\S]*?if\s*\([\s\S]*?\{([\s\S]*?return;\s*\})/);
if (deleteDescMatch) {
  const delBlock = deleteDescMatch[1];
  if (!delBlock.includes("sec.content.description = ''") ||
      !delBlock.includes("sec.content.body = ''") ||
      !delBlock.includes("sec.content.desc = ''")) {
    throw new Error('builderDeleteTarget does not clear all description/body aliases simultaneously!');
  }
}
console.log('  ✓ builderDeleteTarget purges all description and body aliases simultaneously upon delete.');

console.log('\n=======================================');
console.log('ALL GLOBAL RICH_TEXT TESTS PASSED');
console.log('=======================================');
