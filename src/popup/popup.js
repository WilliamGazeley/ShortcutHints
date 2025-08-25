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
            } else {
              resolve(items || {});
            }
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



  function getAllSiteModules() {
    return (window.SiteModules) || {};
  }

  function getHostname(url) {
    try {
      return new URL(url).hostname || "";
    } catch (e) {
      return "";
    }
  }

  function getSiteModule(hostname) {
    if (!window.SiteModules) return null;
    return window.SiteModules[hostname] || null;
  }

  async function getCurrentTab() {
    try {
      const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      return tab;
    } catch (e) {
      console.error('Error getting current tab:', e);
      return null;
    }
  }

  function createHintToggle(hint, enabled, hostname, onToggle) {
    const hintItem = document.createElement('div');
    hintItem.className = 'hint-item';

    const hintInfo = document.createElement('div');
    hintInfo.className = 'hint-info';

    const label = document.createElement('div');
    label.className = 'hint-label';
    label.textContent = hint.label;

    const shortcut = document.createElement('div');
    shortcut.className = 'hint-shortcut';
    shortcut.textContent = hint.shortcut;

    hintInfo.appendChild(label);
    hintInfo.appendChild(shortcut);

    const toggleContainer = document.createElement('label');
    toggleContainer.className = 'toggle-switch';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = enabled;
    checkbox.addEventListener('change', () => onToggle(hint.id, checkbox.checked));

    const slider = document.createElement('span');
    slider.className = 'slider';

    toggleContainer.appendChild(checkbox);
    toggleContainer.appendChild(slider);

    hintItem.appendChild(hintInfo);
    hintItem.appendChild(toggleContainer);

    return hintItem;
  }

  async function loadHintsForCurrentPage() {
    const tab = await getCurrentTab();
    if (!tab) return;

    const hostname = getHostname(tab.url);
    if (!hostname) return;

    const siteModule = getSiteModule(hostname);
    if (!siteModule) {
      // No hints available for this site
      document.getElementById('no-hints').style.display = 'block';
      document.getElementById('hints-section').style.display = 'block';
      return;
    }

    // Get site settings
    const settings = await storage.get(['siteHints']);
    const siteHints = (settings.siteHints && settings.siteHints[hostname]) || {};

    // Get available hints
    const hints = siteModule.listHints();

    // Update site name
    const siteNameEl = document.getElementById('site-name');
    siteNameEl.textContent = hostname.replace('www.', '').replace('.com', '');

    // Create hint toggles
    const hintsContainer = document.getElementById('hints-container');
    hintsContainer.innerHTML = '';

    hints.forEach(hint => {
      const enabled = (typeof siteHints[hint.id] === 'boolean') ? siteHints[hint.id] : !!hint.defaultEnabled;
      const hintToggle = createHintToggle(hint, enabled, hostname, async (hintId, checked) => {
        // Update storage
        const currentSettings = await storage.get(['siteHints']);
        const currentSiteHints = currentSettings.siteHints || {};
        currentSiteHints[hostname] = currentSiteHints[hostname] || {};
        currentSiteHints[hostname][hintId] = checked;

        await storage.set({ siteHints: currentSiteHints });

        // Send message to content script to update hints
        try {
          await api.tabs.sendMessage(tab.id, {
            action: 'updateHint',
            hintId: hintId,
            enabled: checked,
            hostname: hostname
          });
        } catch (e) {
          console.error('Error sending message to content script:', e);
        }
      });

      hintsContainer.appendChild(hintToggle);
    });

    document.getElementById('hints-section').style.display = 'block';
  }

  function openOptions() {
    api.runtime.openOptionsPage();
    window.close();
  }

  // Event listeners
  document.addEventListener('DOMContentLoaded', () => {
    loadHintsForCurrentPage();

    // Open options button
    document.getElementById('openOptions').addEventListener('click', (e) => {
      e.preventDefault();
      openOptions();
    });
  });
})();
