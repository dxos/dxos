---
'@dxos/plugin-google': patch
---

Lowered the mail sync per-run budget so a run's resident set fits the memory limit of the smallest host that runs it. Gmail and JMAP now consider 100 candidate messages per run instead of 500; a capped run still requests `Operation.runAgain()`, so a larger delta is drained across runs rather than lost.
