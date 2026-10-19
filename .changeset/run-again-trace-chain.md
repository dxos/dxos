---
'@dxos/compute': minor
'@dxos/compute-runtime': patch
'@dxos/react-ui-trace': patch
'@dxos/plugin-routine': patch
---

A run that continues with `Operation.runAgain()` shows as one run in the trace views. `Trace.Meta.runId` holds the pid of the run's first invocation, and the trigger dispatcher stamps it on every retry. The routine's run history lists the chain as one run whose status follows its latest invocation. While the run continues, the trace graph draws it as a branch with one commit per invocation, and once it finishes, one commit. Selecting the run in the trace panel brings its continuations along.
