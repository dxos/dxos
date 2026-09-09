---
'@dxos/react-ui': minor
---

`Main`'s sidebars run on Ark's drawer machine below `lg`. Both sidebars now close on a swipe toward their edge (`swipeToDismiss`, on by default), and a touch swipe inward from the screen edge opens a closed one (`swipeToOpen`, on by default; the edge strip is touch-only). Dismissing one sidebar no longer dismisses the other. The sidebar's label is on the element at every width. `useSwipeToDismiss` is removed. The public API, the three-state model and the layout at `lg` are unchanged.
