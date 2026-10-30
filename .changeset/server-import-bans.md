---
'@dxos/ui-editor': minor
'@dxos/plugin-markdown': patch
---

Plugin `workerd` (EDGE) builds no longer bundle editor extensions, CLI commands, local-client layer specs, UI state or defuddle's DOM build: those modules now list `['browser', 'node', 'tauri']`, and markdown's Scroll To Anchor operation registers only in the browser. `@dxos/ui-editor/hunks` exports the word-level diff helpers (`cherryPickHunk`, `revertHunk`, `computeWordHunks`) without a CodeMirror dependency; **Breaking:** `@dxos/ui-editor/headless` no longer exports `cherryPickHunk` and `revertHunk`; import them from `@dxos/ui-editor/hunks` (or the package root) instead.
