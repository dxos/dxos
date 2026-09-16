---
'@dxos/ui-theme': patch
---

`ThemePlugin` no longer fails every rebuild under Vite's full-bundle dev mode (`vite dev --experimentalBundle`), where Rolldown's `hotUpdate` call carries neither the `server` field nor an `environment` the hook needs. Both its own hook and `@tailwindcss/vite`'s stand down there; a newly used utility class still needs a server restart in that mode.
