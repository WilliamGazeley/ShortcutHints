# Shortcut Hints

Love keyboard shortcuts but hate memorizing them? Shortcut Hints puts keyboard shortcut hints right on your favorite sites so you can ditch the mouse and zip around with ease. Works on Chrome and Firefox!

## Current support

- WhatsApp Web (`web.whatsapp.com`)
  - Search conversations: `Ctrl + Alt + /`
  - Search in current chat: `Ctrl + Shift + F`
- YouTube (`youtube.com`)
  - Search bar: `/`

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
