---
'@dxos/compute': patch
'@dxos/plugin-assistant': patch
---

Present operations that yield via `Operation.runAgain()` (`RunAgainError`) as a distinct "incomplete" state in the trace graph and routine run list, rather than a hard error, since the run will be re-invoked. The `operation.end` trace event now carries the failing error's `errorCode` so consumers can distinguish a run-again yield from a genuine failure.
