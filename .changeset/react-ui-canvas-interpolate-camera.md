---
'@dxos/react-ui-canvas': minor
---

Add `interpolateCamera`, which returns the camera at any point along the smooth zoom-and-pan path between two cameras, so a frame-by-frame renderer can animate the camera deterministically; `animateCamera` now uses it.
