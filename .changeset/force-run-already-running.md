---
'@dxos/edge-compute': patch
---

Running an EDGE trigger that is already running now succeeds without starting a second run, instead of failing with a defect. EDGE refuses the second run with `Trigger already running`, and the client counts that as the run it asked for.
