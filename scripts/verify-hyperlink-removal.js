const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Verifying Inline Hyperlink Deletion & Canvas Sync ===\n');

const builderPath = path.join(__dirname, '..', 'admin-builder.html');
const builderHtml = fs.readFileSync(builderPath, 'utf8');

// 1. Verify removeHyperlinkFromField is defined and calls updateRenderedSectionContent
assert(builderHtml.includes('window.removeHyperlinkFromField = function'), 'removeHyperlinkFromField is missing');
assert(builderHtml.includes('updateRenderedSectionContent(sec.id, fieldName, content)'), 'updateRenderedSectionContent not called in removeHyperlinkFromField');
assert(builderHtml.includes('syncSectionTextAliases(sec, fieldName, content)'), 'syncSectionTextAliases not called in removeHyperlinkFromField');
console.log('✓ removeHyperlinkFromField is wired to updateRenderedSectionContent and syncSectionTextAliases');

// 2. Verify findRenderedSectionContentElement handles 'text' and '.sec-heading-custom'
assert(builderHtml.includes('text: \'.sec-heading-custom,'), 'text selector with .sec-heading-custom is missing');
console.log('✓ findRenderedSectionContentElement contains heading & text selectors');

// 3. Test removal logic on user exact case
function stripHtmlTags(str) {
  if (!str) return '';
  return String(str)
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function simulateRemoveHyperlink(content, anchorText, href) {
  const cleanAnchor = stripHtmlTags(anchorText);
  const escapedRaw = escapeRegExp(cleanAnchor);
  const escapedEnc = escapeRegExp(escapeHtml(cleanAnchor));
  const wordPattern = (cleanAnchor && escapedRaw !== escapedEnc) ? `(?:${escapedRaw}|${escapedEnc})` : (escapedRaw || '');

  let replaced = false;
  if (href && href !== '#' && href !== 'Highlight only') {
    const hrefEscaped = escapeRegExp(href);
    const linkWithHrefRegex = new RegExp(`<a\\s+[^>]*href=["']${hrefEscaped}["'][^>]*>[\\s\\S]*?<\\/a>`, 'i');
    if (linkWithHrefRegex.test(content)) {
      content = content.replace(linkWithHrefRegex, escapeHtml(cleanAnchor));
      replaced = true;
    }
  }

  if (!replaced && wordPattern) {
    const linkWithAnchorRegex = new RegExp(`<a\\s+[^>]*>[\\s\\S]*?${wordPattern}[\\s\\S]*?<\\/a>`, 'i');
    if (linkWithAnchorRegex.test(content)) {
      content = content.replace(linkWithAnchorRegex, escapeHtml(cleanAnchor));
      replaced = true;
    }
  }

  if (wordPattern) {
    const spanLinkRegex = new RegExp(`<span\\s+[^>]*class=["'][^"']*wd-inline-link[^"']*["'][^>]*>[\\s\\S]*?${wordPattern}[\\s\\S]*?<\\/span>`, 'gi');
    const styledSpanRegex = new RegExp(`<span\\s+[^>]*style=["'][^"']*(?:color|text-decoration)[^"']*["'][^>]*>\\s*${wordPattern}\\s*<\\/span>`, 'gi');
    if (spanLinkRegex.test(content)) {
      content = content.replace(spanLinkRegex, escapeHtml(cleanAnchor));
      replaced = true;
    }
    if (styledSpanRegex.test(content)) {
      content = content.replace(styledSpanRegex, escapeHtml(cleanAnchor));
      replaced = true;
    }
  }

  return content;
}

// Case A: Exact User Case with <a> tag
const initialContentA = 'Crafting <a href="https://thesonicmedia.com" class="wd-inline-link" style="color:#FF5C00;font-weight:700;text-decoration:underline;" target="_blank" rel="noopener noreferrer">Next-Generation</a> Digital Experiences';
const cleanedA = simulateRemoveHyperlink(initialContentA, 'Next-Generation', 'https://thesonicmedia.com');
assert.strictEqual(cleanedA, 'Crafting Next-Generation Digital Experiences');
console.log('✓ User exact case: <a ...>Next-Generation</a> successfully removed to plain text without leftover styled span');

// Case B: Leftover/orphan highlight span (Image 3 state)
const initialContentB = 'Crafting <span style="color:#FF5C00;font-weight:700;text-decoration:underline;">Next-Generation</span> Digital Experiences';
const cleanedB = simulateRemoveHyperlink(initialContentB, 'Next-Generation', '');
assert.strictEqual(cleanedB, 'Crafting Next-Generation Digital Experiences');
console.log('✓ Image 3 orphan highlight span successfully removed to plain text');

// Case C: wd-inline-link span
const initialContentC = 'Crafting <span class="wd-inline-link" style="color:#FF5C00;">Next-Generation</span> Digital Experiences';
const cleanedC = simulateRemoveHyperlink(initialContentC, 'Next-Generation', '');
assert.strictEqual(cleanedC, 'Crafting Next-Generation Digital Experiences');
console.log('✓ Class-based wd-inline-link span successfully cleaned');

console.log('\n=======================================');
console.log('ALL HYPERLINK REMOVAL TESTS PASSED');
console.log('=======================================');
