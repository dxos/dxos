---
'@dxos/plugin-presenter': minor
'@dxos/react-ui-syntax-highlighter': minor
'@dxos/react-ui': minor
'@dxos/react-ui-list': minor
---

Presentations render slides written in a Slidev markdown subset (layouts, click steps, video backgrounds, embedded object surfaces) and print the whole deck, one slide per page; reveal.js is removed. A Presentation's article is a grid of slide thumbnails that can be dragged to reorder and double-clicked to present. A deck takes a theme (`default`, `light`, `dark`, `serif`) with color overrides and a named text and code font, whose web fonts load only when used. Slides open in an editor with a slide toolbar and a live preview, below it or in the companion, kept in step with the cursor both ways.

`Listbox` takes `tiles` (a column count) to lay items out as a grid of cards with two-dimensional arrow keys; a list's current row is now marked in a neutral color and its selection in the focus color, and draggable rows can be reordered in a grid (`useReorder` with `axis: 'horizontal'`). `SyntaxHighlighter` takes a `themeMode` prop and `react-ui-syntax-highlighter` exports `renderRows`.
