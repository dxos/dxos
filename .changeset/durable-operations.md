---
'@dxos/compute': minor
---

Process definitions are now durable operations: `Process.make` → `Operation.makeDurable`, `Process.Process` → `Operation.Durable`, `Process.Callbacks` → `Operation.DurableHandler`, `Process.ProcessContext` → `Operation.DurableContext`, and `BaseServices`/`ChildEvent` move to `Operation`. `Process.fromOperation` moves to `@dxos/compute-runtime` as `DurableOperation.fromOperation`. The `Process` name now means a running process: `Process.Info` → `Process.Process`.
