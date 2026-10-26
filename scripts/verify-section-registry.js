'use strict';

const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('assets/js/section-registry.js', 'utf8');
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

const registry = windowObject.SectionRegistry;
if (!registry) throw new Error('SectionRegistry was not exported.');

const definitions = registry.getAll();
if (definitions.length < 27) {
  throw new Error(`Expected at least 27 section types, found ${definitions.length}.`);
}

for (const definition of definitions) {
  const section = registry.createSection(definition.type);
  const validation = definition.validate(section);
  if (validation && validation.valid === false) {
    throw new Error(`${definition.type}: default data failed validation.`);
  }

  for (const viewport of ['desktop', 'tablet', 'mobile']) {
    for (const isPublic of [false, true]) {
      const html = registry.renderSection(section, { viewport, isPublic, index: 0 });
      if (typeof html !== 'string' || !html.trim()) {
        throw new Error(`${definition.type}: empty ${viewport} render (public=${isPublic}).`);
      }
      if (/\b(?:undefined|NaN)\b/.test(html)) {
        throw new Error(`${definition.type}: invalid token in ${viewport} render (public=${isPublic}).`);
      }
    }
  }

  const roundTrip = registry.migrateSection(JSON.parse(JSON.stringify(section)));
  if (!roundTrip || roundTrip.type !== definition.type || !roundTrip.id) {
    throw new Error(`${definition.type}: migration round-trip failed.`);
  }
}

const carousel = registry.createSection('carousel');
const editingCarousel = registry.renderSection(carousel, { viewport: 'desktop', isPublic: false, index: 0 });
const publicCarousel = registry.renderSection(carousel, { viewport: 'desktop', isPublic: true, index: 0 });
if (!editingCarousel.includes('data-autoplay="false"')) {
  throw new Error('Carousel autoplay must be paused in edit mode.');
}
if (!publicCarousel.includes('data-autoplay="true"')) {
  throw new Error('Carousel autoplay configuration was not preserved for public output.');
}
if (!editingCarousel.includes('data-continuous-loop="true"')) {
  throw new Error('Carousel edit mode is missing the same seamless circular loop used by Preview.');
}
if (!publicCarousel.includes('data-continuous-loop="true"')) {
  throw new Error('Public carousel output is missing seamless circular looping.');
}
const renderedSlideCount = (publicCarousel.match(/data-slide-index="\d+"/g) || []).length;
if (renderedSlideCount !== carousel.content.slides.length) {
  throw new Error(`Carousel rendered ${renderedSlideCount} slides for ${carousel.content.slides.length} configured slides.`);
}
if (!source.includes(".sec-carousel-slide:not([data-carousel-clone])") || !source.includes('data-carousel-clone')) {
  throw new Error('Carousel runtime is not separating real editable slides from seamless-loop clones.');
}
if (!source.includes("clone.setAttribute('data-builder-layer', 'internal')") || !source.includes("clone.style.pointerEvents = 'none'")) {
  throw new Error('Carousel loop clones can still interfere with editor selection or actions.');
}
if (!source.includes('targetSlide.offsetLeft - track.offsetLeft')) {
  throw new Error('Carousel navigation is not using scale-independent layout coordinates.');
}
if (!source.includes("setProperty('scroll-behavior', 'auto', 'important')") || !source.includes("addEventListener('scrollend', finish")) {
  throw new Error('Carousel loop reset can still animate backward instead of jumping invisibly.');
}
if (!source.includes('st.width && !isCarouselTrackSlide') || !source.includes('st.height && !isCarouselTrackSlide')) {
  throw new Error('Legacy per-slide dimensions can still break carousel continuity.');
}
if (!editingCarousel.includes('data-builder-layer="carousel-slide"')) {
  throw new Error('Carousel slides are missing their atomic editor layer marker.');
}
carousel.settings.containerWidth = 'bleed';
carousel.settings.customWidth = '640px';
carousel.settings.rowFlow = true;
const fullBleedCarousel = registry.renderSection(carousel, { viewport: 'desktop', isPublic: true, index: 0 });
if (!fullBleedCarousel.includes('sec-full-bleed')) {
  throw new Error('Carousel full-bleed width mode was not preserved in public output.');
}
if (!/class="sec-inner" style="[^"]*max-width:100%/.test(fullBleedCarousel)) {
  throw new Error('Carousel full-bleed mode did not override the stale fixed content max-width.');
}
if (fullBleedCarousel.includes('has-row-flow')) {
  throw new Error('Carousel full-bleed mode was still constrained by a stale row-flow setting.');
}

