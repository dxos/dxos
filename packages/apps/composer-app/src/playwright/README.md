# End-to-end Tests

To run the end-to-end tests locally:

```bash
DX_PWA=false moon run composer-app:e2e
```

To debug, add `--inspect` to step through each Playwright test.

To target a single browser, set `PLAYWRIGHT_BROWSER=webkit` (or `chromium` / `firefox`); the default in CI is `all`.

Note: the webkit boot path is sensitive to plugin chunk-graph shape. Plugins should keep their top-level `Plugin.ts` static imports minimal and put module `activate` bodies behind `Capability.lazy` — broad top-level imports can shift bundler chunk ordering and trip ESM init order in Linux webkit.
