---
'@dxos/react-ui-canvas': patch
---

A stroke kept as drawn (Freehand, or a Sketch stroke that reads as nothing) lands as a closed line where it ends near where it began, measured against its own bounds (`strokeCloses`), so a large stroke and a small one close alike.
