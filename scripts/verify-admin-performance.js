const fs = require('fs');

const builder = fs.readFileSync('admin-builder.html', 'utf8');
const dashboard = fs.readFileSync('sonicmediaadmin.html', 'utf8');
const registry = fs.readFileSync('assets/js/section-registry.js', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseInlineScripts(fileName, source) {
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptPattern.exec(source))) {
    if (/\bsrc\s*=/.test(match[1])) continue;
    try {
      new Function(match[2]);
    } catch (error) {
      throw new Error(fileName + ' contains invalid inline JavaScript: ' + error.message);
    }
  }
}

parseInlineScripts('admin-builder.html', builder);
parseInlineScripts('sonicmediaadmin.html', dashboard);
new Function(registry);

assert(registry.includes('SectionRegistry.destroyInteractive'), 'Interactive runtime cleanup is missing.');
assert(registry.includes('clearInterval(car._autoplayTimer)'), 'Carousel interval cleanup is missing.');
assert(/removeEventListener\('mousemove', onMouseMove\)/.test(registry), 'Before/after mouse listener cleanup is missing.');
assert(builder.includes('function renderCanvasSection(sectionId)'), 'Single-section renderer is missing.');
assert(builder.includes('renderCanvasSection(sec.id);'), 'Hot editing paths are not using the single-section renderer.');
assert(builder.includes('}, 1200);'), 'Autosave is not using the trailing debounce.');
assert(builder.includes('updateDraftsBadgeFromLocalIndex(index.length);'), 'Local autosave still refreshes the badge remotely.');
assert(builder.includes('let sectionById = new Map();'), 'O(1) section lookup index is missing.');
assert(builder.includes('const builderDomCache = new Map();'), 'Stable builder DOM cache is missing.');
assert(builder.includes('function getBuilderElement(id)'), 'Builder DOM cache accessor is missing.');
assert(builder.includes('function scheduleCanvasSectionRender(sectionId)'), 'Frame-batched section rendering is missing.');
assert(builder.includes('updateRenderedSectionContent(sec.id, key, processedVal)'), 'Inline content updates are missing.');
assert((builder.match(/state\.sections = \[\];/g) || []).length >= 3, 'New builder projects are not defaulting to blank canvases.');
assert(builder.includes('function discardUnsavedNewProjectDraft()'), 'Resume cleanup for unsaved new projects is missing.');
assert(builder.includes('discardUnsavedNewProjectDraft();'), 'Resume action does not discard the temporary new project draft.');
assert(dashboard.includes('id,status,display_order,num,cat,name,tags,img,metric_val,metric_lbl'), 'Portfolio summary query regressed to a full-row fetch.');
assert(dashboard.includes('async function getFullAdminItem'), 'On-demand full record loading is missing.');

console.log('Admin performance verification passed.');
