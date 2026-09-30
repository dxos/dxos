---
'@dxos/react-ui': minor
---

Navtree rows drag in Safari, and a branch held mid-drag opens with its children already loading.
Breaking: `Tooltip.Trigger`'s `onInteract` no longer receives the event and keeps the tooltip closed when it returns `false`.
