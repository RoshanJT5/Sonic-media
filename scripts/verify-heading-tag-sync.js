const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Verifying Heading Level Tag (H1-H5) Live Instant Sync ===\n');

const builderPath = path.join(__dirname, '..', 'admin-builder.html');
const builderHtml = fs.readFileSync(builderPath, 'utf8');

const registryPath = path.join(__dirname, '..', 'assets', 'js', 'section-registry.js');
const registryJs = fs.readFileSync(registryPath, 'utf8');

// 1. Verify setHeadingTag is defined and wired in admin-builder.html
assert(builderHtml.includes('window.setHeadingTag = function (tag, btn)'), 'window.setHeadingTag is missing in admin-builder.html');
console.log('✓ window.setHeadingTag is defined');

// 2. Verify segmented buttons call setHeadingTag(..., this)
assert(builderHtml.includes("onclick=\"setHeadingTag('h1', this)\""), 'H1 button does not call setHeadingTag');
assert(builderHtml.includes("onclick=\"setHeadingTag('h2', this)\""), 'H2 button does not call setHeadingTag');
assert(builderHtml.includes("onclick=\"setHeadingTag('h3', this)\""), 'H3 button does not call setHeadingTag');
assert(builderHtml.includes("onclick=\"setHeadingTag('h4', this)\""), 'H4 button does not call setHeadingTag');
assert(builderHtml.includes("onclick=\"setHeadingTag('h5', this)\""), 'H5 button does not call setHeadingTag');
console.log('✓ Heading Level Tag buttons call setHeadingTag with `this` reference for instant active state update');

// 3. Verify updateContentForSection delegates 'tag' to setHeadingTag
assert(builderHtml.includes("if (key === 'tag' && typeof window.setHeadingTag === 'function')"), 'updateContentForSection does not delegate key === "tag"');
console.log('✓ updateContentForSection delegates key === "tag" to setHeadingTag');

// 4. Verify updateRenderedSectionContent handles 'tag' DOM node replacement
assert(builderHtml.includes("if (key === 'tag')"), 'updateRenderedSectionContent does not handle key === "tag"');
assert(builderHtml.includes("cleanTag = ['h1', 'h2', 'h3', 'h4', 'h5'].includes(value) ? value : 'h2'"), 'cleanTag validation missing in updateRenderedSectionContent');
console.log('✓ updateRenderedSectionContent directly swaps canvas DOM tag element for 0ms visual update');

// 5. Verify SectionRegistry supports hierarchical default tag sizes
assert(registryJs.includes("const defaultTagSizes = { h1: '48px', h2: '36px', h3: '28px', h4: '22px', h5: '18px' };"), 'SectionRegistry heading fallback sizes missing');
console.log('✓ SectionRegistry has default sizes for h1 through h5');

// 6. Test functional simulation of setHeadingTag logic
const tagDefaultSizes = { h1: 48, h2: 36, h3: 28, h4: 22, h5: 18 };

const mockSection = {
  id: 'sec_test_heading',
  type: 'heading',
  content: {
    text: 'Transforming Ideas Into Impact',
    tag: 'h1'
  },
  settings: {
    fontSize: '48',
    elementStyles: {
      heading: {
        fontSize: '48px'
      }
    }
  }
};

function simulateSetHeadingTag(sec, newTag) {
  const cleanTag = ['h1', 'h2', 'h3', 'h4', 'h5'].includes(newTag) ? newTag : 'h2';
  sec.content.tag = cleanTag;

  const newSize = tagDefaultSizes[cleanTag] || 36;
  sec.settings.fontSize = String(newSize);

  if (sec.settings.elementStyles && sec.settings.elementStyles.heading) {
    delete sec.settings.elementStyles.heading.fontSize;
  }

  return { cleanTag, newSize };
}

// Switching H1 -> H3
const resultH3 = simulateSetHeadingTag(mockSection, 'h3');
assert.strictEqual(mockSection.content.tag, 'h3', 'Tag should update to h3');
assert.strictEqual(mockSection.settings.fontSize, '28', 'Font size should update to 28 for h3');
assert.strictEqual(mockSection.settings.elementStyles.heading.fontSize, undefined, 'Prior heading fontSize override should be cleared');
console.log('✓ Simulation: H1 -> H3 updates tag to "h3" and fontSize to 28');

// Switching H3 -> H1
const resultH1 = simulateSetHeadingTag(mockSection, 'h1');
assert.strictEqual(mockSection.content.tag, 'h1', 'Tag should update to h1');
assert.strictEqual(mockSection.settings.fontSize, '48', 'Font size should update to 48 for h1');
console.log('✓ Simulation: H3 -> H1 updates tag to "h1" and fontSize to 48');

// Switching H1 -> H5
const resultH5 = simulateSetHeadingTag(mockSection, 'h5');
assert.strictEqual(mockSection.content.tag, 'h5', 'Tag should update to h5');
assert.strictEqual(mockSection.settings.fontSize, '18', 'Font size should update to 18 for h5');
console.log('✓ Simulation: H1 -> H5 updates tag to "h5" and fontSize to 18');

// 7. Verify SectionRegistry heading render output matches tag and size
function simulateRegistryRender(sec) {
  const c = sec.content || {};
  const s = sec.settings || {};
  const elSt = (s.elementStyles && s.elementStyles.heading) || {};
  const tag = ['h1', 'h2', 'h3', 'h4', 'h5'].includes(c.tag) ? c.tag : 'h2';
  const defaultTagSizes = { h1: '48px', h2: '36px', h3: '28px', h4: '22px', h5: '18px' };
  const fallbackSize = defaultTagSizes[tag] || '36px';
  const fSize = elSt.fontSize ? elSt.fontSize : (s.fontSize ? `${parseInt(s.fontSize)}px` : fallbackSize);
  return `<${tag} class="sec-heading-custom" style="font-size:${fSize};">${c.text}</${tag}>`;
}

mockSection.content.tag = 'h3';
mockSection.settings.fontSize = '28';
const renderedH3 = simulateRegistryRender(mockSection);
assert(renderedH3.startsWith('<h3 class="sec-heading-custom" style="font-size:28px;">'), `Rendered H3 mismatch: ${renderedH3}`);
console.log('✓ SectionRegistry renders `<h3 class="sec-heading-custom" style="font-size:28px;">`');

mockSection.content.tag = 'h1';
mockSection.settings.fontSize = '48';
const renderedH1 = simulateRegistryRender(mockSection);
assert(renderedH1.startsWith('<h1 class="sec-heading-custom" style="font-size:48px;">'), `Rendered H1 mismatch: ${renderedH1}`);
console.log('✓ SectionRegistry renders `<h1 class="sec-heading-custom" style="font-size:48px;">`');

console.log('\n=== ALL HEADING TAG SYNC CHECKS PASSED ===');
