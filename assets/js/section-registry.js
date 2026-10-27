/**
 * THE SONIC MEDIA — DYNAMIC SECTION & ELEMENT REGISTRY (v2.0 Visual Page Builder)
 * Comprehensive Registry for WordPress/Shopify-style Page Design System.
 * Shared between the Visual Page Builder Canvas and the Public project.html Renderer.
 */

(function (global) {
  'use strict';

  // ── Helper Utilities ──
  function decodePreEscapedEntities(str) {
    if (!str || typeof str !== 'string') return '';
    var result = str;
    for (var i = 0; i < 4; i++) {
      var prev = result;
      result = result
        .replace(/&amp;#39;/gi, "'")
        .replace(/&#39;/gi, "'")
        .replace(/&#039;/gi, "'")
        .replace(/&apos;/gi, "'")
        .replace(/&amp;apos;/gi, "'")
        .replace(/&amp;quot;/gi, '"')
        .replace(/&quot;/gi, '"')
        .replace(/&amp;amp;/gi, '&')
        .replace(/&amp;lt;/gi, '<')
        .replace(/&amp;gt;/gi, '>');
      if (result === prev) break;
    }
    return result;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    var clean = decodePreEscapedEntities(String(str));
    return clean
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function repairEscapedFormatting(str) {
    if (!str || typeof str !== 'string') return str || '';
    var s = decodePreEscapedEntities(str);
    if (s.includes('&lt;') && s.includes('&gt;')) {
      s = s.replace(/&lt;(\/?(?:span|a|u|b|i|strong|em|s|mark|font|br|hr|p|h[1-6]|small|sub|sup))((?:\s+[\w-]+(?:=(?:&quot;[^&]*&quot;|&#39;[^&#39;]*&#39;|"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)&gt;/gi, function (match, tag, attrs, selfClose) {
        var unescapedAttrs = attrs.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
        return '<' + tag + unescapedAttrs + (selfClose ? ' /' : '') + '>';
      });
    }
    // Also convert legacy <font color="X">...</font> to <span style="color:X;">...</span>
    s = s.replace(/<font\s+[^>]*color=["']([^"']*)["'][^>]*>([\s\S]*?)<\/font>/gi, '<span style="color:$1;">$2</span>');
    s = s.replace(/<font\s+[^>]*color=([^\s>]+)[^>]*>([\s\S]*?)<\/font>/gi, '<span style="color:$1;">$2</span>');
    return s;
  }

  const BUILDER_CHROME_SELECTOR = [
    '.element-action-bar', '.element-resize-handle', '.canvas-resize-handle',
    '.canvas-img-resize-handle', '.canvas-section-header-bar', '.canvas-section-badge',
    '.canvas-reposition-handle', '.canvas-reposition-reset-btn',
    '.element-reposition-drag-handle', '.element-reposition-handle',
    '[data-builder-ui="true"]'
  ].join(',');

  function stripBuilderChromeFromHtml(html) {
    if (!html || typeof html !== 'string') return html || '';
    let source = html.replace(/style="font-family:\s*"([^"]+)"\s*;?([^"]*)"/gi, function (_m, family, rest) {
      return `style="font-family:${family};${rest || ''}"`;
    });

    if (!((source.includes('<') && source.includes('>')) || (source.includes('&lt;') && source.includes('&gt;')))) {
      return source;
    }

    if (global.document && typeof global.document.createElement === 'function') {
      const template = global.document.createElement('template');
      template.innerHTML = source;
      template.content.querySelectorAll(BUILDER_CHROME_SELECTOR).forEach(node => node.remove());
      template.content.querySelectorAll('*').forEach(node => {
        node.removeAttribute('contenteditable');
        node.removeAttribute('spellcheck');
        node.removeAttribute('data-sec-id');
        node.removeAttribute('data-el-key');
        node.removeAttribute('data-el-label');
        node.classList.remove('canvas-live-editable', 'element-active-selected', 'has-element-box', 'has-reposition-handle', 'element-has-active-child');
        if (!node.getAttribute('class')) node.removeAttribute('class');
      });
      return template.innerHTML;
    }

    return source
      .replace(/<(?:div|span|button)[^>]*class=["'][^"']*(?:element-action-bar|element-resize-handle|canvas-resize-handle|canvas-img-resize-handle|canvas-section-header-bar|canvas-section-badge|canvas-reposition-handle|element-reposition-(?:drag-)?handle)[^"']*["'][^>]*>[\s\S]*?<\/(?:div|span|button)>/gi, '')
      .replace(/\s(?:contenteditable|spellcheck|data-sec-id|data-el-key|data-el-label)=["'][^"']*["']/gi, '');
  }

  function cleanPersistedContentValue(value) {
    if (typeof value === 'string') return stripBuilderChromeFromHtml(value);
    if (Array.isArray(value)) return value.map(cleanPersistedContentValue);
    if (value && typeof value === 'object') {
      Object.keys(value).forEach(key => {
        value[key] = cleanPersistedContentValue(value[key]);
      });
    }
    return value;
  }

  function sanitizeRichText(html) {
    if (!html) return '';
    const quoteToken = '__SONIC_HTML_QUOTE__';
    const protectedHtml = stripBuilderChromeFromHtml(String(html)).replace(/&amp;quot;|&quot;/gi, quoteToken);
    var processed = repairEscapedFormatting(decodePreEscapedEntities(protectedHtml)).replace(new RegExp(quoteToken, 'g'), '&quot;');
    if (typeof global.DOMPurify !== 'undefined') {
      return global.DOMPurify.sanitize(processed, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'b', 'strong', 'i', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'span', 'br', 'hr', 'code', 'mark', 'small', 'sub', 'sup', 'font'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'title', 'color', 'face', 'size']
      });
    }
    // Fallback basic stripper for dangerous tags if DOMPurify is not yet loaded
    return String(processed)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  }

  function renderFormattedText(text) {
    if (!text) return '';
    if (typeof text !== 'string') return String(text);
    if ((text.includes('<') && text.includes('>')) || (text.includes('&lt;') && text.includes('&gt;'))) {
      return sanitizeRichText(text);
    }
    var processed = decodePreEscapedEntities(repairEscapedFormatting(text));
    return escapeHtml(processed);
  }

  function resolveFontFamily(val, defaultFallback = "'Syne', sans-serif") {
    if (!val || val === 'inherit' || val === 'default') return defaultFallback;
    const clean = String(val).replace(/["']/g, '').trim();
    const lower = clean.toLowerCase();
    if (lower.includes('bebas')) return "'Bebas Neue', sans-serif";
    if (lower.includes('dm sans')) return "'DM Sans', sans-serif";
    if (lower.includes('plus jakarta')) return "'Plus Jakarta Sans', sans-serif";
    if (lower.includes('outfit')) return "'Outfit', sans-serif";
    if (lower.includes('space grotesk')) return "'Space Grotesk', sans-serif";
    if (lower.includes('playfair')) return "'Playfair Display', serif";
    if (lower.includes('garamond')) return "'Cormorant Garamond', serif";
    if (lower.includes('cinzel')) return "'Cinzel', serif";
    if (lower.includes('inter')) return "'Inter', sans-serif";
    if (lower.includes('monospace')) return "monospace";
    if (lower.includes('system-ui')) return "system-ui, -apple-system, sans-serif";
    if (lower.includes('syne')) return "'Syne', sans-serif";
    if (val.includes(',') || val.includes("'")) return val;
    return `'${clean}', sans-serif`;
  }

  function generateId(prefix) {
    return (prefix || 'sec') + '_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
  }

  function formatSpacingClass(spacing) {
    switch (spacing) {
      case 'compact': return 'sp-compact';
      case 'generous': return 'sp-generous';
      case 'none': return 'sp-none';
      default: return 'sp-standard';
    }
  }

  function normalizeCssDimension(value, fallbackUnit = 'px') {
    if (value === null || value === undefined || value === '') return '';
    const raw = String(value).trim();
    const match = raw.match(/^(\d+(?:\.\d+)?)(px|%)?$/i);
    if (!match) return '';
    return match[1] + (match[2] || fallbackUnit);
  }

  const BUILDER_SCHEMA_VERSION = 4;

  function normalizeBuilderNode(node, sectionId, index) {
    const source = node && typeof node === 'object' ? node : {};
    const legacyType = source.elementType || source.type || 'card';
    return Object.assign({}, source, {
      id: source.id || generateId('node'),
      kind: source.kind || 'element',
      elementType: legacyType,
      type: legacyType,
      parentId: sectionId,
      order: Number.isFinite(source.order) ? source.order : index
    });
  }

  function attachLegacyNodeAlias(section) {
    if (!section || typeof section !== 'object') return section;
    section.settings = section.settings && typeof section.settings === 'object' ? section.settings : {};
    section.content = cleanPersistedContentValue(section.content && typeof section.content === 'object' ? section.content : {});
    section.nodes = Array.isArray(section.nodes) ? section.nodes : [];
    try {
      Object.defineProperty(section.settings, 'customContainers', {
        configurable: true,
        enumerable: true,
        get() { return section.nodes; },
        set(value) {
          section.nodes = Array.isArray(value)
            ? value.map((node, index) => normalizeBuilderNode(node, section.id, index))
            : [];
        }
      });
    } catch (_) {
      section.settings.customContainers = section.nodes;
    }
    return section;
  }

  function migrateSection(section) {
    if (!section || typeof section !== 'object') return section;
    section.id = section.id || generateId(section.type || 'section');
    section.kind = 'section';
    section.schemaVersion = BUILDER_SCHEMA_VERSION;
    section.settings = section.settings && typeof section.settings === 'object' ? section.settings : {};

    const legacyNodes = Array.isArray(section.nodes)
      ? section.nodes
      : (Array.isArray(section.settings.customContainers) ? section.settings.customContainers : []);
    section.nodes = legacyNodes.map((node, index) => {
      const normalized = normalizeBuilderNode(node, section.id, index);
      if (normalized.content) normalized.content = cleanPersistedContentValue(normalized.content);
      return normalized;
    });

    const hasFreeformGeometry = section.nodes.some(node =>
      parseFloat(node.offsetX || 0) !== 0 || parseFloat(node.offsetY || 0) !== 0
    );
    const existingLayout = section.layout && typeof section.layout === 'object' ? section.layout : {};
    const declaredLayout = section.settings.semanticLayout && typeof section.settings.semanticLayout === 'object'
      ? section.settings.semanticLayout
      : {};
    section.layout = Object.assign({
      mode: hasFreeformGeometry || section.nodes.length > 0 ? 'freeform' : 'structured',
      type: hasFreeformGeometry || section.nodes.length > 0 ? 'freeform' : 'stack',
      columns: 1,
      gap: 20
    }, declaredLayout, existingLayout);

    return attachLegacyNodeAlias(section);
  }

  function migrateSections(sections) {
    return Array.isArray(sections) ? sections.filter(Boolean).map(migrateSection) : [];
  }

  function serializeSections(sections) {
    const migrated = migrateSections(sections);
    migrated.forEach(sec => {
      if (sec && sec.settings) {
        sec.settings.customContainers = Array.isArray(sec.nodes) ? sec.nodes : (Array.isArray(sec.settings.customContainers) ? sec.settings.customContainers : []);
      }
    });
    return JSON.parse(JSON.stringify(migrated));
  }

  function getSectionNodes(section) {
    if (!section) return [];
    if (Array.isArray(section.nodes)) return section.nodes;
    const settings = section.settings || {};
    return Array.isArray(settings.customContainers) ? settings.customContainers : [];
  }

  function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(255,92,0,${alpha})`;
    let c = String(hex).replace('#', '').trim();
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return `rgba(255,92,0,${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function renderCustomBtnMarkup(btnConfig, idx) {
    if (!btnConfig) return '';
    const rawText = (btnConfig.text !== undefined && btnConfig.text !== null && btnConfig.text !== '') ? btnConfig.text : 'Action';
    const text = escapeHtml(rawText);
    const url = escapeHtml(btnConfig.url || '#');
    const target = btnConfig.target === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : '';
    const color = btnConfig.color || '#FF5C00';
    const textColor = btnConfig.textColor || '#FFFFFF';
    const btnStyle = btnConfig.style || 'solid'; // 'solid', 'outline', 'ghost', 'neon', 'gradient', 'frosted', 'brutalist', 'link'
    const radius = btnConfig.radius !== undefined && btnConfig.radius !== '' ? `${parseInt(btnConfig.radius)}px` : '50px';
    const size = btnConfig.size || 'medium'; // 'small', 'medium', 'large'

    let pad = '12px 28px';
    let fz = '12px';
    if (size === 'small') { pad = '8px 18px'; fz = '11px'; }
    else if (size === 'large') { pad = '16px 38px'; fz = '14px'; }

    // Typography overrides
    const fw = btnConfig.fontWeight || '700';
    const tt = btnConfig.textTransform || 'none';
    const ls = btnConfig.letterSpacing !== undefined && btnConfig.letterSpacing !== '' ? `${parseInt(btnConfig.letterSpacing)}px` : '0.03em';

    // Custom Border Resolution
    const hasCustomBorderWidth = btnConfig.borderWidth !== undefined && btnConfig.borderWidth !== '';
    const bWidth = hasCustomBorderWidth ? parseInt(btnConfig.borderWidth) : null;
    const bStyleType = btnConfig.borderStyle || 'solid';
    const bColor = btnConfig.borderColor || (btnStyle === 'solid' ? hexToRgba('#FFFFFF', 0.25) : color);

    let borderStr = '';
    if (bWidth !== null) {
      if (bWidth > 0 && bStyleType !== 'none') {
        borderStr = `${bWidth}px ${bStyleType} ${bColor}`;
      } else {
        borderStr = 'none';
      }
    }

    // Glow & Ambient Shadow
    const glowSetting = btnConfig.glow || 'default';
    const glow1 = hexToRgba(color, 0.45);
    const glow2 = hexToRgba(color, 0.25);

    let bgStr = '';
    let colorStr = textColor;
    let shadowStr = '';
    let extraCss = '';

    if (btnStyle === 'solid') {
      bgStr = color;
      colorStr = textColor;
      if (!borderStr) borderStr = 'none';
      if (glowSetting === 'none') {
        shadowStr = 'none';
      } else if (glowSetting === 'soft') {
        shadowStr = `0 0 16px ${hexToRgba(color, 0.35)}, 0 2px 8px ${hexToRgba(color, 0.2)}`;
      } else if (glowSetting === 'intense') {
        shadowStr = `0 0 32px ${glow1}, 0 4px 16px ${glow2}, 0 0 60px ${hexToRgba(color, 0.25)}`;
      } else if (glowSetting === 'shadow') {
        shadowStr = '0 10px 25px -5px rgba(0,0,0,0.65), 0 8px 10px -6px rgba(0,0,0,0.5)';
      } else {
        shadowStr = `0 0 24px ${glow1}, 0 4px 12px ${glow2}`;
      }
    } else if (btnStyle === 'outline') {
      bgStr = 'rgba(255, 255, 255, 0.03)';
      colorStr = (btnConfig.textColor && btnConfig.textColor !== '#FFFFFF') ? btnConfig.textColor : color;
      if (!borderStr) borderStr = `1.5px solid ${bColor || color}`;
      if (glowSetting === 'none') {
        shadowStr = 'none';
      } else if (glowSetting === 'intense') {
        shadowStr = `0 0 24px ${glow1}, inset 0 0 12px ${hexToRgba(color, 0.15)}`;
      } else if (glowSetting === 'shadow') {
        shadowStr = '0 8px 20px rgba(0,0,0,0.55)';
      } else {
        shadowStr = `0 0 16px ${hexToRgba(color, 0.2)}`;
      }
      extraCss += 'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);';
    } else if (btnStyle === 'ghost') {
      bgStr = hexToRgba(color, 0.14);
      colorStr = textColor;
      if (!borderStr) borderStr = `1px solid ${bColor || hexToRgba(color, 0.35)}`;
      shadowStr = (glowSetting === 'intense') ? `0 0 20px ${hexToRgba(color, 0.35)}` : (glowSetting === 'none' ? 'none' : 'none');
    } else if (btnStyle === 'neon') {
      bgStr = 'rgba(8, 8, 12, 0.82)';
      colorStr = color;
      if (!borderStr) borderStr = `2px solid ${bColor || color}`;
      shadowStr = `0 0 16px ${glow1}, inset 0 0 12px ${hexToRgba(color, 0.25)}, 0 0 36px ${hexToRgba(color, 0.3)}`;
      extraCss += `text-shadow:0 0 8px ${glow1};backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);`;
    } else if (btnStyle === 'gradient') {
      bgStr = `linear-gradient(135deg, ${color} 0%, #FF8533 100%)`;
      colorStr = textColor;
      if (!borderStr) borderStr = '1px solid rgba(255, 255, 255, 0.25)';
      shadowStr = `0 4px 20px ${hexToRgba(color, 0.45)}, inset 0 1px 0 rgba(255, 255, 255, 0.35)`;
    } else if (btnStyle === 'frosted') {
      bgStr = 'rgba(255, 255, 255, 0.08)';
      colorStr = textColor;
      if (!borderStr) borderStr = `1px solid ${bColor || 'rgba(255, 255, 255, 0.22)'}`;
      shadowStr = '0 8px 32px rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
      extraCss += 'backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);';
    } else if (btnStyle === 'brutalist') {
      bgStr = color;
      colorStr = textColor;
      const shadowCol = bColor || '#000000';
      if (!borderStr) borderStr = `2px solid ${shadowCol}`;
      shadowStr = `4px 4px 0px ${shadowCol}`;
    } else if (btnStyle === 'link') {
      bgStr = 'transparent';
      colorStr = color;
      borderStr = 'none';
      shadowStr = 'none';
      extraCss += 'text-decoration:underline;text-underline-offset:4px;padding:4px 0 !important;';
    }

    const hEffect = btnConfig.hoverEffect || 'lift';
    const extraClass = `custom-sec-btn btn-hover-${hEffect}`;

    const styleStr = [
      `background:${bgStr}`,
      `color:${colorStr}`,
      `border:${borderStr}`,
      `border-radius:${radius}`,
      `padding:${pad}`,
      `font-size:${fz}`,
      `font-weight:${fw}`,
      `text-transform:${tt}`,
      `letter-spacing:${ls}`,
      shadowStr ? `box-shadow:${shadowStr}` : '',
      extraCss
    ].filter(Boolean).join(';');

    const dataAttr = (idx !== undefined && idx !== null) ? ` data-btn-idx="${idx}"` : '';
    return `<a href="${url}" class="${extraClass}"${dataAttr} style="${styleStr}"${target}>${text}</a>`;
  }

  // Resolve section buttons into an array of styled button configs
  function getSectionButtons(section) {
    if (!section) return [];
    const s = section.settings || {};
    const c = section.content || {};

    // 1. If explicit buttons array exists in settings, use it
    if (Array.isArray(s.buttons) && s.buttons.length > 0) {
      return s.buttons.filter(Boolean).map((b, i) => ({
        id: b.id || ('btn_' + i + '_' + Math.random().toString(36).substring(2, 6)),
        text: b.text !== undefined ? b.text : '',
        url: b.url || '#',
        target: b.target || '_self',
        color: b.color || (i === 0 ? '#FF5C00' : (i === 1 ? '#8E8E8E' : '#00E5FF')),
        textColor: b.textColor || '#FFFFFF',
        style: b.style || (i === 0 ? 'solid' : (i === 1 ? 'outline' : 'ghost')),
        radius: b.radius !== undefined ? b.radius : 50,
        size: b.size || 'medium',
        borderWidth: b.borderWidth !== undefined ? b.borderWidth : '',
        borderColor: b.borderColor || '',
        borderStyle: b.borderStyle || 'solid',
        glow: b.glow || 'default',
        hoverEffect: b.hoverEffect || 'lift',
        fontWeight: b.fontWeight || '700',
        textTransform: b.textTransform || 'none',
        letterSpacing: b.letterSpacing !== undefined ? b.letterSpacing : ''
      }));
    }

    // 2. Otherwise build from legacy settings/content
    const buttons = [];
    const isInlineBtnSec = ['text_image', 'hero', 'cta', 'button_block'].includes(section.type);
    const hasLegacyPrimary = !!(s.buttonText || c.ctaText || c.btnText || c.primaryText);
    const primaryActive = s.buttonEnabled === true || (isInlineBtnSec && s.buttonEnabled !== false && hasLegacyPrimary);

    if (primaryActive) {
      const pText = s.buttonText !== undefined ? s.buttonText : (c.ctaText || c.btnText || c.primaryText || '');
      if (pText && pText.trim()) {
        buttons.push({
          id: 'btn_primary',
          text: pText,
          url: s.buttonUrl !== undefined ? s.buttonUrl : (c.ctaUrl || c.btnUrl || c.primaryUrl || '#'),
          target: s.buttonTarget || '_self',
          color: s.buttonColor || '#FF5C00',
          textColor: s.buttonTextColor || '#FFFFFF',
          style: s.buttonStyle || 'solid',
          radius: s.buttonRadius !== undefined ? s.buttonRadius : 50,
          size: s.buttonSize || 'medium'
        });
      }
    }

    // Legacy secondary button for cta or button_block
    const secText = c.secondaryBtnText || c.secondaryText;
    const secUrl = c.secondaryBtnUrl || c.secondaryUrl;
    if (secText && secText.trim()) {
      buttons.push({
        id: 'btn_secondary',
        text: secText,
        url: secUrl || '#',
        target: s.secondaryButtonTarget || '_self',
        color: s.secondaryButtonColor || '#8E8E8E',
        textColor: s.secondaryButtonTextColor || '#F5F0EB',
        style: s.secondaryButtonStyle || 'outline',
        radius: s.secondaryButtonRadius !== undefined ? s.secondaryButtonRadius : (s.buttonRadius !== undefined ? s.buttonRadius : 50),
        size: s.secondaryButtonSize || (s.buttonSize || 'medium')
      });
    }

    return buttons;
  }

  function renderSectionButtonGroup(section, defaultAlign = 'left', extraWrapperStyle = '') {
    const buttons = getSectionButtons(section);
    if (!buttons || buttons.length === 0) return '';
    const s = section.settings || {};
    const align = s.buttonAlign || defaultAlign;
    const justify = align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start');

    const btnsHtml = buttons.map((b, idx) => renderCustomBtnMarkup(b, idx)).join('');
    return `
      <div class="custom-btn-wrapper custom-btn-group align-${align}" style="margin-top:24px;display:flex;gap:14px;justify-content:${justify};align-items:center;flex-wrap:wrap;${extraWrapperStyle}">
        ${btnsHtml}
      </div>
    `;
  }

  // ── Scoped Responsive Media Query Generator (Tablet & Mobile) ──
  function generateSectionResponsiveCss(secId, resp) {
    if (!resp || (!resp.tablet && !resp.mobile)) return '';
    const rules = [];

    // Tablet Rules (max-width: 991px and .tablet-view)
    if (resp.tablet && typeof resp.tablet === 'object') {
      const t = resp.tablet;
      const tCss = [];
      if (t.elementOffsets) {
        for (const [elKey, pos] of Object.entries(t.elementOffsets)) {
          if (pos && (pos.x !== undefined || pos.y !== undefined)) {
            tCss.push(`--el-${elKey}-ox: ${parseInt(pos.x || 0)}px; --el-${elKey}-oy: ${parseInt(pos.y || 0)}px;`);
          }
        }
      }
      if (t.gap !== undefined && t.gap !== '') {
        tCss.push(`--sec-gap: ${parseInt(t.gap)}px;`);
      }
      if (t.columns !== undefined) {
        const cVal = t.columns === 'all' ? '12' : (t.columns === 'auto' ? 'auto' : parseInt(t.columns));
        if (cVal) {
          rules.push(`
            @media (max-width: 991px) {
              [data-section-id="${secId}"] .wd-narrative-grid,
              [data-section-id="${secId}"] .cards-grid-wrap,
              [data-section-id="${secId}"] .sec-gallery-grid,
              [data-section-id="${secId}"] .sec-list-grid {
                grid-template-columns: repeat(${cVal}, minmax(0, 1fr)) !important;
              }
            }
            .tablet-view [data-section-id="${secId}"] .wd-narrative-grid,
            .tablet-view [data-section-id="${secId}"] .cards-grid-wrap,
            .tablet-view [data-section-id="${secId}"] .sec-gallery-grid,
            .tablet-view [data-section-id="${secId}"] .sec-list-grid {
              grid-template-columns: repeat(${cVal}, minmax(0, 1fr)) !important;
            }
          `);
        }
      }
      if (tCss.length > 0) {
        rules.push(`
          @media (max-width: 991px) {
            [data-section-id="${secId}"] {
              ${tCss.join(' ')}
            }
          }
          .tablet-view [data-section-id="${secId}"] {
            ${tCss.join(' ')}
          }
        `);
      }
    }

    // Mobile Rules (max-width: 767px and .mobile-view)
    if (resp.mobile && typeof resp.mobile === 'object') {
      const m = resp.mobile;
      const mCss = [];
      if (m.elementOffsets) {
        for (const [elKey, pos] of Object.entries(m.elementOffsets)) {
          if (pos && (pos.x !== undefined || pos.y !== undefined)) {
            mCss.push(`--el-${elKey}-ox: ${parseInt(pos.x || 0)}px; --el-${elKey}-oy: ${parseInt(pos.y || 0)}px;`);
          }
        }
      }
      if (m.gap !== undefined && m.gap !== '') {
        mCss.push(`--sec-gap: ${parseInt(m.gap)}px;`);
      }
      if (m.columns !== undefined) {
        const cVal = m.columns === 'all' ? '12' : (m.columns === 'auto' ? 'auto' : parseInt(m.columns));
        if (cVal) {
          rules.push(`
            @media (max-width: 767px) {
              [data-section-id="${secId}"] .wd-narrative-grid,
              [data-section-id="${secId}"] .cards-grid-wrap,
              [data-section-id="${secId}"] .sec-gallery-grid,
              [data-section-id="${secId}"] .sec-list-grid {
                grid-template-columns: repeat(${cVal}, minmax(0, 1fr)) !important;
              }
            }
            .mobile-view [data-section-id="${secId}"] .wd-narrative-grid,
            .mobile-view [data-section-id="${secId}"] .cards-grid-wrap,
            .mobile-view [data-section-id="${secId}"] .sec-gallery-grid,
            .mobile-view [data-section-id="${secId}"] .sec-list-grid {
              grid-template-columns: repeat(${cVal}, minmax(0, 1fr)) !important;
            }
          `);
        }
      }
      if (m.direction === 'column' || m.direction === 'vertical' || m.columns === 1) {
        rules.push(`
          @media (max-width: 767px) {
            [data-section-id="${secId}"] .wd-narrative-grid,
            [data-section-id="${secId}"] .sec-list-grid {
              display: flex !important;
              flex-direction: column !important;
            }
          }
          .mobile-view [data-section-id="${secId}"] .wd-narrative-grid,
          .mobile-view [data-section-id="${secId}"] .sec-list-grid {
            display: flex !important;
            flex-direction: column !important;
          }
        `);
      }
      if (mCss.length > 0) {
        rules.push(`
          @media (max-width: 767px) {
            [data-section-id="${secId}"] {
              ${mCss.join(' ')}
            }
          }
          .mobile-view [data-section-id="${secId}"] {
            ${mCss.join(' ')}
          }
        `);
      }
    }

    if (rules.length === 0) return '';
    return `<style class="sec-responsive-style" data-sec-id="${secId}">${rules.join('\n')}</style>`;
  }

  // Universal Prebuilt Empty Image Upload Zone (Matches Custom Container UX)
  function renderEmptyImageUploadZone(opts) {
    const secId = opts.secId || '';
    const elKey = opts.elKey || 'image';
    const title = opts.title || 'Upload Image';
    const sub = opts.sub || 'Click to browse or drag & drop photo';
    const btnText = opts.btnText || 'Browse Photo';
    const minH = opts.minHeight || '80px';
    const radius = opts.borderRadius || '14px';
    const extraStyle = opts.extraStyle || '';
    const imgIndex = opts.imgIndex !== undefined ? `data-img-index="${opts.imgIndex}"` : '';

    return `
      <div class="sec-image-upload-zone custom-container-upload-zone"
           data-sec-id="${escapeHtml(secId)}"
           data-el-key="${escapeHtml(elKey)}"
           ${imgIndex}
           onclick="window.triggerImageElementUpload && window.triggerImageElementUpload('${escapeHtml(secId)}', '${escapeHtml(elKey)}', this, event)"
           style="position:relative;width:100%;min-height:${minH};height:100%;border:2px dashed rgba(255,92,0,0.45);border-radius:${radius};background:rgba(255,92,0,0.03);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 20px;text-align:center;box-sizing:border-box;cursor:pointer !important;transition:all 0.2s ease;${extraStyle}">
        <div class="custom-upload-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>
        <div class="custom-upload-title" style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:#F5F0EB;margin-bottom:4px;">${escapeHtml(title)}</div>
        <div class="custom-upload-sub" style="font-size:12.5px;color:rgba(245,240,235,0.6);margin-bottom:12px;">${escapeHtml(sub)}</div>
        <button type="button" class="btn btn-primary btn-sm custom-upload-btn" onclick="window.triggerImageElementUpload && window.triggerImageElementUpload('${escapeHtml(secId)}', '${escapeHtml(elKey)}', this.closest('.sec-image-upload-zone'), event)" style="padding:7px 18px;font-size:12px;font-weight:600;border-radius:20px;background:#FF5C00;color:#fff;border:none;cursor:pointer !important;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(255,92,0,0.35);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          ${escapeHtml(btnText)}
        </button>
      </div>
    `;
  }

  // Universal Section Wrapper
  function renderUniversalWrap(section, innerHtml, extraClasses = '') {
    const s = section.settings || {};
    const spacingClass = formatSpacingClass(s.spacing);
    const visibilityClass = s.responsiveVisibility === 'hide-mobile' ? 'builder-hide-mobile' : 
                           (s.responsiveVisibility === 'hide-desktop' ? 'builder-hide-desktop' : '');
    const animAttr = s.animation && s.animation !== 'none' ? `data-anim="${escapeHtml(s.animation)}"` : '';
    
    const styleParts = [];
    if (s.bgColor) {
      const bg = String(s.bgColor).trim();
      if (bg.toLowerCase() === 'transparent' || bg.toLowerCase() === 'none') {
        styleParts.push('background-color: transparent !important');
        if (!s.bgImage && !s.bgGradient) {
          styleParts.push('background-image: none !important');
        }
      } else {
        styleParts.push(`background-color: ${escapeHtml(bg)}`);
      }
    }
    if (s.bgGradient) styleParts.push(`background-image:${s.bgGradient}`);
    if (s.bgImage) {
      const showOverlay = s.showBgOverlay !== false; // Default true unless user turns it off
      const overlay = showOverlay ? (s.bgOverlay !== undefined && s.bgOverlay !== '' ? parseFloat(s.bgOverlay) : 0.75) : 0;
      
      if (overlay > 0) {
        styleParts.push(`background-image:linear-gradient(rgba(8,8,8,${overlay}), rgba(8,8,8,${overlay})), url('${escapeHtml(s.bgImage)}');background-size:cover;background-position:${escapeHtml(s.bgPosition || 'center center')}`);
      } else {
        styleParts.push(`background-image:url('${escapeHtml(s.bgImage)}');background-size:cover;background-position:${escapeHtml(s.bgPosition || 'center center')}`);
      }
    }

    // Outer Section Margin (Top, Bottom)
    if (s.marginTop !== undefined && s.marginTop !== '') {
      styleParts.push(`--sec-mt:${parseInt(s.marginTop)}px`);
      styleParts.push(`margin-top:${parseInt(s.marginTop)}px`);
    }
    if (s.marginBottom !== undefined && s.marginBottom !== '') {
      styleParts.push(`--sec-mb:${parseInt(s.marginBottom)}px`);
      styleParts.push(`margin-bottom:${parseInt(s.marginBottom)}px`);
    }

    // Outer Section Padding (Top, Bottom, Left, Right)
    const pt = (s.paddingTop !== undefined && s.paddingTop !== '') ? parseInt(s.paddingTop) : (s.customPaddingTop ? parseInt(s.customPaddingTop) : null);
    if (pt !== null) {
      styleParts.push(`--sec-pt:${pt}px`);
      styleParts.push(`padding-top:${pt}px !important`);
    }
    const pb = (s.paddingBottom !== undefined && s.paddingBottom !== '') ? parseInt(s.paddingBottom) : (s.customPaddingBottom ? parseInt(s.customPaddingBottom) : null);
    if (pb !== null) {
      styleParts.push(`--sec-pb:${pb}px`);
      styleParts.push(`padding-bottom:${pb}px !important`);
    }
    if (s.paddingLeft !== undefined && s.paddingLeft !== '') {
      styleParts.push(`--sec-pl:${parseInt(s.paddingLeft)}px`);
    }
    if (s.paddingRight !== undefined && s.paddingRight !== '') {
      styleParts.push(`--sec-pr:${parseInt(s.paddingRight)}px`);
    }

    // Section Container Repositioning (Smooth X & Y Offsets)
    const ox = parseInt(s.offsetX || 0);
    const oy = parseInt(s.offsetY || 0);
    if (ox !== 0 || oy !== 0) {
      styleParts.push(`transform:translate3d(${ox}px, ${oy}px, 0)`);
      styleParts.push(`--sec-ox:${ox}px`);
      styleParts.push(`--sec-oy:${oy}px`);
    }

    // Section Layer Stacking (Bottom-over-top z-index rule)
    const secIndex = typeof section._renderIndex === 'number' ? section._renderIndex : 0;
    const autoZ = 10 + (secIndex + 1) * 10;
    const resolvedZ = (s.zIndex !== undefined && s.zIndex !== '' && !isNaN(parseInt(s.zIndex)))
      ? parseInt(s.zIndex)
      : autoZ;
    styleParts.push('position:relative');
    styleParts.push('isolation:isolate');
    styleParts.push(`z-index:${resolvedZ}`);

    // Heading Spacing, Alignment & Positioning Overrides
    if (s.headingMarginTop !== undefined && s.headingMarginTop !== '') styleParts.push(`--sec-h-mt:${parseInt(s.headingMarginTop)}px`);
    if (s.headingMarginBottom !== undefined && s.headingMarginBottom !== '') styleParts.push(`--sec-h-mb:${parseInt(s.headingMarginBottom)}px`);
    if (s.headingPaddingLeft !== undefined && s.headingPaddingLeft !== '') styleParts.push(`--sec-h-pl:${parseInt(s.headingPaddingLeft)}px`);
    if (s.headingPaddingRight !== undefined && s.headingPaddingRight !== '') styleParts.push(`--sec-h-pr:${parseInt(s.headingPaddingRight)}px`);
    if (s.headingAlign) {
      styleParts.push(`--sec-h-align:${s.headingAlign}`);
      const hJust = s.headingAlign === 'center' ? 'center' : (s.headingAlign === 'right' ? 'flex-end' : 'flex-start');
      styleParts.push(`--sec-h-justify:${hJust}`);
    }
    if (s.headingOffsetX !== undefined && s.headingOffsetX !== '') styleParts.push(`--sec-h-ox:${parseInt(s.headingOffsetX)}px`);
    if (s.headingOffsetY !== undefined && s.headingOffsetY !== '') styleParts.push(`--sec-h-oy:${parseInt(s.headingOffsetY)}px`);

    // Text & Description Spacing, Alignment & Positioning Overrides
    if (s.textMarginTop !== undefined && s.textMarginTop !== '') styleParts.push(`--sec-t-mt:${parseInt(s.textMarginTop)}px`);
    if (s.textMarginBottom !== undefined && s.textMarginBottom !== '') styleParts.push(`--sec-t-mb:${parseInt(s.textMarginBottom)}px`);
    if (s.textPaddingLeft !== undefined && s.textPaddingLeft !== '') styleParts.push(`--sec-t-pl:${parseInt(s.textPaddingLeft)}px`);
    if (s.textPaddingRight !== undefined && s.textPaddingRight !== '') styleParts.push(`--sec-t-pr:${parseInt(s.textPaddingRight)}px`);
    if (s.textAlign) styleParts.push(`--sec-t-align:${s.textAlign}`);
    if (s.textOffsetX !== undefined && s.textOffsetX !== '') styleParts.push(`--sec-t-ox:${parseInt(s.textOffsetX)}px`);
    if (s.textOffsetY !== undefined && s.textOffsetY !== '') styleParts.push(`--sec-t-oy:${parseInt(s.textOffsetY)}px`);
    if (s.textMaxWidth !== undefined && s.textMaxWidth !== '') styleParts.push(`--sec-t-maxw:${parseInt(s.textMaxWidth)}px`);

    // Image & Media Spacing, Sizing, Radius & Positioning Overrides
    if (s.imageMarginTop !== undefined && s.imageMarginTop !== '') styleParts.push(`--sec-img-mt:${parseInt(s.imageMarginTop)}px`);
    if (s.imageMarginBottom !== undefined && s.imageMarginBottom !== '') styleParts.push(`--sec-img-mb:${parseInt(s.imageMarginBottom)}px`);
    if (s.imagePaddingLeft !== undefined && s.imagePaddingLeft !== '') styleParts.push(`--sec-img-pl:${parseInt(s.imagePaddingLeft)}px`);
    if (s.imagePaddingRight !== undefined && s.imagePaddingRight !== '') styleParts.push(`--sec-img-pr:${parseInt(s.imagePaddingRight)}px`);
    if (s.imageBorderRadius !== undefined && s.imageBorderRadius !== '') styleParts.push(`--sec-img-rad:${parseInt(s.imageBorderRadius)}px`);
    if (s.imageWidth !== undefined && s.imageWidth !== '') {
      const iw = String(s.imageWidth).endsWith('%') || String(s.imageWidth).endsWith('px') ? s.imageWidth : `${s.imageWidth}px`;
      styleParts.push(`--sec-img-w:${iw}`);
    }
    if (s.imageHeight !== undefined && s.imageHeight !== '' && s.imageHeight !== 'auto') {
      const ih = String(s.imageHeight).endsWith('px') ? s.imageHeight : `${s.imageHeight}px`;
      styleParts.push(`--sec-img-h:${ih}`);
    }
    if (s.imageOffsetX !== undefined && s.imageOffsetX !== '') styleParts.push(`--sec-img-ox:${parseInt(s.imageOffsetX)}px`);
    if (s.imageOffsetY !== undefined && s.imageOffsetY !== '') styleParts.push(`--sec-img-oy:${parseInt(s.imageOffsetY)}px`);
    if (s.imageObjectFit || s.objectFit) styleParts.push(`--sec-img-fit:${s.imageObjectFit || s.objectFit}`);
    if (s.imageObjectPosition || s.objectPosition) styleParts.push(`--sec-img-pos:${s.imageObjectPosition || s.objectPosition}`);

    // Button Group Positioning Overrides
    const btnOx = parseInt(s.buttonOffsetX || 0);
    const btnOy = parseInt(s.buttonOffsetY || 0);
    if (btnOx !== 0 || btnOy !== 0) {
      styleParts.push(`--sec-btn-ox:${btnOx}px`);
      styleParts.push(`--sec-btn-oy:${btnOy}px`);
    }

    // Granular Element Offsets (Per-Card, Per-Column, Per-Image Item)
    if (s.elementOffsets && typeof s.elementOffsets === 'object') {
      for (const [elKey, pos] of Object.entries(s.elementOffsets)) {
        if (pos && (pos.x || pos.y)) {
          const eox = parseInt(pos.x || 0);
          const eoy = parseInt(pos.y || 0);
          styleParts.push(`--el-${elKey}-ox:${eox}px`);
          styleParts.push(`--el-${elKey}-oy:${eoy}px`);
        }
      }
    }

    // Section Minimum Height (supports canvas drag resize handle & sidebar inputs)
    // Section frame height must not inherit a media/banner height. The visual
    // builder exposes separate controls for those two independent dimensions.
    const customHVal = parseInt(s.customHeight);
    if (customHVal && customHVal > 0) {
      styleParts.push(`min-height:${customHVal}px`);
      if (extraClasses.includes('sec-hero') || section.type === 'hero') {
        styleParts.push('display:flex;flex-direction:column;justify-content:center');
      }
    }

    if (s.borderColor) styleParts.push(`border:1px solid ${s.borderColor}`);
    if (s.borderRadius) styleParts.push(`border-radius:${parseInt(s.borderRadius)}px`);
    
    // Custom Width (supports canvas drag resize handle & sidebar inputs)
    const normalizedCustomWidth = normalizeCssDimension(s.customWidth);
    const customWVal = normalizedCustomWidth ? parseFloat(normalizedCustomWidth) : null;
    const isFullBleed = s.containerWidth === 'bleed';
    const maxW = isFullBleed ? '100%' :
                 (customWVal ? normalizedCustomWidth :
                 (s.containerWidth === 'full' ? '100%' :
                 (s.containerWidth === 'wide' ? '1400px' :
                 (s.containerWidth === 'narrow' ? '800px' : '1200px'))));

    // Container Horizontal Alignment (inside section)
    const containerAlign = s.containerAlign || 'center';
    let containerMargin = 'margin:0 auto';
    if (containerAlign === 'left') containerMargin = 'margin:0 auto 0 0';
    else if (containerAlign === 'right') containerMargin = 'margin:0 0 0 auto';

    const innerStyleParts = [`max-width:${maxW}`, containerMargin, 'width:100%'];
    if (s.containerWidth === 'full' || isFullBleed) {
      if (s.paddingLeft === undefined || s.paddingLeft === '') innerStyleParts.push('padding-left:0 !important');
      if (s.paddingRight === undefined || s.paddingRight === '') innerStyleParts.push('padding-right:0 !important');
    }
    if (s.paddingLeft !== undefined && s.paddingLeft !== '') innerStyleParts.push(`padding-left:${parseInt(s.paddingLeft)}px !important`);
    if (s.paddingRight !== undefined && s.paddingRight !== '') innerStyleParts.push(`padding-right:${parseInt(s.paddingRight)}px !important`);

    // Check if universal button is enabled for this section (when not already rendered inside section)
    const hasInlineBtn = ['hero', 'text_image', 'cta', 'button_block'].includes(section.type);
    let universalBtnHtml = '';
    if (!hasInlineBtn) {
      const hasExplicitBtns = Array.isArray(s.buttons) && s.buttons.length > 0;
      const hasLegacyBtn = s.buttonEnabled === true && (s.buttonText || s.buttonUrl);
      if (hasExplicitBtns || hasLegacyBtn) {
        universalBtnHtml = renderSectionButtonGroup(section, s.buttonAlign || 'left', 'margin-top:28px;');
      }
    }

    // Custom containers added dynamically by user (Image, Text, Button, Card)
    const customContainersHtml = renderCustomContainersHtml(section);

    // Scoped responsive style block for mobile/tablet overrides
    const origSec = section._originalSection || section;
    const resp = (origSec.settings && origSec.settings.responsive) || (section.settings && section.settings.responsive);
    let responsiveStyleBlock = '';
    if (resp && (resp.tablet || resp.mobile)) {
      responsiveStyleBlock = generateSectionResponsiveCss(section.id, resp);
    }

    const isTemplateCardHidden = s.hideTemplateCard === true;
    const actualInnerHtml = isTemplateCardHidden ? '' : innerHtml;
    const containersOnlyClass = isTemplateCardHidden ? 'sec-containers-only' : '';

    // Responsive Hybrid Row Flow & Side-by-Side Sizing
    const hasCustomWidth = !!normalizedCustomWidth && normalizedCustomWidth !== '100%' &&
                           (normalizedCustomWidth.endsWith('%') || (customWVal > 0 && customWVal < 1400));
    const isRowFlow = !isFullBleed && (s.rowFlow === true || hasCustomWidth);
    const rowFlowClass = isRowFlow ? 'has-row-flow' : '';

    if (isRowFlow) {
      const outerW = normalizedCustomWidth || '50%';
      styleParts.push(`max-width:${outerW}`);
      styleParts.push(`flex:0 1 ${outerW}`);
      styleParts.push('width:100%');
      styleParts.push('box-sizing:border-box');
      styleParts.push('margin:0 auto');
    }

    const customStyleStr = styleParts.length ? `style="${styleParts.join(';')}"` : '';

    return `
      <section class="sec-block ${isFullBleed ? 'sec-full-bleed' : ''} ${spacingClass} ${extraClasses} ${containersOnlyClass} ${rowFlowClass} ${visibilityClass}" ${animAttr} ${customStyleStr} data-section-id="${section.id}">
        ${responsiveStyleBlock}
        <div class="sec-inner" style="${innerStyleParts.join(';')}">
          ${actualInnerHtml}
          ${isTemplateCardHidden ? '' : universalBtnHtml}
          ${customContainersHtml}
        </div>
      </section>
    `;
  }

  // Render dynamic custom containers (Image, Text, Button, Card/Box)
  function renderCustomContainersHtml(section) {
    if (!section) return '';
    const s = section.settings || {};
    // Responsive settings may intentionally provide a mode-specific node list.
    // Otherwise the canonical section.nodes collection is the single source of truth.
    const containers = Array.isArray(s.customContainers)
      ? s.customContainers
      : getSectionNodes(section);
    if (containers.length === 0) return '';

    const itemsHtml = containers.map((c, idx) => {
      const cId = c.id || `ccont_${idx}`;
      const cType = c.type || 'image';
      const cWidth = c.width ? (String(c.width).endsWith('px') || String(c.width).endsWith('%') ? c.width : `${parseInt(c.width)}px`) : (cType === 'button' ? 'auto' : '450px');
      const cHeight = c.height ? (String(c.height).endsWith('px') || String(c.height).endsWith('%') ? c.height : `${parseInt(c.height)}px`) : (cType === 'button' ? 'auto' : (cType === 'image' ? '320px' : '200px'));
      const ox = parseInt(c.offsetX || 0);
      const oy = parseInt(c.offsetY || 0);
      const rot = parseInt(c.rotation || 0);

      // Typography edited on a custom container must reach its real text
      // children. The children carry template defaults inline, so relying on
      // CSS inheritance would make the edit appear in the builder and then
      // disappear in Live Preview/New Tab.
      const customTextStyle = [
        c.fontFamily ? `font-family:${escapeHtml(String(c.fontFamily).replace(/["']/g, ''))}` : '',
        c.fontSize ? `font-size:${escapeHtml(c.fontSize)}` : '',
        c.fontWeight ? `font-weight:${escapeHtml(c.fontWeight)}` : '',
        c.fontStyle ? `font-style:${escapeHtml(c.fontStyle)}` : '',
        c.textDecoration ? `text-decoration:${escapeHtml(c.textDecoration)}` : '',
        c.textAlign ? `text-align:${escapeHtml(c.textAlign)}` : '',
        c.textTransform ? `text-transform:${escapeHtml(c.textTransform)}` : '',
        c.letterSpacing ? `letter-spacing:${escapeHtml(c.letterSpacing)}` : '',
        c.lineHeight ? `line-height:${escapeHtml(c.lineHeight)}` : '',
        c.color ? `color:${escapeHtml(c.color)}` : ''
      ].filter(Boolean).join(';');
      const customTextSuffix = customTextStyle ? `;${customTextStyle}` : '';

      const transformParts = [];
      if (ox !== 0 || oy !== 0) transformParts.push(`translate3d(${ox}px, ${oy}px, 0)`);
      const transformStyle = transformParts.length > 0 ? `transform:${transformParts.join(' ')};` : '';

      let innerContent = '';
      if (cType === 'image') {
        if (c.imageUrl) {
          innerContent = `
            <div class="custom-image-wrapper" style="width:100%;height:100%;overflow:hidden;border-radius:inherit;display:flex;align-items:center;justify-content:center;position:relative;">
              <img src="${escapeHtml(c.imageUrl)}" alt="${escapeHtml(c.alt || 'Custom Image')}" style="width:100%;height:100%;object-fit:${escapeHtml(c.objectFit || 'cover')};object-position:${escapeHtml(c.objectPosition || '50% 50%')};transform:rotate(${rot}deg);display:block;border-radius:inherit;pointer-events:none;transition:transform 0.25s cubic-bezier(0.16,1,0.3,1);">
              <div class="custom-image-drop-overlay" style="position:absolute;inset:0;background:rgba(255,92,0,0.25);display:none;align-items:center;justify-content:center;border-radius:inherit;border:2px dashed #FF5C00;z-index:2;pointer-events:none;">
                <span style="background:#111;color:#FF5C00;font-weight:700;font-size:13px;padding:6px 16px;border-radius:20px;border:1px solid #FF5C00;box-shadow:0 4px 15px rgba(0,0,0,0.5);">Drop to Replace Photo</span>
              </div>
            </div>
          `;
        } else {
          innerContent = `
            <div class="custom-container-upload-zone" data-sec-id="${section.id}" data-ccont-id="${cId}" onclick="window.triggerCustomContainerUpload && window.triggerCustomContainerUpload('${section.id}', '${cId}', event)">
              <div class="custom-upload-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
              <div class="custom-upload-title">Upload Image</div>
              <div class="custom-upload-sub">Click to browse or drag & drop photo</div>
              <button type="button" class="btn btn-primary btn-sm custom-upload-btn" onclick="window.triggerCustomContainerUpload && window.triggerCustomContainerUpload('${section.id}', '${cId}', event)" style="margin-top:10px;padding:7px 18px;font-size:12px;font-weight:600;border-radius:20px;background:#FF5C00;color:#fff;border:none;cursor:pointer !important;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(255,92,0,0.35);">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Browse Photo
              </button>
              <input type="file" id="custom_file_${cId}" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/avif" class="custom-container-file-input" style="display:none;" onclick="event.stopPropagation();" onchange="window.handleCustomContainerFile && window.handleCustomContainerFile(this, '${section.id}', '${cId}')">
            </div>
          `;
        }
      } else if (cType === 'text') {
        const h = (c.content && c.content.heading !== undefined) ? c.content.heading : 'Custom Heading';
        const p = (c.content && c.content.text !== undefined) ? c.content.text : 'Click here to write custom description...';
        innerContent = `
          <div class="custom-text-wrapper" style="padding:28px 24px;width:100%;box-sizing:border-box;">
            <h3 class="canvas-live-editable" contenteditable="true" data-ccont-id="${cId}" data-field="heading" style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#F5F0EB;margin:0 0 10px;line-height:1.2${customTextSuffix};">${renderFormattedText(h)}</h3>
            <p class="canvas-live-editable" contenteditable="true" data-ccont-id="${cId}" data-field="text" style="font-size:15px;line-height:1.6;color:rgba(245,240,235,0.7);margin:0${customTextSuffix};">${renderFormattedText(p)}</p>
          </div>
        `;
      } else if (cType === 'button') {
        const bText = (c.content && c.content.buttonText) ? c.content.buttonText : 'Custom Action →';
        const bUrl = (c.content && c.content.buttonUrl) ? c.content.buttonUrl : '#';
        innerContent = `
          <div style="display:flex;align-items:center;justify-content:center;padding:16px 20px;width:100%;box-sizing:border-box;">
            <a href="${escapeHtml(bUrl)}" class="custom-sec-btn btn-hover-lift" style="background:#FF5C00;color:#FFFFFF;padding:12px 28px;border-radius:50px;font-weight:700;display:inline-block;text-decoration:none;box-shadow:0 4px 18px rgba(255,92,0,0.35)${customTextSuffix};">${escapeHtml(bText)}</a>
          </div>
        `;
      } else {
        // card / box
        innerContent = `
          <div style="padding:28px;width:100%;box-sizing:border-box;">
            <h4 class="canvas-live-editable" contenteditable="true" data-ccont-id="${cId}" data-field="heading" style="font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:#F5F0EB;margin:0 0 8px${customTextSuffix};">${renderFormattedText(c.content && c.content.heading !== undefined ? c.content.heading : 'Custom Card Box')}</h4>
            <p class="canvas-live-editable" contenteditable="true" data-ccont-id="${cId}" data-field="text" style="font-size:14px;line-height:1.6;color:rgba(245,240,235,0.65);margin:0${customTextSuffix};">${renderFormattedText(c.content && c.content.text !== undefined ? c.content.text : 'Customize this card with your own text or media elements.')}</p>
          </div>
        `;
      }

      const bRadius = c.borderRadius ? (String(c.borderRadius).endsWith('px') || String(c.borderRadius).endsWith('%') ? c.borderRadius : `${c.borderRadius}px`) : '18px';
      const bgStyle = c.background ? `background:${c.background};` : '';
      const borderStyle = c.border ? `border:${c.border};` : '';
      const shadowStyle = c.boxShadow ? `box-shadow:${c.boxShadow};` : '';
      const opacityStyle = (c.opacity !== undefined && c.opacity !== '') ? `opacity:${c.opacity};` : '';
      const zIndexStyle = c.zIndex ? `z-index:${c.zIndex};` : '';

      const maxWStyle = cWidth && cWidth !== 'auto' && !String(cWidth).endsWith('%') ? `max-width:${cWidth};` : 'max-width:100%;';
      return `
        <div class="custom-container-item custom-container-${cType} ${c.imageUrl ? 'has-uploaded-image' : 'is-empty-upload'}"
             id="ccont_${cId}"
             data-container-id="${cId}"
             data-container-type="${cType}"
             data-sec-id="${section.id}"
             data-rotation="${rot}"
             style="position:relative;width:${cWidth};height:${cHeight};${maxWStyle}box-sizing:border-box;border-radius:${bRadius};overflow:visible;${bgStyle}${borderStyle}${shadowStyle}${opacityStyle}${zIndexStyle}${transformStyle}">
          ${innerContent}
        </div>
      `;
    }).join('');

    const layout = section.layout && typeof section.layout === 'object' ? section.layout : {};
    const layoutMode = layout.mode === 'structured' ? 'structured' : 'freeform';
    const layoutType = ['grid', 'row', 'stack', 'freeform'].includes(layout.type) ? layout.type : layoutMode;
    const layoutColumns = Math.max(1, Math.min(12, parseInt(layout.columns) || 1));
    const layoutGap = Math.max(0, Math.min(160, parseInt(layout.gap) || 20));

    return `
      <div class="sec-custom-containers-layer sec-layout-${layoutMode} sec-layout-${layoutType}"
           data-sec-id="${section.id}"
           data-layout-mode="${layoutMode}"
           data-layout-type="${layoutType}"
           style="--layout-columns:${layoutColumns};--layout-gap:${layoutGap}px;">
        ${itemsHtml}
      </div>
    `;
  }

  // ==========================================================================
  // SECTION REGISTRY
  // ==========================================================================
  const SectionRegistry = {
    types: {},

    register(type, definition) {
      if (!type || !definition) return;
      this.types[type] = {
        type: type,
        label: definition.label || type,
        category: definition.category || 'General',
        icon: definition.icon || '📦',
        description: definition.description || '',
        createDefault: definition.createDefault || (() => ({})),
        validate: definition.validate || (() => ({ valid: true })),
        render: definition.render || (() => ''),
        renderProperties: definition.renderProperties || null
      };
    },

    get(type) {
      return this.types[type] || null;
    },

    getAll() {
      return Object.values(this.types);
    },

    getByCategory(category) {
      return Object.values(this.types).filter(t => t.category === category);
    },

    getCategories() {
      const cats = new Set();
      Object.values(this.types).forEach(t => cats.add(t.category));
      return Array.from(cats);
    },

    createSection(type, customContent, customSettings) {
      const def = this.get(type);
      if (!def) throw new Error('Unknown section type: ' + type);
      const defaults = def.createDefault();
      return migrateSection({
        id: generateId(type),
        type: type,
        version: 1,
        schemaVersion: BUILDER_SCHEMA_VERSION,
        visible: true,
        nodes: Array.isArray(defaults.nodes)
          ? defaults.nodes
          : (Array.isArray(defaults.settings && defaults.settings.customContainers)
            ? defaults.settings.customContainers
            : []),
        content: Object.assign({}, defaults.content || {}, customContent || {}),
        settings: Object.assign({
          spacing: 'standard',
          containerWidth: 'standard',
          responsiveVisibility: 'all',
          animation: 'none'
        }, defaults.settings || {}, customSettings || {})
      });
    },

    // ── Responsive Viewport Settings Resolver ──
    resolveSettings(section, viewport = 'desktop') {
      if (!section) return {};
      const base = section.settings || {};
      if (viewport === 'desktop' || !base.responsive) {
        return base;
      }
      const tabletOverrides = (base.responsive && base.responsive.tablet) || {};
      const mobileOverrides = (base.responsive && base.responsive.mobile) || {};
      const mergeElementMap = (...maps) => {
        const merged = {};
        maps.forEach(map => {
          if (!map || typeof map !== 'object') return;
          Object.entries(map).forEach(([key, value]) => {
            merged[key] = (value && typeof value === 'object' && !Array.isArray(value))
              ? { ...(merged[key] || {}), ...value }
              : value;
          });
        });
        return merged;
      };

      if (viewport === 'tablet') {
        return {
          ...base,
          ...tabletOverrides,
          elementOffsets: mergeElementMap(base.elementOffsets, tabletOverrides.elementOffsets),
          elementStyles: mergeElementMap(base.elementStyles, tabletOverrides.elementStyles),
          customContainers: Array.isArray(tabletOverrides.customContainers) ? tabletOverrides.customContainers : base.customContainers
        };
      }

      if (viewport === 'mobile') {
        // Mobile cascades: Desktop -> Tablet -> Mobile
        return {
          ...base,
          ...tabletOverrides,
          ...mobileOverrides,
          elementOffsets: mergeElementMap(base.elementOffsets, tabletOverrides.elementOffsets, mobileOverrides.elementOffsets),
          elementStyles: mergeElementMap(base.elementStyles, tabletOverrides.elementStyles, mobileOverrides.elementStyles),
          customContainers: Array.isArray(mobileOverrides.customContainers)
            ? mobileOverrides.customContainers
            : (Array.isArray(tabletOverrides.customContainers) ? tabletOverrides.customContainers : base.customContainers)
        };
      }

      return base;
    },

    renderSection(section, options) {
      if (!section || !section.type) return '';
      if (options && options.isPublic && section.visible === false) return '';
      const def = this.get(section.type);
      if (!def) {
        return `<div class="sec-unknown-block">Unsupported section type: ${escapeHtml(section.type)}</div>`;
      }
      if (options && typeof options.index === 'number') {
        section._renderIndex = options.index;
      }

      // Determine viewport mode: options.viewport > builder mode > 'desktop'
      let targetViewport = 'desktop';
      if (options && options.viewport) {
        targetViewport = options.viewport;
      } else if (typeof window !== 'undefined' && typeof window.getBuilderViewportMode === 'function') {
        targetViewport = window.getBuilderViewportMode();
      }

      const effectiveSettings = this.resolveSettings(section, targetViewport);
      const effectiveSection = {
        ...section,
        settings: effectiveSettings,
        layout: effectiveSettings.semanticLayout && typeof effectiveSettings.semanticLayout === 'object'
          ? effectiveSettings.semanticLayout
          : section.layout,
        _activeViewport: targetViewport,
        _originalSection: section
      };

      return def.render(effectiveSection, options || {});
    }
  };

  // ==========================================================================
  // 1. TYPOGRAPHY & CONTENT BLOCKS
  // ==========================================================================

  // Heading Block
  SectionRegistry.register('heading', {
    label: 'Heading',
    category: 'Typography & Text',
    icon: '🔤',
    description: 'Custom H1–H5 heading with fine typography controls and accent colors.',
    createDefault: () => ({
      content: {
        text: 'Crafting Next-Generation Digital Experiences',
        tag: 'h2', // 'h1', 'h2', 'h3', 'h4', 'h5'
        subtitle: ''
      },
      settings: {
        alignment: 'left', // 'left', 'center', 'right'
        fontFamily: 'Syne', // 'Syne', 'DM Sans', 'Bebas Neue'
        fontSize: '36',
        color: '#F5F0EB',
        accentColor: '#FF5C00',
        letterSpacing: '-0.5',
        lineHeight: '1.2',
        spacing: 'compact'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const elSt = (s.elementStyles && (s.elementStyles.heading || s.elementStyles['heading-0'])) || {};
      const tag = ['h1', 'h2', 'h3', 'h4', 'h5'].includes(c.tag) ? c.tag : 'h2';
      const align = elSt.textAlign || s.alignment || 'left';
      const rawFont = elSt.fontFamily || s.fontFamily || 'Syne';
      const font = resolveFontFamily(rawFont, "'Syne', sans-serif");
      const fontStyle = elSt.fontStyle || s.fontStyle || 'normal';
      const fontWeight = elSt.fontWeight || s.fontWeight || '';
      const fSize = elSt.fontSize ? elSt.fontSize : (s.fontSize ? `${parseInt(s.fontSize)}px` : '36px');
      const color = elSt.color || s.color || '#F5F0EB';
      const ls = elSt.letterSpacing ? elSt.letterSpacing : (s.letterSpacing ? `${s.letterSpacing}px` : '-0.5px');
      const lh = elSt.lineHeight || s.lineHeight || '1.2';
      const textDeco = elSt.textDecoration || '';

      const headingStyles = [
        `font-family:${font} !important`,
        `font-size:${fSize}`,
        `color:${color}`,
        `letter-spacing:${ls}`,
        `line-height:${lh}`,
        `font-style:${fontStyle} !important`,
        fontWeight ? `font-weight:${fontWeight} !important` : '',
        textDeco ? `text-decoration:${textDeco}` : '',
        'margin:0'
      ].filter(Boolean).join(';');

      const inner = `
        <div style="text-align:${align};">
          <${tag} class="sec-heading-custom" style="${headingStyles}">
            ${renderFormattedText(c.text || '')}
          </${tag}>
          ${c.subtitle ? `<div style="font-size:15px;color:rgba(245,240,235,0.6);margin-top:10px;">${renderFormattedText(c.subtitle)}</div>` : ''}
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Rich Text / Paragraph Block
  SectionRegistry.register('rich_text', {
    label: 'Rich Text & Paragraph',
    category: 'Typography & Text',
    icon: '📝',
    description: 'Long-form editorial copy, bold/italic markup, lists, and formatted paragraphs.',
    createDefault: () => ({
      content: {
        heading: 'Strategic Deep Dive',
        subheading: 'Behind the creative execution and measurable outcomes',
        body: '<p>Write your detailed story, methodology, client interview, or results analysis here. You can format paragraphs, bullet points, links, and bold highlights easily.</p>'
      },
      settings: {
        maxWidth: 'standard', // 'narrow', 'standard', 'wide'
        cardStyle: true,       // boxed card vs transparent
        fontSize: '16',
        spacing: 'standard'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const maxW = s.maxWidth === 'narrow' ? '760px' : (s.maxWidth === 'wide' ? '1100px' : '920px');
      const bodyHtml = sanitizeRichText(c.body || '');
      const fSize = s.fontSize ? `font-size:${parseInt(s.fontSize)}px;` : '';

      const inner = `
        <div style="max-width:${maxW};margin:0 auto;">
          <div class="${s.cardStyle ? 'wd-full-card' : ''}" style="${s.cardStyle ? 'padding:40px 36px;' : ''}">
            ${c.heading ? `<h2 class="sec-heading">${renderFormattedText(c.heading)}</h2>` : ''}
            ${c.subheading ? `<div class="sec-subheading">${renderFormattedText(c.subheading)}</div>` : ''}
            <div class="wd-article-body" style="margin-top:18px;${fSize}">
              ${bodyHtml}
            </div>
          </div>
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Blockquote / Pull Quote
  SectionRegistry.register('quote', {
    label: 'Pull Quote / Callout',
    category: 'Typography & Text',
    icon: '💬',
    description: 'Prominent quote with left orange accent border, author name, and company title.',
    createDefault: () => ({
      content: {
        quote: '“The Sonic Media transformed our brand vision into an undeniable market leader within 90 days.”',
        author: 'Sarah Jenkins',
        role: 'Chief Marketing Officer, LuxeFashion Group'
      },
      settings: {
        alignment: 'left',
        cardStyle: true,
        fontSize: '22',
        spacing: 'standard'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const elSt = (s.elementStyles && (s.elementStyles.heading || s.elementStyles.text || s.elementStyles['heading-0'])) || {};
      const rawFont = elSt.fontFamily || s.fontFamily || '';
      const quoteFont = resolveFontFamily(rawFont, "'Syne', sans-serif");
      const quoteFontStyle = elSt.fontStyle || s.fontStyle || 'normal';
      const quoteFontWeight = elSt.fontWeight || s.fontWeight || '600';
      const fSize = elSt.fontSize || (s.fontSize ? `${parseInt(s.fontSize)}px` : '22px');

      const inner = `
        <div style="max-width:880px;margin:0 auto;">
          <div class="sec-quote-box ${s.cardStyle ? 'wd-full-card' : ''}" style="border-left:4px solid #FF5C00;padding:32px 36px;${s.cardStyle ? '' : 'background:transparent;'}">
            <blockquote style="font-family:${quoteFont};font-style:${quoteFontStyle};font-size:${fSize};font-weight:${quoteFontWeight};line-height:1.45;color:#F5F0EB;margin:0 0 16px;">
              ${renderFormattedText(c.quote || '')}
            </blockquote>
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:24px;height:2px;background:#FF5C00;"></div>
              <div>
                <strong style="color:#F5F0EB;font-size:14px;font-family:'Syne',sans-serif;">${escapeHtml(c.author || '')}</strong>
                ${c.role ? `<div style="font-size:12px;color:rgba(245,240,235,0.6);margin-top:2px;">${escapeHtml(c.role)}</div>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Lists Block (Bullet / Numbered / Checkmark)
  SectionRegistry.register('list_block', {
    label: 'Feature & Check List',
    category: 'Typography & Text',
    icon: '✅',
    description: 'Custom styled bullet points, numbered steps, or orange checkmarks.',
    createDefault: () => ({
      content: {
        heading: 'Strategic Execution Steps',
        listType: 'checkmark', // 'checkmark', 'bullet', 'numbered'
        items: [
          'Full-funnel digital brand positioning audit',
          'Custom UX architecture and high-converting checkout flows',
          'High-performance Cloudflare and Supabase headless backend',
          'Multi-channel programmatic SEO campaign rollout'
        ]
      },
      settings: {
        columns: 2, // 1 or 2
        cardStyle: true,
        spacing: 'standard'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const items = Array.isArray(c.items) ? c.items : [];
      const direction = s.direction || (s.columns === 1 ? 'vertical' : 'horizontal');
      let gridStyle;
      if (direction === 'vertical' || s.columns === 1) {
        gridStyle = 'display:flex;flex-direction:column;gap:16px;';
      } else {
        const colCount = (s.columns && !isNaN(parseInt(s.columns))) ? parseInt(s.columns) : 2;
        gridStyle = `display:grid;grid-template-columns:repeat(${colCount}, minmax(0, 1fr));gap:16px;`;
      }

      const itemsHtml = items.map((item, idx) => {
        let badge = '';
        if (c.listType === 'numbered') {
          badge = `<span class="sec-list-num">${String(idx + 1).padStart(2, '0')}</span>`;
        } else if (c.listType === 'bullet') {
          badge = `<span class="sec-list-bullet">•</span>`;
        } else {
          badge = `<span class="sec-list-check">✓</span>`;
        }

        return `
          <div class="sec-list-item">
            ${badge}
            <span class="sec-list-text">${renderFormattedText(item)}</span>
          </div>
        `;
      }).join('');

      const inner = `
        <div class="${s.cardStyle ? 'wd-full-card' : ''}" style="${s.cardStyle ? 'padding:36px;' : ''}">
          ${c.heading ? `<h3 class="sec-heading" style="margin-bottom:24px;">${renderFormattedText(c.heading)}</h3>` : ''}
          <div class="sec-list-grid" style="${gridStyle}">
            ${itemsHtml}
          </div>
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Button Row Block
  SectionRegistry.register('button_block', {
    label: 'Buttons & Hyperlinks',
    category: 'Typography & Text',
    icon: '🔗',
    description: 'Single or dual call-to-action buttons with custom alignment and styles.',
    createDefault: () => ({
      content: {
        primaryText: 'Get in Touch',
        primaryUrl: '/contact',
        secondaryText: 'View Live Project ↗',
        secondaryUrl: ''
      },
      settings: {
        alignment: 'center', // 'left', 'center', 'right'
        spacing: 'compact'
      }
    }),
    render(section, opts) {
      const s = section.settings || {};
      const align = s.alignment || s.buttonAlign || 'center';
      const inner = renderSectionButtonGroup(section, align, 'margin-top:0;');
      return renderUniversalWrap(section, inner);
    }
  });

  // ==========================================================================
  // 2. MEDIA & SHOWCASE BLOCKS
  // ==========================================================================

  // Hero / Project Header
  SectionRegistry.register('hero', {
    label: 'Hero Header Banner',
    category: 'Media & Showcase',
    icon: '⚡',
    description: 'Full-width project headline, eyebrow category, subtitle, and optional background photo.',
    createDefault: () => ({
      content: {
        eyebrow: 'PORTFOLIO · CLIENT SHOWCASE',
        title: 'Project Headline',
        subtitle: 'Strategy · Creative Direction · Digital Execution',
        bgImage: '',
        ctaText: '',
        ctaUrl: '',
        textAnimation: 'slide-up'
      },
      settings: {
        alignment: 'center',
        spacing: 'standard',
        textAnimation: 'slide-up'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const elSt = (s.elementStyles && (s.elementStyles.heading || s.elementStyles['heading-0'])) || {};
      const align = elSt.textAlign || s.alignment || 'center';
      const textAnim = s.textAnimation || c.textAnimation || 'slide-up';
      const animAttr = (textAnim && textAnim !== 'none') ? `data-text-anim="${escapeHtml(textAnim)}"` : '';
      
      const rawTitle = c.title || '';
      const repairedTitle = repairEscapedFormatting(rawTitle);
      let titleHtml = '';
      if (/<[a-z][\s\S]*>/i.test(repairedTitle)) {
        titleHtml = renderFormattedText(repairedTitle);
      } else {
        const plainTitle = escapeHtml(rawTitle);
        const words = plainTitle ? plainTitle.split(' ') : [];
        if (words.length > 2) {
          titleHtml = `${words.slice(0, 2).join(' ')}<br><em>${words.slice(2).join(' ')}</em>`;
        } else if (plainTitle) {
          titleHtml = `<em>${plainTitle}</em>`;
        }
      }

      const rawFont = elSt.fontFamily || s.fontFamily || '';
      const h1Font = rawFont ? resolveFontFamily(rawFont, "'Bebas Neue', sans-serif") : '';
      const h1FontStyle = elSt.fontStyle || s.fontStyle || '';
      const h1FontWeight = elSt.fontWeight || s.fontWeight || '';
      const h1FontSize = elSt.fontSize || s.fontSize || '';
      const h1Color = elSt.color || s.color || '';
      const h1TextDeco = elSt.textDecoration || '';

      const h1StyleParts = ['--anim-delay: 0.22s;'];
      if (h1Font) h1StyleParts.push(`font-family:${h1Font} !important;`);
      if (h1FontStyle) h1StyleParts.push(`font-style:${h1FontStyle} !important;`);
      if (h1FontWeight) h1StyleParts.push(`font-weight:${h1FontWeight} !important;`);
      if (h1FontSize) h1StyleParts.push(`font-size:${h1FontSize} !important;`);
      if (h1Color) h1StyleParts.push(`color:${h1Color} !important;`);
      if (h1TextDeco) h1StyleParts.push(`text-decoration:${h1TextDeco} !important;`);
      const h1StyleAttr = h1StyleParts.join('');

      const heroBtnHtml = renderSectionButtonGroup(section, s.buttonAlign || align || 'center');

      const inner = `
        ${c.eyebrow ? `<div class="wd-eyebrow" ${animAttr} style="--anim-delay: 0.08s;">${renderFormattedText(c.eyebrow)}</div>` : ''}
        <h1 class="wd-h1" ${animAttr} style="${h1StyleAttr}">${titleHtml}</h1>
        ${c.subtitle ? `<p class="wd-sub" ${animAttr} style="--anim-delay: 0.38s;">${renderFormattedText(c.subtitle)}</p>` : ''}
        ${heroBtnHtml}
      `;

      if (c.bgImage && !s.bgImage) {
        s.bgImage = c.bgImage;
      }

      // If user sets bgOverlay in hero settings, it overrides the default 0.75
      if (s.bgOverlay === undefined && s.showBgOverlay === undefined) {
        // Default hero overlay is 0.75 unless explicitly changed
        s.bgOverlay = 0.75;
      }

      return renderUniversalWrap(section, inner, `sec-hero align-${align}`);
    }
  });

  // Single Image Block
  SectionRegistry.register('image', {
    label: 'Single Image',
    category: 'Media & Showcase',
    icon: '🖼️',
    description: 'High-resolution photo or 100% full-width banner with aspect ratio, focal crop, caption, and full-bleed toggle.',
    createDefault: () => ({
      content: {
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=80',
        alt: 'Project Showcase Deliverable',
        caption: '',
        link: ''
      },
      settings: {
        aspectRatio: 'auto', // 'auto', '16:9', '21:9', '4:3', '1:1', 'banner-h'
        bannerHeight: 450,
        objectFit: 'cover',   // 'cover', 'contain'
        borderRadius: 0,
        fullWidth: true,
        spacing: 'none'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const isFull = s.fullWidth !== false || s.containerWidth === 'full';
      const radius = isFull && (s.borderRadius === undefined || s.borderRadius === 0 || s.borderRadius === '0') ? '0px' : (s.borderRadius !== undefined ? `${s.borderRadius}px` : '16px');
      const fit = s.imageObjectFit || s.objectFit || 'cover';
      const objPos = s.objectPosition || c.objectPosition || 'center center';
      const arMap = { '16:9': '56.25%', '4:3': '75%', '1:1': '100%', '3:4': '133.33%', '2:3': '150%', '21:9': '42.85%' };
      const arPadding = arMap[s.aspectRatio] || '';
      const customW = s.customWidth ? (String(s.customWidth).endsWith('%') || String(s.customWidth).endsWith('px') ? s.customWidth : `${s.customWidth}px`) : '';
      const align = s.alignment || 'center';
      const marginAuto = align === 'left' ? 'margin-right:auto;margin-left:0;' : (align === 'right' ? 'margin-left:auto;margin-right:0;' : 'margin:0 auto;');

      // Media height is intentionally independent from the outer section height.
      const hasCustomH = (s.aspectRatio === 'banner-h' || s.aspectRatio === 'custom-h') && parseInt(s.bannerHeight) > 0;
      const bh = parseInt(s.bannerHeight) || 450;
      
      const hasUrl = c.url && c.url.trim();
      let imgTag = '';
      if (!hasUrl) {
        imgTag = renderEmptyImageUploadZone({
          secId: section.id,
          elKey: 'image',
          title: 'Single Image',
          sub: 'Click to browse or drag & drop photo',
          btnText: 'Browse Photo',
          minHeight: hasCustomH ? bh + 'px' : '320px',
          borderRadius: radius
        });
      } else if (hasCustomH) {
        imgTag = `
          <div class="sec-img-holder sec-prebuilt-img-holder" data-sec-id="${section.id}" data-el-key="image" style="position:relative;width:100%;height:${bh}px;overflow:hidden;border-radius:${radius};background:#121212;">
            <img src="${escapeHtml(c.url || '')}" 
                 alt="${escapeHtml(c.alt || 'Deliverable Asset')}" 
                 style="width:100%;height:100%;object-fit:${fit};object-position:${objPos};border-radius:${radius};display:block;" 
                 loading="eager" decoding="async">
            <div class="custom-image-drop-overlay sec-image-drop-overlay" style="position:absolute;inset:0;background:rgba(255,92,0,0.25);display:none;align-items:center;justify-content:center;border-radius:inherit;border:2px dashed #FF5C00;z-index:4;pointer-events:none;">
              <span style="background:#111;color:#FF5C00;font-weight:700;font-size:13px;padding:6px 16px;border-radius:20px;border:1px solid #FF5C00;box-shadow:0 4px 15px rgba(0,0,0,0.5);">Drop to Replace Photo</span>
            </div>
          </div>
        `;
      } else if (arPadding) {
        imgTag = `
          <div class="sec-img-holder sec-prebuilt-img-holder" data-sec-id="${section.id}" data-el-key="image" style="position:relative;width:100%;overflow:hidden;border-radius:${radius};padding-top:${arPadding};background:#121212;">
            <img src="${escapeHtml(c.url || '')}" 
                 alt="${escapeHtml(c.alt || 'Deliverable Asset')}" 
                 style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:${fit};object-position:${objPos};border-radius:${radius};display:block;" 
                 loading="eager" decoding="async">
            <div class="custom-image-drop-overlay sec-image-drop-overlay" style="position:absolute;inset:0;background:rgba(255,92,0,0.25);display:none;align-items:center;justify-content:center;border-radius:inherit;border:2px dashed #FF5C00;z-index:4;pointer-events:none;">
              <span style="background:#111;color:#FF5C00;font-weight:700;font-size:13px;padding:6px 16px;border-radius:20px;border:1px solid #FF5C00;box-shadow:0 4px 15px rgba(0,0,0,0.5);">Drop to Replace Photo</span>
            </div>
          </div>
        `;
      } else {
        // Natural Auto aspect ratio (crisp full banner)
        imgTag = `
          <div class="sec-img-holder sec-prebuilt-img-holder" data-sec-id="${section.id}" data-el-key="image" style="position:relative;width:100%;overflow:hidden;border-radius:${radius};">
            <img src="${escapeHtml(c.url || '')}" 
                 alt="${escapeHtml(c.alt || 'Deliverable Asset')}" 
                 style="width:100%;height:auto;max-width:100%;object-position:${objPos};display:block;border-radius:${radius};" 
                 loading="eager" decoding="async">
            <div class="custom-image-drop-overlay sec-image-drop-overlay" style="position:absolute;inset:0;background:rgba(255,92,0,0.25);display:none;align-items:center;justify-content:center;border-radius:inherit;border:2px dashed #FF5C00;z-index:4;pointer-events:none;">
              <span style="background:#111;color:#FF5C00;font-weight:700;font-size:13px;padding:6px 16px;border-radius:20px;border:1px solid #FF5C00;box-shadow:0 4px 15px rgba(0,0,0,0.5);">Drop to Replace Photo</span>
            </div>
          </div>
        `;
      }

      const isBuilderSelected = !opts?.isPublic && opts?.isSelected;
      const imgHandles = isBuilderSelected ? `
        <div class="canvas-img-size-badge" title="Image Dimensions"><span>🖼️</span> <span class="badge-dim">${customW || '100%'} × ${hasCustomH ? bh + 'px' : (s.aspectRatio || 'Auto')}</span></div>
        <div class="canvas-img-resize-handle canvas-img-resize-handle-s" data-img-handle="s" data-sec-id="${section.id}" title="Drag vertically to adjust image height"></div>
        <div class="canvas-img-resize-handle canvas-img-resize-handle-e" data-img-handle="e" data-sec-id="${section.id}" title="Drag horizontally to adjust image width"></div>
        <div class="canvas-img-resize-handle canvas-img-resize-handle-w" data-img-handle="w" data-sec-id="${section.id}" title="Drag horizontally to adjust image width"></div>
        <div class="canvas-img-resize-handle canvas-img-resize-handle-se" data-img-handle="se" data-sec-id="${section.id}" title="Drag corner to adjust image width & height"></div>
        <div class="canvas-img-resize-handle canvas-img-resize-handle-sw" data-img-handle="sw" data-sec-id="${section.id}" title="Drag corner to adjust image width & height"></div>
      ` : '';

      const wrapped = c.link ? `<a href="${escapeHtml(c.link)}" target="_blank" rel="noopener noreferrer">${imgTag}</a>` : imgTag;

      const inner = `
        <div class="sec-img-wrap" style="${marginAuto}width:100%;position:relative;${customW ? `max-width:${customW};` : (isFull ? 'max-width:100%;' : '')}">
          ${wrapped}
          ${c.caption ? `<div class="sec-img-caption" style="font-size:12px;color:rgba(245,240,235,0.5);text-align:center;margin-top:10px;">${renderFormattedText(c.caption)}</div>` : ''}
          ${imgHandles}
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Image Grid & Multi-Image
  SectionRegistry.register('image_grid', {
    label: 'Image Grid (1–6 Columns)',
    category: 'Media & Showcase',
    icon: '⊞',
    description: 'Custom multi-image grid (1 to 6 columns per row), custom gap, aspect ratios, and captions.',
    createDefault: () => ({
      content: {
        heading: 'Visual Brand Rollout',
        items: [
          { url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80', caption: 'Packaging Mockup' },
          { url: 'https://images.unsplash.com/photo-1571867424488-4565932edb41?w=800&q=80', caption: 'Mobile Experience' },
          { url: 'https://images.unsplash.com/photo-1542744094-3a31727560fa?w=800&q=80', caption: 'Design System' }
        ]
      },
      settings: {
        columns: 3, // 1, 2, 3, 4, 5, or 6
        aspectRatio: '4:3', // '16:9', '4:3', '1:1', '3:4', '2:3', 'auto'
        gap: 20,
        borderRadius: 12,
        objectFit: 'cover',
        spacing: 'standard'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const items = Array.isArray(c.items) ? c.items : [];
      const cols = s.columns === 'all'
        ? (items.length || 1)
        : Math.min(12, Math.max(1, parseInt(s.columns) || 3));
      const gap = s.gap !== undefined && s.gap !== '' ? parseInt(s.gap) : 20;
      const radius = s.borderRadius !== undefined ? `${parseInt(s.borderRadius)}px` : '12px';
      const fit = s.imageObjectFit || s.objectFit || 'cover';
      const objPos = s.objectPosition || 'center center';

      const arMap = {
        '16:9': '56.25%',
        '4:3': '75%',
        '1:1': '100%',
        '3:4': '133.33%',
        '2:3': '150%',
        '21:9': '42.85%'
      };
      const arPadding = arMap[s.aspectRatio] || (s.aspectRatio === 'auto' ? '' : '75%');

      const itemsHtml = items.map((img, idx) => {
        const itemImg = typeof img === 'string' ? img : (img.url || '');
        const itemCap = typeof img === 'object' ? (img.caption || '') : '';
        const itemPos = (img && img.objectPosition) || objPos;
        const hasUrl = itemImg && itemImg.trim();

        let imgMarkup = '';
        if (!hasUrl) {
          imgMarkup = renderEmptyImageUploadZone({
            secId: section.id,
            elKey: `grid-img-${idx}`,
            imgIndex: idx,
            title: `Grid Image ${idx + 1}`,
            sub: 'Click to browse or drag & drop photo',
            btnText: 'Browse Photo',
            minHeight: s.cardHeight && parseInt(s.cardHeight) > 0 ? parseInt(s.cardHeight) + 'px' : '220px',
            borderRadius: radius
          });
        } else if (s.cardHeight && parseInt(s.cardHeight) > 0) {
          const ch = parseInt(s.cardHeight);
          imgMarkup = `
            <div class="sec-img-holder sec-prebuilt-img-holder" data-sec-id="${section.id}" data-el-key="grid-img-${idx}" data-img-index="${idx}" style="position:relative;width:100%;height:${ch}px;border-radius:${radius};overflow:hidden;background:#121212;">
              <img src="${escapeHtml(itemImg)}" alt="${escapeHtml(itemCap || 'Grid item')}" style="width:100%;height:100%;object-fit:${fit};object-position:${itemPos};border-radius:${radius};display:block;" loading="lazy">
              <div class="custom-image-drop-overlay sec-image-drop-overlay" style="position:absolute;inset:0;background:rgba(255,92,0,0.25);display:none;align-items:center;justify-content:center;border-radius:inherit;border:2px dashed #FF5C00;z-index:4;pointer-events:none;">
                <span style="background:#111;color:#FF5C00;font-weight:700;font-size:13px;padding:6px 16px;border-radius:20px;border:1px solid #FF5C00;box-shadow:0 4px 15px rgba(0,0,0,0.5);">Drop to Replace Photo</span>
              </div>
            </div>
          `;
        } else if (arPadding) {
          imgMarkup = `
            <div class="sec-img-holder sec-prebuilt-img-holder" data-sec-id="${section.id}" data-el-key="grid-img-${idx}" data-img-index="${idx}" style="position:relative;width:100%;padding-top:${arPadding};border-radius:${radius};overflow:hidden;background:#121212;">
              <img src="${escapeHtml(itemImg)}" alt="${escapeHtml(itemCap || 'Grid item')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${fit};object-position:${itemPos};border-radius:${radius};display:block;" loading="lazy">
              <div class="custom-image-drop-overlay sec-image-drop-overlay" style="position:absolute;inset:0;background:rgba(255,92,0,0.25);display:none;align-items:center;justify-content:center;border-radius:inherit;border:2px dashed #FF5C00;z-index:4;pointer-events:none;">
                <span style="background:#111;color:#FF5C00;font-weight:700;font-size:13px;padding:6px 16px;border-radius:20px;border:1px solid #FF5C00;box-shadow:0 4px 15px rgba(0,0,0,0.5);">Drop to Replace Photo</span>
              </div>
            </div>
          `;
        } else {
          imgMarkup = `
            <div class="sec-img-holder sec-prebuilt-img-holder" data-sec-id="${section.id}" data-el-key="grid-img-${idx}" data-img-index="${idx}" style="position:relative;width:100%;border-radius:${radius};overflow:hidden;">
              <img src="${escapeHtml(itemImg)}" alt="${escapeHtml(itemCap || 'Grid item')}" style="width:100%;height:auto;object-position:${itemPos};border-radius:${radius};display:block;" loading="lazy">
              <div class="custom-image-drop-overlay sec-image-drop-overlay" style="position:absolute;inset:0;background:rgba(255,92,0,0.25);display:none;align-items:center;justify-content:center;border-radius:inherit;border:2px dashed #FF5C00;z-index:4;pointer-events:none;">
                <span style="background:#111;color:#FF5C00;font-weight:700;font-size:13px;padding:6px 16px;border-radius:20px;border:1px solid #FF5C00;box-shadow:0 4px 15px rgba(0,0,0,0.5);">Drop to Replace Photo</span>
              </div>
            </div>
          `;
        }

        return `
          <div class="sec-grid-item" data-el-key="grid-img-${idx}" style="display:flex;flex-direction:column;min-width:0;">
            ${imgMarkup}
            ${itemCap ? `<div style="font-size:12px;color:rgba(245,240,235,0.6);margin-top:8px;text-align:center;">${escapeHtml(itemCap)}</div>` : ''}
          </div>
        `;
      }).join('');

      const inner = `
        ${c.heading ? `<h3 class="sec-heading" style="margin-bottom:24px;text-align:center;">${renderFormattedText(c.heading)}</h3>` : ''}
        <div class="sec-img-grid-container sec-grid-cols-${cols}" style="display:grid;grid-template-columns:repeat(${cols}, minmax(0, 1fr));gap:${gap}px;width:100%;box-sizing:border-box;">
          ${itemsHtml}
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Showcase Gallery (Masonry & Grid)
  SectionRegistry.register('gallery', {
    label: 'Showcase Gallery',
    category: 'Media & Showcase',
    icon: '📸',
    description: 'Dynamic portfolio visual deliverable cards with title, description, and preview.',
    createDefault: () => ({
      content: {
        heading: 'Project Showcase & Visual Deliverables',
        items: [
          {
            url: 'https://images.unsplash.com/photo-1542744094-3a31727560fa?auto=format&fit=crop&w=800&q=80',
            title: 'Design System & Tokens',
            desc: 'Custom UI kit crafted for omnichannel consistency.'
          },
          {
            url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
            title: 'Performance Analytics Dashboard',
            desc: 'Real-time telemetry and revenue conversion tracking.'
          }
        ]
      },
      settings: {
        columns: 2, // 1 to 6
        gap: 24,
        spacing: 'standard'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const items = Array.isArray(c.items) ? c.items : [];
      const cols = s.columns === 'all'
        ? (items.length || 1)
        : Math.min(12, Math.max(1, parseInt(s.columns) || 2));
      const gap = s.gap !== undefined && s.gap !== '' ? parseInt(s.gap) : 24;

      const itemsHtml = items.map((img, idx) => {
        const imgObj = typeof img === 'object' && img !== null ? img : { url: String(img || '') };
        const itemPos = imgObj.objectPosition || s.objectPosition || 'center center';
        const imgUrl = (imgObj.url || imgObj.imageUrl || '').trim();
        const hasUrl = !!imgUrl;
        const mediaHtml = hasUrl ? `
          <div class="sec-prebuilt-img-holder" data-sec-id="${section.id}" data-el-key="gallery-img-${idx}" data-gallery-idx="${idx}" style="position:relative;width:100%;height:100%;min-height:180px;overflow:hidden;border-radius:12px;">
            <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(imgObj.title || 'Deliverable Asset')}" class="wd-gallery-img" style="width:100%;height:100%;object-fit:cover;display:block;object-position:${itemPos};border-radius:12px;" loading="lazy" decoding="async">
            <div class="custom-image-drop-overlay sec-image-drop-overlay" style="position:absolute;inset:0;background:rgba(255,92,0,0.25);display:none;align-items:center;justify-content:center;border-radius:inherit;border:2px dashed #FF5C00;z-index:4;pointer-events:none;">
              <span style="background:#111;color:#FF5C00;font-weight:700;font-size:13px;padding:6px 16px;border-radius:20px;border:1px solid #FF5C00;box-shadow:0 4px 15px rgba(0,0,0,0.5);">Drop to Replace Photo</span>
            </div>
          </div>
        ` : renderEmptyImageUploadZone({
          secId: section.id,
          elKey: `gallery-img-${idx}`,
          imgIndex: idx,
          title: imgObj.title || `Showcase Image ${idx + 1}`,
          sub: 'Click to browse or drag & drop photo',
          btnText: 'Browse Photo',
          minHeight: '180px',
          borderRadius: '12px'
        });
        return `
          <div class="wd-gallery-card" data-gallery-idx="${idx}" data-el-key="gallery-card-${idx}" style="display:flex;flex-direction:column;min-width:0;position:relative;">
            <div class="wd-gallery-img-wrap" data-gallery-idx="${idx}" data-el-key="gallery-img-${idx}" style="position:relative;width:100%;flex:1 1 auto;min-height:180px;border-radius:12px;display:flex;">
              ${mediaHtml}
            </div>
            ${imgObj.title ? `<div class="wd-gallery-title" style="margin-top:14px;flex-shrink:0;">${escapeHtml(imgObj.title)}</div>` : ''}
            ${imgObj.desc ? `<div class="wd-gallery-desc" style="margin-top:4px;flex-shrink:0;">${escapeHtml(imgObj.desc)}</div>` : ''}
          </div>
        `;
      }).join('');

      const inner = `
        <div class="wd-full-card" style="padding:36px;">
          ${c.heading ? `<h3 class="sec-heading" style="margin-bottom:24px;">${renderFormattedText(c.heading)}</h3>` : ''}
          <div class="sec-img-grid-container sec-grid-cols-${cols}" style="display:grid;grid-template-columns:repeat(${cols}, minmax(0, 1fr));gap:${gap}px;width:100%;box-sizing:border-box;">
            ${itemsHtml}
          </div>
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Image Slider / Carousel
  SectionRegistry.register('carousel', {
    label: 'Image Slider / Carousel',
    category: 'Media & Showcase',
    icon: '🎞️',
    description: 'Horizontal scrollable image carousel with smooth slide snap, autoplay timer, and captions.',
    createDefault: () => ({
      content: {
        heading: 'Interactive Slide Gallery',
        slides: [
          { url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1000&q=80', title: 'Slide 1 — Discovery' },
          { url: 'https://images.unsplash.com/photo-1571867424488-4565932edb41?w=1000&q=80', title: 'Slide 2 — Strategy' },
          { url: 'https://images.unsplash.com/photo-1542744094-3a31727560fa?w=1000&q=80', title: 'Slide 3 — Execution' }
        ]
      },
      settings: {
        aspectRatio: '16:9',
        slideHeight: 480,
        slideWidth: '100', // Default: 100% Full Area Coverage (1 slide at a time)
        spacing: 'standard',
        autoplay: true,
        autoplaySpeed: 4, // Seconds per slide
        pauseOnHover: true,
        showArrows: true,
        showDots: true
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const slides = Array.isArray(c.slides) ? c.slides : [];

      const isTwoSlide = s.slideWidth === '50';
      const isThreeSlide = s.slideWidth === '33';
      const isFourSlide = s.slideWidth === '25';
      const isPeekSlide = s.slideWidth === 'peek';
      const isFullSlide = !isTwoSlide && !isThreeSlide && !isFourSlide && !isPeekSlide; // Default is always full 100% cover
      const customSlideH = parseInt(s.slideHeight) || (s.aspectRatio === 'banner-h' ? 450 : null);

      let slideFlex = '0 0 100%';
      let slideMaxW = '100%';
      let slideRadius = ((s.containerWidth === 'full' || s.containerWidth === 'bleed') && (s.imageBorderRadius === undefined || s.imageBorderRadius === '')) ? '0px' : (s.imageBorderRadius ? parseInt(s.imageBorderRadius) + 'px' : '14px');

      if (isTwoSlide) {
        slideFlex = '0 0 calc(50% - 10px)';
        slideMaxW = 'calc(50% - 10px)';
        slideRadius = '14px';
      } else if (isThreeSlide) {
        slideFlex = '0 0 calc(33.333% - 12px)';
        slideMaxW = 'calc(33.333% - 12px)';
        slideRadius = '14px';
      } else if (isFourSlide) {
        slideFlex = '0 0 calc(25% - 12px)';
        slideMaxW = 'calc(25% - 12px)';
        slideRadius = '14px';
      } else if (isPeekSlide) {
        slideFlex = '0 0 85%';
        slideMaxW = '85%';
      }

      const slidesHtml = slides.map((sl, idx) => {
        const itemPos = sl.objectPosition || s.objectPosition || 'center center';
        const itemRotation = parseInt(sl.rotation ?? s.elementStyles?.[`slide-${idx + 1}`]?.rotation ?? 0);
        const itemTransform = itemRotation ? `transform:rotate(${itemRotation}deg);` : '';
        const hasUrl = sl.url && sl.url.trim();
        let mediaHtml = '';
        if (!hasUrl) {
          mediaHtml = renderEmptyImageUploadZone({
            secId: section.id,
            elKey: `slide-${idx + 1}`,
            imgIndex: idx,
            title: sl.title || `Slide ${idx + 1}`,
            sub: 'Click to browse or drag & drop photo',
            btnText: 'Browse Slide Photo',
            minHeight: customSlideH ? customSlideH + 'px' : '260px',
            borderRadius: slideRadius
          });
        } else if (customSlideH) {
          mediaHtml = `
            <div class="sec-prebuilt-img-holder" data-sec-id="${section.id}" data-el-key="slide-${idx + 1}" data-img-index="${idx}" style="position:relative;width:100%;height:${customSlideH}px;overflow:hidden;background:#121212;">
              <img src="${escapeHtml(sl.url)}" alt="${escapeHtml(sl.title || 'Slide')}" style="width:100%;height:100%;object-fit:cover;object-position:${itemPos};display:block;${itemTransform}" loading="lazy">
              <div class="custom-image-drop-overlay sec-image-drop-overlay" style="position:absolute;inset:0;background:rgba(255,92,0,0.25);display:none;align-items:center;justify-content:center;border-radius:inherit;border:2px dashed #FF5C00;z-index:4;pointer-events:none;">
                <span style="background:#111;color:#FF5C00;font-weight:700;font-size:13px;padding:6px 16px;border-radius:20px;border:1px solid #FF5C00;box-shadow:0 4px 15px rgba(0,0,0,0.5);">Drop to Replace Photo</span>
              </div>
            </div>
          `;
        } else {
          mediaHtml = `
            <div class="sec-prebuilt-img-holder" data-sec-id="${section.id}" data-el-key="slide-${idx + 1}" data-img-index="${idx}" style="position:relative;width:100%;padding-top:56.25%;overflow:hidden;background:#121212;">
              <img src="${escapeHtml(sl.url)}" alt="${escapeHtml(sl.title || 'Slide')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${itemPos};display:block;${itemTransform}" loading="lazy">
              <div class="custom-image-drop-overlay sec-image-drop-overlay" style="position:absolute;inset:0;background:rgba(255,92,0,0.25);display:none;align-items:center;justify-content:center;border-radius:inherit;border:2px dashed #FF5C00;z-index:4;pointer-events:none;">
                <span style="background:#111;color:#FF5C00;font-weight:700;font-size:13px;padding:6px 16px;border-radius:20px;border:1px solid #FF5C00;box-shadow:0 4px 15px rgba(0,0,0,0.5);">Drop to Replace Photo</span>
              </div>
            </div>
          `;
        }

        return `
          <div class="sec-carousel-slide ${isTwoSlide ? 'cols-2' : (isThreeSlide ? 'cols-3' : (isFourSlide ? 'cols-4' : ''))}" 
               data-builder-layer="carousel-slide"
               data-el-key="slide-${idx + 1}"
               data-el-label="Slide ${idx + 1}"
               data-img-index="${idx}"
               data-slide-index="${idx}" 
               style="flex:${slideFlex};min-width:${slideMaxW};max-width:${slideMaxW};width:${slideMaxW};scroll-snap-align:${isFullSlide ? 'start' : 'center'};scroll-snap-stop:always;border-radius:${slideRadius};overflow:hidden;background:#141414;border:1px solid rgba(255,255,255,0.08);box-sizing:border-box;">
            ${mediaHtml}
            ${sl.title ? `<div class="sec-carousel-title" style="font-size:13px;color:#F5F0EB;font-weight:600;padding:12px 18px;text-align:center;background:#141414;letter-spacing:0.02em;border-top:1px solid rgba(255,255,255,0.06);">${escapeHtml(sl.title)}</div>` : ''}
          </div>
        `;
      }).join('');

      // Autoplay & Timer configuration
      const isAutoplay = s.autoplay !== false;
      // Keep the editing canvas stable. Live Preview and published output still
      // use the configured autoplay value, while edit mode only moves when the
      // admin explicitly uses the carousel controls.
      const runtimeAutoplay = !!opts?.isPublic && isAutoplay;
      const speedSec = Math.max(1, parseFloat(s.autoplaySpeed) || 4);
      const pauseOnHover = s.pauseOnHover !== false;
      const showArrows = s.showArrows !== false && slides.length > 1;
      const showDots = s.showDots !== false && slides.length > 1;

      // Dots HTML
      let dotsHtml = '';
      if (showDots) {
        dotsHtml = `
          <div class="sec-carousel-dots-wrap">
            ${slides.map((_, i) => `<button type="button" class="sec-carousel-dot ${i === 0 ? 'active' : ''}" data-target-slide="${i}" aria-label="Go to slide ${i + 1}"></button>`).join('')}
            ${isAutoplay ? `<span class="sec-carousel-autoplay-badge"><span class="sec-carousel-autoplay-pulse"></span> Auto (${speedSec}s)</span>` : ''}
          </div>
        `;
      }

      const inner = `
        <div class="sec-carousel-container" data-builder-layer="internal"
             data-carousel="true" 
             data-autoplay="${runtimeAutoplay ? 'true' : 'false'}"
             data-continuous-loop="true"
             data-interval="${Math.round(speedSec * 1000)}" 
             data-pause-hover="${pauseOnHover ? 'true' : 'false'}">
          ${c.heading ? `<h3 class="sec-heading" style="margin-bottom:20px;text-align:center;">${renderFormattedText(c.heading)}</h3>` : ''}
          
          <div class="sec-carousel-wrap" data-builder-layer="internal" style="position:relative;width:100%;overflow:hidden;border-radius:${slideRadius};">
            ${showArrows ? `
              <button type="button" class="sec-carousel-nav-btn prev-btn" aria-label="Previous Slide">‹</button>
              <button type="button" class="sec-carousel-nav-btn next-btn" aria-label="Next Slide">›</button>
            ` : ''}
            <div class="sec-carousel-track" data-builder-layer="internal" style="display:flex;gap:${isFullSlide ? '0px' : '18px'};overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;width:100%;">
              ${slidesHtml}
            </div>
          </div>

          ${dotsHtml}
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Before & After Comparison Slider
  SectionRegistry.register('before_after', {
    label: 'Before / After Comparison',
    category: 'Media & Showcase',
    icon: '⚖️',
    description: 'Interactive comparison slider with before & after photos and movable divider.',
    createDefault: () => ({
      content: {
        heading: 'Brand Transformation: Before & After',
        beforeUrl: 'https://images.unsplash.com/photo-1542744094-3a31727560fa?w=1000&q=80',
        beforeLabel: 'Original Identity',
        afterUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&q=80',
        afterLabel: 'Redesigned Modern Platform'
      },
      settings: {
        aspectRatio: '16:9',
        spacing: 'standard'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};

      const customW = s.customWidth ? (String(s.customWidth).endsWith('%') || String(s.customWidth).endsWith('px') ? s.customWidth : `${s.customWidth}px`) : '960px';
      const hasCustomH = s.comparisonHeight && parseInt(s.comparisonHeight) > 0;
      const customH = hasCustomH ? parseInt(s.comparisonHeight) : null;
      const isBuilderSelected = !opts?.isPublic && opts?.isSelected;
      const imgHandles = isBuilderSelected ? `
        <div class="canvas-img-size-badge" title="Image Dimensions"><span>⚖️</span> <span class="badge-dim">${customW} × ${hasCustomH ? customH + 'px' : (s.aspectRatio || '16:9')}</span></div>
        <div class="canvas-img-resize-handle canvas-img-resize-handle-s" data-img-handle="s" data-sec-id="${section.id}" title="Drag vertically to adjust comparison height"></div>
        <div class="canvas-img-resize-handle canvas-img-resize-handle-e" data-img-handle="e" data-sec-id="${section.id}" title="Drag horizontally to adjust comparison width"></div>
        <div class="canvas-img-resize-handle canvas-img-resize-handle-w" data-img-handle="w" data-sec-id="${section.id}" title="Drag horizontally to adjust comparison width"></div>
        <div class="canvas-img-resize-handle canvas-img-resize-handle-se" data-img-handle="se" data-sec-id="${section.id}" title="Drag corner to adjust comparison width & height"></div>
        <div class="canvas-img-resize-handle canvas-img-resize-handle-sw" data-img-handle="sw" data-sec-id="${section.id}" title="Drag corner to adjust comparison width & height"></div>
      ` : '';

      const inner = `
        <div style="max-width:${customW};margin:0 auto;position:relative;">
          ${c.heading ? `<h3 class="sec-heading" style="margin-bottom:20px;text-align:center;">${renderFormattedText(c.heading)}</h3>` : ''}
          <div class="sec-ba-container" style="position:relative;width:100%;${hasCustomH ? `height:${customH}px;padding-top:0;` : 'padding-top:56.25%;'}border-radius:16px;overflow:hidden;background:#121212;box-shadow:0 12px 40px rgba(0,0,0,0.8);--pos:50%;">
            <!-- After Image (Background) -->
            <div class="sec-ba-image-frame" data-el-key="after-image" style="position:absolute;inset:0;width:100%;height:100%;overflow:hidden;">
              <img src="${escapeHtml(c.afterUrl || '')}" alt="${escapeHtml(c.afterLabel || 'After')}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
            </div>
            <span class="sec-ba-badge badge-after" style="position:absolute;bottom:14px;right:14px;background:rgba(0,0,0,0.7);color:#10B981;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;border:1px solid rgba(16,185,129,0.4);pointer-events:none;">
              ${escapeHtml(c.afterLabel || 'AFTER')}
            </span>

            <!-- Before Image (Clipped Overlay) -->
            <div class="sec-ba-image-frame" data-el-key="before-image" style="position:absolute;inset:0;width:100%;height:100%;overflow:hidden;clip-path:polygon(0 0, var(--pos, 50%) 0, var(--pos, 50%) 100%, 0 100%);">
              <img src="${escapeHtml(c.beforeUrl || '')}" alt="${escapeHtml(c.beforeLabel || 'Before')}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
              <span class="sec-ba-badge badge-before" style="position:absolute;bottom:14px;left:14px;background:rgba(0,0,0,0.7);color:#FF5C00;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;border:1px solid rgba(255,92,0,0.4);pointer-events:none;">
                ${escapeHtml(c.beforeLabel || 'BEFORE')}
              </span>
            </div>

            <!-- Divider Line -->
            <div style="position:absolute;top:0;bottom:0;left:var(--pos, 50%);width:2px;background:#FF5C00;box-shadow:0 0 12px #FF5C00;pointer-events:none;transform:translateX(-50%);">
              <div style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);width:28px;height:28px;background:#FF5C00;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;box-shadow:0 0 10px rgba(0,0,0,0.6);">↔</div>
            </div>

            <!-- Native Range Slider Controller -->
            <input type="range" min="0" max="100" value="50" 
                   oninput="this.parentElement.style.setProperty('--pos', this.value + '%')" 
                   style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:ew-resize;z-index:10;margin:0;">
          </div>
          ${imgHandles}
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Video Embed Block
  SectionRegistry.register('video_embed', {
    label: 'Video Player & Embed',
    category: 'Media & Showcase',
    icon: '🎥',
    description: 'Responsive video player for YouTube, Vimeo, or direct MP4 video URLs.',
    createDefault: () => ({
      content: {
        title: 'Campaign Reel & Motion Direction',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        caption: 'Direction & editing by The Sonic Media Studio'
      },
      settings: {
        aspectRatio: '16:9',
        spacing: 'standard'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const url = c.videoUrl || '';

      let iframeSrc = '';
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let vidId = '';
        if (url.includes('youtu.be/')) vidId = url.split('youtu.be/')[1].split('?')[0];
        else if (url.includes('v=')) vidId = url.split('v=')[1].split('&')[0];
        iframeSrc = `https://www.youtube-nocookie.com/embed/${vidId}`;
      } else if (url.includes('vimeo.com')) {
        const vimeoId = url.split('vimeo.com/')[1].split('?')[0];
        iframeSrc = `https://player.vimeo.com/video/${vimeoId}`;
      }

      let videoPlayerHtml = '';
      if (iframeSrc) {
        videoPlayerHtml = `
          <div style="position:relative;width:100%;padding-top:56.25%;border-radius:14px;overflow:hidden;background:#000;">
            <iframe src="${iframeSrc}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe>
          </div>
        `;
      } else if (url.endsWith('.mp4') || url.endsWith('.webm')) {
        videoPlayerHtml = `
          <div style="border-radius:14px;overflow:hidden;background:#000;">
            <video src="${escapeHtml(url)}" controls style="width:100%;height:auto;display:block;" preload="metadata"></video>
          </div>
        `;
      } else {
        videoPlayerHtml = `
          <div style="padding:48px 20px;text-align:center;background:#141414;border:1px dashed rgba(255,255,255,0.15);border-radius:14px;color:rgba(245,240,235,0.6);">
            📹 Enter a valid YouTube, Vimeo, or MP4 link in the right inspector to preview video.
          </div>
        `;
      }

      const inner = `
        <div style="max-width:960px;margin:0 auto;">
          ${c.title ? `<h3 class="sec-heading" style="margin-bottom:16px;text-align:center;">${renderFormattedText(c.title)}</h3>` : ''}
          ${videoPlayerHtml}
          ${c.caption ? `<div style="font-size:12px;color:rgba(245,240,235,0.5);text-align:center;margin-top:10px;">${renderFormattedText(c.caption)}</div>` : ''}
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // ==========================================================================
  // 3. COLUMNS & LAYOUT BLOCKS
  // ==========================================================================

  // Multi-Column Flexible Container
  SectionRegistry.register('columns', {
    label: 'Columns Container (2 or 3 Cols)',
    category: 'Columns & Layouts',
    icon: '▥',
    description: 'Custom multi-column layout with 25:75, 50:50, 75:25, or 33:33:33 proportions.',
    createDefault: () => ({
      content: {
        col1: {
          title: '01. Discovery & Research',
          body: 'We conducted deep qualitative interviews with target customers to isolate core friction points in the existing user journey.'
        },
        col2: {
          title: '02. Identity & System',
          body: 'Developed an uncompromising visual language, design token architecture, and high-performance frontend interfaces.'
        },
        col3: {
          title: '03. Scale & Growth',
          body: 'Delivered +340% increase in checkout conversions through programmatic SEO and headless Next.js speed optimization.'
        }
      },
      settings: {
        columnsCount: 3, // 2 or 3
        ratio: 'equal',  // 'equal' (50:50 or 33:33:33), '25:75', '75:25', '33:66', '66:33'
        gap: 24,
        cardStyle: true,
        verticalAlign: 'top', // 'top', 'center', 'bottom'
        spacing: 'standard'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const cols = s.columnsCount || 3;
      const gap = s.gap !== undefined ? s.gap : 24;
      const vAlign = s.verticalAlign || 'top';

      let gridCols = 'repeat(3, minmax(0, 1fr))';
      if (cols === 2) {
        if (s.ratio === '25:75') gridCols = '1fr 3fr';
        else if (s.ratio === '75:25') gridCols = '3fr 1fr';
        else if (s.ratio === '33:66') gridCols = '1fr 2fr';
        else if (s.ratio === '66:33') gridCols = '2fr 1fr';
        else gridCols = '1fr 1fr';
      } else if (cols === 4) {
        gridCols = 'repeat(4, minmax(0, 1fr))';
      }

      function renderColContent(col, colNum) {
        if (!col) return '';
        const cardClass = s.cardStyle ? 'wd-full-card sec-col-card' : 'sec-col-card';
        return `
          <div class="${cardClass}" data-el-key="col-card-${colNum || 1}" style="${s.cardStyle ? 'padding:32px;' : ''}height:100%;min-width:0;">
            ${col.title ? `<h4 style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:#F5F0EB;margin:0 0 12px;">${renderFormattedText(col.title)}</h4>` : ''}
            ${col.body ? `<div style="font-size:14px;line-height:1.6;color:rgba(245,240,235,0.7);">${sanitizeRichText(col.body)}</div>` : ''}
          </div>
        `;
      }

      const col4Fallback = { title: '04. Deployment & Scale', body: 'Ongoing performance telemetry, iterations, and brand evolution.' };

      const inner = `
        <div class="sec-columns-grid" data-el-key="columns-grid" style="display:grid;grid-template-columns:${gridCols};gap:${gap}px;align-items:${vAlign === 'center' ? 'center' : (vAlign === 'bottom' ? 'flex-end' : 'start')};width:100%;box-sizing:border-box;">
          <div class="sec-col" data-el-key="col-1">${renderColContent(c.col1, 1)}</div>
          <div class="sec-col" data-el-key="col-2">${renderColContent(c.col2, 2)}</div>
          ${cols >= 3 ? `<div class="sec-col" data-el-key="col-3">${renderColContent(c.col3, 3)}</div>` : ''}
          ${cols >= 4 ? `<div class="sec-col" data-el-key="col-4">${renderColContent(c.col4 || col4Fallback, 4)}</div>` : ''}
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Text & Image Split
  SectionRegistry.register('text_image', {
    label: 'Text & Image Split',
    category: 'Columns & Layouts',
    icon: '◫',
    description: 'Editorial side-by-side split layout with image left or right and ratio controls.',
    createDefault: () => ({
      content: {
        eyebrow: 'APPROACH & STRATEGY',
        heading: 'Crafting Brand Distinction',
        body: '<p>Every touchpoint was engineered to communicate luxury and technical excellence. We designed a bespoke typography system and dynamic interaction tokens.</p>',
        imageUrl: 'https://images.unsplash.com/photo-1542744094-3a31727560fa?auto=format&fit=crop&w=800&q=80',
        ctaText: 'Explore System',
        ctaUrl: '#strategy'
      },
      settings: {
        imagePosition: 'right', // 'left', 'right'
        ratio: '50:50',         // '50:50', '25:75', '75:25', '40:60', '60:40'
        spacing: 'standard',
        animation: 'split-converge',
        imageWidth: '100%',
        imageHeight: 'auto',
        imageFit: 'cover',
        imageRadius: 16,
        imageAlign: 'center'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const isImgLeft = s.imagePosition === 'left';
      
      let gridStyle = '1fr 1fr';
      if (s.ratio === '25:75') gridStyle = isImgLeft ? '1fr 3fr' : '3fr 1fr';
      else if (s.ratio === '75:25') gridStyle = isImgLeft ? '3fr 1fr' : '1fr 3fr';
      else if (s.ratio === '40:60') gridStyle = isImgLeft ? '2fr 3fr' : '3fr 2fr';
      else if (s.ratio === '60:40') gridStyle = isImgLeft ? '3fr 2fr' : '2fr 3fr';

      const imgW = s.imageWidth ? (String(s.imageWidth).endsWith('%') || String(s.imageWidth).endsWith('px') ? s.imageWidth : `${s.imageWidth}px`) : '100%';
      const hasCustomH = s.imageHeight && s.imageHeight !== 'auto' && parseInt(s.imageHeight) > 0;
      const imgH = hasCustomH ? (String(s.imageHeight).endsWith('px') ? s.imageHeight : `${s.imageHeight}px`) : '';
      const imgFit = s.imageObjectFit || s.imageFit || s.objectFit || 'cover';
      const imgRadius = s.imageRadius !== undefined && s.imageRadius !== '' ? `${s.imageRadius}px` : '16px';
      const imgAlign = s.imageAlign || 'center';
      const imgMargin = imgAlign === 'left' ? 'margin-right:auto;margin-left:0;' : (imgAlign === 'right' ? 'margin-left:auto;margin-right:0;' : 'margin:0 auto;');
      const objPos = s.objectPosition || 'center center';

      const isBuilderSelected = !opts?.isPublic && opts?.isSelected;
      const imgHandles = isBuilderSelected ? `
        <div class="canvas-img-size-badge" title="Image Dimensions"><span>🖼️</span> <span class="badge-dim">${imgW} × ${imgH || 'Auto'}</span></div>
        <div class="canvas-img-resize-handle canvas-img-resize-handle-s" data-img-handle="s" data-sec-id="${section.id}" title="Drag vertically to adjust image height"></div>
        <div class="canvas-img-resize-handle canvas-img-resize-handle-e" data-img-handle="e" data-sec-id="${section.id}" title="Drag horizontally to adjust image width"></div>
        <div class="canvas-img-resize-handle canvas-img-resize-handle-w" data-img-handle="w" data-sec-id="${section.id}" title="Drag horizontally to adjust image width"></div>
        <div class="canvas-img-resize-handle canvas-img-resize-handle-se" data-img-handle="se" data-sec-id="${section.id}" title="Drag corner to adjust image width & height"></div>
        <div class="canvas-img-resize-handle canvas-img-resize-handle-sw" data-img-handle="sw" data-sec-id="${section.id}" title="Drag corner to adjust image width & height"></div>
      ` : '';

      // Button configuration (Supports custom button settings, existing ctaText/ctaUrl, or removal)
      const btnHtml = renderSectionButtonGroup(section, s.buttonAlign || 'left');

      const textCol = `
        <div class="sec-text-col" style="display:flex;flex-direction:column;justify-content:center;">
          ${c.eyebrow ? `<div class="wd-eyebrow" style="margin-bottom:8px;">${renderFormattedText(c.eyebrow)}</div>` : ''}
          ${c.heading ? `<h2 class="sec-heading" style="margin-bottom:16px;">${renderFormattedText(c.heading)}</h2>` : ''}
          <div class="wd-article-body">
            ${sanitizeRichText(c.body || '')}
          </div>
          ${btnHtml}
        </div>
      `;

      const hasUrl = c.imageUrl && c.imageUrl.trim();
      const imgHolderHtml = hasUrl ? `
        <div class="sec-img-holder sec-prebuilt-img-holder" data-sec-id="${section.id}" data-el-key="split-image" style="width:100%;height:${imgH ? '100%' : 'auto'};overflow:hidden;border-radius:${imgRadius};background:#121212;position:relative;">
          <img src="${escapeHtml(c.imageUrl || '')}" alt="${escapeHtml(c.heading || 'Project visual')}" style="width:100%;height:${imgH ? '100%' : 'auto'};max-height:100%;object-fit:${imgFit};object-position:${objPos};display:block;border-radius:${imgRadius};" loading="lazy">
          <div class="custom-image-drop-overlay sec-image-drop-overlay" style="position:absolute;inset:0;background:rgba(255,92,0,0.25);display:none;align-items:center;justify-content:center;border-radius:inherit;border:2px dashed #FF5C00;z-index:4;pointer-events:none;">
            <span style="background:#111;color:#FF5C00;font-weight:700;font-size:13px;padding:6px 16px;border-radius:20px;border:1px solid #FF5C00;box-shadow:0 4px 15px rgba(0,0,0,0.5);">Drop to Replace Photo</span>
          </div>
        </div>
      ` : renderEmptyImageUploadZone({
        secId: section.id,
        elKey: 'split-image',
        title: 'Split Image',
        sub: 'Click to browse or drag & drop photo',
        btnText: 'Browse Photo',
        minHeight: imgH || '80px',
        borderRadius: imgRadius
      });

      const imgCol = `
        <div class="sec-img-col" data-el-key="split-image" style="${imgMargin}width:100%;max-width:${imgW};position:relative;border-radius:${imgRadius};box-shadow:0 12px 40px rgba(0,0,0,0.6);${imgH ? `height:${imgH};` : ''}">
          ${imgHolderHtml}
          ${imgHandles}
        </div>
      `;

      const inner = `
        <div class="sec-split-grid" style="display:grid;grid-template-columns:${gridStyle};gap:48px;align-items:center;">
          ${isImgLeft ? imgCol + textCol : textCol + imgCol}
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // ==========================================================================
  // 4. BUSINESS & PORTFOLIO BLOCKS
  // ==========================================================================

  // Statistics & KPI Metrics Badges
  SectionRegistry.register('metrics', {
    label: 'Statistics & KPI Badges',
    category: 'Business & Portfolio',
    icon: '📊',
    description: 'High-visibility metrics row (e.g. +340% Growth, 10x ROI, Year 2026).',
    createDefault: () => ({
      content: {
        items: [
          { value: '+340%', label: 'Revenue Growth', desc: 'Direct online sales in 6 months' },
          { value: '10×', label: 'ROAS', desc: 'Sustained paid performance' },
          { value: '0.8s', label: 'Load Time', desc: 'Sub-second mobile speed' },
          { value: '2026', label: 'Year Completed', desc: 'Full-stack launch' }
        ]
      },
      settings: {
        columns: 4,
        cardStyle: true,
        spacing: 'standard'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const items = Array.isArray(c.items) ? c.items : [];
      let cols;
      if (s.columns === 'all') {
        cols = items.length || 1;
      } else if (s.columns !== undefined && s.columns !== '' && !isNaN(parseInt(s.columns))) {
        cols = Math.min(12, Math.max(1, parseInt(s.columns)));
      } else {
        cols = Math.min(items.length, 4) || 1;
      }
      const gap = s.gap !== undefined && s.gap !== '' ? parseInt(s.gap) : (s.cardStyle ? 0 : 20);

      const itemsHtml = items.map(m => `
        <div class="wd-meta-cell" style="min-width:0;">
          <div class="wd-meta-label">${escapeHtml(m.label || '')}</div>
          <div class="wd-meta-val">${escapeHtml(m.value || '')}</div>
          ${m.desc ? `<div style="font-size:11px;color:rgba(245,240,235,0.4);margin-top:4px;">${escapeHtml(m.desc)}</div>` : ''}
        </div>
      `).join('');

      const inner = `
        <div class="${s.cardStyle ? 'wd-meta-grid' : 'sec-metrics-transparent'}" style="display:grid;grid-template-columns:repeat(${cols}, minmax(0, 1fr));gap:${gap}px;width:100%;box-sizing:border-box;">
          ${itemsHtml}
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Narrative Cards (About / Challenge / Solution)
  SectionRegistry.register('narrative_cards', {
    label: 'Narrative Story Cards',
    category: 'Business & Portfolio',
    icon: '💡',
    description: 'Problem & Solution or About The Client story cards with icons and accent borders.',
    createDefault: () => ({
      content: {
        cards: [
          { icon: 'building', title: 'About The Client', body: 'A premier industry leader looking to redefine customer acquisition through bespoke digital experiences.' },
          { icon: 'target', title: 'The Core Challenge', body: 'Legacy tech stack suffered from severe load latency and fragmented brand messaging across touchpoints.' },
          { icon: 'bulb', title: 'Our Strategic Solution', body: 'Engineered a unified visual design system with headless architecture and automated lead scoring.' }
        ]
      },
      settings: {
        columns: 3, // 1 to 6, or 'all'
        spacing: 'standard'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const cards = Array.isArray(c.cards) ? c.cards : [];
      let cols;
      if (s.columns === 'all') {
        cols = cards.length || 1;
      } else if (s.columns !== undefined && s.columns !== '' && !isNaN(parseInt(s.columns))) {
        cols = Math.min(12, Math.max(1, parseInt(s.columns)));
      } else {
        cols = cards.length === 4 ? 4 : (Math.min(cards.length, 3) || 1);
      }
      const gap = s.gap !== undefined && s.gap !== '' ? parseInt(s.gap) : 24;

      const iconSvgs = {
        building: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M9 21v-4h6v4M3 7l9-4 9 4"/></svg>',
        target: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
        bulb: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M15 9a6 6 0 1 0-8 5.3V17h10v-2.7A6 6 0 0 0 15 9z"/></svg>'
      };

      const cardsHtml = cards.map((card, idx) => `
        <div class="wd-narrative-card" data-el-key="card-${idx}" style="transform:translate3d(var(--el-card-${idx}-ox, 0px), var(--el-card-${idx}-oy, 0px), 0);min-width:0;">
          <div class="wd-narrative-card-header">
            <span class="wd-narrative-card-icon">${iconSvgs[card.icon] || iconSvgs.building}</span>
            <span class="wd-narrative-card-title">${renderFormattedText(card.title || '')}</span>
          </div>
          <p class="wd-narrative-card-body">${renderFormattedText(card.body || '')}</p>
        </div>
      `).join('');

      const direction = s.direction || (s.columns === 1 ? 'column' : 'row');
      let layoutStyle;
      if (direction === 'column' || cols === 1) {
        layoutStyle = `display:flex;flex-direction:column;gap:${gap}px;width:100%;box-sizing:border-box;`;
      } else {
        layoutStyle = `display:grid;grid-template-columns:repeat(${cols}, minmax(0, 1fr));gap:${gap}px;width:100%;box-sizing:border-box;`;
      }

      const inner = `
        <div class="wd-narrative-grid" style="${layoutStyle}">
          ${cardsHtml}
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Key Deliverables Checklist
  SectionRegistry.register('deliverables', {
    label: 'Key Deliverables Checklist',
    category: 'Business & Portfolio',
    icon: '📦',
    description: 'Pills or checklist of project deliverables (e.g. Brand Identity, UI Design).',
    createDefault: () => ({
      content: {
        heading: 'Project Deliverables & Scope',
        items: [
          'Brand Strategy & Visual Identity',
          'UI/UX Design & High-Fidelity Prototypes',
          'Headless Full-Stack Web Development',
          'Performance SEO & Conversion Architecture'
        ]
      },
      settings: {
        spacing: 'standard'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const items = Array.isArray(c.items) ? c.items : [];
      let gridColsStyle = 'repeat(auto-fit, minmax(260px, 1fr))';
      if (s.columns === 'all') {
        gridColsStyle = `repeat(${items.length || 1}, minmax(0, 1fr))`;
      } else if (s.columns === 'auto') {
        gridColsStyle = 'repeat(auto-fit, minmax(260px, 1fr))';
      } else if (s.columns !== undefined && s.columns !== '' && !isNaN(parseInt(s.columns))) {
        gridColsStyle = `repeat(${parseInt(s.columns)}, minmax(0, 1fr))`;
      }
      const gap = s.gap !== undefined && s.gap !== '' ? parseInt(s.gap) : 16;

      const itemsHtml = items.map((d, idx) => `
        <div class="wd-deliverable-item" data-el-key="deliv-${idx}" style="transform:translate3d(var(--el-deliv-${idx}-ox, 0px), var(--el-deliv-${idx}-oy, 0px), 0);min-width:0;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#FF5C00" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span class="wd-deliverable-text">${renderFormattedText(d)}</span>
        </div>
      `).join('');

      const direction = s.direction || (s.columns === 1 ? 'column' : 'grid');
      let layoutStyle;
      if (direction === 'column' || s.columns === 1) {
        layoutStyle = `display:flex;flex-direction:column;gap:${gap}px;width:100%;box-sizing:border-box;`;
      } else {
        layoutStyle = `display:grid;grid-template-columns:${gridColsStyle};gap:${gap}px;width:100%;box-sizing:border-box;`;
      }

      const inner = `
        <div class="wd-full-card" style="padding:36px;">
          ${c.heading ? `<h3 class="sec-heading" style="margin-bottom:20px;">${renderFormattedText(c.heading)}</h3>` : ''}
          <div class="wd-deliverables-grid" style="${layoutStyle}">
            ${itemsHtml}
          </div>
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Cards Grid Block
  SectionRegistry.register('cards_grid', {
    label: 'Cards Grid',
    category: 'Business & Portfolio',
    icon: '▦',
    description: 'Interactive grid of service or feature cards with icons, headings, and links.',
    createDefault: () => ({
      content: {
        heading: 'Strategic Capabilities',
        cards: [
          { title: 'Brand Identity', desc: 'Logo systems, brand books, typography, and color harmony.', link: '' },
          { title: 'Digital Experiences', desc: 'Ultra-fast Next.js apps, bespoke portals, and ecommerce.', link: '' },
          { title: 'Performance Growth', desc: 'Meta & Google paid media campaigns with high ROAS.', link: '' }
        ]
      },
      settings: {
        columns: 3,
        spacing: 'standard'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const cards = Array.isArray(c.cards) ? c.cards : [];
      let gridColsStyle = 'repeat(auto-fit, minmax(280px, 1fr))';
      if (s.columns === 'all') {
        gridColsStyle = `repeat(${cards.length || 1}, minmax(0, 1fr))`;
      } else if (s.columns === 'auto') {
        gridColsStyle = 'repeat(auto-fit, minmax(280px, 1fr))';
      } else if (s.columns !== undefined && s.columns !== '' && !isNaN(parseInt(s.columns))) {
        gridColsStyle = `repeat(${parseInt(s.columns)}, minmax(0, 1fr))`;
      }
      const gap = s.gap !== undefined && s.gap !== '' ? parseInt(s.gap) : 24;

      const cardsHtml = cards.map(cd => `
        <div class="wd-full-card sec-hover-card" style="padding:32px;display:flex;flex-direction:column;min-width:0;">
          <h4 style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:#F5F0EB;margin:0 0 10px;">${renderFormattedText(cd.title || '')}</h4>
          <p style="font-size:13.5px;line-height:1.6;color:rgba(245,240,235,0.7);margin:0 0 16px;flex:1;">${renderFormattedText(cd.desc || '')}</p>
          ${cd.link ? `<a href="${escapeHtml(cd.link)}" style="color:#FF5C00;font-size:12px;font-weight:700;text-decoration:none;">Learn More →</a>` : ''}
        </div>
      `).join('');

      const inner = `
        ${c.heading ? `<h3 class="sec-heading" style="margin-bottom:24px;text-align:center;">${renderFormattedText(c.heading)}</h3>` : ''}
        <div class="wd-cards-grid-inner" style="display:grid;grid-template-columns:${gridColsStyle};gap:${gap}px;width:100%;box-sizing:border-box;">
          ${cardsHtml}
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Client Testimonial
  SectionRegistry.register('testimonial', {
    label: 'Client Testimonial',
    category: 'Business & Portfolio',
    icon: '⭐',
    description: 'Highlighted client review card with avatar, rating stars, name, and designation.',
    createDefault: () => ({
      content: {
        quote: 'Working with The Sonic Media was the single best agency decision we made. They executed every phase with speed, precision, and extraordinary visual taste.',
        author: 'Arjun Mehta',
        title: 'Founder & CEO, Titan Fitness Club',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
        rating: 5
      },
      settings: {
        spacing: 'standard'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const ratingStars = '★'.repeat(c.rating || 5);

      const inner = `
        <div style="max-width:880px;margin:0 auto;">
          <div class="wd-full-card testimonial-card" style="padding:40px;position:relative;border:1px solid rgba(255,92,0,0.25);">
            <div style="color:#FF5C00;font-size:18px;margin-bottom:14px;letter-spacing:2px;">${ratingStars}</div>
            <p style="font-family:'Syne',sans-serif;font-size:20px;font-weight:600;line-height:1.5;color:#F5F0EB;margin:0 0 24px;">
              “${escapeHtml(c.quote || '')}”
            </p>
            <div style="display:flex;align-items:center;gap:14px;">
              ${c.avatar ? `<span data-el-key="testimonial-avatar" style="display:inline-flex;width:48px;height:48px;border-radius:50%;overflow:hidden;flex:0 0 auto;"><img src="${escapeHtml(c.avatar)}" alt="${escapeHtml(c.author || '')}" style="width:100%;height:100%;border-radius:inherit;object-fit:cover;border:2px solid #FF5C00;box-sizing:border-box;" loading="lazy"></span>` : ''}
              <div>
                <strong style="color:#F5F0EB;font-size:14px;font-family:'Syne',sans-serif;">${escapeHtml(c.author || '')}</strong>
                <div style="font-size:12px;color:rgba(245,240,235,0.6);margin-top:2px;">${escapeHtml(c.title || '')}</div>
              </div>
            </div>
          </div>
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Client Logos Strip
  SectionRegistry.register('client_logos', {
    label: 'Client Logos Strip',
    category: 'Business & Portfolio',
    icon: '🤝',
    description: 'Trusted brand logos strip with grayscale filter and hover glow.',
    createDefault: () => ({
      content: {
        heading: 'Trusted by High-Growth Brands & Leaders',
        logos: [
          { name: 'Nexora', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&q=80' },
          { name: 'Titan', url: 'https://images.unsplash.com/photo-1542744094-3a31727560fa?w=200&q=80' },
          { name: 'Spice Theory', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&q=80' },
          { name: 'Elira', url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200&q=80' }
        ]
      },
      settings: {
        spacing: 'compact'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};
      const logos = Array.isArray(c.logos) ? c.logos : [];
      const gap = s.gap !== undefined && s.gap !== '' ? parseInt(s.gap) : 36;

      const logosHtml = logos.map((l, i) => `
        <div data-el="logo-item-${i}" data-el-key="logo-${i}" class="sec-logo-item client-logo-item" style="display:flex;align-items:center;justify-content:center;padding:12px;filter:grayscale(100%) brightness(1.2);opacity:0.75;transition:all 0.2s;">
          ${l.url ? `<img src="${escapeHtml(l.url)}" alt="${escapeHtml(l.name || 'Client Logo')}" style="max-height:42px;max-width:140px;object-fit:contain;" loading="lazy">` : `<div style="font-size:12px;color:rgba(255,255,255,0.4);border:1px dashed rgba(255,255,255,0.2);padding:8px 14px;border-radius:4px;">${escapeHtml(l.name || 'Empty Logo')}</div>`}
        </div>
      `).join('');

      let layoutStyle = `display:flex;align-items:center;justify-content:center;gap:${gap}px;flex-wrap:wrap;`;
      if (s.columns && s.columns !== 'auto') {
        const cols = s.columns === 'all' ? (logos.length || 1) : Math.min(12, Math.max(1, parseInt(s.columns)));
        layoutStyle = `display:grid;grid-template-columns:repeat(${cols}, minmax(0, 1fr));gap:${gap}px;align-items:center;justify-items:center;width:100%;box-sizing:border-box;`;
      }

      const inner = `
        ${c.heading ? `<div style="font-size:12px;font-family:'Syne',sans-serif;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(245,240,235,0.45);text-align:center;margin-bottom:20px;">${renderFormattedText(c.heading)}</div>` : ''}
        <div style="${layoutStyle}">
          ${logosHtml}
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Call to Action (CTA)
  SectionRegistry.register('cta', {
    label: 'Call to Action Banner',
    category: 'Business & Portfolio',
    icon: '📣',
    description: 'High-conversion banner with headline, description, primary button, and secondary link.',
    createDefault: () => ({
      content: {
        eyebrow: 'Ready to Build Something Great?',
        heading: 'Work With The Sonic Media',
        description: "Let's craft your brand's next digital chapter — strategy, design, development, and growth under one roof.",
        btnText: 'Start a Project →',
        btnUrl: '/contact',
        secondaryBtnText: 'Explore All Work',
        secondaryBtnUrl: '/portfolio'
      },
      settings: {
        spacing: 'generous'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const s = section.settings || {};

      const buttons = getSectionButtons(section);
      let btnsHtml = '';
      if (buttons.length > 0) {
        btnsHtml = buttons.map((b, idx) => renderCustomBtnMarkup(b, idx)).join('');
      }

      const cardStyle = s.elementStyles?.['cta-card'] || {};
      const cardW = cardStyle.width || (s.cardWidth ? (String(s.cardWidth).endsWith('px') || String(s.cardWidth).endsWith('%') ? s.cardWidth : `${s.cardWidth}px`) : null);
      const cardH = cardStyle.height || null;
      const cardWidthStyle = cardW ? `width:${cardW} !important;max-width:${cardW} !important;` : 'width:100%;max-width:1000px;';
      const cardHeightStyle = cardH ? `height:${cardH} !important;min-height:${cardH} !important;` : '';
      const cardBg = cardStyle.background ? `background:${cardStyle.background} !important;` : 'background:radial-gradient(circle at 50% 50%, rgba(255,92,0,0.12), transparent 70%), #0D0D0D;';
      const cardBorder = cardStyle.border ? `border:${cardStyle.border} !important;` : 'border:1px solid rgba(255,92,0,0.3);';
      const cardRadius = cardStyle.borderRadius ? `border-radius:${cardStyle.borderRadius} !important;` : 'border-radius:24px;';
      const cardShadow = cardStyle.boxShadow ? `box-shadow:${cardStyle.boxShadow} !important;` : 'box-shadow:0 16px 50px rgba(0,0,0,0.8), 0 0 30px rgba(255,92,0,0.15);';
      const cardOpacity = (cardStyle.opacity !== undefined && cardStyle.opacity !== '') ? `opacity:${cardStyle.opacity};` : '';

      const cardPos = s.elementOffsets?.['cta-card'];
      const cardTransform = (cardPos && (cardPos.x || cardPos.y))
        ? `transform:translate3d(${parseInt(cardPos.x || 0)}px, ${parseInt(cardPos.y || 0)}px, 0);`
        : '';

      const elSt = (s.elementStyles && (s.elementStyles.heading || s.elementStyles['heading-0'])) || {};
      const ctaFont = resolveFontFamily(elSt.fontFamily || s.fontFamily || 'Syne');
      const ctaFontStyle = elSt.fontStyle || s.fontStyle || '';
      const ctaFontWeight = elSt.fontWeight || s.fontWeight || '800';
      const ctaFontStyleAttr = ctaFontStyle ? `font-style:${ctaFontStyle} !important;` : '';

      const inner = `
        <div class="sec-cta-card has-element-box has-reposition-handle" data-el-key="cta-card" data-el-label="CTA Card" data-sec-id="${section.id}" style="position:relative;${cardWidthStyle}${cardHeightStyle}margin:0 auto;box-sizing:border-box;padding:clamp(40px, 6vw, 64px) clamp(24px, 4vw, 40px);text-align:center;${cardBg}${cardBorder}${cardRadius}${cardShadow}${cardOpacity}${cardTransform}word-break:break-word;overflow-wrap:break-word;">
          ${c.eyebrow ? `<div class="wd-eyebrow" data-el-key="eyebrow" style="margin-bottom:12px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#FF5C00;text-align:center;justify-content:center;word-break:break-word;overflow-wrap:break-word;">${renderFormattedText(c.eyebrow)}</div>` : ''}
          <h2 class="wd-cta-heading" data-el-key="heading" style="font-size:clamp(28px, 4.5vw, 48px);font-family:${ctaFont} !important;${ctaFontStyleAttr}font-weight:${ctaFontWeight};color:#F5F0EB;margin:0 0 16px;line-height:1.15;text-align:center;word-break:break-word;overflow-wrap:break-word;">
            ${renderFormattedText(c.heading || '')}
          </h2>
          <p class="wd-cta-desc" data-el-key="description" style="max-width:560px;width:100%;box-sizing:border-box;margin:0 auto 32px;font-size:15px;line-height:1.6;color:rgba(245,240,235,0.7);text-align:center;word-break:break-word;overflow-wrap:break-word;">
            ${renderFormattedText(c.description || '')}
          </p>
          ${btnsHtml ? `
            <div class="custom-btn-wrapper custom-btn-group" style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;align-items:center;">
              ${btnsHtml}
            </div>
          ` : ''}
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Spacer & Divider
  SectionRegistry.register('spacer', {
    label: 'Spacer & Divider',
    category: 'Columns & Layouts',
    icon: '➖',
    description: 'Configurable whitespace or decorative divider line between sections.',
    createDefault: () => ({
      content: {},
      settings: {
        height: 60,
        showLine: true,
        lineStyle: 'subtle', // 'subtle', 'orange', 'dashed'
        spacing: 'none'
      }
    }),
    render(section, opts) {
      const s = section.settings || {};
      const h = parseInt(s.height) || 60;
      
      let lineStyle = 'border-top: 1px solid rgba(255, 255, 255, 0.08);';
      if (s.lineStyle === 'orange') lineStyle = 'border-top: 1px solid rgba(255, 92, 0, 0.4); box-shadow: 0 0 10px rgba(255, 92, 0, 0.2);';
      else if (s.lineStyle === 'dashed') lineStyle = 'border-top: 1px dashed rgba(255, 255, 255, 0.15);';

      const inner = `
        <div style="height:${h}px;display:flex;align-items:center;justify-content:center;">
          ${s.showLine ? `<div style="width:100%;${lineStyle}"></div>` : ''}
        </div>
      `;
      return renderUniversalWrap(section, inner);
    }
  });

  // Custom Content / Safe HTML
  SectionRegistry.register('custom_content', {
    label: 'Custom Content Block',
    category: 'Typography & Text',
    icon: '💻',
    description: 'Custom sanitized HTML content for specialized widgets or embeds.',
    createDefault: () => ({
      content: {
        html: '<div style="padding:24px;text-align:center;color:#F5F0EB;">Custom HTML Block</div>'
      },
      settings: {
        spacing: 'standard'
      }
    }),
    render(section, opts) {
      const c = section.content || {};
      const safeHtml = `<div class="sec-custom-html-wrap" data-el-key="custom-html-wrap">${sanitizeRichText(c.html || '')}</div>`;
      return renderUniversalWrap(section, safeHtml);
    }
  });

  function createLayoutDefaults(type) {
    const isFreeform = type === 'freeform';
    const nodes = isFreeform ? [] : [
      {
        id: generateId('text'),
        type: 'text',
        width: '100%',
        height: '220px',
        content: {
          heading: 'Your Heading',
          text: 'Add supporting copy for this section.'
        }
      },
      {
        id: generateId('image'),
        type: 'image',
        width: '100%',
        height: '320px',
        imageUrl: '',
        objectFit: 'cover'
      }
    ];
    return {
      content: {},
      settings: {
        spacing: 'standard',
        hideTemplateCard: true,
        customContainers: nodes
      }
    };
  }

  function registerSemanticLayout(type, label, description, layout) {
    SectionRegistry.register(type, {
      label,
      category: 'Columns & Layouts',
      icon: '\u25A6',
      description,
      createDefault: () => {
        const defaults = createLayoutDefaults(layout.type);
        defaults.settings.semanticLayout = Object.assign({}, layout);
        return defaults;
      },
      render(section) {
        section.layout = Object.assign({}, layout, section.layout || {});
        return renderUniversalWrap(section, '', 'sec-semantic-layout');
      }
    });
  }

  registerSemanticLayout('layout_grid', 'Grid + Text & Image', 'Responsive grid with independent text and image elements.', {
    mode: 'structured', type: 'grid', columns: 2, gap: 24
  });
  registerSemanticLayout('layout_row', 'Row Layout', 'Responsive horizontal row for independent elements.', {
    mode: 'structured', type: 'row', columns: 2, gap: 20
  });
  registerSemanticLayout('layout_stack', 'Stack Layout', 'Vertical structured layout for text, media, and buttons.', {
    mode: 'structured', type: 'stack', columns: 1, gap: 20
  });
  registerSemanticLayout('layout_freeform', 'Freeform Canvas', 'Blank section for manually positioned independent elements.', {
    mode: 'freeform', type: 'freeform', columns: 1, gap: 20
  });

  // ==========================================================================
  // INTERACTIVE RUNTIME INITIALIZER (Carousels, Before/After, Animations)
  // ==========================================================================
  SectionRegistry.destroyInteractive = function (rootElement) {
    const root = rootElement || document;
    const interactiveNodes = [];

    if (root.matches && root.matches('[data-carousel=true], .sec-ba-container')) {
      interactiveNodes.push(root);
    }
    if (root.querySelectorAll) {
      root.querySelectorAll('[data-carousel=true], .sec-ba-container').forEach(node => interactiveNodes.push(node));
    }

    interactiveNodes.forEach(node => {
      if (typeof node._sectionInteractiveCleanup === 'function') {
        try { node._sectionInteractiveCleanup(); } catch (_) { }
      }
      node._sectionInteractiveCleanup = null;
    });
  };

  SectionRegistry.initInteractive = function (rootElement) {
    const root = rootElement || document;

    // Re-initialization is intentionally idempotent. The visual builder can
    // refresh a single section many times while editing; clean the previous
    // runtime before attaching a new one so detached nodes, timers and global
    // pointer listeners are never retained.
    SectionRegistry.destroyInteractive(root);

    // ── Carousel / Slider Initializer ──
    const carousels = root.querySelectorAll('[data-carousel="true"]');
    carousels.forEach(car => {
      // Clear any previously running autoplay interval on this DOM node
      if (car._autoplayTimer) {
        clearInterval(car._autoplayTimer);
        car._autoplayTimer = null;
      }

      const track = car.querySelector('.sec-carousel-track');
      if (!track) return;

      const slides = Array.from(track.querySelectorAll('.sec-carousel-slide:not([data-carousel-clone])'));
      if (slides.length <= 1) return;

      const prevBtn = car.querySelector('.sec-carousel-nav-btn.prev-btn');
      const nextBtn = car.querySelector('.sec-carousel-nav-btn.next-btn');
      const dots = Array.from(car.querySelectorAll('.sec-carousel-dot'));
      
      const isAutoplay = car.getAttribute('data-autoplay') === 'true';
      const intervalMs = parseInt(car.getAttribute('data-interval'), 10) || 4000;
      const pauseOnHover = car.getAttribute('data-pause-hover') === 'true';
      const continuousLoop = car.getAttribute('data-continuous-loop') === 'true';

      let currentIndex = 0;
      let isPaused = false;
      let isProgrammaticScroll = false;
      let settleTimer = null;
      let scrollDebounce = null;
      let leadingClone = null;
      let trailingClone = null;

      function prepareClone(source, edge) {
        const clone = source.cloneNode(true);
        clone.classList.add('sec-carousel-slide-clone');
        clone.setAttribute('data-carousel-clone', edge);
        clone.setAttribute('data-builder-layer', 'internal');
        clone.setAttribute('aria-hidden', 'true');
        clone.style.pointerEvents = 'none';
        clone.removeAttribute('data-el-key');
        clone.querySelectorAll('[data-el-key]').forEach(node => node.removeAttribute('data-el-key'));
        clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        clone.querySelectorAll('a, button, input, textarea, select, [tabindex]').forEach(node => node.setAttribute('tabindex', '-1'));
        return clone;
      }

      if (continuousLoop) {
        leadingClone = prepareClone(slides[slides.length - 1], 'leading');
        trailingClone = prepareClone(slides[0], 'trailing');
        track.insertBefore(leadingClone, slides[0]);
        track.appendChild(trailingClone);
      }

      function updateActiveDot(idx) {
        dots.forEach((d, i) => {
          if (i === idx) d.classList.add('active');
          else d.classList.remove('active');
        });
      }

      function targetScrollLeft(targetSlide) {
        if (!targetSlide) return 0;
        // offsetLeft is expressed in the track's unscaled layout coordinate
        // system. getBoundingClientRect() is visually scaled by the builder /
        // public page surface, which previously left part of the leading loop
        // clone visible and created a large gap beside slide 1.
        return Math.max(0, targetSlide.offsetLeft - track.offsetLeft);
      }

      function moveTrackTo(targetSlide, behavior = 'smooth') {
        if (!targetSlide) return;
        const left = targetScrollLeft(targetSlide);
        if (behavior === 'auto') {
          // CSS sets scroll-behavior:smooth on the track. Passing "auto" to
          // scrollTo would still inherit that CSS and visibly animate backward
          // from the trailing clone to slide 1. Temporarily disable both smooth
          // scrolling and snap while performing the invisible loop reset.
          const previousBehavior = track.style.scrollBehavior;
          const previousSnap = track.style.scrollSnapType;
          track.style.setProperty('scroll-behavior', 'auto', 'important');
          track.style.setProperty('scroll-snap-type', 'none', 'important');
          track.scrollLeft = left;
          void track.offsetWidth;
          if (previousBehavior) track.style.scrollBehavior = previousBehavior;
          else track.style.removeProperty('scroll-behavior');
          if (previousSnap) track.style.scrollSnapType = previousSnap;
          else track.style.removeProperty('scroll-snap-type');
          return;
        }
        track.scrollTo({ left, behavior });
      }

      function finishLoopAt(targetSlide) {
        clearTimeout(settleTimer);
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          clearTimeout(settleTimer);
          track.removeEventListener('scrollend', finish);
          moveTrackTo(targetSlide, 'auto');
          requestAnimationFrame(() => { isProgrammaticScroll = false; });
        };

        // Reset only after the visible forward movement reaches its cloned
        // destination. The timeout is a compatibility fallback for browsers
        // without the scrollend event.
        if ('onscrollend' in track) {
          track.addEventListener('scrollend', finish, { once: true });
          settleTimer = setTimeout(finish, 1000);
        } else {
          settleTimer = setTimeout(finish, 520);
        }
      }

      function scrollToSlide(idx, behavior = 'smooth') {
        const isBeforeFirst = idx < 0;
        const isAfterLast = idx >= slides.length;
        const wrappedIndex = ((idx % slides.length) + slides.length) % slides.length;
        currentIndex = wrappedIndex;
        isProgrammaticScroll = true;

        if (continuousLoop && isAfterLast && trailingClone) {
          moveTrackTo(trailingClone, behavior);
          finishLoopAt(slides[0]);
        } else if (continuousLoop && isBeforeFirst && leadingClone) {
          moveTrackTo(leadingClone, behavior);
          finishLoopAt(slides[slides.length - 1]);
        } else {
          moveTrackTo(slides[currentIndex], behavior);
          clearTimeout(settleTimer);
          settleTimer = setTimeout(() => { isProgrammaticScroll = false; }, behavior === 'smooth' ? 480 : 0);
        }
        updateActiveDot(currentIndex);
      }

      function nextSlide() {
        scrollToSlide(currentIndex + 1);
      }

      function prevSlide() {
        scrollToSlide(currentIndex - 1);
      }

      // Prev / Next button listeners
      if (prevBtn) {
        prevBtn.onclick = (e) => {
          e.stopPropagation();
          prevSlide();
          resetAutoplay();
        };
      }
      if (nextBtn) {
        nextBtn.onclick = (e) => {
          e.stopPropagation();
          nextSlide();
          resetAutoplay();
        };
      }

      // Dots click listeners
      dots.forEach((dot, idx) => {
        dot.onclick = (e) => {
          e.stopPropagation();
          scrollToSlide(idx);
          resetAutoplay();
        };
      });

      // Track scroll listener to sync dots when user swipes or scrolls manually
      track.onscroll = () => {
        clearTimeout(scrollDebounce);
        scrollDebounce = setTimeout(() => {
          if (isProgrammaticScroll) return;
          const physicalSlides = continuousLoop
            ? [leadingClone, ...slides, trailingClone].filter(Boolean)
            : slides;

          let closestSlide = slides[0];
          let minDistance = Infinity;

          physicalSlides.forEach(sl => {
            const dist = Math.abs(targetScrollLeft(sl) - track.scrollLeft);
            if (dist < minDistance) {
              minDistance = dist;
              closestSlide = sl;
            }
          });

          if (closestSlide === leadingClone) {
            currentIndex = slides.length - 1;
            isProgrammaticScroll = true;
            moveTrackTo(slides[currentIndex], 'auto');
            requestAnimationFrame(() => { isProgrammaticScroll = false; });
          } else if (closestSlide === trailingClone) {
            currentIndex = 0;
            isProgrammaticScroll = true;
            moveTrackTo(slides[0], 'auto');
            requestAnimationFrame(() => { isProgrammaticScroll = false; });
          } else {
            currentIndex = Math.max(0, slides.indexOf(closestSlide));
          }
          updateActiveDot(currentIndex);
        }, 120);
      };

      // A leading clone shifts the physical scroll origin. Start on the first
      // real slide without animation so slide 1 remains the logical default.
      if (continuousLoop) {
        requestAnimationFrame(() => {
          isProgrammaticScroll = true;
          moveTrackTo(slides[0], 'auto');
          requestAnimationFrame(() => { isProgrammaticScroll = false; });
        });
      }

      // Autoplay Timer handling
      function startAutoplay() {
        if (!isAutoplay || slides.length <= 1) return;
        if (car._autoplayTimer) clearInterval(car._autoplayTimer);

        car._autoplayTimer = setInterval(() => {
          if (!isPaused && document.visibilityState !== 'hidden') {
            nextSlide();
          }
        }, intervalMs);
      }

      function resetAutoplay() {
        if (isAutoplay) {
          startAutoplay();
        }
      }

      if (pauseOnHover) {
        car.onmouseenter = () => { isPaused = true; };
        car.onmouseleave = () => { isPaused = false; };
      }

      // Start the autoplay loop
      startAutoplay();

      car._sectionInteractiveCleanup = () => {
        if (car._autoplayTimer) {
          clearInterval(car._autoplayTimer);
          car._autoplayTimer = null;
        }
        clearTimeout(settleTimer);
        clearTimeout(scrollDebounce);
        track.onscroll = null;
        car.onmouseenter = null;
        car.onmouseleave = null;
        if (prevBtn) prevBtn.onclick = null;
        if (nextBtn) nextBtn.onclick = null;
        dots.forEach(dot => { dot.onclick = null; });
        track.querySelectorAll('[data-carousel-clone]').forEach(clone => clone.remove());
      };
    });

    // ── Before/After Slider Initializer ──
    const baContainers = root.querySelectorAll('.sec-ba-container');
    baContainers.forEach(box => {
      const handle = box.querySelector('.sec-ba-handle');
      if (!handle) return;

      let isDown = false;
      const updateDivider = (clientX) => {
        const rect = box.getBoundingClientRect();
        const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const pct = (offsetX / rect.width) * 100;
        box.style.setProperty('--pos', pct.toFixed(2) + '%');
      };

      const onMouseDown = (e) => {
        isDown = true;
        updateDivider(e.clientX);
      };
      const onMouseMove = (e) => {
        if (!isDown) return;
        updateDivider(e.clientX);
      };
      const onMouseUp = () => {
        isDown = false;
      };
      const onTouchMove = (e) => {
        if (e.touches && e.touches[0]) {
          updateDivider(e.touches[0].clientX);
        }
      };

      box.onmousedown = onMouseDown;
      box.ontouchmove = onTouchMove;
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      box._sectionInteractiveCleanup = () => {
        isDown = false;
        box.onmousedown = null;
        box.ontouchmove = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    });

    // ── Apply Element Offsets across Public Pages & Builder ──
    const secBlocks = root.querySelectorAll('.sec-block[data-section-id]');
    secBlocks.forEach(secEl => {
      const taggedEls = secEl.querySelectorAll('[data-el-key]');
      taggedEls.forEach(el => {
        // Carousel slides are positioned exclusively by the track. Ignore old
        // freeform offsets on both the semantic slide and its internal media.
        if (el.closest('[data-builder-layer="carousel-slide"]')) return;
        const key = el.getAttribute('data-el-key');
        if (key) {
          const ox = getComputedStyle(secEl).getPropertyValue(`--el-${key}-ox`).trim();
          const oy = getComputedStyle(secEl).getPropertyValue(`--el-${key}-oy`).trim();
          if ((ox && ox !== '0px') || (oy && oy !== '0px')) {
            el.style.transform = `translate3d(${ox || '0px'}, ${oy || '0px'}, 0)`;
          }
        }
      });
    });
  };

  // Expose to window
  global.SectionRegistry = SectionRegistry;
  global.renderFormattedText = renderFormattedText;
  global.sanitizeRichText = sanitizeRichText;
  SectionRegistry.renderFormattedText = renderFormattedText;
  SectionRegistry.sanitizeRichText = sanitizeRichText;
  SectionRegistry.getSectionButtons = getSectionButtons;
  SectionRegistry.renderSectionButtonGroup = renderSectionButtonGroup;
  SectionRegistry.renderCustomBtnMarkup = renderCustomBtnMarkup;
  SectionRegistry.renderCustomContainersHtml = renderCustomContainersHtml;
  SectionRegistry.schemaVersion = BUILDER_SCHEMA_VERSION;
  SectionRegistry.migrateSection = migrateSection;
  SectionRegistry.migrateSections = migrateSections;
  SectionRegistry.serializeSections = serializeSections;
  SectionRegistry.getSectionNodes = getSectionNodes;

  function resolveSavedElement(secEl, key) {
    if (!secEl || !key) return null;
    let direct = secEl.querySelector(`[data-el-key="${key}"]`);
    if (direct && direct.closest && direct.closest('[data-carousel-clone]')) {
      direct = Array.from(secEl.querySelectorAll(`[data-el-key="${key}"]`))
        .find(node => !(node.closest && node.closest('[data-carousel-clone]')));
    }
    if (direct) return direct;

    const selectorGroups = {
      heading: '.sec-heading, .sec-heading-custom, .hero-title, h1, h2, h3, h4, h5, h6, .wd-cta-heading, .wd-h1, .wd-gallery-title, .wd-narrative-card-header, .wd-narrative-card-title, .sec-carousel-title, .sec-title, .sec-feature-title',
      eyebrow: '.wd-eyebrow, .project-eyebrow, .wd-sub, .sec-subheading, .hero-eyebrow, .wd-meta-label, .wd-meta-val, .sec-eyebrow, .sec-subtitle',
      text: '.sec-desc, .wd-article-body, blockquote, .sec-quote-box, .hero-desc, .sec-content-col > p, .sec-block p, .wd-cta-sub, .wd-cta-desc, .project-deliverable-desc, .wd-gallery-desc, .wd-deliverable-text, .sec-list-text, .sec-img-caption, .sec-feature-desc, p',
      button: '.custom-btn-wrapper, .custom-btn-group, .btn-primary, .btn-secondary, .custom-sec-btn, .custom-btn-action, .wd-cta-btn, .sec-cta-btn, .custom-btn'
    };

    const firstFor = group => secEl.querySelector(selectorGroups[group]);
    if (key === 'heading') return firstFor('heading');
    if (key === 'eyebrow') return firstFor('eyebrow');
    if (key === 'text' || key === 'description') return firstFor('text');
    if (key === 'button') return firstFor('button');
    if (key === 'image') return secEl.querySelector('.sec-img-col, .sec-img-wrap, .sec-img-holder, img');

    const indexedPatterns = [
      [/^heading-(\d+)$/, 'heading'], [/^card-h-(\d+)$/, 'heading'],
      [/^eyebrow-(\d+)$/, 'eyebrow'], [/^card-ey-(\d+)$/, 'eyebrow'],
      [/^text-(\d+)$/, 'text'], [/^card-desc-(\d+)$/, 'text'],
      [/^button-(\d+)$/, 'button']
    ];
    for (const [pattern, group] of indexedPatterns) {
      const match = key.match(pattern);
      if (!match) continue;
      return secEl.querySelectorAll(selectorGroups[group])[parseInt(match[1], 10)] || null;
    }

    const indexedLayerSelectors = [
      [/^image-(\d+)$/, '.sec-img-col, .sec-img-wrap, .sec-img-holder, .media-container, .portfolio-hero-img, .sec-block-img, .sec-image-frame, .wd-gallery-img-wrap, .sec-ba-image-frame, .video-embed-container'],
      [/^card-img-(\d+)$/, '.sec-img-col, .sec-img-wrap, .sec-img-holder, .media-container, .portfolio-hero-img, .sec-block-img, .sec-image-frame, .wd-gallery-img-wrap, .sec-ba-image-frame, .video-embed-container'],
      [/^card-(\d+)$/, '.wd-narrative-card, .wd-deliverable-item, .cards-grid-item, .sec-col, .sec-feature-card, .client-logo-item, .testimonial-card, .sec-metric-card, .wd-meta-cell, .wd-gallery-card, .sec-cta-card, .sec-grid-item, .sec-list-item, .sec-hover-card, .sec-col-card, .sec-card'],
      [/^metric-(\d+)$/, '.sec-metric-card, .metric-item, .wd-meta-cell'],
      [/^list-item-(\d+)$/, '.sec-list-item'],
      [/^deliv-(\d+)$/, '.wd-deliverable-item'],
      [/^col-card-(\d+)$/, '.sec-col-card'],
      [/^col-(\d+)$/, '.sec-col'],
      [/^logo-(\d+)$/, '.client-logo-item, .sec-logo-item']
    ];
    for (const [pattern, selector] of indexedLayerSelectors) {
      const match = key.match(pattern);
      if (!match) continue;
      const rawIndex = parseInt(match[1], 10);
      const index = key.startsWith('col-') && !key.startsWith('col-card-') ? Math.max(0, rawIndex - 1) : rawIndex;
      return secEl.querySelectorAll(selector)[index] || null;
    }

    const fixedLayerSelectors = {
      'img-col': '.sec-img-col',
      'split-image': '.sec-img-col, [data-el-key="split-image"]',
      'before-after': '.sec-ba-container',
      'cta-card': '.sec-cta-card',
      'quote-box': '.sec-quote-box',
      'custom-html-wrap': '.sec-custom-html-wrap',
      'testimonial': '.testimonial-card',
      'testimonial-avatar': '[data-el-key="testimonial-avatar"]',
      'columns-grid': '.sec-columns-grid'
    };
    if (fixedLayerSelectors[key]) return secEl.querySelector(fixedLayerSelectors[key]);
    return null;
  }

  function applySavedSectionElementStyles(secEl, section, viewport) {
    if (!secEl || !section) return;
    const effectiveSettings = SectionRegistry.resolveSettings(section, viewport);
    const stylesMap = effectiveSettings.elementStyles;
    const offsetsMap = effectiveSettings.elementOffsets;

    if (stylesMap && typeof stylesMap === 'object') {
      Object.entries(stylesMap).forEach(([key, st]) => {
        if (!st || typeof st !== 'object') return;
        const el = resolveSavedElement(secEl, key);
        if (!el) return;

        const setStyleProp = (targetNode, propName, cssProp, value, priority = 'important') => {
          if (!targetNode || !targetNode.style || value === undefined || value === '') return;
          if (typeof targetNode.style.setProperty === 'function') {
            targetNode.style.setProperty(cssProp, value, priority);
          }
          targetNode.style[propName] = value;
        };

        if (st.fontSize) setStyleProp(el, 'fontSize', 'font-size', st.fontSize);
        if (st.color) setStyleProp(el, 'color', 'color', st.color);
        if (st.fontFamily) {
          setStyleProp(el, 'fontFamily', 'font-family', resolveFontFamily(st.fontFamily));
          el.style.fontFamily = st.fontFamily;
        }
        if (st.fontWeight) setStyleProp(el, 'fontWeight', 'font-weight', st.fontWeight);
        if (st.fontStyle) setStyleProp(el, 'fontStyle', 'font-style', st.fontStyle);
        if (st.textDecoration) setStyleProp(el, 'textDecoration', 'text-decoration', st.textDecoration);
        if (st.letterSpacing) setStyleProp(el, 'letterSpacing', 'letter-spacing', st.letterSpacing);
        if (st.lineHeight) setStyleProp(el, 'lineHeight', 'line-height', st.lineHeight);
        if (st.textAlign) setStyleProp(el, 'textAlign', 'text-align', st.textAlign);
        if (st.textTransform) setStyleProp(el, 'textTransform', 'text-transform', st.textTransform);
        if (st.zIndex !== undefined && st.zIndex !== '') setStyleProp(el, 'zIndex', 'z-index', st.zIndex);
        if (st.background) setStyleProp(el, 'background', 'background', st.background);
        if (st.backgroundColor) setStyleProp(el, 'backgroundColor', 'background-color', st.backgroundColor);
        if (st.border) setStyleProp(el, 'border', 'border', st.border);
        if (st.borderRadius) setStyleProp(el, 'borderRadius', 'border-radius', st.borderRadius);
        if (st.boxShadow) setStyleProp(el, 'boxShadow', 'box-shadow', st.boxShadow);
        if (st.opacity !== undefined && st.opacity !== '') setStyleProp(el, 'opacity', 'opacity', st.opacity);
        const isCarouselTrackSlide = !!(el.matches && el.matches('[data-builder-layer="carousel-slide"]'));
        // Carousel slide dimensions belong to the track-level "Slides Visible"
        // setting. Old drafts may contain per-slide resize values; applying
        // those values makes one slide narrower and leaves a blank seam before
        // the next slide. Focal point, rotation and visual styling remain valid.
        if (st.width && !isCarouselTrackSlide) {
          setStyleProp(el, 'width', 'width', st.width);
          setStyleProp(el, 'maxWidth', 'max-width', st.width);
        }
        if (st.height && !isCarouselTrackSlide) {
          setStyleProp(el, 'height', 'height', st.height);
          setStyleProp(el, 'minHeight', 'min-height', st.height);
        }

        // Container layers may own several textual children. Mirror saved
        // typography onto those children because template-level inline styles
        // otherwise override inheritance in Live Preview and New Tab.
        const textSelector = 'h1,h2,h3,h4,h5,h6,p,blockquote,.wd-eyebrow,.project-eyebrow,.sec-eyebrow,.sec-subheading,.sec-title,.sec-subtitle,.sec-desc,.hero-title,.hero-desc,.wd-cta-heading,.wd-cta-desc,.wd-cta-sub,.wd-gallery-title,.wd-gallery-desc,.wd-deliverable-title,.wd-deliverable-text,.wd-narrative-card-title,.sec-carousel-title,.sec-card-title,.sec-feature-title,.sec-feature-desc,.sec-list-text,.sec-img-caption,.wd-meta-label,.wd-meta-val,.custom-sec-btn,.custom-btn-action,.sec-cta-btn,a.btn,button.btn';
        const textTargets = [];
        if (el.matches && el.matches(textSelector)) textTargets.push(el);
        if (el.querySelectorAll) {
          textTargets.push(...Array.from(el.querySelectorAll(textSelector)));
          // Inline formatting created by the selection toolbar must receive
          // element-level typography too; otherwise an inner span can override
          // the builder's saved font size/family in Preview or New Tab.
          textTargets.push(...Array.from(el.querySelectorAll('span,strong,b,em,i,u,s,mark,a')));
        }
        Array.from(new Set(textTargets)).forEach(textEl => {
          if (st.fontFamily) {
            setStyleProp(textEl, 'fontFamily', 'font-family', resolveFontFamily(st.fontFamily));
            textEl.style.fontFamily = st.fontFamily;
          }
          if (st.fontStyle) setStyleProp(textEl, 'fontStyle', 'font-style', st.fontStyle);
          if (st.fontWeight) setStyleProp(textEl, 'fontWeight', 'font-weight', st.fontWeight);
          if (st.fontSize) setStyleProp(textEl, 'fontSize', 'font-size', st.fontSize);
          if (st.color) setStyleProp(textEl, 'color', 'color', st.color);
          if (st.textDecoration) setStyleProp(textEl, 'textDecoration', 'text-decoration', st.textDecoration);
          if (st.letterSpacing) setStyleProp(textEl, 'letterSpacing', 'letter-spacing', st.letterSpacing);
          if (st.lineHeight) setStyleProp(textEl, 'lineHeight', 'line-height', st.lineHeight);
          if (st.textAlign) setStyleProp(textEl, 'textAlign', 'text-align', st.textAlign);
          if (st.textTransform) setStyleProp(textEl, 'textTransform', 'text-transform', st.textTransform);
        });
        if (st.objectFit || st.objectPosition) {
          const innerImg = el.querySelector('img') || (el.tagName === 'IMG' ? el : null);
          if (innerImg) {
            if (st.objectFit) innerImg.style.objectFit = st.objectFit;
            if (st.objectPosition) innerImg.style.objectPosition = st.objectPosition;
          }
        }
        if (st.rotation && parseInt(st.rotation) !== 0) {
          const img = el.querySelector('img') || (el.tagName === 'IMG' ? el : null);
          if (img) img.style.transform = `rotate(${parseInt(st.rotation)}deg)`;
        }
      });
    }

    // Apply section-level typography if defined in settings and not already overridden by elementStyles
    if (effectiveSettings.fontFamily || effectiveSettings.fontStyle || effectiveSettings.fontWeight) {
      const headingEl = resolveSavedElement(secEl, 'heading');
      if (headingEl) {
        const hasElFontFamily = stylesMap && stylesMap.heading && stylesMap.heading.fontFamily;
        const hasElFontStyle = stylesMap && stylesMap.heading && stylesMap.heading.fontStyle;
        const hasElFontWeight = stylesMap && stylesMap.heading && stylesMap.heading.fontWeight;
        if (!hasElFontFamily && effectiveSettings.fontFamily) {
          headingEl.style.setProperty('font-family', resolveFontFamily(effectiveSettings.fontFamily), 'important');
        }
        if (!hasElFontStyle && effectiveSettings.fontStyle) {
          headingEl.style.setProperty('font-style', effectiveSettings.fontStyle, 'important');
        }
        if (!hasElFontWeight && effectiveSettings.fontWeight) {
          headingEl.style.setProperty('font-weight', effectiveSettings.fontWeight, 'important');
        }
        headingEl.querySelectorAll('em, i, strong, b, span').forEach(child => {
          if (!hasElFontFamily && effectiveSettings.fontFamily) child.style.setProperty('font-family', resolveFontFamily(effectiveSettings.fontFamily), 'important');
          if (!hasElFontStyle && effectiveSettings.fontStyle) child.style.setProperty('font-style', effectiveSettings.fontStyle, 'important');
        });
      }
    }

    if (offsetsMap && typeof offsetsMap === 'object') {
      Object.entries(offsetsMap).forEach(([key, pos]) => {
        if (!pos || (pos.x === undefined && pos.y === undefined)) return;
        const ox = parseInt(pos.x || 0);
        const oy = parseInt(pos.y || 0);
        const el = resolveSavedElement(secEl, key);
        if (el && !(el.matches && el.matches('[data-builder-layer="carousel-slide"]'))) {
          el.style.setProperty('transform', `translate3d(${ox}px, ${oy}px, 0)`, 'important');
        }
      });
    }
  }

  SectionRegistry.resolveFontFamily = resolveFontFamily;
  SectionRegistry.resolveSavedElement = resolveSavedElement;
  SectionRegistry.applySavedSectionElementStyles = applySavedSectionElementStyles;

  // Mount builder-authored sections inside the same fixed design coordinate
  // system used by the visual builder. This prevents a wide public viewport
  // from stretching the canvas and changing relationships between manually
  // positioned containers. Tablet/mobile use their own saved overrides.
  SectionRegistry.mountPageSections = function (container, sections, options = {}) {
    if (!container || !Array.isArray(sections)) return function () {};
    sections = migrateSections(sections);

    if (typeof container._sectionRuntimeCleanup === 'function') {
      container._sectionRuntimeCleanup();
    }

    const viewportWidths = { desktop: 1440, tablet: 768, mobile: 390 };
    let activeViewport = '';
    let surface = null;
    let resizeObserver = null;
    let resizeFrame = 0;

    const getViewport = () => {
      const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      if (width <= 600) return 'mobile';
      if (width <= 900) return 'tablet';
      return 'desktop';
    };

    const syncSurfaceGeometry = () => {
      if (!surface || !surface.isConnected) return;
      const logicalWidth = viewportWidths[activeViewport] || viewportWidths.desktop;
      const availableWidth = Math.max(1, container.clientWidth || window.innerWidth || logicalWidth);
      const scale = Math.min(1, availableWidth / logicalWidth);
      surface.style.width = logicalWidth + 'px';
      surface.style.left = '50%';
      surface.style.transform = `translateX(-50%) scale(${scale})`;
      surface.style.transformOrigin = 'top center';
      container.style.height = Math.ceil(surface.scrollHeight * scale) + 'px';
      container.style.setProperty('--section-runtime-scale', String(scale));
    };

    const scheduleGeometrySync = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(syncSurfaceGeometry);
    };

    const render = () => {
      activeViewport = getViewport();
      const visibleSections = options.includeHidden === true
        ? sections
        : sections.filter(section => section && section.visible !== false);
      const html = visibleSections.map((section, index) =>
        SectionRegistry.renderSection(section, {
          isPublic: true,
          index,
          viewport: activeViewport
        })
      ).join('');

      container.classList.add('sec-page-runtime');
      container.dataset.viewport = activeViewport;
      container.style.display = 'block';
      SectionRegistry.destroyInteractive(container);
      container.innerHTML = `<div class="sec-page-surface" data-runtime-viewport="${activeViewport}">${html}</div>`;
      surface = container.querySelector('.sec-page-surface');

      if (surface) {
        visibleSections.forEach(section => {
          if (!section || !section.id) return;
          const secEl = surface.querySelector(`[data-section-id="${section.id}"]`);
          if (secEl) {
            applySavedSectionElementStyles(secEl, section, activeViewport);
          }
        });
      }

      if (typeof SectionRegistry.initInteractive === 'function') {
        SectionRegistry.initInteractive(surface || container);
      }

      if (resizeObserver) resizeObserver.disconnect();
      if (window.ResizeObserver && surface) {
        resizeObserver = new ResizeObserver(scheduleGeometrySync);
        resizeObserver.observe(surface);
        resizeObserver.observe(container);
      }

      if (surface) {
        surface.querySelectorAll('img').forEach(img => {
          if (!img.complete) img.addEventListener('load', scheduleGeometrySync, { once: true });
        });
      }
      scheduleGeometrySync();
    };

    const handleResize = () => {
      const nextViewport = getViewport();
      if (nextViewport !== activeViewport) render();
      else scheduleGeometrySync();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    render();

    const cleanup = () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(resizeFrame);
      if (resizeObserver) resizeObserver.disconnect();
      SectionRegistry.destroyInteractive(container);
    };
    container._sectionRuntimeCleanup = cleanup;
    return cleanup;
  };

})(typeof window !== 'undefined' ? window : this);
