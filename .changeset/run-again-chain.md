---
'@dxos/compute': minor
'@dxos/plugin-inbox': patch
---

A run that continues with `Operation.runAgain()` shows as one run instead of one per invocation. `Trace.Meta.runId` holds the pid of the run's first invocation, and the trigger dispatcher stamps it on every retry. The routine's run history lists the chain as one run whose status follows its latest invocation, and labels a yielded run "Continuing". The trace graph draws a continuing run as a branch with one commit per invocation, then one commit once it finishes, or once the span timeout passes without a continuation. The sync progress meter keeps one bar across every run: mail sync sizes the remaining backfill on each run (Gmail's `resultSizeEstimate`, JMAP's `calculateTotal`), the progress sink holds that total across the gap between runs, and the count is the messages each run keeps.
