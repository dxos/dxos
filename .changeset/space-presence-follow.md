---
'@dxos/app-toolkit': minor
'@dxos/plugin-deck': patch
'@dxos/plugin-markdown': patch
'@dxos/plugin-sheet': patch
'@dxos/plugin-space': patch
'@dxos/ui-editor': patch
---

You can follow a peer around a space. Follow sits next to Jump and Go to on a peer's row and follows whichever of their sessions moved last; with the sessions toggle on, each session row has a Follow that stays on that session. While you follow, your deck opens what they open and keeps their top line at the top of your view, without moving your caret or focus, and they send their location every 100 ms instead of every second. Scrolling, clicking or typing in a plank, attending another object, or pressing Escape stops it, and so does the leader being gone from the space for five seconds. The Members tab shows a dot while you follow, and the leader's row sits first in its list with Stop. A `Locator` reveal takes `follow` to scroll without moving the caret, and a deck companion's `badge` atom can hold `true` to draw a dot.
