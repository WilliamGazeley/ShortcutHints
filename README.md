# Shortcut Hints

Always‑visible keyboard shortcut hints for popular websites. Hints are added manually per‑site for high reliability and polish, and can be toggled on/off from the settings page. Chrome and Firefox are supported.

## Current support

- WhatsApp Web (`web.whatsapp.com`)
  - Search conversations: `Ctrl + Alt + /` (sidebar label hint)
  - Search in current chat: `Ctrl + Shift + F` (header button hint)

More sites are welcome via contributions (see Contributing).

## Install (development)

1. Clone
   ```bash
   git clone https://github.com/your-username/ShortcutHints.git
   cd ShortcutHints
   ```
2. Load the extension
   - Chrome/Edge: `chrome://extensions` → Enable Developer mode → Load unpacked → select `src/`
   - Firefox: `about:debugging` → This Firefox → Load Temporary Add‑on → pick any file in `src/`

## Usage

1. Open the extension’s Settings (Options) page
2. Toggle per‑site shortcuts in the “Available Shortcuts” table
3. Changes apply live without reloading the page

## How it works

- Each supported site provides a small module in `src/content/sites/` that:
  - declares available hints at a glance (`listHints()`), and
  - renders/removes hints (`apply(id, enabled)` / `removeAll()`)
- A lightweight content script re‑applies hints when the page updates (SPA navigation, dynamic DOM), throttled to avoid performance impact
- Minimal helper `hintRenderer` is available for overlay badges

Key files:
- `src/content/sites/whatsapp.js` — WhatsApp implementation
- `src/content/contentScript.js` — applies site hints, listens to changes
- `src/content/hintRenderer.js` — small overlay helper

## Build (ZIPs for distribution)

```bash
./package.sh
```

Artifacts:
- `builds/shortcut-hints-chrome.zip`
- `builds/shortcut-hints-firefox.zip`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for a minimal checklist. Contributions that add or improve site modules are especially welcome.

## License

GPL‑3.0 — see [LICENSE](LICENSE).
