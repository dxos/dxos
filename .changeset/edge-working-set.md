---
'@dxos/echo-client': minor
---

EDGE invocations can hand a database the working set of the caller that started them: `DatabaseImpl.noteUnindexedWrites` takes the objects another client wrote, so queries return them before the index holds them, and a window with no order now admits such writes when the index answer is short of its limit. `WorkingSetRow` moved from `@dxos/echo-client` to `@dxos/protocols`, and `EdgeFunctionEnv.WorkingSetService` is new; the plugin invocation scope can carry it.
