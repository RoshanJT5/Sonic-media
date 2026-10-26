const fs = require('fs');

const builder = fs.readFileSync('admin-builder.html', 'utf8');

function requireSource(fragment, message) {
  if (!builder.includes(fragment)) throw new Error(message);
}

requireSource(
  "updateCarouselSlideForSection('${escapeHtml(sec.id)}', ${i}, 'url', u, true)",
  'Carousel upload controls are not bound to their originating section and slide.'
);
requireSource(
  'window.updateCarouselSlideForSection = function (sectionId, idx, field, val, commitImmediately = false)',
  'The section-scoped carousel update handler is missing.'
);
requireSource(
  'if (commitImmediately) {',
  'Carousel image URLs are not persisted immediately after replacement.'
);
requireSource(
  'flushHistoryDebounce();\n        saveCurrentDraftLocally();\n\n        state.isPreviewMode = !state.isPreviewMode;',
  'Live Preview does not flush the latest builder snapshot before rendering.'
);
requireSource(
  "projectUrl.searchParams.delete('new');",
  'New projects keep an unstable new=true URL and cannot recover their local draft after refresh.'
);
requireSource(
  "projectUrl.searchParams.set('id', state.projectId);",
  'New projects do not receive a stable recoverable project URL.'
);

console.log('Carousel image persistence verification passed.');
