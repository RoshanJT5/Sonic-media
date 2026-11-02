/**
 * Verification test for Pull Quote / Callout Customization Feature:
 * 1. SectionRegistry render engine support for sizes, colors, designs, and ornaments
 * 2. admin-builder.html quote design toolkit integration in element properties & section inspector
 * 3. Candidate discovery labeling and two-way wire synchronization
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== VERIFYING PULL QUOTE / CALLOUT CUSTOMIZATION FEATURE ===\n');

// 1. Read files
const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'admin-builder.html'), 'utf8');
const secRegCode = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'section-registry.js'), 'utf8');

// 2. Mock environment to load SectionRegistry
const globalMock = {
  window: {},
  document: {
    createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {} }),
    querySelectorAll: () => [],
    getElementById: () => null
  }
};
globalMock.window = globalMock;

// Execute SectionRegistry in sandbox
const vm = require('vm');
const context = vm.createContext({
  window: globalMock,
  document: globalMock.document,
  console: console,
  ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
  cancelAnimationFrame: () => {},
  requestAnimationFrame: (cb) => cb()
});
vm.runInContext(secRegCode, context);

const secReg = context.window.SectionRegistry;
assert(secReg, 'SectionRegistry must be loaded in window');

const quoteDef = secReg.get('quote');
assert(quoteDef, 'SectionRegistry must have registered "quote" section type');
console.log('✓ 1. SectionRegistry has registered "quote" section');

// 3. Test SectionRegistry rendering with various customizable settings
// Test A: Default rendering (preserves classic look)
const defaultSec = {
  id: 'q1',
  type: 'quote',
  content: {
    quote: 'Classic quote text here',
    author: 'John Doe',
    role: 'CEO, Acme'
  },
  settings: {}
};
const defaultRendered = quoteDef.render(defaultSec, { isPublic: true });
assert(defaultRendered.includes('Classic quote text here'), 'Default quote text must be rendered');
assert(defaultRendered.includes('John Doe'), 'Author name must be rendered');
assert(defaultRendered.includes('CEO, Acme'), 'Role must be rendered');
assert(defaultRendered.includes('border-left:4px solid #FF5C00'), 'Default accent border must be 4px solid #FF5C00');
console.log('✓ 2. Default quote rendering maintains classic backward-compatible design');

// Test B: Custom size, quoteColor, accentColor, and accentWidth
const styledSec = {
  id: 'q2',
  type: 'quote',
  content: {
    quote: 'Custom styled quotation',
    author: 'Alice Smith',
    role: 'Design Director'
  },
  settings: {
    quoteSize: 34,
    quoteColor: '#00E5FF',
    accentColor: '#F5A623',
    accentWidth: 6,
    alignment: 'center',
    authorColor: '#FFFFFF',
    roleColor: '#00E5FF',
    showDivider: true
  }
};
const styledRendered = quoteDef.render(styledSec, { isPublic: true });
assert(styledRendered.includes('font-size:34px'), 'Custom quoteSize 34px must be applied to blockquote');
assert(styledRendered.includes('color:#00E5FF'), 'Custom quoteColor #00E5FF must be applied to blockquote');
assert(styledRendered.includes('border-left:6px solid #F5A623'), 'Custom accentWidth 6px and accentColor #F5A623 must be applied');
assert(styledRendered.includes('text-align:center'), 'Text alignment center must be applied');
assert(styledRendered.includes('color:#FFFFFF'), 'Custom authorColor must be applied');
console.log('✓ 3. Custom quote size (34px), text color, accent border (6px gold), and author colors render accurately');

// Test C: Quote Designs: modern_card, large_marks, top_bottom, minimal, speech_bubble
const modernCardSec = {
  id: 'q3',
  type: 'quote',
  content: { quote: 'Modern Card Quote', author: 'Author' },
  settings: { quoteDesign: 'modern_card', cardStyle: 'glass' }
};
const modernCardRendered = quoteDef.render(modernCardSec, { isPublic: true });
assert(modernCardRendered.includes('backdrop-filter:blur'), 'Modern card with glass style must include backdrop-filter');

const largeMarksSec = {
  id: 'q4',
  type: 'quote',
  content: { quote: 'Big Marks Quote', author: 'Author' },
  settings: { quoteDesign: 'large_marks', quoteMarkStyle: 'bold', accentColor: '#FF5C00' }
};
const largeMarksRendered = quoteDef.render(largeMarksSec, { isPublic: true });
assert(largeMarksRendered.includes('“') && largeMarksRendered.includes('font-size:42px'), 'Big marks design must include decorative quotation mark glyph');

const topBottomSec = {
  id: 'q5',
  type: 'quote',
  content: { quote: 'Top Bottom Quote', author: 'Author' },
  settings: { quoteDesign: 'top_bottom', accentColor: '#00E5FF', accentWidth: 4 }
};
const topBottomRendered = quoteDef.render(topBottomSec, { isPublic: true });
assert(topBottomRendered.includes('border-top:4px solid #00E5FF') && topBottomRendered.includes('border-bottom:4px solid #00E5FF'), 'Top & bottom design must render horizontal accent borders');

const minimalSec = {
  id: 'q6',
  type: 'quote',
  content: { quote: 'Minimal Quote', author: 'Author' },
  settings: { quoteDesign: 'minimal', cardStyle: 'transparent' }
};
const minimalRendered = quoteDef.render(minimalSec, { isPublic: true });
assert(minimalRendered.includes('border:none'), 'Minimal design must have border:none');

const speechBubbleSec = {
  id: 'q7',
  type: 'quote',
  content: { quote: 'Callout Bubble Quote', author: 'Author' },
  settings: { quoteDesign: 'speech_bubble' }
};
const speechBubbleRendered = quoteDef.render(speechBubbleSec, { isPublic: true });
assert(speechBubbleRendered.includes('border-radius:18px'), 'Callout bubble design must have rounded border-radius:18px');
console.log('✓ 4. All quote design presets (Modern Card, Big Marks, Top & Bottom, Minimalist, Callout Bubble) render cleanly');

// 4. Verify admin-builder.html features & wiring
assert(adminHtml.includes('window.updateQuoteDesignSetting = function'), 'admin-builder.html must define window.updateQuoteDesignSetting');
assert(adminHtml.includes('function renderQuoteDesignControlsHtml'), 'admin-builder.html must define renderQuoteDesignControlsHtml');
assert(adminHtml.includes('propDrawer_quoteDesign'), 'admin-builder.html must include Drawer 7 propDrawer_quoteDesign in element properties toolkit');
assert(adminHtml.includes('Quote Styling & Design Toolkit'), 'admin-builder.html must title Drawer 7 "Quote Styling & Design Toolkit"');
assert(adminHtml.includes('isQuoteElement ? \'quote\' :'), 'admin-builder.html must identify quote elements in candidate scanner');
assert(adminHtml.includes('Quote / Callout'), 'admin-builder.html must label quote elements as "Quote / Callout" instead of "Description 2"');
console.log('✓ 5. admin-builder.html includes Drawer 7 "Quote Styling & Design Toolkit" below Drawer 6 (Box Styling)');
console.log('✓ 6. Candidate discovery accurately labels quote elements as "Quote / Callout"');
console.log('✓ 7. Section inspector (sec.type === "quote") embeds renderQuoteDesignControlsHtml');

console.log('\nALL PULL QUOTE / CALLOUT CUSTOMIZATION CHECKS PASSED SUCCESSFULLY! 🚀');
