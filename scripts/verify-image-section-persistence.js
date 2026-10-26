const fs = require('fs');

const builder = fs.readFileSync('admin-builder.html', 'utf8');
const registry = fs.readFileSync('assets/js/section-registry.js', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const imageSections = [
  'hero',
  'image',
  'image_grid',
  'gallery',
  'carousel',
  'before_after',
  'text_image',
  'testimonial',
  'client_logos'
];

imageSections.forEach(type => {
  assert(
    registry.includes(`SectionRegistry.register('${type}'`),
    `Image-bearing section is missing from the registry audit: ${type}.`
  );
});

const scopedUploadTargets = [
  "updateContentForSection('${escapeHtml(sec.id)}', 'bgImage', url, false, true)",
  "updateContentForSection('${escapeHtml(sec.id)}', 'url', url, false, true)",
  "updateGalleryItemForSection('${escapeHtml(sec.id)}', ${i}, 'url', u, true)",
  "updateContentForSection('${escapeHtml(sec.id)}', 'imageUrl', url, false, true)",
  "updateContentForSection('${escapeHtml(sec.id)}', 'avatar', url, false, true)",
  "updateContentForSection('${escapeHtml(sec.id)}', 'beforeUrl', u, false, true)",
  "updateContentForSection('${escapeHtml(sec.id)}', 'afterUrl', u, false, true)",
  "updateCarouselSlideForSection('${escapeHtml(sec.id)}', ${i}, 'url', u, true)",
  "updateImageGridItemForSection('${escapeHtml(sec.id)}', ${i}, 'url', u, true)",
  "updateClientLogoItemForSection('${escapeHtml(sec.id)}', ${i}, 'url', u, true)",
  "updateImageSettingForSection('${escapeHtml(sec.id)}', 'bgImage', url)"
];

scopedUploadTargets.forEach(target => {
  assert(builder.includes(target), `Image upload is not section-scoped: ${target}.`);
});

[
  'window.updateContentForSection = function',
  'window.updateGalleryItemForSection = function',
  'window.updateCarouselSlideForSection = function',
  'window.updateImageGridItemForSection = function',
  'window.updateClientLogoItemForSection = function',
  'window.updateImageSettingForSection = function'
].forEach(handler => {
  assert(builder.includes(handler), `Scoped image update handler is missing: ${handler}.`);
});

assert(
  builder.includes("const isMediaField = ['url', 'imageUrl', 'bgImage', 'avatar', 'beforeUrl', 'afterUrl'].includes(key);"),
  'Media URLs are still being processed as formatted text.'
);
assert(
  /if \(commitImmediately\) \{[\s\S]{0,120}saveCurrentDraftLocally\(\);/.test(builder),
  'Completed image uploads are not persisted immediately.'
);
assert(
  builder.includes("sec.content[imageKey === 'before-image' ? 'beforeUrl' : 'afterUrl'] = publicUrl;"),
  'Before/After canvas replacement does not preserve the selected side.'
);
assert(
  builder.includes("} else if (sType === 'testimonial') {\n              sec.content.avatar = publicUrl;"),
  'Testimonial canvas replacement is not mapped to the avatar field.'
);
assert(
  /processCustomContainerImageFile[\s\S]{0,3500}pushHistory\(\);[\s\S]{0,100}saveCurrentDraftLocally\(\);/.test(builder),
  'Custom image containers do not persist immediately after upload.'
);

console.log(`Image persistence verification passed: ${imageSections.length} prebuilt image sections plus custom image containers.`);
