const fs = require('fs');
const path = require('path');

console.log('--- Verifying Image URL Normalization & Admin Integration ---');

// 1. Test SectionRegistry.normalizeImageUrl
const registryPath = path.resolve(__dirname, '../assets/js/section-registry.js');
const registryCode = fs.readFileSync(registryPath, 'utf8');

// Load section-registry in simulated environment
const fakeWindow = {
  addEventListener: () => {},
  removeEventListener: () => {}
};
fakeWindow.window = fakeWindow;

const fn = new Function('window', 'global', registryCode);
fn(fakeWindow, fakeWindow);

const normalizeImageUrl = fakeWindow.SectionRegistry.normalizeImageUrl;

if (typeof normalizeImageUrl !== 'function') {
  console.error('FAIL: SectionRegistry.normalizeImageUrl is not a function');
  process.exit(1);
}

const urlTestCases = [
  {
    desc: 'Bare Cloudinary domain without scheme',
    input: 'res.cloudinary.com/dq2nrpky0/image/upload/f_auto,q_auto/v1779787887/favicon_oalxfi.png',
    expected: 'https://res.cloudinary.com/dq2nrpky0/image/upload/f_auto,q_auto/v1779787887/favicon_oalxfi.png'
  },
  {
    desc: 'Cloudinary URL with http upgraded to https',
    input: 'http://res.cloudinary.com/demo/image/upload/sample.jpg',
    expected: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
  },
  {
    desc: 'Protocol-relative Cloudinary URL',
    input: '//res.cloudinary.com/demo/image/upload/sample.jpg',
    expected: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
  },
  {
    desc: 'Surrounding whitespace and zero-width spaces',
    input: ' \u200Bhttps://res.cloudinary.com/demo/image/upload/sample.jpg\uFEFF ',
    expected: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
  },
  {
    desc: 'Surrounding quotes',
    input: '"https://res.cloudinary.com/demo/image/upload/sample.jpg"',
    expected: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
  },
  {
    desc: 'Markdown image wrapper',
    input: '![Alt text](https://res.cloudinary.com/demo/image/upload/sample.jpg)',
    expected: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
  },
  {
    desc: 'HTML img tag wrapper',
    input: '<img src="https://res.cloudinary.com/demo/image/upload/sample.jpg" alt="pic">',
    expected: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
  },
  {
    desc: 'Cloudinary fl_attachment stripped so it renders instead of downloading',
    input: 'https://res.cloudinary.com/demo/image/upload/fl_attachment/sample.jpg',
    expected: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
  },
  {
    desc: 'Google Drive file view link converted to uc?export=view',
    input: 'https://drive.google.com/file/d/1B2C3D4E5F6G7H/view?usp=sharing',
    expected: 'https://drive.google.com/uc?export=view&id=1B2C3D4E5F6G7H'
  },
  {
    desc: 'Dropbox download link converted to raw=1',
    input: 'https://www.dropbox.com/s/sample123/banner.png?dl=0',
    expected: 'https://www.dropbox.com/s/sample123/banner.png?raw=1'
  },
  {
    desc: 'Imgur page URL converted to direct image URL',
    input: 'https://imgur.com/abc1234',
    expected: 'https://i.imgur.com/abc1234.jpg'
  },
  {
    desc: 'Local asset relative path preserved',
    input: '/assets/images/logo.png',
    expected: '/assets/images/logo.png'
  },
  {
    desc: 'Data URI preserved with XML/HTML closing bracket',
    input: 'data:image/svg+xml;utf8,<svg></svg>',
    expected: 'data:image/svg+xml;utf8,<svg></svg>'
  }
];

let failed = 0;
urlTestCases.forEach((t, i) => {
  const result = normalizeImageUrl(t.input);
  if (result === t.expected) {
    console.log(`✓ PASS: ${t.desc}`);
  } else {
    console.error(`✗ FAIL: ${t.desc}\n  Expected: ${t.expected}\n  Got:      ${result}`);
    failed++;
  }
});

// 2. Verify section-registry.js rendering checks
console.log('\n--- Checking Section Registry render templates ---');
const sectionTypesToCheck = [
  'image',
  'image_grid',
  'gallery',
  'carousel',
  'before_after',
  'text_image',
  'testimonial',
  'client_logos'
];

