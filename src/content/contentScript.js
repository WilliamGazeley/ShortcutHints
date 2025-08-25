(function () {
  const api = typeof browser !== 'undefined' ? browser : chrome;

  const storage = {
    async get(keys) {
      return new Promise((resolve) => {
        try {
          api.storage.local.get(keys, (items) => {
            if (api.runtime.lastError) {
              resolve({});
              return;
            }
            resolve(items || {});
          });
        } catch (e) {
          resolve({});
        }
      });
    },
    async set(items) {
      return new Promise((resolve) => {
        try { api.storage.local.set(items, () => resolve()); } catch (e) { resolve(); }
      });
    }
  };

  function getHostname(doc) {
    try { return (doc || document).location.hostname || ""; } catch (e) { return ""; }
  }

  function getSiteModule(hostname) {
    if (!window.SiteModules) return null;
    return window.SiteModules[hostname] || null;
  }

  async function applySiteHints() {
    const hostname = getHostname(document);
    const site = getSiteModule(hostname);
    if (!site) return;

    const settings = await storage.get(["siteHints"]);
    const siteHints = (settings.siteHints && settings.siteHints[hostname]) || {};

    // If no stored preference, use defaults from site module
    const list = site.listHints();
    list.forEach(function (h) {
      const enabled = (typeof siteHints[h.id] === 'boolean') ? siteHints[h.id] : !!h.defaultEnabled;
      site.apply(h.id, enabled);
    });
  }

  // Lightweight throttle for re-applying
  let applyScheduled = false;
  let lastApplyAt = 0;
  const APPLY_MIN_INTERVAL_MS = 300;
  function scheduleApply() {
    if (applyScheduled) return;
    applyScheduled = true;
    const now = Date.now();
    const delay = Math.max(0, APPLY_MIN_INTERVAL_MS - (now - lastApplyAt));
    setTimeout(() => {
      applyScheduled = false;
      lastApplyAt = Date.now();
      applySiteHints();
    }, delay);
  }

  function observeDomChanges() {
    if (observeDomChanges._bound) return;
    observeDomChanges._bound = true;
    const target = document.documentElement || document;

    const RELEVANT = 'span[data-icon="search-refreshed"], header, div[contenteditable="true"][aria-label*="Search"], div[role="textbox"][contenteditable="true"]';
    function nodeOrDescendantMatches(node) {
      if (!node || node.nodeType !== 1) return false;
      try {
        if (node.matches(RELEVANT)) return true;
        const el = /** @type {Element} */ (node);
        return !!el.querySelector(RELEVANT);
      } catch (e) { return false; }
    }

    const observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type === 'childList') {
          if ((m.addedNodes && m.addedNodes.length > 0 && Array.from(m.addedNodes).some(nodeOrDescendantMatches)) || nodeOrDescendantMatches(m.target)) {
            scheduleApply();
            break;
          }
        }
      }
    });
    observer.observe(target, { childList: true, subtree: true });

    // Re-apply on visibility restored (tabs switching)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleApply(); });
    // Re-apply on URL/navigation changes typical for SPAs
    window.addEventListener('popstate', scheduleApply);
    window.addEventListener('hashchange', scheduleApply);
  }

  function listenForStorageChanges() {
    if (listenForStorageChanges._bound) return;
    listenForStorageChanges._bound = true;
    api.storage.onChanged.addListener(function (changes, area) {
      if (area !== 'local') return;
      if (changes.siteHints) {
        // Re-apply when site hint toggles change
        scheduleApply();
      }
    });
  }

  function listenForPopupMessages() {
    if (listenForPopupMessages._bound) return;
    listenForPopupMessages._bound = true;

    api.runtime.onMessage.addListener(function (message, sender, sendResponse) {
      if (message.action === 'updateHint') {
        const hostname = getHostname(document);
        if (hostname !== message.hostname) return;

        const site = getSiteModule(hostname);
        if (!site) return;

        // Update the specific hint
        site.apply(message.hintId, message.enabled);

        sendResponse({ success: true });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      applySiteHints();
      listenForStorageChanges();
      listenForPopupMessages();
      observeDomChanges();
      // Bootstrap a few lightweight retries to catch late-rendered UI
      setTimeout(scheduleApply, 250);
      setTimeout(scheduleApply, 750);
      setTimeout(scheduleApply, 1500);
    });
  } else {
    applySiteHints();
    listenForStorageChanges();
    listenForPopupMessages();
    observeDomChanges();
    setTimeout(scheduleApply, 250);
    setTimeout(scheduleApply, 750);
    setTimeout(scheduleApply, 1500);
  }
})();
