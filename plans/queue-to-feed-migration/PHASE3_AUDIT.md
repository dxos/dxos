# Phase 3: QueueService Audit & Removal

Branch: `claude/queueservice-audit-replace-lrDep`.

## Goal

Continue the migration started in `MIGRATION_PLAN.md`. Audit every remaining
`QueueService` reference (the Effect `Context.Tag` named
`@dxos/functions/QueueService`, defined in
`packages/core/echo/echo-db/src/effect-queue-service.ts`) and remove it where
`Feed.FeedService` already covers the call site, or document why it must stay.

**Out of scope:** the lower-level `FeedProtocol.QueueService` interface in
`@dxos/protocols/FeedProtocol` (the RPC service used by `EchoClient`,
`EchoHost`, `LocalQueueServiceImpl`, etc.). That is the data plane and is not
the thing being deprecated.

## QueueService API surface today

```ts
export class QueueService extends Context.Tag('@dxos/functions/QueueService')<
  QueueService,
  { readonly queues: QueueAPI }
>() {}

interface QueueAPI {
  get<T>(dxn: DXN): Queue<T>;
  create<T>(options?: { subspaceTag?: QueueSubspaceTag }): Queue<T>;
}
```

`Queue` exposes imperative methods: `append`, `delete`, `queryObjects`,
`query(filter)`, `sync`, `setParentEntity`, plus `dxn`.

## Feed.FeedService API today

```ts
class FeedService {
  append(feed: Feed, items: Entity.Unknown[]): Promise<void>;
  remove(feed: Feed, ids: string[]): Promise<void>;
  query(feed: Feed, queryOrFilter): QueryResult;
  sync(feed: Feed, options?): Promise<void>;
}
```

Plus module-level `Feed.append`, `Feed.remove`, `Feed.query`, `Feed.runQuery`,
`Feed.sync` Effect helpers.

## Gaps vs QueueService

1. **No DXN-keyed access.** `FeedService` takes a `Feed.Feed` object. Several
   call sites only have a queue DXN (trigger spec, `gpt` node, `trace`
   command, conductor `queue`/`append` nodes). For those we need to first
   resolve the `Feed` from the database — there is already a `Feed` object
   stored alongside the queue, e.g. `chat.feed`, `agent.feed`,
   `properties.invocationTraceFeed`. The conductor `make-queue`/`queue`/
   `append` nodes only have the raw DXN; those still need queue access.
2. **No `create`.** New feeds are created via `Database.add(Feed.make())`;
   the assistant-toolkit already uses this pattern in
   `Agent.makeInitialized`.

## Audit (excluding tests and stories)

### Group A — Type unions only

These reference `QueueService` purely in a service-union alias. Remove the
`QueueService` member once concrete usages of those unions no longer require
it. Each is a one-line delete + import cleanup.

- `packages/core/compute/functions/src/sdk.ts` — `FunctionServices`
  (`@deprecated`).
- `packages/core/compute/conductor/src/types/compute.ts` —
  `ComputeRequirements`.
- `packages/ui/react-ui-canvas-compute/src/graph/controller.ts` —
  `ComputeServices`.
- `packages/core/compute/functions-runtime/src/triggers/trigger-dispatcher.ts`
  — service union (also Group D).
- `packages/plugins/plugin-assistant/src/processor/processor.ts` —
  `SpaceServices`, `AiChatServices`.
- `packages/devtools/cli/src/util/runtime.ts` — `AiChatServices`.

### Group B — Provided in layer wiring, never consumed

These wire `QueueService` into a `ServiceResolver` / layer but the consumers
(agent worker, processor, canvas) only `yield* Feed.FeedService` in their
handlers. Removing `QueueService` from the `provide` list is safe once Group
D handlers are migrated.

- `packages/plugins/plugin-client/src/capabilities/layer-specs.ts` —
  `DatabaseLayerSpec` provides `QueueService.layer(space.queues)` alongside
  `createFeedServiceLayer(space.queues)`. Keep the queue factory but stop
  publishing the Effect tag.
- `packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx`
  — `ServiceResolver.provide(..., QueueService, ...)`.
- `packages/plugins/plugin-assistant/src/hooks/useChatProcessor.ts`.
- `packages/plugins/plugin-assistant/src/capabilities/create-object.ts`.
- `packages/plugins/plugin-automation/src/capabilities/layer-specs.ts` —
  `TriggerDispatcherSpec.requires`.
- `packages/plugins/plugin-doctor/src/diagnostics/providers/operations.ts` —
  `KNOWN_SERVICES` whitelist; remove the entry when nothing declares it.
- `packages/core/compute/functions/src/protocol/protocol.ts` —
  `wrapFunctionHandler` checks for `QueueService.key`; the `FunctionContext`
  layer still wires `QueueService.layer(this.queues)` for handlers that
  request it.
- `packages/core/compute/functions-runtime/src/services/service-container.ts`
  — `queues: QueueService` (already marked `@deprecated`).
- `packages/core/compute/functions-runtime/src/services/local-function-execution.ts`
  — wires the tag for downstream handlers.
