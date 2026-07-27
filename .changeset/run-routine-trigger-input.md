---
'@dxos/compute-runtime': minor
'@dxos/plugin-routine': patch
---

Fix running a routine manually invoking its operation with no input — the runnable's input now comes from the routine's first trigger, so a sync routine's `binding` reaches the operation instead of throwing. Also export `createInvocationPayload` for building a trigger's invocation payload.
