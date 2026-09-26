---
'@dxos/react-ui-markdown': patch
---

`MarkdownEditable` now shows a bullet when a line starts with `- `, where the marker used to vanish off the field's left edge. `MarkdownView` takes a `uniformLineHeight` option that renders every block (headings, quotes, lists, code, tables) at the container's line height with no vertical padding, so a `line-clamp` preview ends on a whole line; task rows use it for their three-line description.
