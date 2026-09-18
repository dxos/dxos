---
'@dxos/react-ui-attention': patch
'@dxos/plugin-deck': patch
---

Navigation in the deck is smoother in three ways. A plank's heading no longer paints its sigil and title as unattended for a frame before flipping: `useAttention` and `useAttended` read the current state synchronously on first render, and a newly opened plank takes focus before paint, carrying the scroll intent in the same write as the plank list. Opening a plank crossfades the content region where the browser supports a view transition. A deck showing several planks at once no longer opens a companion pane beside every one of them before the reader has opened or closed a single one; an untouched companion flag now reads as open only where one plank is laid out at a time.
