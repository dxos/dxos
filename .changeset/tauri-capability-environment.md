---
'@dxos/app-framework': minor
---

A capability module can be annotated `environments: ['tauri']` to load only in Tauri builds. `dx-plugin gen` gives the `tauri` condition every browser module plus the annotated ones, and leaves the annotated ones out of the `default` barrel, so web bundles never carry them.
