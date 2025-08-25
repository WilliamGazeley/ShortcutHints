(function () {
  const api = typeof browser !== 'undefined' ? browser : chrome;
  const $ = (id) => document.getElementById(id);

  const storage = {
    get(keys) {
      return new Promise((resolve) => {
        try { api.storage.local.get(keys, (items) => resolve(items || {})); } catch (e) { resolve({}); }
      });
    },
    set(items) {
      return new Promise((resolve) => {
        try { api.storage.local.set(items, () => resolve()); } catch (e) { resolve(); }
      });
    }
  };

  function getAllSiteModules() {
    return (window.SiteModules) || {};
  }

  function renderSitesUI(siteHints) {
    const container = $('sites');
    if (!container) return;
    container.innerHTML = '';

    const modules = getAllSiteModules();
    const hosts = Object.keys(modules).sort();

    hosts.forEach(function (host) {
      const siteSection = document.createElement('div');
      siteSection.className = 'site-section';

      const title = document.createElement('h3');
      title.className = 'site-title';
      title.textContent = host.replace('.com', '').replace('www.', '');
      siteSection.appendChild(title);

      const table = document.createElement('table');
      table.className = 'shortcuts-table';

      // Create table header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      const headers = ['Enable', 'Action', 'Shortcut'];

      headers.forEach(function (headerText) {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Create table body
      const tbody = document.createElement('tbody');
      const list = modules[host].listHints();

      list.forEach(function (hint) {
        const row = document.createElement('tr');

        // Checkbox cell
        const checkboxCell = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'checkbox';
        const enabled = siteHints[host] && typeof siteHints[host][hint.id] === 'boolean' ? siteHints[host][hint.id] : !!hint.defaultEnabled;
        input.checked = enabled;
        input.addEventListener('change', async function () {
          const current = (await storage.get(['siteHints'])).siteHints || {};
          current[host] = current[host] || {};
          current[host][hint.id] = !!input.checked;
          await storage.set({ siteHints: current });
          const status = $('status');
          if (status) {
            status.textContent = 'Settings saved';
            status.style.display = 'block';
            setTimeout(() => {
              status.textContent = '';
              status.style.display = 'none';
            }, 1200);
          }
        });
        checkboxCell.appendChild(input);
        row.appendChild(checkboxCell);

        // Action cell
        const actionCell = document.createElement('td');
        actionCell.textContent = hint.label;
        row.appendChild(actionCell);

        // Shortcut cell
        const shortcutCell = document.createElement('td');
        const shortcutSpan = document.createElement('span');
        shortcutSpan.className = 'shortcut-key';
        shortcutSpan.textContent = hint.shortcut;
        shortcutCell.appendChild(shortcutSpan);
        row.appendChild(shortcutCell);

        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      siteSection.appendChild(table);
      container.appendChild(siteSection);
    });
  }

  async function load() {
    const settings = await storage.get(['siteHints']);
    const siteHints = settings.siteHints || {};

    renderSitesUI(siteHints);
  }

  document.addEventListener('DOMContentLoaded', load);
})();


