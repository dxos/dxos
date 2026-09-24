---
'@dxos/react-ui-attention': patch
'@dxos/plugin-deck': patch
---

Navigation in the deck is smoother in three ways. A plank's heading no longer paints its sigil and title as unattended for a frame before flipping: a newly opened plank is attended from its first painted frame. Opening a plank crossfades the content region where the browser supports a view transition. A deck showing several planks at once no longer opens a companion pane beside every one of them before the reader has opened or closed a single one.
