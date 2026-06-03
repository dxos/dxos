# @dxos/plugin-extension

Composer plugin exposing user settings for the `@dxos/composer-crx` browser extension.

The extension can clip DOM subtrees into Composer and act as a **search render-proxy** — fetching
and JS-rendering pages in a real browser tab so plugins (e.g. `@dxos/plugin-commerce`) can
scrape client-rendered or anti-bot sites that a plain HTTP proxy cannot read.

This plugin owns the user-facing settings for that render-proxy:

- **Use extension to render pages** — master toggle; when off, plugins fall back to the edge proxy.
- **Render timeout (ms)** — per-render time budget.
- **Render in focused tab** — render in a foreground tab for sites that defer loading when backgrounded.
- **Developer mode** — verbose logging and debug previews.

Settings are persisted to the app-framework settings store and exposed to other plugins via a
plugin-scoped capability (`ExtensionCapabilities.Settings`).

## Testing

```bash
moon run plugin-extension:build
moon run plugin-extension:test
moon run plugin-extension:lint -- --fix
```

Preview the settings panel in Storybook:

```bash
moon run storybook-react:serve
# open the "plugins/plugin-extension/ExtensionSettings" story
```
