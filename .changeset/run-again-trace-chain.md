---
'@dxos/compute': minor
'@dxos/compute-runtime': patch
'@dxos/react-ui-trace': patch
'@dxos/plugin-routine': patch
---

A run that continues with `Operation.runAgain()` shows as one run in the trace views. `Trace.Meta.runId` holds the pid of the run's first invocation, and the trigger dispatcher stamps it on every retry. The routine's run history lists the chain as one run whose status follows its latest invocation. The trace graph draws the invocations in sequence on one lane, and selecting the run in the trace panel brings its continuations along.
