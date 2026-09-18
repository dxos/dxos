---
'@dxos/react-ui-attention': patch
'@dxos/plugin-deck': patch
---

Attention now moves in the same frame as navigation. The plank heading no longer paints its sigil and title as unattended for a frame before flipping when a plank or workspace opens: `useAttention` and `useAttended` read the current state synchronously on first render, and the deck focuses a newly opened plank before paint, carrying the scroll intent in the same write as the plank list.
