---
'@dxos/ui-theme': patch
---

`ThemePlugin` no longer fails every rebuild under Vite's full-bundle dev mode (`vite dev --experimentalBundle`), where Rolldown invokes `hotUpdate` without the `server` argument and environment the hook needs. Both its own hook and `@tailwindcss/vite`'s stand down there; a newly used utility class still needs a server restart in that mode.
