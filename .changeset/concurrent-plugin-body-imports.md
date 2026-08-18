---
'@dxos/app-framework': patch
---

Plugin body imports run concurrently. `Plugin.resolveLazy` no longer serializes every plugin's
body `import()` behind a global lock (a WebKit workaround the production bundle cannot trigger — the
only top-level-await chunk plugin bodies reach is in the entry's static closure and evaluated before
any body import). Measured on Composer's warm-cold startup: the startup pass drops ~500 ms on chromium
and the core plugins finish ~2.6 s earlier instead of starving behind content plugins. The startup
profile also gains activation-cause (`moduleCauses`) and graph-builder body-run (`graphBodies`) marks.
