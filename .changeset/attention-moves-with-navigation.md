---
# multiple-changesets: stacked on #13224, whose workspace view transition is its own entry
'@dxos/react-ui-attention': patch
'@dxos/plugin-deck': patch
---

Attention now moves in the same frame as navigation, and opening a plank crossfades the content region. The plank heading no longer paints its sigil and title as unattended for a frame before flipping: `useAttention` and `useAttended` read the current state synchronously on first render, and the deck focuses a newly opened plank before paint, carrying the scroll intent in the same write as the plank list. An in-app open runs that write as a view transition where the browser supports one.
