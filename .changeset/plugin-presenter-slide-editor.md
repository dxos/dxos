---
'@dxos/plugin-presenter': patch
---

In the slide editor, slot markers such as `::right::` and click tags without attributes are atomic: the caret steps over them and a delete removes them whole. Two layouts are added: `three-cols` (`::middle::`, `::right::`) and `grid`, 2 × 2 (`::right::`, `::bottom-left::`, `::bottom-right::`); "Start the next column" inserts the marker after the one at the caret. Typing a `layout:` value in the frontmatter offers the matching layouts with their names, in two columns. The slide toolbar's layout picker is an icon button, and every layout has a translated name in the picker. In fullscreen, the overlay pager stays visible while the pointer is on it. Frontmatter `bleed: left` or `bleed: right` takes a column slide's outer column to the slide's edges, so an embedded object can fill it.
