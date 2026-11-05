---
'@dxos/app-toolkit': minor
'@dxos/plugin-deck': patch
'@dxos/plugin-markdown': patch
'@dxos/plugin-sheet': patch
'@dxos/plugin-space': patch
'@dxos/react-ui-form': patch
'@dxos/ui-editor': patch
---

You can follow a peer around a space. Follow sits next to Jump and Go to on a peer's row and follows whichever of their sessions moved last; with the sessions toggle on, each session row has a Follow that stays on that session. While you follow, a deck that lays planks side by side shows theirs: the same planks in their order, scrolled to the plank at the front of theirs, with each plank keeping their top line at the top. A flattened deck opens the plank they attend, at the path they opened it from. Neither moves your caret or focus, and they send their location every 100 ms instead of every second. Scrolling, clicking or typing in a plank, attending an object outside what you show of them, or pressing Escape stops it, and so does the leader being gone from the space for five seconds. The Members tab shows a dot while you follow, and the leader's row sits first in its list with Stop. A `Locator` reveal takes `follow` to scroll without moving the caret, a deck companion's `badge` atom can hold `true` to draw a dot, and `AppCapabilities.Layout` gains `flat` and `front`, the plank a sliding deck is scrolled to. A schema form's boolean field carries its JSON path as `data-testid`, as text fields do.
