const assert = require('assert');
const fs = require('fs');

console.log('=== Verifying Rich Text Paragraph Spacing & Container Resize Integrity ===\n');

// 1. Load section-registry.js in simulated window
const regCode = fs.readFileSync('assets/js/section-registry.js', 'utf8');
const fakeWindow = {
  addEventListener: () => {},
  removeEventListener: () => {}
};
const runContext = new Function('window', 'global', regCode);
runContext(fakeWindow, fakeWindow);
const SectionRegistry = fakeWindow.SectionRegistry;

assert(SectionRegistry, 'SectionRegistry should be defined on fakeWindow');
assert(typeof SectionRegistry.formatRichTextHtml === 'function', 'formatRichTextHtml must be exposed on SectionRegistry');

// Test formatRichTextHtml
const plainWithNewlines = 'Para 1 Line 1\nPara 1 Line 2\n\nPara 2\n\nPara 3';
const formatted = SectionRegistry.formatRichTextHtml(plainWithNewlines);
console.log('Test 1 - formatRichTextHtml:');
console.log(formatted);
assert(formatted.includes('<p>Para 1 Line 1<br>Para 1 Line 2</p>'), 'Single newlines should become <br>');
assert(formatted.includes('<p>Para 2</p>'), 'Para 2 must be in its own <p>');
assert(formatted.includes('<p>Para 3</p>'), 'Para 3 must be in its own <p>');
console.log('  ✓ formatRichTextHtml correctly formats plain text into <p> and <br>');

// Test rich_text render with multi-paragraph text
const sec = SectionRegistry.createSection('rich_text', {
  heading: 'In-Depth Case Study & Story',
  subheading: '',
  body: 'Legal Buddy: Designing a Professional Stationery Identity...\n\nUnderstanding the Brand...\n\nThe Outcome The completed stationery...'
});

const rendered = SectionRegistry.renderSection(sec, { isPublic: false, viewport: 'desktop' });
assert(rendered.includes('<p>Legal Buddy: Designing a Professional Stationery Identity...</p>'), 'Rendered HTML must contain paragraph 1 in <p>');
assert(rendered.includes('<p>Understanding the Brand...</p>'), 'Rendered HTML must contain paragraph 2 in <p>');
assert(rendered.includes('<p>The Outcome The completed stationery...</p>'), 'Rendered HTML must contain paragraph 3 in <p>');
assert(!rendered.includes('sec-subheading'), 'Subheading must remain suppressed when empty');
console.log('  ✓ SectionRegistry.renderSection for rich_text wraps raw paragraphs into distinct <p> tags');

// 2. Verify admin-builder.html source code safety
const builderCode = fs.readFileSync('admin-builder.html', 'utf8');

// Check that flushCanvasDomToState is called in initCanvasResizeHandlers
assert(builderCode.includes('if (typeof flushCanvasDomToState === \'function\') {\n              flushCanvasDomToState();\n            }\n\n            try { h.setPointerCapture'),
  'initCanvasResizeHandlers must call flushCanvasDomToState on pointerdown');

assert(builderCode.includes('if (typeof flushCanvasDomToState === \'function\') {\n                flushCanvasDomToState();\n              }\n\n              pushHistory();\n              renderCanvas();'),
  'initCanvasResizeHandlers must call flushCanvasDomToState on pointerup before renderCanvas');
console.log('  ✓ Canvas resize drag handler flushes in-flight canvas edits on pointerdown and pointerup');

// Check plainTextFromFormattedContent preserves line breaks
assert(builderCode.includes("source = source\n          .replace(/<br\\s*\\/?>/gi, '\\n')\n          .replace(/<\\/(?:p|div|li|h[1-6]|tr|blockquote)>/gi, '\\n\\n');"),
  'plainTextFromFormattedContent must convert <br> and closing block tags to newlines');
console.log('  ✓ plainTextFromFormattedContent preserves newlines from <p>, <div>, and <br> elements');

// Check updateContentForSection formats rich text body
assert(builderCode.includes("const isRichField = key === 'body' || (sec.type === 'rich_text' && (key === 'description' || key === 'desc' || key === 'text'));"),
  'updateContentForSection must detect rich text body fields');
assert(builderCode.includes("processedVal = sanitizeContentFormatting(formatter(val));"),
  'updateContentForSection must format rich text fields through formatRichTextHtml');
console.log('  ✓ updateContentForSection formats rich text fields through formatRichTextHtml');

// Check updateRenderedSectionContent targets container directly
assert(builderCode.includes("const isBodyContainer = matchedElement.matches('.wd-article-body, .sec-rich-text, .sec-content-col');\n        const target = isBodyContainer"),
  'updateRenderedSectionContent must target article body container directly without nesting in inner <p>');
console.log('  ✓ updateRenderedSectionContent targets .wd-article-body directly to prevent paragraph nesting');

// Check initCanvasDirectTextEditing avoids nested contenteditable on child p
assert(builderCode.includes("if (el.tagName === 'P' && el.closest('.wd-article-body') && el !== el.closest('.wd-article-body')) return;"),
  'initCanvasDirectTextEditing must prevent child p inside .wd-article-body from getting its own contenteditable');
console.log('  ✓ initCanvasDirectTextEditing prevents nested contenteditable collision on child paragraphs');

// Check CSS paragraph margin
const cssCode = fs.readFileSync('assets/css/section-builder.css', 'utf8');
assert(cssCode.includes('.wd-article-body p {\n  margin-bottom: 20px;\n  line-height: 1.85;\n}'),
  'section-builder.css must style .wd-article-body p with margin-bottom');
assert(builderCode.includes('.wd-article-body p {\n      margin-bottom: 20px;\n      line-height: 1.85;\n    }'),
  'admin-builder.html must style .wd-article-body p with margin-bottom');
console.log('  ✓ Both section-builder.css and admin-builder.html enforce 20px paragraph separation');

// Check auto-heal on project load
assert(builderCode.includes("if (c.body && typeof c.body === 'string' && (c.body.includes('\\n\\n') || !/<[a-z][\\s\\S]*>/i.test(c.body)))"),
  'admin-builder.html must auto-heal unformatted rich_text body on load');
console.log('  ✓ admin-builder.html auto-heals rich_text body on load across all existing projects');

console.log('\n=======================================');
console.log('ALL RICH_TEXT PARAGRAPH & RESIZE TESTS PASSED');
console.log('=======================================');
