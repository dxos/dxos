---
'@dxos/react-ui': patch
'@dxos/react-ui-list': patch
---

Navtree dragging works in Safari and opens a held branch with its children already loading.
`Tooltip.Trigger`'s `onInteract` now keeps the tooltip closed when it returns `false`, not when it
calls `preventDefault()`: a cancelled pointermove stops WebKit from starting a native drag, so a row
could not be dragged while the pointer was over its label. A `Tree` row also calls `onItemHover` when
a drag enters it, since a native drag fires no mouseenter.
