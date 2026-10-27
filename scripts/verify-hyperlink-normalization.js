// Comprehensive Hyperlink Normalization & Auto-repair Verification
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'section-registry.js'), 'utf8');

const mockContent = {
  querySelectorAll: () => []
};

const windowObject = {
  DOMPurify: { sanitize: value => String(value) },
  document: {
    documentElement: { clientWidth: 1440 },
    querySelectorAll: () => [],
    createElement: () => ({ content: mockContent })
  }
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

const { normalizeLinkUrl, repairAnchorHrefs, sanitizeRichText, renderFormattedText, renderCustomBtnMarkup } = windowObject.SectionRegistry;

console.log('--- 1. Testing normalizeLinkUrl() ---');
const testCases = [
  // User's exact issue case
  ['www.theconicmedia.com', 'https://www.theconicmedia.com'],
  ['www.thesonicmedia.com', 'https://www.thesonicmedia.com'],
  ['theconicmedia.com', 'https://theconicmedia.com'],
  ['theconicmedia.com/pricing', 'https://theconicmedia.com/pricing'],
  ['subdomain.agency.co.in/path?test=1#hash', 'https://subdomain.agency.co.in/path?test=1#hash'],

  // Already prefixed protocols (MUST remain unchanged)
  ['https://sonic-media.vercel.app', 'https://sonic-media.vercel.app'],
  ['http://sonic-media.vercel.app', 'http://sonic-media.vercel.app'],
  ['https://www.thesonicmedia.com', 'https://www.thesonicmedia.com'],
  ['//cdn.sonicmedia.com/assets', '//cdn.sonicmedia.com/assets'],

  // Internal relative paths and anchors (MUST remain unchanged)
  ['/about', '/about'],
  ['/contact-us', '/contact-us'],
  ['./team', './team'],
  ['../projects', '../projects'],
  ['#services', '#services'],
  ['?filter=branding', '?filter=branding'],

  // Special protocols
  ['mailto:info@thesonicmedia.com', 'mailto:info@thesonicmedia.com'],
  ['contact@thesonicmedia.com', 'mailto:contact@thesonicmedia.com'], // auto-prefix mailto
  ['tel:+919876543210', 'tel:+919876543210'],
  ['sms:+919876543210', 'sms:+919876543210'],

  // Edge cases & Security
  ['javascript:alert(1)', '#'],
  ['data:text/html,bad', '#'],
  ['#', '#'],
  ['', '#'],
  [null, '#'],
  [undefined, '#'],
  ['   www.thesonicmedia.com   ', 'https://www.thesonicmedia.com']
];

testCases.forEach(([input, expected]) => {
  const result = normalizeLinkUrl(input);
  assert.strictEqual(result, expected, `Failed for input "${input}": expected "${expected}", got "${result}"`);
  console.log(`  ✓ "${input}" => "${result}"`);
});

console.log('\n--- 2. Testing repairAnchorHrefs() on legacy / saved HTML ---');
const htmlTests = [
  {
    name: 'Single legacy www link (user exact case)',
    input: '<a href="www.theconicmedia.com" class="wd-inline-link" style="color:#FF5C00;font-weight:700;text-decoration:underline;" target="_blank" rel="noopener noreferrer">measurable</a>',
    expectedHref: 'href="https://www.theconicmedia.com"'
  },
  {
    name: 'Single domain without www',
    input: '<a href="thesonicmedia.com" class="wd-inline-link">Sonic</a>',
    expectedHref: 'href="https://thesonicmedia.com"'
  },
  {
    name: 'Internal relative link (must NOT be prefixed)',
    input: '<a href="/projects" class="wd-inline-link">Work</a>',
    expectedHref: 'href="/projects"'
  },
  {
    name: 'Anchor link (must NOT be prefixed)',
    input: '<a href="#contact" class="wd-inline-link">Contact</a>',
    expectedHref: 'href="#contact"'
  },
  {
    name: 'Multiple mixed links in paragraph',
    input: '<p>Visit <a href="www.theconicmedia.com">Site</a> or <a href="/case-studies">Cases</a> or <a href="https://instagram.com">Insta</a>.</p>',
    expectedCheck: (out) => {
      assert(out.includes('href="https://www.theconicmedia.com"'), 'www link not converted');
      assert(out.includes('href="/case-studies"'), 'internal link was changed');
      assert(out.includes('href="https://instagram.com"'), 'https link was changed');
    }
  }
];

htmlTests.forEach(t => {
  const output = repairAnchorHrefs(t.input);
  if (t.expectedHref) {
    assert(output.includes(t.expectedHref), `Test "${t.name}" failed: output "${output}" does not contain "${t.expectedHref}"`);
  }
  if (t.expectedCheck) {
    t.expectedCheck(output);
  }
  console.log(`  ✓ Passed: ${t.name}`);
});

console.log('\n--- 3. Testing sanitizeRichText() auto-healing ---');
const legacyRichText = 'We deliver <a href="www.theconicmedia.com" class="wd-inline-link" style="color:#ff5c00;">measurable</a> ROI.';
const sanitized = sanitizeRichText(legacyRichText);
assert(sanitized.includes('href="https://www.theconicmedia.com"'), `Sanitized output did not heal link: ${sanitized}`);
console.log('  ✓ Legacy draft rich text auto-healed through sanitizeRichText()');

console.log('\n--- 4. Testing Button Markup Normalization ---');
const btnMarkup = renderCustomBtnMarkup({
  text: 'Explore Work',
  url: 'www.theconicmedia.com',
  style: 'solid',
  color: '#FF5C00'
}, 0);
assert(btnMarkup.includes('href="https://www.theconicmedia.com"'), `Button markup did not normalize url: ${btnMarkup}`);
console.log('  ✓ Button markup normalized url: ' + btnMarkup.substring(0, 80) + '...');

console.log('\n--- 5. Checking admin-builder.html syntax and integrations ---');
const builderHtml = fs.readFileSync(path.join(__dirname, '..', 'admin-builder.html'), 'utf8');

// Verify all expected function calls are in place
assert(builderHtml.includes('function normalizeLinkUrl('), 'normalizeLinkUrl missing in admin-builder.html');
assert(builderHtml.includes('function repairAnchorHrefs('), 'repairAnchorHrefs missing in admin-builder.html');
assert(builderHtml.includes('window.wdpadApplyHyperlinkFromPopover = function () {'), 'wdpadApplyHyperlinkFromPopover missing');
assert(builderHtml.includes('window.applyHyperlinkFromInspector = function ('), 'applyHyperlinkFromInspector missing');

// Verify wdpadPopoverUrl onblur
assert(builderHtml.includes('id="wdpadPopoverUrl" class="prop-input" style="font-size:12px;"'), 'wdpadPopoverUrl input modified or missing');
assert(builderHtml.includes('typeof normalizeLinkUrl===\'function\''), 'onblur normalizeLinkUrl check present');

console.log('  ✓ admin-builder.html contains all normalization functions and event handlers.');

console.log('\n=======================================');
console.log('ALL HYPERLINK NORMALIZATION TESTS PASSED');
console.log('=======================================');
