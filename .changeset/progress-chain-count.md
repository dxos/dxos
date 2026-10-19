---
'@dxos/app-toolkit': patch
---

A sync that continues with `Operation.runAgain()` keeps one progress meter whose count climbs across every run, instead of dropping back to zero at each new batch. Between batches the meter shows the count reached with no total, rather than a full bar that reads as finished.
