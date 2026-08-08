---
'@dxos/plugin-routine': patch
---

`wireTriggers` no longer strands the triggers of a routine that has no action.

Deriving a `runnable` from an absent `spec` yields `undefined`, so wiring an actionless routine left its triggers enabled and pointing at nothing. The runtime treats an unrunnable trigger as a defect, so a timer trigger then failed on its whole schedule. `makeRoutine` already guarded its own call; the guard now lives in `wireTriggers`, since one unguarded caller is enough to strand a trigger.
