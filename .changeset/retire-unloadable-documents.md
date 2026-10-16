---
'@dxos/echo-host': patch
'@dxos/echo-protocol': patch
---

Quarantine documents whose load runs out of memory instead of hanging the worker, rebuild them from the index, and retire them through the space directory so every peer wipes its copy.
