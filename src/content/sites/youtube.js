(function () {
  // YouTube site module: declares available hints and applies/removes them.
  const HOST = 'www.youtube.com';

  // Human-readable, at-a-glance registry of supported hints for this site.
  // Each entry includes: id, label, selector, position, defaultEnabled, and shortcut string.
  const HINTS = [
    {
      id: 'search-input',
      label: 'Focus search',
      selector: 'input.ytSearchboxComponentInput.yt-searchbox-input[name="search_query"]',
      position: 'pseudo-element',
      shortcut: '/',
      defaultEnabled: true
    }
  ];

  const STYLE_ID = 'shh-yt-styles';

  function ensureStyles() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        .shh-yt-search-hint { }
        .shh-yt-search-hint::after {
          content: attr(data-shh-hint);
          position: fixed;
          left: var(--shh-left, 0px);
          top: var(--shh-top, 0px);
          transform: translate(-100%, -50%);
          background: rgba(0, 0, 0, 0.8);
          color: #cccccc;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 12px;
          line-height: 1.4;
          font-weight: 600;
          white-space: nowrap;
          pointer-events: none;
          z-index: 1000;
          opacity: 1;
          visibility: visible;
          display: block;
          transition: opacity 0.12s ease;
        }
        /* Hide hint when the input reports focused state */
        .shh-yt-search-hint[data-shh-focused="1"]::after {
          opacity: 0 !important;
          visibility: hidden !important;
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  function findSearchInput() {
    // Try common selectors in document
    const docTry = [
      'ytd-searchbox input#search',
      'ytd-searchbox input[name="search_query"]',
      'ytd-searchbox input[aria-label="Search"]',
      'input#search',
      'input[name="search_query"]',
      'input[aria-label="Search"]',
      'input[type="text"][role="combobox"]'
    ];
    for (let i = 0; i < docTry.length; i++) {
      const el = document.querySelector(docTry[i]);
      if (el) return el;
    }
    // Try inside ytd-searchbox shadow root if present
    const host = document.querySelector('ytd-searchbox');
    if (host && host.shadowRoot) {
      const shadowTry = [
        'input#search',
        'input[name="search_query"]',
        'input[aria-label="Search"]',
        'input[type="text"][role="combobox"]'
      ];
      for (let i = 0; i < shadowTry.length; i++) {
        const el = host.shadowRoot.querySelector(shadowTry[i]);
        if (el) return el;
      }
    }
    return null;
  }

  function setSearchHint(enabled) {
    try {
      // Clear any previous hints
      document.querySelectorAll('.shh-yt-search-hint').forEach(function (el) {
        el.classList.remove('shh-yt-search-hint');
        el.removeAttribute('data-shh-hint');
        el.removeAttribute('data-shh-focused');
        if (el._shhPosHandler) {
          try {
            window.removeEventListener('scroll', el._shhPosHandler, true);
            window.removeEventListener('resize', el._shhPosHandler, true);
          } catch (e) {}
          delete el._shhPosHandler;
        }
      });
      // Clean old listeners on known inputs
      const old = document.querySelector('input#search, input[name="search_query"], input[aria-label="Search"], input[type="text"][role="combobox"]');
      if (old) {
        if (old._shhOnFocus) { try { old.removeEventListener('focus', old._shhOnFocus); } catch (e) {} delete old._shhOnFocus; }
        if (old._shhOnBlur) { try { old.removeEventListener('blur', old._shhOnBlur); } catch (e) {} delete old._shhOnBlur; }
      }

      if (!enabled) return;

      // Find the YouTube search input via robust selectors (including shadow)
      const searchInput = findSearchInput();
      if (!searchInput) return;

      // Prefer the ytd-searchbox host element as stable container
      let container = searchInput.closest('ytd-searchbox');
      if (!container) {
        const host = document.querySelector('ytd-searchbox');
        container = host || (searchInput.parentElement || searchInput);
      }
      if (!container) return;

      ensureStyles();
      container.classList.add('shh-yt-search-hint');
      container.setAttribute('data-shh-hint', '/');
      container.removeAttribute('data-shh-focused');

      // Attach explicit focus/blur listeners so hint returns on blur regardless of where focus moved
      const onFocus = function () {
        try { container.setAttribute('data-shh-focused', '1'); } catch (e) {}
      };
      const onBlur = function () {
        // Delay to allow focus transitions; then clear focused state if input no longer focused
        setTimeout(function () {
          try {
            if (document.activeElement !== searchInput) {
              container.removeAttribute('data-shh-focused');
            }
          } catch (e) {}
        }, 50);
      };
      try {
        searchInput.addEventListener('focus', onFocus);
        searchInput.addEventListener('blur', onBlur);
        searchInput._shhOnFocus = onFocus;
        searchInput._shhOnBlur = onBlur;
      } catch (e) {}

      // Position the fixed pseudo-element at the right edge of the search box
      const updatePos = function () {
        try {
          const r = container.getBoundingClientRect();
          const left = r.right - 12; // 12px padding from right edge
          const top = r.top + (r.height / 2);
          container.style.setProperty('--shh-left', left + 'px');
          container.style.setProperty('--shh-top', top + 'px');
        } catch (e) {}
      };
      updatePos();
      const handler = function () { updatePos(); };
      try {
        window.addEventListener('scroll', handler, true);
        window.addEventListener('resize', handler, true);
        container._shhPosHandler = handler;
      } catch (e) {}

    } catch (e) {
      console.error('Error setting YouTube search hint:', e);
    }
  }

  function apply(hintId, enabled) {
    const hint = HINTS.find(h => h.id === hintId);
    if (!hint) return;

    if (hintId === 'search-input') {
      setSearchHint(enabled);
      return;
    }

    // Fallback for other hint types
    if (window.HintRenderer && typeof window.HintRenderer.renderForSelector === 'function') {
      window.HintRenderer.renderForSelector(hint.selector, hint.shortcut, hint.position);
    }
  }

  function removeAll() {
    if (window.HintRenderer && typeof window.HintRenderer.removeAll === 'function') {
      window.HintRenderer.removeAll();
    }

    // Remove pseudo-element hints and listeners
    try {
      document.querySelectorAll('.shh-yt-search-hint').forEach(function (el) {
        el.classList.remove('shh-yt-search-hint');
        el.removeAttribute('data-shh-hint');
        el.removeAttribute('data-shh-focused');
        if (el._shhPosHandler) {
          try {
            window.removeEventListener('scroll', el._shhPosHandler, true);
            window.removeEventListener('resize', el._shhPosHandler, true);
          } catch (e) {}
          delete el._shhPosHandler;
        }
      });
      const searchInput = findSearchInput();
      if (searchInput) {
        if (searchInput._shhOnFocus) { try { searchInput.removeEventListener('focus', searchInput._shhOnFocus); } catch (e) {} delete searchInput._shhOnFocus; }
        if (searchInput._shhOnBlur) { try { searchInput.removeEventListener('blur', searchInput._shhOnBlur); } catch (e) {} delete searchInput._shhOnBlur; }
      }
    } catch (e) {}
  }

  function listHints() {
    return HINTS.map(function (h) {
      return {
        id: h.id,
        label: h.label,
        selector: h.selector,
        position: h.position,
        shortcut: h.shortcut,
        defaultEnabled: !!h.defaultEnabled
      };
    });
  }

  window.SiteModules = window.SiteModules || {};
  window.SiteModules[HOST] = {
    host: HOST,
    listHints: listHints,
    apply: apply,
    removeAll: removeAll
  };
})();
