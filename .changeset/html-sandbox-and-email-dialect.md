---
'@dxos/react-ui-components': minor
'@dxos/plugin-inbox': minor
---

Add `Html`, a sandboxed renderer for untrusted HTML: sanitized content in a Shadow DOM host, so the document's CSS cannot reach the app while it still flows in the app layout, with remote images blocked by default. Content-specific behaviour is supplied as an `HtmlDialect` — a plain value carrying CSS, transforms and a `src` resolver — rather than baked into the component; `emailDialect()` is the first of these. `plugin-inbox`'s `HtmlViewer` is replaced by that pair, moving `cid:` attachment resolution into the plugin (`useCidResolver`) so the shared UI package no longer depends on ECHO.

Email bodies now honour the sender's `color-scheme` declaration, read from the raw markup before sanitization strips it: a body declaring `light` is left as authored on a light sheet in dark mode, and anything undeclared is recolored to the app theme regardless of layout (the previous table-layout exemption preserved too little to justify leaving marketing mail glaring white in dark mode).
