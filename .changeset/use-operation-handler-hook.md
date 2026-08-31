---
'@dxos/app-framework': minor
'@dxos/compute': minor
'@dxos/plugin-tasks': minor
'@dxos/echo': patch
'@dxos/types': patch
---

New `useOperationHandler(operation, map?)` hook: suspensefully resolves an operation's handler as an effect fn (`(input) => Effect<Output>`), or — with `map` — as a callback-args binding (`(...args) => Effect<Output>`). The component suspends while the handler's module lazy-loads; a miss throws `NoHandlerError`. Resolution goes through the new `Capabilities.OperationHandlers` singleton — the merged reactive handler set the process manager already builds for the operation invoker, now also contributed as a capability. `OperationHandlerSet.reactive` memoizes `getHandlerFor` promises per key (invalidated when contributions change) so React's `use` can resume suspended renders, and `OperationHandlerSet.findHandler(set, definition)` is the definition-typed promise counterpart of `getHandler`.

`useSpaceCallback` now passes the returned callback's arguments through to `fn`, so gesture handlers can build effects from per-call inputs. BREAKING: the optimistic-overlay layer is removed entirely — `useOptimisticOperation`, `OptimisticBinding`, `useOptimisticQuery`, and the `@dxos/app-framework/Optimistic` module. Local-first sync writes need no overlay; a query view is a memoized `Atom.make` over `query.atom` read with `useAtomValue`.

New `Ref.peek()` / `Database.peek(ref)` — the target when already materialized: the pinned target or a side-effect-free working-set lookup; never throws, never triggers loading. `Ref.target` is deprecated in its favor (it loads and registers a resolution callback as side effects, and can throw). Compose `Database.peek(ref) ?? (yield* Database.load(ref))` for a sync-when-materialized read with an async fallback — an effect built only from materialized refs runs under `Effect.runSync`. `Database.load` itself is unchanged — its async resolution also settles a just-added object into its own document, which flows like branching depend on. `TaskSet.resolveParentTask` uses that composition, and its cycle check walks the candidate's `parentTask` ancestor chain (equivalent to the old subtree collection, and it sees cross-set descendants) instead of querying.

BREAKING: `TaskOperation.MoveTask`'s input requires a `taskSet` ref alongside the task and its handler needs no services. With loaded refs the whole operation completes without an async boundary — a drop runs it with `Effect.runSync` so the write lands in the gesture frame, with no optimistic overlay — while unloaded refs (e.g. an agent caller) load asynchronously through the same path.
