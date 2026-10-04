---
'@dxos/echo': minor
'@dxos/plugin-markdown': minor
---

Spinners share one interface: `SpinnerProps` with an `ActivityState` of `'ready' | 'thinking' | 'alert' | 'error'`, named by meaning rather than animation. `ShapeSpinner` is the morphing square and `PulseSpinner` a dot matrix (a wave when ready, amber on alert, random pings while thinking, a sweep on error).

**Breaking:** `Spinner` is now `ShapeSpinner`, and its states are renamed (`pulse` → `ready`, `spin` → `thinking`, `flash` → `alert`). `Matrix` moves from `@dxos/react-ui-components` to `@dxos/react-ui-experimental`. `Html` (with `emailDialect`, the colour-scheme transforms and `HtmlSrcResolver`) moves from `@dxos/react-ui-components` to the new `@dxos/react-ui-html`.

`QueryEditor`, `QueryForm` and `useQueryBuilder` move from `@dxos/react-ui-components` to the new `@dxos/react-ui-query`, with their translations (`@dxos/react-ui-query/translations`), so `@dxos/react-ui-components` no longer carries CodeMirror or `@dxos/echo-query`. Its `./Spinner` subpath is removed; import spinners from the package root.

The `dx-fullscreen` utility is renamed `dx-cover` (`absolute inset-0`): it covers the nearest positioned ancestor, not the screen.

`ScrollArea.Root` hides its overlay thumbs until the pointer is over the frame by default (`autoHide` now defaults to `true`; pass `autoHide={false}` for always-visible thumbs).
