# Browser captures

`desktop-models.png` and `mobile-models.png` show the real-mode model selector populated from the live OpenRouter catalog. Chat generation was intercepted with local fixtures during that verification. The other captures use explicit test-fixture mode. `chromium-history.png` and `mobile-history.png` show restored conversations, the larger New conversation button, and the Knowledge base icon.

Captured from the production build in mock mode using Playwright and installed Chrome on October 19, 2026. Desktop viewport: 1280 × 720. Mobile: Playwright’s iPhone 13 viewport emulation in Chromium; this is not a physical iOS/Safari test. Images were visually reviewed.

- `chromium-welcome.png`, `mobile-welcome.png`: empty chat and suggestions.
- `chromium-citations.png`, `mobile-citations.png`: completed answer with a selected local source.
- `chromium-dark.png`, `mobile-dark.png`: persisted dark theme.

To refresh in PowerShell:

```powershell
pnpm.cmd build
$env:PLAYWRIGHT_PRODUCTION='1'
$env:PLAYWRIGHT_CHANNEL='chrome'
$env:CAPTURE_SCREENSHOTS='1'
pnpm.cmd test:e2e
```

Captures use real app state and deterministic local fixtures; no external AI calls are made.