- `packages/core/compute/conductor/src/compiler/fiber-compiler.ts` —
  `_createServiceLayer` republishes `QueueService` alongside
  `Feed.FeedService`.
- `packages/devtools/cli-util/src/util/space.ts` — `spaceLayer` exports
  `Database.Service | QueueService`.
- `packages/devtools/devtools/src/panels/edge/WorkflowPanel/WorkflowDebugPanel.tsx`
  — `createLocalExecutionContext` (also Group D).

### Group C — Operation `services` lists

`Operation.make({ services: [...] })` lists declarative dependencies.

- `packages/core/compute/assistant-toolkit/src/blueprints/project/functions/definitions.ts:30`
  — `AgentWorker` lists `QueueService`. The handler in
  `.../functions/agent.ts` only uses `Feed.FeedService` and `Database.Service`.
  Safe to drop.
- `packages/core/compute/assistant-toolkit/src/blueprints/project-wizard/functions/definitions.ts:46`
  — `CreateAgent` lists `QueueService` but the handler (Database + Feed only)
  doesn't need it. Verify the handler before dropping.

### Group D — Concrete `yield* QueueService` consumers

Real callers. These need code changes, not just a type prune.

1. `packages/core/compute/conductor/src/nodes/gpt/gpt.ts:125` —
   `queues.get(conversation.dxn).queryObjects()` to load history. The
   `conversation.dxn` is a queue DXN; the matching `Feed` object exists in
   the database (chat.feed). Replace with
   `Database.resolve(conversation.dxn, Feed.Feed)` + `Feed.runQuery(feed,
Filter.everything())`. _(Conversation refs in conductor are queue DXNs —
   confirm the resolver works for queue DXNs or thread the feed DXN through
   instead.)_
2. `packages/core/compute/functions-runtime/src/triggers/trigger-dispatcher.ts:460`
   — `QueueService.getQueue(DXN.parse(spec.queue))` then `queue.queryObjects()`.
   Per `MIGRATION_PLAN.md`, the trigger dispatcher was explicitly excluded
   from migration ("complex cursor/position tracking"). **Keep using
   QueueService here for now.**
3. `packages/core/compute/conductor/src/nodes/registry.ts:140,208,231` —
   `make-queue`/`queue`/`append` compute nodes. These are
   schema-graph-level nodes that operate on raw queue DXNs and have no
   `Feed` object backing them in the graph. **Keep using QueueService for
   now;** revisit after we decide whether queue-DXN nodes should be
   re-modelled around `Feed`.
4. `packages/devtools/cli/src/commands/function/trace/trace.tsx:42` —
   `const { queues } = yield* QueueService` then passed into `<Trace
db={db} queues={queues} ...>`. The UI uses the queue API directly.
   Lower priority — keep for now.
5. `packages/devtools/devtools/src/panels/edge/WorkflowPanel/WorkflowDebugPanel.tsx:243`
   — `createLocalExecutionContext` constructs a `ServiceContainer` with
   `queues: QueueService.make(space.queues)`. The execution context feeds
   the local workflow runner; required while the runner takes the deprecated
   `ServiceContainer`. Leave alone.
6. `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:44`
   — `QueueService.createQueue()` inside `resetHistory`. Replace with
   `Database.add(Feed.make())` — matches the pattern in
   `Agent.makeInitialized` and only needs `Database.Service | Feed.FeedService`
   afterwards. **Migrate.**

### Group E — Stub / pass-through

- `packages/core/compute/functions/src/services/queues.ts` —
  re-exports `QueueService` and `feedServiceFromQueueServiceLayer` from
  `@dxos/echo-db`. Keep until all consumers stop importing
  `QueueService` from `@dxos/functions`.

## Plan

This branch lands the safe subset:

1. **AgentArticle:** replace `QueueService.createQueue()` with
   `Database.add(Feed.make())`. Drop `QueueService` from the
   `useSpaceCallback` requirement list.
2. **AgentWorker / CreateAgent operation services:** drop `QueueService` from
   the `services` list — handler doesn't use it.
3. Remove `QueueService` from `ServiceResolver.provide` call sites that
   wrap handlers from step 1/2:
   - `plugin-assistant/src/capabilities/create-object.ts`.
   - `plugin-assistant/src/hooks/useChatProcessor.ts` (the processor handler
     was already audited — `processor.ts` keeps `QueueService` only in the
     `SpaceServices`/`AiChatServices` aliases for back-compat).
4. Keep:
   - `trigger-dispatcher` (per prior PR review).
   - Conductor `make-queue`/`queue`/`append` nodes and `gpt` history loader.
   - The `protocol.ts` / `service-container.ts` layer wiring (those provide
     the tag for handlers that still declare it).
   - The `Feed.notAvailable` / `QueueService.notAvailable` stubs.
5. Do **not** touch the `feedServiceFromQueueServiceLayer` bridge, the
   re-export in `functions/src/services/queues.ts`, or
   `effect-queue-service.ts` itself. Removing the tag entirely is a Phase 4
   task once Groups B/C/D have all been chipped away.

Each change should keep the build green; this is a conservative pass, not a
big-bang removal.
