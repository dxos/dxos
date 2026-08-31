---
'@dxos/app-framework': minor
'@dxos/compute': minor
'@dxos/plugin-tasks': minor
---

New `useOperationHandler(operation, map?)` hook: suspensefully resolves an operation's handler as an effect fn (`(input) => Effect<Output>`), or — with `map` — as a callback-args binding (`(...args) => Effect<Output>`). The component suspends while the handler's module lazy-loads; a miss throws `NoHandlerError`. Resolution goes through the new `Capabilities.OperationHandlers` singleton — the merged reactive handler set the process manager already builds for the operation invoker, now also contributed as a capability. `OperationHandlerSet.reactive` memoizes `getHandlerFor` promises per key (invalidated when contributions change) so React's `use` can resume suspended renders, and `OperationHandlerSet.findHandler(set, definition)` is the definition-typed promise counterpart of `getHandler`.

`useSpaceCallback` now passes the returned callback's arguments through to `fn`, so gesture handlers can build effects from per-call inputs. BREAKING: `useOptimisticOperation` and `OptimisticBinding` are removed — compose `useOperationHandler` (or the invoker) with `overlay.mutate` from `useOptimisticQuery` instead, committing on success and reverting on failure.

BREAKING: `TaskOperation.MoveTask` is now synchronous (`executionMode: 'sync'`): its input requires a `taskSet` ref alongside the task, all refs must be loaded, and the handler needs no services — a drop runs it with `Effect.runSync` so the write lands in the gesture frame, with no optimistic overlay.
