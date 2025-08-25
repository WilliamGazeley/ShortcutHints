(function () {
  const STYLE_ID = 'shortcut-hints-overlays-styles';
  const OVERLAY_CLASS = 'shortcut-hint-overlay';

  const activeOverlays = new Map(); // HTMLElement -> { overlay, text, position }
  let repositionScheduled = false;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${OVERLAY_CLASS} {
        position: absolute;
        pointer-events: none;
        font-family: inherit;
        font-size: 11px;
        line-height: 1.4;
        font-weight: 500;
        padding: 3px 8px;
        border-radius: 6px;
        white-space: nowrap;
        z-index: 2147483646;
        transform: translateX(-50%);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        backdrop-filter: blur(8px);
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(0, 0, 0, 0.1);
        color: #333;
        font-size: 12px;
        font-weight: 600;
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
      }
    `;
    document.head.appendChild(style);
  }

  function getEffectiveBackgroundColor(el) {
    let node = el;
    for (var i = 0; i < 6 && node; i++) {
      try {
        const cs = window.getComputedStyle(node);
        const bg = cs && cs.backgroundColor ? cs.backgroundColor : '';
        if (bg && bg !== 'transparent' && !/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(bg)) {
          return bg;
        }
      } catch (e) { }
      node = node.parentElement;
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'rgb(24,24,24)' : 'rgb(255,255,255)';
  }

  function parseRgb(color) {
    if (!color) return { r: 255, g: 255, b: 255, a: 1 };
    const hex = color.trim().toLowerCase();
    if (hex[0] === '#') {
      if (hex.length === 4) {
        const r = parseInt(hex[1] + hex[1], 16);
        const g = parseInt(hex[2] + hex[2], 16);
        const b = parseInt(hex[3] + hex[3], 16);
        return { r: r, g: g, b: b, a: 1 };
      } else if (hex.length === 7) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r: r, g: g, b: b, a: 1 };
      }
    }
    const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d\.]+))?\s*\)/i);
    if (m) {
      return { r: parseInt(m[1], 10), g: parseInt(m[2], 10), b: parseInt(m[3], 10), a: m[4] ? parseFloat(m[4]) : 1 };
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  function computeLuminance(rgb) {
    function srgbToLinear(x) {
      x = x / 255;
      return x <= 0.03928 ? (x / 12.92) : Math.pow((x + 0.055) / 1.055, 2.4);
    }
    const r = srgbToLinear(rgb.r);
    const g = srgbToLinear(rgb.g);
    const b = srgbToLinear(rgb.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function applyContextAwareStyle(overlay, target) {
    const bg = getEffectiveBackgroundColor(target);
    const rgb = parseRgb(bg);
    const lum = computeLuminance(rgb);
    if (lum >= 0.5) {
      overlay.style.background = 'rgba(0, 0, 0, 0.65)';
      overlay.style.color = '#fff';
      overlay.style.border = '1px solid rgba(255,255,255,0.15)';
      overlay.style.boxShadow = '0 1px 2px rgba(0,0,0,0.25)';
    } else {
      overlay.style.background = 'rgba(255, 255, 255, 0.18)';
      overlay.style.color = '#fff';
      overlay.style.border = '1px solid rgba(255,255,255,0.22)';
      overlay.style.boxShadow = '0 1px 2px rgba(0,0,0,0.45)';
    }
  }

  function positionOverlay(overlay, target, position) {
    if (!target.isConnected) {
      try { overlay.remove(); } catch (e) { }
      return;
    }
    const rect = target.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft || 0;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;

    let top = scrollY + rect.bottom + 4;
    let left = scrollX + rect.left + (rect.width / 2);

    if (position === 'below-left') {
      left = scrollX + rect.left + 8;
      overlay.style.transform = 'none';
    } else if (position === 'below-right') {
      left = scrollX + rect.right - 8;
      overlay.style.transform = 'translateX(-100%)';
    } else {
      overlay.style.transform = 'translateX(-50%)';
    }

    overlay.style.top = top + 'px';
    overlay.style.left = left + 'px';
    overlay.style.visibility = 'visible';
  }

  function scheduleReposition() {
    if (repositionScheduled) return;
    repositionScheduled = true;
    window.requestAnimationFrame(function () {
      repositionScheduled = false;
      activeOverlays.forEach(function (entry, el) {
        if (!el || !el.isConnected) {
          try { entry.overlay.remove(); } catch (e) { }
          activeOverlays.delete(el);
          return;
        }
        applyContextAwareStyle(entry.overlay, el);
        positionOverlay(entry.overlay, el, entry.position);
      });
    });
  }

  function bindGlobalHandlers() {
    if (bindGlobalHandlers._bound) return;
    bindGlobalHandlers._bound = true;
    window.addEventListener('scroll', scheduleReposition, { passive: true, capture: true });
    window.addEventListener('resize', scheduleReposition, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) scheduleReposition();
    });
  }

  function renderForElement(el, text, position) {
    if (!el || !(el instanceof HTMLElement)) return null;
    ensureStyles();
    bindGlobalHandlers();

    let entry = activeOverlays.get(el);
    if (!entry) {
      const overlay = document.createElement('div');
      overlay.className = OVERLAY_CLASS;
      overlay.textContent = text;
      overlay.style.visibility = 'hidden';
      document.body.appendChild(overlay);
      entry = { overlay: overlay, text: text, position: position || 'below-center' };
      activeOverlays.set(el, entry);
    } else {
      entry.text = text;
      entry.position = position || entry.position || 'below-center';
      entry.overlay.textContent = text;
    }
    applyContextAwareStyle(entry.overlay, el);
    positionOverlay(entry.overlay, el, entry.position);
    scheduleReposition();
    return entry.overlay;
  }

  function renderForSelector(selector, text, position, root) {
    try {
      const nodes = (root || document).querySelectorAll(selector);
      nodes.forEach(function (node) { renderForElement(node, text, position); });
    } catch (e) { }
  }

  function removeAll() {
    activeOverlays.forEach(function (entry) {
      try { entry.overlay.remove(); } catch (e) { }
    });
    activeOverlays.clear();
  }

  window.HintRenderer = {
    renderForElement: renderForElement,
    renderForSelector: renderForSelector,
    removeAll: removeAll,
    scheduleReposition: scheduleReposition
  };
})();


