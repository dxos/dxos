---
'@dxos/react-ui-list': patch
---

A `Tree` row now calls `onItemHover` when a drag enters it. A native drag fires no mouseenter, so a
branch held open during a drag used to start loading its children only as it opened.
