---
'@dxos/react-ui-virtual': patch
'@dxos/react-ui-feed': patch
'@dxos/react-ui-assistant': patch
---

The assistant thread shows a floating scroll-to-bottom button once the reader leaves the tail; clicking it returns them and re-arms the follow. `useFollow` now publishes `atEnd` as state so an affordance can render against the same threshold the scroller uses, and `MessageList.Viewport` takes an `overlay` slot for chrome pinned over the scroller.
