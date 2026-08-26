---
'@dxos/react-ui-assistant': patch
---

`@dxos/react-ui-assistant/translations` now resolves. The package has always exported that subpath, but `dist/lib/translations.mjs` was never built, so anything importing it failed to bundle — which is what `@dxos/plugin-assistant` started doing in #12610.
