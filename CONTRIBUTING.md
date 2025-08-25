# Contributing to Shortcut Hints

Thanks for helping improve Shortcut Hints! This guide keeps contributions simple and consistent.

## Quick rules
- Keep changes minimal and focused.
- Optimize for reliability and performance - shortcuts are supposed to make us faster.
- Match existing code style (vanilla JS, small modules, no build system).
- Test on Chrome (or Edge) and Firefox.

## Project structure
- `src/content/sites/` — per‑site modules (one file per site)
- `src/content/contentScript.js` — applies site modules and re‑applies on changes
- `src/content/hintRenderer.js` — small helper for overlay badges
- `src/options/` — settings UI (per‑site toggles)

## Add or update a site
Checklist:
1. Create/modify file in `src/content/sites/<site>.js`
   - Export via the global registry:
     ```js
     window.SiteModules["example.com"] = { listHints, apply, removeAll };
     ```
2. List hints (minimal, human‑readable):
   ```js
   const HINTS = [
     { id: 'action-id', label: 'Action name', shortcut: 'Ctrl + K', defaultEnabled: true }
   ];
   function listHints() { return HINTS.map(h => ({ id: h.id, label: h.label, shortcut: h.shortcut, defaultEnabled: !!h.defaultEnabled })); }
   ```
3. Render hints in `apply(id, enabled)`
   - For inputs/labels: prefer pseudo‑element approach (class + `::after`)
   - For buttons: insert one overlay badge anchored to a stable wrapper; avoid layout shifts
   - Ensure idempotency: re‑running should not produce duplicates
   - Provide a disable path that fully removes the hint
4. Implement `removeAll()` to clean up badges/classes/attributes
5. Performance
   - Query only what you need; avoid wide selectors inside hot paths
   - Do not attach new observers; contentScript already re‑applies with throttling

## Enable settings for your site
After creating a site module, make it available in the settings and popup:

1. **Add to Options Page** (`src/options/options.html`):
   ```html
   <!-- Load site modules so the options page can list available hints -->
   <script src="../content/sites/whatsapp.js"></script>
   <script src="../content/sites/example.js"></script>  <!-- Add your new site -->
   <script src="options.js"></script>
   ```

2. **Add to Popup** (`src/popup/popup.html`):
   ```html
   <!-- Load site modules so the popup can access available hints -->
   <script src="../content/sites/whatsapp.js"></script>
   <script src="../content/sites/example.js"></script>  <!-- Add your new site -->
   <script src="popup.js"></script>
   ```

3. **Add to Content Scripts** (`src/content/contentScript.js`):
   ```html
   <script src="content/hintRenderer.js"></script>
   <script src="content/sites/whatsapp.js"></script>
   <script src="content/sites/example.js"></script>  <!-- Add your new site -->
   <script src="content/contentScript.js"></script>
   ```

**What happens automatically:**
- ✅ Settings page will show toggles for your site's hints
- ✅ Popup will show toggles when users visit your site
- ✅ Hint preferences are saved per-site and persist
- ✅ Changes apply immediately without page refresh

## Testing checklist
- [ ] The hint appears in the correct location
- [ ] No duplicate hints appear after navigation or dynamic changes
- [ ] No layout shift when rendering badges
- [ ] Works in both Chrome and Firefox
- [ ] Toggling the settings updates live without refresh
- [ ] No noticeable performance impact

## Pull requests
- One site or feature per PR
- Include a brief description, before/after notes, and screenshots/GIFs if UI changed
- Keep diffs small and reviewable

Thanks! 🎉
