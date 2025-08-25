(function () {
  // Use browser API for Firefox compatibility
  const api = typeof browser !== 'undefined' ? browser : chrome;

  const storage = {
    get(keys) {
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
    set(items) {
      return new Promise((resolve) => {
        try {
          api.storage.local.set(items, () => resolve());
        } catch (e) {
          resolve();
        }
      });
    }
  };

  const DEFAULTS = {
    userMappings: {}
  };

  async function loadDefaultMappings() {
    // Default mappings are now handled by per-site modules
    return {};
  }

  function mergeDefaultsAndUser(defaults, user) {
    const out = {};
    const hosts = new Set([].concat(Object.keys(defaults || {}), Object.keys(user || {})));
    hosts.forEach((host) => {
      out[host] = Object.assign({}, defaults && defaults[host]);
      const userSelectors = user && user[host] ? user[host] : {};
      Object.keys(userSelectors).forEach((sel) => {
        const val = userSelectors[sel];
        if (typeof val === 'string') {
          out[host] = out[host] || {};
          out[host][sel] = { shortcut: val, disabled: false };
        } else if (val && typeof val === 'object') {
          out[host] = out[host] || {};
          out[host][sel] = { shortcut: val.shortcut, disabled: !!val.disabled };
        }
      });
    });
    return out;
  }

  api.runtime.onInstalled.addListener(async () => {
    try {
      const existing = await storage.get(["mappings", "userMappings"]);
      const toSet = {};
      if (typeof existing.mappings === "undefined") {
        const defaults = await loadDefaultMappings();
        // Migrate from legacy userMappings if present
        if (existing && existing.userMappings) {
          toSet.mappings = mergeDefaultsAndUser(defaults, existing.userMappings);
        } else {
          toSet.mappings = defaults;
        }
      }
      if (Object.keys(toSet).length > 0) await storage.set(toSet);
    } catch (e) {
      // no-op
    }
  });
})();
