---
'@dxos/compute-runtime': minor
'@dxos/plugin-routine': patch
---

Fix running a routine manually. The runnable's input now comes from the routine's first trigger, so a sync routine's `binding` reaches the operation instead of throwing, and a routine whose trigger is `remote` force-runs on the edge dispatcher rather than silently running on the client. Also export `createInvocationPayload` for building a trigger's invocation payload.
