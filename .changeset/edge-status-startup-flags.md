---
'@dxos/devtools': patch
---

The devtools EDGE card no longer reports spurious red flags right after startup: its first status query waits until each active space is replicating with EDGE, and it re-queries every second while EDGE still reports issues.
