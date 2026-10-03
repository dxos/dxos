---
'@dxos/compute': minor
---

Process definitions are now durable operations: `Process.make` → `Operation.makeDurable`, `Process.Process` → `Operation.Durable`, `Process.Callbacks` → `Operation.Handler`, `Process.ProcessContext` → `Operation.DurableContext`, `Process.fromOperation` → `OperationHandlerSet.toDurable` (and `BaseServices`/`ChildEvent` move to `Operation`). The `Process` name now means a running process: `Process.Info` → `Process.Process`. Breaking: the operation handler function type `Operation.Handler` is renamed `Operation.HandlerFn`.
