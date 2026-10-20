---
'@dxos/plugin-inbox': patch
'@dxos/plugin-google': patch
'@dxos/plugin-jmap': patch
---

A mail sync that continues with `Operation.runAgain()` reports one total for the whole backfill from its first run: Gmail's `resultSizeEstimate` or JMAP's `calculateTotal`, refreshed on every run. The meter's count is the messages each run keeps, so a message fetched past a run's cap is no longer counted twice.
