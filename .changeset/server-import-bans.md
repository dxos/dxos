---
'@dxos/ui-editor': minor
'@dxos/plugin-markdown': patch
---

`@dxos/ui-editor/hunks` exports the word-level diff helpers (`cherryPickHunk`, `revertHunk`, `computeWordHunks`) without a CodeMirror dependency; `@dxos/ui-editor/headless` no longer exports `cherryPickHunk` and `revertHunk`. The EDGE (`workerd`) builds of plugin-markdown and plugin-magazine no longer bundle CodeMirror's view layer or defuddle's DOM build, and markdown's Scroll To Anchor operation is now registered only in the browser.
