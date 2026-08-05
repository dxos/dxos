---
'@dxos/compute': minor
'@dxos/plugin-assistant': patch
---

Report operations that yield via `Operation.runAgain()` (`RunAgainError`) as a new `incomplete` operation outcome instead of a failure, so scheduler re-runs surface as an unfinished state in the trace graph and routine run list rather than a hard error.
