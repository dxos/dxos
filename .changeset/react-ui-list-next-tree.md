---
'@dxos/react-ui-list': minor
---

`@dxos/react-ui-list/next` exports `Tree`, the next tree on Ark's tree-view driven by `TreeModel` atoms. Its parts
follow Ark's names on the Next row: `Tree.Root` (model, `virtual='fixed' | 'variable'`, `animate`, drag and drop),
`Label`, `Content` (a row renderer as children), `Item`, `ItemIndicator` (the caret, the only branch toggle),
`ItemIcon` (forwards Icon props, including `hue`), `ItemText` and `Empty`. The walk reads only open branches, rows
render flat and window at one block each, and rows drag with a `Next.DragPreview` chip and mark the drop with
`data-drop-target`. The current `Tree` is unchanged.
