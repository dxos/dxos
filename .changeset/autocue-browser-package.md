---
'@dxos/autocue': minor
---

`@dxos/autocue` now builds to `dist/` with browser-safe entry points: `@dxos/autocue` (Frame, tokens), `@dxos/autocue/player` (Player, `loadBundle`), `@dxos/autocue/grid` and `@dxos/autocue/ident`; the root no longer re-exports the Ident. The Player takes `layout: 'embedded'` to fill a host container, and the new `@dxos/plugin-autocue` plays a hosted autocue bundle as a Composer object.
