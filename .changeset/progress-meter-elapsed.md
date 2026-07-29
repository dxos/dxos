---
'@dxos/app-toolkit': patch
---

`ProgressMeter` now shows a live elapsed-time readout for indeterminate tasks (no known total) instead of a perpetually-pulsing bar; the fractional bar and remaining-time ETA render only when a total is known.