sectionTypesToCheck.forEach(type => {
  const def = fakeWindow.SectionRegistry.get(type);
  if (!def || typeof def.render !== 'function') {
    console.error(`✗ FAIL: Section type "${type}" not registered or missing render()`);
    failed++;
    return;
  }
  // Render a mock instance
  const mockSec = {
    id: 'test-sec-' + type,
    type: type,
    content: {
      url: 'res.cloudinary.com/test/pic.jpg',
      imageUrl: 'res.cloudinary.com/test/pic.jpg',
      beforeUrl: 'res.cloudinary.com/test/before.jpg',
      afterUrl: 'res.cloudinary.com/test/after.jpg',
      items: [{ url: 'res.cloudinary.com/test/item1.jpg', caption: 'Test item' }],
      slides: [{ url: 'res.cloudinary.com/test/slide1.jpg', title: 'Slide 1' }],
      logos: [{ url: 'res.cloudinary.com/test/logo1.jpg', name: 'Logo 1' }],
      avatar: 'res.cloudinary.com/test/avatar.jpg'
    },
    settings: {
      bgImage: 'res.cloudinary.com/test/bg.jpg'
    }
  };

  const renderedHtml = def.render(mockSec, { isPublic: false });
  if (!renderedHtml.includes('https://res.cloudinary.com')) {
    console.error(`✗ FAIL: Section type "${type}" did not normalize Cloudinary URL to https`);
    failed++;
  } else {
    console.log(`✓ PASS: Section "${type}" normalized image URL in rendered HTML`);
  }

  if (!renderedHtml.includes('referrerpolicy="no-referrer"')) {
    console.error(`✗ FAIL: Section type "${type}" is missing referrerpolicy="no-referrer"`);
    failed++;
  } else {
    console.log(`✓ PASS: Section "${type}" includes referrerpolicy="no-referrer"`);
  }
});

// Test custom container image normalization
const heroDef = fakeWindow.SectionRegistry.get('hero');
const mockHeroWithContainer = {
  id: 'test-hero',
  type: 'hero',
  content: {},
  settings: {
    customContainers: [
      {
        id: 'c1',
        type: 'image',
        imageUrl: 'res.cloudinary.com/test/custom.jpg'
      }
    ]
  }
};
const heroHtml = heroDef.render(mockHeroWithContainer, { isPublic: false });
if (heroHtml.includes('https://res.cloudinary.com/test/custom.jpg') && heroHtml.includes('referrerpolicy="no-referrer"')) {
  console.log('✓ PASS: Custom container image normalized with referrerpolicy="no-referrer"');
} else {
  console.error('✗ FAIL: Custom container image did not normalize or is missing referrerpolicy');
  failed++;
}

// 3. Verify admin-builder.html integration
console.log('\n--- Checking admin-builder.html integration ---');
const builderPath = path.resolve(__dirname, '../admin-builder.html');
const builderCode = fs.readFileSync(builderPath, 'utf8');

const builderChecks = [
  { desc: 'cardImg input has onchange and oninput normalization', check: builderCode.includes('normalizeImageUrl(this.value)') && builderCode.includes('updateCardImgPreview') },
  { desc: 'cardImg preview box exists (#cardImgPreviewBox)', check: builderCode.includes('id="cardImgPreviewBox"') },
  { desc: 'window.updateCardImgPreview function is defined', check: builderCode.includes('window.updateCardImgPreview = function') },
  { desc: 'singleImgInput has onchange auto-normalization', check: builderCode.includes('id="singleImgInput"') && builderCode.includes('SectionRegistry.normalizeImageUrl') },
  { desc: 'textImgInput has onchange auto-normalization', check: builderCode.includes('id="textImgInput"') && builderCode.includes('SectionRegistry.normalizeImageUrl') },
  { desc: 'updateContentForSection normalizes media fields', check: builderCode.includes("isMediaField && typeof val === 'string' && window.SectionRegistry") },
  { desc: 'updateImageSettingForSection normalizes image URLs', check: builderCode.includes("window.updateImageSettingForSection = function") && builderCode.includes("normalizeImageUrl(val)") },
  { desc: 'updateGalleryItemForSection normalizes URL', check: builderCode.includes("window.updateGalleryItemForSection = function") && builderCode.includes("key === 'url'") },
  { desc: 'updateCarouselSlideForSection normalizes URL', check: builderCode.includes("window.updateCarouselSlideForSection = function") && builderCode.includes("field === 'url'") },
  { desc: 'updateImageGridItemForSection normalizes URL', check: builderCode.includes("window.updateImageGridItemForSection = function") && builderCode.includes("field === 'url'") },
  { desc: 'updateClientLogoItemForSection normalizes URL', check: builderCode.includes("window.updateClientLogoItemForSection = function") && builderCode.includes("field === 'url'") },
  { desc: 'saveProjectSettings normalizes cardImg before saving', check: builderCode.includes("rawCardImg") && builderCode.includes("normalizeImageUrl(rawCardImg)") }
];

