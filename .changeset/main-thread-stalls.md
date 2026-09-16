---
'@dxos/plugin-routine': patch
---

Remove main-thread stalls: routine registry sync yields to the event loop every 8ms, and each layer slice initializes under its own lock instead of one stack-wide lock.
