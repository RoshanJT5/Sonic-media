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
if (!editingCarousel.includes('data-builder-layer="carousel-slide"')) {
  throw new Error('Carousel slides are missing their atomic editor layer marker.');
}

// Responsive settings must cascade without mutating or replacing the desktop base.
const responsiveSection = registry.createSection('text_image');
responsiveSection.settings.customWidth = '1200px';
responsiveSection.settings.gap = 40;
responsiveSection.settings.elementStyles = {
  image: { width: '640px', borderRadius: '16px', opacity: 1 }
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
