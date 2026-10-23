---
'@dxos/plugin-presenter': minor
'@dxos/react-ui-syntax-highlighter': minor
'@dxos/react-ui': minor
'@dxos/react-ui-list': minor
---

A Presentation's article is a grid of slide thumbnails that scrolls and can be reordered by dragging; double-click presents from a slide. Presentations render slides in a Slidev markdown subset with layouts, click steps, video backgrounds and embedded object surfaces, print the whole deck, one slide per page, and take a theme (`default`, `light`, `dark`, `serif`, with color and font overrides on a Presentation). A Presentation's slides open in an editor with a slide toolbar (layout, click steps, columns, objects, background, notes) and a live preview below it or in the companion, kept in step with the cursor both ways; reveal.js is removed. `react-ui-syntax-highlighter` exports `renderRows`, and `SyntaxHighlighter` takes a `themeMode` prop. `Listbox` takes `tiles` (a column count) to lay its items out as a grid of tiles with two-dimensional arrow keys, outlined on hover and when selected; a draggable row starts a native drag, and `row.css` draws `left`/`right` drop indicators. `useReorder` marks its drag preview with `data-drag-preview`. The keyboard's current row is ringed in a neutral colour, and in orange only when it is also selected, so it no longer looks like the selection. Tiles draw current, hover and selection as one outline of the same width.
