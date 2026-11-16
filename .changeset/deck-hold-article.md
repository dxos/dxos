---
'@dxos/plugin-deck': patch
---

Moving between two articles no longer empties the plank. The article already on screen is held for the commit the shell paints alone, instead of being replaced by the loading placeholder — which took the editor and its toolbar out of the DOM for about 90ms on every move, and tore down what was there so the next article measured its container from scratch.
