---
'@dxos/plugin-assistant': patch
---

Present operations that yield via `Operation.runAgain()` (`RunAgainError`) as a distinct "incomplete" state in the trace graph and routine run list, rather than a hard error, since the run will be re-invoked.
