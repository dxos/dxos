---
'@dxos/plugin-canvas': patch
'@dxos/plugin-presenter': patch
'@dxos/react-ui-canvas': patch
---

In the presentation grid, double-clicking a slide or adding one opens it in the slide editor. The add button is a split button whose caret sets the layout of later slides, and a ghost tile after the last slide adds one. A slide's context menu hides or shows it and deletes it (undoably, as the navtree does). A slide with `hide: true` in its frontmatter is skipped when presenting and shown dimmed in the grid. The toolbar presents with the editor's present icon, replacing the fullscreen button. The slide editor splits evenly until resized and has no fold gutter. A canvas drawing on a slide is read-only and shows no toolbar, palette or panels. `Canvas.Root` takes `transparent`, which draws no surface under the scene; a canvas on a slide uses it. In fullscreen, the space around a letterboxed slide takes the slide's background. The canvas background's context menu has a Back item inside a frame or an isolated composite.
