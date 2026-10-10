---
'@dxos/ui-theme': patch
---

`ThemePlugin` no longer scans the consumer's whole `node_modules` when the package is installed, which could stall a Vite dev server before its first response. Installed copies now scan the app's own sources and the built `@dxos` packages, plus any globs passed as the new `content` option.