const beforeAfter = registry.createSection('before_after');
beforeAfter.settings.elementStyles = {
  'before-image': { objectPosition: '20% 30%' },
  'after-image': { objectPosition: '80% 70%' }
};
const beforeAfterHtml = registry.renderSection(beforeAfter, { viewport: 'desktop', isPublic: false, index: 0 });
if (!beforeAfterHtml.includes('data-el-key="before-image"') || !beforeAfterHtml.includes('data-el-key="after-image"')) {
  throw new Error('Before/after images are missing independent focal-point layer keys.');
}

const customImageSection = registry.createSection('heading');
customImageSection.settings.customContainers = [{
  id: 'focal-test-image',
  type: 'image',
  imageUrl: 'https://example.com/image.jpg',
  objectPosition: '25% 75%'
}];
const customImageHtml = registry.renderSection(customImageSection, { viewport: 'desktop', isPublic: true, index: 0 });
if (!customImageHtml.includes('object-position:25% 75%')) {
  throw new Error('Custom image container focal point was not preserved in public output.');
}

// Rich text must retain legitimate formatting while editor-only controls are
// removed from old drafts, published projects, and public rendering.
const contaminatedTextSection = registry.createSection('hero');
contaminatedTextSection.content.subtitle = '<span style="font-family:&quot;Bebas Neue&quot;,sans-serif;color:#00e5ff"><b>Strategy</b><div class="element-action-bar">Move Reset Delete</div><div class="element-resize-handle"></div></span>';
const migratedTextSection = registry.migrateSection(contaminatedTextSection);
if (/element-action-bar|element-resize-handle|Move Reset Delete/.test(migratedTextSection.content.subtitle)) {
  throw new Error('Migration did not remove editor chrome from persisted rich text.');
}
const migratedTextHtml = registry.renderSection(migratedTextSection, { viewport: 'desktop', isPublic: true, index: 0 });
if (!migratedTextHtml.includes('Bebas Neue') || !migratedTextHtml.includes('#00e5ff') || !migratedTextHtml.includes('<b>Strategy</b>')) {
  throw new Error('Legitimate rich-text formatting was not preserved in public output.');
}
if (/element-action-bar|element-resize-handle|Move Reset Delete/.test(migratedTextHtml)) {
  throw new Error('Editor chrome leaked into public rich-text output.');
}

const customTextSection = registry.createSection('heading');
customTextSection.settings.customContainers = [{
  id: 'typography-test',
  type: 'text',
  fontFamily: 'Bebas Neue',
  color: '#00e5ff',
  content: { heading: '<u>Styled heading</u>', text: '<i>Styled description</i>' }
}];
const customTextHtml = registry.renderSection(customTextSection, { viewport: 'desktop', isPublic: true, index: 0 });
if (!customTextHtml.includes('font-family:Bebas Neue') || !customTextHtml.includes('color:#00e5ff')) {
  throw new Error('Custom-container typography was not preserved in public output.');
}

// Generated nested-layer keys must resolve in public rendering even when a
// section template does not emit data-el-key itself.
const fakeLayerA = { name: 'first' };
const fakeLayerB = { name: 'second' };
const fakeSectionElement = {
  querySelector() { return null; },
  querySelectorAll() { return [fakeLayerA, fakeLayerB]; }
};
if (registry.resolveSavedElement(fakeSectionElement, 'card-1') !== fakeLayerB) {
  throw new Error('Nested card layer keys are not resolved consistently in public rendering.');
}
if (registry.resolveSavedElement(fakeSectionElement, 'col-1') !== fakeLayerA) {
  throw new Error('One-based column layer keys are not resolved consistently in public rendering.');
}

const builderHtml = fs.readFileSync('admin-builder.html', 'utf8');
if (!builderHtml.includes('setActiveElementOffsetControl') || !builderHtml.includes('setSectionOffsetControl')) {
  throw new Error('Section and element position inputs are not using shared synchronized control paths.');
}
if (!builderHtml.includes('min="-1200" max="1200" step="1"')) {
  throw new Error('Position range and numeric controls do not share the universal limits.');
}
if (!builderHtml.includes('getTextStyleTargets') || !builderHtml.includes('setActiveTypographyNumeric')) {
  throw new Error('Selected text-bearing layers are not using the universal typography toolkit path.');
}

