---
'@dxos/plugin-tldraw': patch
---

Arrowing onto a sketch embedded in a Markdown document leaves focus on the embed, so the next arrow goes on through the document. Enter or a click on the canvas goes into the sketch. `Canvas` takes a `focusContainer` prop, passed to tldraw's `editor.focus`.
