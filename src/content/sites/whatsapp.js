(function () {
  // WhatsApp site module: manual, polished placement (no dynamic positioning math)
  const HOST = 'web.whatsapp.com';

  // Minimal, readable registry (no selectors or types here)
  const HINTS = [
    { id: 'search-conversations', label: 'Search conversations', shortcut: 'Ctrl + Alt + /', defaultEnabled: true },
    { id: 'search-current-chat', label: 'Search in current chat', shortcut: 'Ctrl + Shift + F', defaultEnabled: true }
  ];

  const STYLE_ID = 'shh-wa-styles';

  function ensureStyles() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = `
      /* Header search hint as overlay (no layout shift) */
      .shh-wa-inline-hint {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.70);
        color: #fff;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        line-height: 1.3;
        font-weight: 600;
        white-space: nowrap;
        pointer-events: none;
        z-index: 2147483000;
      }
      .shh-wa-inline-hint--above { bottom: calc(100% + 4px); top: auto; }
      .shh-wa-inline-hint--below { top: calc(100% + 4px); bottom: auto; }

      /* Sidebar search placeholder rendered as a pseudo element */
      .shh-wa-label { position: relative !important; }
      .shh-wa-label::after {
        content: attr(data-shh-hint);
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0, 0, 0, 0.65);
        color: #fff;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        line-height: 1.4;
        font-weight: 600;
        white-space: nowrap;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  function findButtonContainer(buttonEl) {
    // Prefer the immediate wrapper that only contains the button (common on WA)
    if (!buttonEl) return null;
    const p = buttonEl.parentElement;
    return p || buttonEl;
  }

  function upsertHeaderSearchBadge(enabled) {
    try {
      // Find the header search button via its icon span
      const icon = document.querySelector('span[data-icon="search-refreshed"]');
      let btn = icon ? icon.closest('button') : null;
      if (!btn) {
        // Fallback by aria/ title (WhatsApp variants)
        btn = document.querySelector('header button[aria-label^="Search"], header button[title^="Search"], button[aria-label^="Search"], button[title^="Search"]');
      }
      const wrapper = findButtonContainer(btn);
      if (!wrapper) return;

      const attr = 'data-shh-id';
      const idSelector = '[' + attr + '="search-current-chat"]';
      const anyHintSelector = '.shh-wa-inline-hint' + idSelector + ', .shh-wa-hint' + idSelector;

      // Disable path: remove all instances globally
      if (!enabled) {
        try { document.querySelectorAll(anyHintSelector).forEach(function (n) { try { n.remove(); } catch (e) { } }); } catch (e) { }
        return;
      }

      ensureStyles();
      // Anchor absolutely within the wrapper without affecting layout
      const cs = window.getComputedStyle(wrapper);
      if (cs && cs.position === 'static') {
        wrapper.style.position = 'relative';
      }
      // Ensure overlay can render outside button bounds
      if (cs && cs.overflow !== 'visible') {
        wrapper.style.overflow = 'visible';
      }

      // Remove duplicates not inside the target wrapper (from prior renders)
      try {
        document.querySelectorAll(anyHintSelector).forEach(function (n) {
          if (!wrapper.contains(n)) { try { n.remove(); } catch (e) { } }
        });
      } catch (e) { }

      // Ensure only one in the wrapper
      const existingInWrapper = wrapper.querySelectorAll(anyHintSelector);
      let node = existingInWrapper[0] || null;
      if (existingInWrapper.length > 1) {
        for (let i = 1; i < existingInWrapper.length; i++) { try { existingInWrapper[i].remove(); } catch (e) { } }
      }

      if (!node) {
        node = document.createElement('div');
        node.className = 'shh-wa-inline-hint';
        node.setAttribute(attr, 'search-current-chat');
        node.textContent = 'Ctrl + Shift + F';
        wrapper.appendChild(node);
      } else {
        // Normalize class if it was an old variant
        if (!node.classList.contains('shh-wa-inline-hint')) {
          node.className = 'shh-wa-inline-hint';
        }
        node.textContent = 'Ctrl + Shift + F';
      }

      // Always place above, but if it clips at the viewport top, shift it down slightly
      node.classList.remove('shh-wa-inline-hint--below');
      node.classList.add('shh-wa-inline-hint--above');
      node.style.bottom = '';
      // Measure and adjust to avoid clipping
      const adjust = function () {
        try {
          const r = node.getBoundingClientRect();
          const MIN_TOP = 2; // leave a small margin from the top edge
          if (r.top < MIN_TOP) {
            const delta = Math.ceil(MIN_TOP - r.top);
            node.style.bottom = 'calc(100% + 4px - ' + delta + 'px)';
          }
        } catch (e) { }
      };
      adjust();
      // Double-check after layout settles
      requestAnimationFrame(adjust);
    } catch (e) { }
  }

  function setSidebarSearchPlaceholder(enabled) {
    try {
      // Clear any previous hint classes/attributes to avoid duplicates
      document.querySelectorAll('.shh-wa-label').forEach(function (n) {
        n.classList.remove('shh-wa-label');
        n.removeAttribute('data-shh-hint');
      });

      if (!enabled) return;

      // Locate candidate labels by exact text and pick the first visible one
      const candidates = Array.from(document.querySelectorAll('div')).filter(function (el) {
        return (el.textContent || '').trim() === 'Search or start a new chat';
      });
      const target = candidates.find(function (el) {
        const r = el.getBoundingClientRect();
        const visible = r && r.width > 0 && r.height > 0;
        const style = window.getComputedStyle(el);
        return visible && style && style.visibility !== 'hidden' && style.display !== 'none';
      }) || candidates[0];

      if (target) {
        ensureStyles();
        target.classList.add('shh-wa-label');
        target.setAttribute('data-shh-hint', 'Ctrl + Alt + /');
      }
    } catch (e) { }
  }

  function apply(hintId, enabled) {
    if (hintId === 'search-conversations') { setSidebarSearchPlaceholder(enabled); return; }
    if (hintId === 'search-current-chat') { upsertHeaderSearchBadge(enabled); return; }
  }

  function removeAll() {
    // Remove badges
    try {
      document.querySelectorAll('.shh-wa-inline-hint').forEach(function (n) { try { n.remove(); } catch (e) { } });
      // No layout class used anymore; nothing else to clean here
    } catch (e) { }
    // Revert placeholders
    setSidebarSearchPlaceholder(false);
  }

  function listHints() {
    return HINTS.map(function (h) { return { id: h.id, label: h.label, shortcut: h.shortcut, defaultEnabled: !!h.defaultEnabled }; });
  }

  window.SiteModules = window.SiteModules || {};
  window.SiteModules[HOST] = { host: HOST, listHints: listHints, apply: apply, removeAll: removeAll };
})();


