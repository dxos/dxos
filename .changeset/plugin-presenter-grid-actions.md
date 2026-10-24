---
'@dxos/app-toolkit': patch
'@dxos/plugin-canvas': patch
'@dxos/plugin-navtree': patch
'@dxos/plugin-presenter': patch
'@dxos/react-ui-canvas': patch
---

In the presentation grid, double-clicking a slide or adding one opens it in the slide editor. The add button is a split button whose caret sets the layout of later slides, and a ghost tile after the last slide adds one. A slide with `hide: true` in its frontmatter is skipped when presenting and shown dimmed in the grid. The toolbar presents with the editor's present icon, replacing the fullscreen button. The slide editor splits evenly until resized and has no fold gutter. A canvas drawing on a slide is read-only and shows no toolbar, palette or panels. `Canvas.Root` takes `transparent`, which draws no surface under the scene; a canvas on a slide uses it. In fullscreen, the space around a letterboxed slide takes the slide's background. The canvas background's context menu has a Back item inside a frame or an isolated composite. The app has one context menu: right-clicking an element marked with `AppNode.contextMenuProps(id)` opens that graph node's actions, as its navtree menu lists them; navtree rows and presentation grid tiles are marked, and hiding a slide is a graph action. A presentation's properties show its theme, font, code font and colors as top-level selectors.