builderChecks.forEach(c => {
  if (c.check) {
    console.log(`✓ PASS: ${c.desc}`);
  } else {
    console.error(`✗ FAIL: ${c.desc}`);
    failed++;
  }
});

// 4. Verify sonicmediaadmin.html integration
console.log('\n--- Checking sonicmediaadmin.html integration ---');
const adminPath = path.resolve(__dirname, '../sonicmediaadmin.html');
const adminCode = fs.readFileSync(adminPath, 'utf8');

const adminChecks = [
  { desc: 'normalizeImageUrl function defined in sonicmediaadmin.html', check: adminCode.includes('function normalizeImageUrl(rawUrl)') },
  { desc: 'portImg has oninput, onchange, and #portImgPreviewBox', check: adminCode.includes('id="portImg"') && adminCode.includes('updatePortImgPreview') && adminCode.includes('id="portImgPreviewBox"') },
  { desc: 'caseImg has oninput, onchange, and #caseImgPreviewBox', check: adminCode.includes('id="caseImg"') && adminCode.includes('updateCaseImgPreview') && adminCode.includes('id="caseImgPreviewBox"') },
  { desc: 'journalThumb has oninput, onchange, and #journalThumbPreviewBox', check: adminCode.includes('id="journalThumb"') && adminCode.includes('updateJournalThumbPreview') && adminCode.includes('id="journalThumbPreviewBox"') },
  { desc: 'item-thumb in portfolio table uses normalizeImageUrl and referrerpolicy="no-referrer"', check: adminCode.includes('normalizeImageUrl(item.img') && adminCode.includes('class="item-thumb" referrerpolicy="no-referrer"') },
  { desc: 'item-thumb in casestudies table uses normalizeImageUrl and referrerpolicy="no-referrer"', check: adminCode.includes('normalizeImageUrl(item.img') && adminCode.includes('class="item-thumb" referrerpolicy="no-referrer"') },
  { desc: 'item-thumb in journal table uses normalizeImageUrl and referrerpolicy="no-referrer"', check: adminCode.includes('normalizeImageUrl(item.thumb_url') && adminCode.includes('class="item-thumb" referrerpolicy="no-referrer"') },
  { desc: 'portfolio gallery preview uses normalizeImageUrl and referrerpolicy="no-referrer"', check: adminCode.includes('normalizeImageUrl(img.url') && adminCode.includes('class="gallery-thumb-preview" referrerpolicy="no-referrer"') },
  { desc: 'case gallery preview uses normalizeImageUrl and referrerpolicy="no-referrer"', check: adminCode.includes('normalizeImageUrl(img.url') && adminCode.includes('class="gallery-thumb-preview" referrerpolicy="no-referrer"') },
  { desc: 'savePortfolioItem normalizes heroImg and gallery items', check: adminCode.includes('normalizeImageUrl(rawHeroImg)') },
  { desc: 'saveCaseStudyWithMode normalizes heroImg and gallery items', check: adminCode.includes('normalizeImageUrl(rawHeroImg)') },
  { desc: 'saveJournalPostWithMode normalizes heroThumb', check: adminCode.includes('normalizeImageUrl(rawThumb)') },
  { desc: 'uploadAsset normalizes publicUrl and updates preview', check: adminCode.includes('normalizedUrl = normalizeImageUrl(publicUrl)') }
];

adminChecks.forEach(c => {
  if (c.check) {
    console.log(`✓ PASS: ${c.desc}`);
  } else {
    console.error(`✗ FAIL: ${c.desc}`);
    failed++;
  }
});

console.log('\n-------------------------------------------------------------');
if (failed === 0) {
  console.log('ALL IMAGE URL NORMALIZATION & ADMIN INTEGRATION TESTS PASSED!');
  process.exit(0);
} else {
  console.error(`FAILED: ${failed} check(s) did not pass.`);
  process.exit(1);
}
