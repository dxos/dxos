# Migration Plan: QueueService → Feed.FeedService

## Status

- **Phase 1 COMPLETE**: Renamed `Feed.Service` → `Feed.FeedService` and updated all references.
- **Phase 2 COMPLETE**: Migrated `AiConversation` and `AiContextBinder` to use `Feed` object and `feedRuntime` instead of `Queue`.
- **Phase 3 COMPLETE** (PR #11483): Migrated `TriggerDispatcher` to `Feed.FeedService`; renamed the `'queue'` trigger kind (spec, event, helpers, cursor key) to `'feed'`. `Trigger.specQueue` was removed; `Trigger.QueueSpec`/`TriggerEvent.QueueEvent` are now `Trigger.FeedSpec`/`TriggerEvent.FeedEvent`; spec storage changed from a queue DXN string to `Ref.Ref(Feed.Feed)`.
- **Phase 4 COMPLETE** (this PR #11484): All in-process consumers of the deprecated `QueueService` Effect tag have been migrated; the tag itself has been deleted.

The Effect `Context.Tag` `@dxos/functions/QueueService` (formerly defined in `packages/core/echo/echo-db/src/effect-queue-service.ts`) has been **removed from the codebase**. Remaining `QueueService` references are confined to:

- the RPC data-plane (`@dxos/protocols/FeedProtocol`, `@dxos/protocols/FunctionProtocol`, `EdgeFunctionEnv`),
- the imperative `QueueFactory` / `QueueImpl` / `LocalQueueServiceImpl` implementations in `@dxos/echo-db` and `@dxos/echo-pipeline`,
- the SDK RPC bridges in `@dxos/client*`,
- the Cloudflare worker runtime (`@dxos/functions-runtime-cloudflare`).

These are **out of scope** for this effort — they are the data plane, not the Effect-level service that was being deprecated.

## Decisions

1. **Trigger Dispatcher**: migrated to `Feed.FeedService` (Phase 3, PR #11483).
2. **Service Container** (`ServiceContainer` in `@dxos/functions-runtime`): `queues` field removed in Phase 4; container now exposes only `feeds: Feed.FeedService`. The class remains `@deprecated` overall.
3. **`AiConversation`**: takes a `Feed` object (Phase 2).
4. **`ContextQueueService`**: removed (predates Phase 4).
5. **`QueueService`** Effect tag: **deleted** in Phase 4. The re-export at `@dxos/functions/services/queues.ts` was also removed.
6. **Queue methods (`sync`/`refresh`/`subscribe`)**: paths that need them now use `Feed.sync` / `feedService.query(feed, ...).subscribe(...)` against a `Feed.Feed` object.

## Out of scope

- `FeedProtocol.QueueService` in `@dxos/protocols/FeedProtocol` — the RPC data-plane service used by `EchoClient`, `EchoHost`, `LocalQueueServiceImpl`, the Cloudflare worker. Not the Effect tag.
- `KEY_QUEUE_POSITION = 'org.dxos.key.queue-position'` in `@dxos/protocols/FeedProtocol`: persisted foreign-key source string in feed item meta. Renaming requires a data migration.
- `Feed.getQueueDxn(feed)` helper: still returns a queue-style DXN derived from the feed object id. This is the wire-level identifier for the feed in the data plane (`space.queues.get(dxn)`) and remains in place; about 49 call sites still build DXNs for diagnostics, refs, or imperative `space.queues.*` calls.

## API surface today

```ts
// FeedService — the canonical replacement.
class FeedService {
  append(feed: Feed, items: Entity.Unknown[]): Promise<void>;
  remove(feed: Feed, ids: string[]): Promise<void>;
  query(feed: Feed, queryOrFilter): QueryResult;
  sync(feed: Feed, options?): Promise<void>;
}
// + Effect helpers: Feed.append / Feed.remove / Feed.query / Feed.runQuery / Feed.sync.

// Factory: `makeFeedService(queues: QueueAPI)` (in `@dxos/echo-db`) builds the
// runtime impl backed by a QueueFactory; `createFeedServiceLayer(queues)`
// wraps it in `Layer.succeed(Feed.FeedService, makeFeedService(queues))`.
```

## What changed in Phase 4 (this PR)

### Conductor

- `packages/core/compute/conductor/src/nodes/gpt/gpt.ts` — replaced `QueueService.getQueue(...).queryObjects()` with `Database.resolve(conversation, Feed.Feed)` + `Feed.runQuery(feed, Filter.type(Message.Message))`; writes use `Feed.append(feed, [...messages])`. `runDeps` now also publishes `Feed.FeedService` so the appended messages can be persisted from inside the `request.run(...)` continuation.
- `packages/core/compute/conductor/src/nodes/registry.ts` — `make-queue` now does `Database.add(Feed.make())` + `Ref.make(feed)`; the `queue`/`append` nodes resolve the Feed from the input DXN via `Database.resolve(dxn, Feed.Feed)` and use `Feed.runQuery`/`Feed.append`.
- `packages/core/compute/conductor/src/compiler/fiber-compiler.ts` — dropped `Layer.succeed(QueueService, ...)` from the per-fiber layer.
- `packages/core/compute/conductor/src/types/compute.ts` — `ComputeRequirements` no longer includes `QueueService`.
- `packages/core/compute/conductor/src/nodes/gpt/gpt.test.ts` — migrated history-loading test to `Database.add(Feed.make())` + `Feed.append` + `Feed.runQuery`.

### Local function execution

- `packages/core/compute/functions-runtime/src/services/local-function-execution.ts` — stopped yielding `QueueService` and stopped providing it to invoked operations.
- `packages/core/compute/functions/src/sdk.ts` — `FunctionServices` no longer lists `QueueService`.
- `packages/core/compute/functions/src/protocol/protocol.ts` — `wrapFunctionHandler` no longer branches on `QueueService.key`; `FunctionContext.createLayer` no longer publishes a `queuesLayer`.
- `packages/core/compute/functions-runtime/src/services/service-container.ts` — removed the `queues` field from `SERVICES` and from `createLayer`.
- `packages/core/compute/functions-runtime/src/testing/services.ts` — `createTestServices` now wires `feeds: makeFeedService(queues)` instead of `queues: QueueService.make(queues)`.
- `packages/core/compute/functions-runtime/src/testing/assistant-test-layer.ts` — dropped `QueueService` from the type union and from the `ServiceResolver.fromRequirements(...)` list.

### Test database / compute-runtime test layer

- `packages/core/echo/echo-db/src/testing/test-database-layer.ts` — `TestDatabaseLayer` now provides `Feed.FeedService` directly (built via `makeFeedService(queues)`), no longer goes through `feedServiceFromQueueServiceLayer`. `onInit` callbacks now declare `Feed.FeedService` instead of `QueueService` as their requirement.
- `packages/core/compute-runtime/src/testing/layer.ts` — same change for the `@dxos/compute-runtime` test layer.

### Layer wiring / `ServiceResolver.provide`

- `packages/plugins/plugin-client/src/capabilities/layer-specs.ts` — `DatabaseLayerSpec.provides` no longer lists `QueueService`; the layer no longer publishes `QueueService.layer(space.queues)`.
- `packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx` — dropped `QueueService` from `ServiceResolver.provide(...)`.
- `packages/stories/stories-assistant/src/testing/testing.tsx` — dropped `QueueService` from `ServiceResolver.provide(...)`.
- `packages/devtools/cli-util/src/util/space.ts` — `spaceLayer` now returns `Layer<Database.Service | Feed.FeedService, …>`; the queue branch was replaced with `createFeedServiceLayer(space.queues)`.
- `packages/devtools/cli/src/util/runtime.ts` — already dropped `QueueService` from `AiChatServices` in Phase 4a.
- `packages/ui/react-ui-canvas-compute/src/graph/controller.ts` — `ComputeServices` no longer includes `QueueService`.

### Diagnostic / Doctor whitelist

- `packages/plugins/plugin-doctor/src/diagnostics/providers/operations.ts` — `KNOWN_SERVICES` no longer includes `QueueService`.

### CLI `trace` command + ink component

- `packages/devtools/cli/src/commands/function/trace/trace.tsx` — yields `Feed.FeedService` instead of `QueueService` and passes the resolved `Feed.Feed` (`properties.invocationTraceFeed.target`) directly to `<Trace>` (no longer the queue DXN).
- `packages/devtools/cli/src/commands/function/trace/components/Trace.tsx` — switched from `(queues: QueueAPI, queueDXN: Option<DXN>)` to `(feedService: Context.Tag.Service<Feed.FeedService>, feed: Option<Feed.Feed>)`; query subscription uses `feedService.query(feed, ...)`.

### Devtools workflow panel

- `packages/devtools/devtools/src/panels/edge/WorkflowPanel/WorkflowDebugPanel.tsx` — `createLocalExecutionContext` now passes `feeds: makeFeedService(space.queues)` to the (deprecated) `ServiceContainer` instead of `queues: QueueService.make(space.queues)`.

### Public API surface

- `packages/core/echo/echo-db/src/queue/feed-service.ts` — exported `makeFeedService(queues): Context.Tag.Service<Feed.FeedService>` alongside the existing `createFeedServiceLayer(queues)`.
- `packages/core/echo/echo-db/src/effect-queue-service.ts` — **deleted** (defined the `QueueService` tag, `feedServiceFromQueueServiceLayer`, etc.). Removed from `packages/core/echo/echo-db/src/index.ts` barrel.
- `packages/core/compute/functions/src/services/queues.ts` — **deleted** (was a re-export shim). Removed from the `services` barrel.

## Audit of remaining `QueueService` references

After Phase 4, `rg -l QueueService packages` returns only files in the following groups, all of which are out of scope:

| Group                                         | Files                                                                                                                                                                                            | Why it stays                                                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| RPC protocol (data plane)                     | `packages/core/protocols/src/{FeedProtocol,FunctionProtocol}.ts`, `packages/core/protocols/src/edge/EdgeFunctionEnv.ts`, `packages/core/protocols/src/proto/dxos/client/queue.proto`, `…/gen/**` | `FeedProtocol.QueueService` is the RPC interface; it is the data plane, not the deprecated Effect tag.                                           |
| `QueueFactory` / `QueueImpl` (imperative API) | `packages/core/echo/echo-db/src/queue/{queue,queue-factory,queue-service,stub}.ts`, `packages/core/echo/echo-db/src/client/echo-client.ts`                                                       | Backs the imperative `space.queues.*` API still consumed in stories, tests, and the Cloudflare runtime. Replacing this requires Phase 5 (below). |
| Local queue service (echo-pipeline)           | `packages/core/echo/echo-pipeline/src/db-host/{echo-host,local-queue-service,queue-service.test,stub}.ts`                                                                                        | Data-plane RPC implementation.                                                                                                                   |
| SDK bridges                                   | `packages/sdk/client/src/client/client.ts`, `packages/sdk/client-protocol/src/service.ts`, `packages/sdk/client-services/src/packlets/services/service-host.ts`                                  | Plumb the RPC service across the worker boundary.                                                                                                |
| Cloudflare worker runtime                     | `packages/core/compute/functions-runtime-cloudflare/src/{functions-client,internal/queue-service-impl,internal/service-container}.ts`, `…/README.md`                                             | Separate runtime; its `QueuesAPI` (`queryQueue`/`insertIntoQueue`) is the surface used by `plugin-script` templates.                             |
| Documentation / fixtures                      | `packages/core/echo/echo/AUDIT.md`, `packages/plugins/plugin-assistant/src/testing/data/trace-timeline.dx.json`                                                                                  | Doc/historical fixture.                                                                                                                          |

## Phase 5 (separate effort) — Imperative `space.queues` and `Queue` class

These sites use the imperative `QueueFactory` API (`space.queues.get`, `space.queues.create`, `queue.append`, `queue.queryObjects`) directly. They are independent of the (now-deleted) Effect tag; migrating them to `Feed`-based APIs is a follow-up effort scoped per plugin/test.

### Plugin templates (Cloudflare worker)

The Cloudflare `QueuesAPI` (`space.queues.queryQueue(dxn)` / `space.queues.insertIntoQueue(dxn, items)`) is a different shape from the in-process `QueueFactory`; migrating these requires either exposing `Feed.runQuery`/`Feed.append` in the worker runtime or wrapping the existing API.

- `packages/plugins/plugin-script/src/templates/discord.ts`
- `packages/plugins/plugin-script/src/templates/gmail.ts`

### In-process imperative call sites

- `packages/plugins/plugin-space/src/commands/queue/query.ts:44`
- `packages/plugins/plugin-feed/src/containers/MagazineArticle/MagazineArticle.stories.tsx`
- `packages/plugins/plugin-feed/src/operations/curate-magazine.test.ts`
- `packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx`
- `packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts`
- `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx`
- `packages/plugins/plugin-inbox/src/operations/google/gmail/sync-e2e.test.ts`
- `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.stories.tsx`
- `packages/stories/stories-assistant/src/stories/Chat.stories.tsx`
- `packages/sdk/client/src/tests/spaces.test.ts`
- `packages/apps/composer-app/scripts/build-exemplar-space.node.test.ts`
- `packages/core/compute/functions-testing/src/testing/util.ts`
- `packages/core/echo/echo-db/src/testing/queue.test.ts` (tests the `Queue` class itself; keep until the class is removed)
- `packages/core/echo/echo-atom/src/query-atom.test.ts` — tests `AtomQuery.make` against a `Queue` directly; migration requires `AtomQuery` to accept a `Feed.Feed` as well.

Each is independent and can be migrated as a separate, small PR.

## Phase 6 — `QueueFactory` removal

Once Phase 5 lands, the imperative `QueueFactory` exposed on `Space` (`space.queues`) can be replaced by a `Feed`-shaped surface. At that point the underlying `QueueImpl` / `LocalQueueServiceImpl` / `FeedProtocol.QueueService` RPC contract can be renamed to use `Feed`/`feed` terminology consistently (and `KEY_QUEUE_POSITION` migrated with a data migration if desired).
