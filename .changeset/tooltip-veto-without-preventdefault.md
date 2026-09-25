---
'@dxos/react-ui': patch
---

`Tooltip.Trigger`'s `onInteract` keeps the tooltip closed when it returns `false`, not when it calls
`preventDefault()`. A cancelled pointermove stops WebKit from starting a native drag, so in Safari a
navtree row could not be dragged while the pointer was over its label.
