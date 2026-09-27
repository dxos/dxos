---
'@dxos/react-ui-attention': patch
'@dxos/plugin-deck': patch
'@dxos/ui-theme': patch
---

Clicking a document in the navigation tree moves attention to the plank it opens, while focus stays on the tree row so the arrow keys keep working. Before this, attention stayed on the document you left. Opening a document within a workspace now crossfades in 50ms instead of 200ms.