const fakeTextChild = { style: {} };
const fakeTextContainer = {
  style: {},
  matches() { return false; },
  querySelectorAll() { return [fakeTextChild]; },
  querySelector() { return null; },
  tagName: 'DIV'
};
const fakeTypographyRoot = {
  querySelector(selector) {
    return selector.includes('data-el-key="card-0"') ? fakeTextContainer : null;
  },
  querySelectorAll() { return []; }
};
const typographySection = registry.createSection('narrative_cards');
typographySection.settings.elementStyles = {
  'card-0': { fontFamily: 'Bebas Neue', color: '#00e5ff', fontSize: '32px' }
};
registry.applySavedSectionElementStyles(fakeTypographyRoot, typographySection, 'desktop');
if (fakeTextChild.style.fontFamily !== 'Bebas Neue' || fakeTextChild.style.color !== '#00e5ff' || fakeTextChild.style.fontSize !== '32px') {
  throw new Error('Container typography was not applied to nested text in public rendering.');
}

// Responsive settings must cascade without mutating or replacing the desktop base.
const responsiveSection = registry.createSection('text_image');
responsiveSection.settings.customWidth = '1200px';
responsiveSection.settings.gap = 40;
responsiveSection.settings.elementStyles = {
  image: { width: '640px', borderRadius: '16px', opacity: 1, objectPosition: '45% 55%' }
};
responsiveSection.settings.elementOffsets = { image: { x: 12, y: 4 } };
responsiveSection.settings.responsive = {
  tablet: {
    customWidth: '720px',
    gap: 24,
    elementStyles: { image: { width: '420px' } },
    elementOffsets: { image: { x: 6 } }
  },
  mobile: {
    customWidth: '100%',
    gap: 14,
    elementStyles: { image: { borderRadius: '10px' } },
    elementOffsets: { image: { y: 18 } }
  }
};

const desktopSettings = registry.resolveSettings(responsiveSection, 'desktop');
const tabletSettings = registry.resolveSettings(responsiveSection, 'tablet');
const mobileSettings = registry.resolveSettings(responsiveSection, 'mobile');
if (desktopSettings.customWidth !== '1200px' || desktopSettings.gap !== 40) {
  throw new Error('Desktop base settings were changed by responsive resolution.');
}
if (tabletSettings.customWidth !== '720px' || tabletSettings.elementStyles.image.borderRadius !== '16px') {
  throw new Error('Tablet settings do not correctly inherit and override Desktop.');
}
if (tabletSettings.elementOffsets.image.x !== 6 || tabletSettings.elementOffsets.image.y !== 4) {
  throw new Error('Tablet element offsets are not deeply merged.');
}
if (mobileSettings.customWidth !== '100%' || mobileSettings.gap !== 14) {
  throw new Error('Mobile scalar overrides were not applied.');
}
if (mobileSettings.elementStyles.image.width !== '420px' || mobileSettings.elementStyles.image.borderRadius !== '10px' || mobileSettings.elementStyles.image.opacity !== 1) {
  throw new Error('Mobile element styles do not cascade Desktop -> Tablet -> Mobile.');
}
if (mobileSettings.elementStyles.image.objectPosition !== '45% 55%') {
  throw new Error('Per-image focal positions do not cascade across responsive viewports.');
}
if (mobileSettings.elementOffsets.image.x !== 6 || mobileSettings.elementOffsets.image.y !== 18) {
  throw new Error('Mobile element offsets do not cascade Desktop -> Tablet -> Mobile.');
}

for (const page of ['project.html', 'case-study.html', 'article.html']) {
  const html = fs.readFileSync(page, 'utf8');
  if (!html.includes('SectionRegistry.mountPageSections')) {
    throw new Error(`${page}: shared public section renderer is not mounted.`);
  }
  if (!html.includes('hasAuthoritativeLocalPreview')) {
    throw new Error(`${page}: local builder preview is not authoritative.`);
  }
}

console.log(`Section registry verification passed: ${definitions.length} types × 3 viewports × editor/public.`);
