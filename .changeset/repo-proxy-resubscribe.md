---
'@dxos/echo': patch
---

Re-establish the ECHO document subscription when its stream drops, instead of failing every later write with "Subscription not found".
