---
'@dxos/compute': minor
---

Report operations that yield via `Operation.runAgain()` (`RunAgainError`) as a new `incomplete` operation outcome instead of a failure, so scheduler re-runs surface as an unfinished state in the trace graph rather than a hard error.
