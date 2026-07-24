---
'@dxos/ui-editor': minor
'@dxos/plugin-space': minor
'@dxos/plugin-comments': minor
'@dxos/plugin-markdown': minor
---

Ambient (Google-Docs-style) document review. The default document view now overlays every author's suggestions plus comments on main, with a per-user Editing/Viewing mode governed by a product-level `ReviewRenderPolicy`; the explicit branch switcher / diff selector remains as the advanced path. Also fixes a crash when adding a comment while viewing a branch (comment anchors now resolve against the editor-bound document) and prohibits inline comments on suggestion branches. `@dxos/ui-editor` gains `suggestionsOverlay` and a `readonly` option on `comments()`.
