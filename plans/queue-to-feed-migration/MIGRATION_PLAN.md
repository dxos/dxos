# Migration Plan: QueueService → Feed.FeedService

## Status

- **Phase 1 COMPLETE**: Renamed `Feed.Service` → `Feed.FeedService` and updated all references.
- **Phase 2 COMPLETE**: Migrated `AiConversation` and `AiContextBinder` to use `Feed` object and `feedRuntime` instead of `Queue`.
- **Phase 3 COMPLETE** (PR #11483): Migrated `TriggerDispatcher` to `Feed.FeedService`; renamed the `'queue'` trigger kind (spec, event, helpers, cursor key) to `'feed'`. `Trigger.specQueue` was removed; `Trigger.QueueSpec`/`TriggerEvent.QueueEvent` are now `Trigger.FeedSpec`/`TriggerEvent.FeedEvent`; spec storage changed from a queue DXN string to `Ref.Ref(Feed.Feed)`.
- **Phase 4 COMPLETE** (this PR #11484): All in-process consumers of the deprecated `QueueService` Effect tag have been migrated; the tag itself has been deleted.
- **Phase 5 COMPLETE** (partial — see "Phase 5 COMPLETE" section below for what was renamed vs. deferred): Renamed remaining in-process, source-level `Queue`→`Feed` naming (`Feed.getQueueUri`→`getFeedUri`, `echo-client`/`proxy-db` service field names, `plugin-routine` trigger CLI files) that does not touch the wire/RPC protocol or persisted data. The RPC contract, `LocalQueueServiceImpl`, `QueueDataSource`'s persisted `sourceName`, and `space.queues`/`QueueFactory` itself remain unrenamed — deferred to Phase 6.

The Effect `Context.Tag` `@dxos/functions/QueueService` (formerly defined in `packages/core/echo/echo-db/src/effect-queue-service.ts`) has been **removed from the codebase**. Remaining `QueueService` references are confined to:

- the RPC data-plane (`@dxos/protocols/FeedProtocol`, `@dxos/protocols/FunctionProtocol`, `EdgeFunctionEnv`),
- the imperative `QueueImpl` (`LocalQueueServiceImpl`) / `QueueDataSource` implementations in `@dxos/echo-host` (formerly split across `@dxos/echo-db` and `@dxos/echo-pipeline`, since consolidated),
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

| Group                                        | Files                                                                                                                                                                                            | Why it stays                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RPC protocol (data plane)                    | `packages/core/protocols/src/{FeedProtocol,FunctionProtocol}.ts`, `packages/core/protocols/src/edge/EdgeFunctionEnv.ts`, `packages/core/protocols/src/proto/dxos/client/queue.proto`, `…/gen/**` | `FeedProtocol.QueueService` is the RPC interface; it is the data plane, not the deprecated Effect tag.                                                                                                                                                                                                                                                                           |
| `QueueImpl` / `QueueDataSource` (data plane) | `packages/core/echo/echo-host/src/db-host/{local-queue-service,queue-data-source,queue-service.test}.ts`, `packages/core/echo/echo-host/src/db-host/echo-host.ts`                                | `LocalQueueServiceImpl` implements `FeedProtocol.QueueService` (the RPC interface) directly; `QueueDataSource.sourceName = 'queue'` and the `queueId`/`queueNamespace` columns it writes are persisted in local SQLite index tables (`index-core/src/{index-tracker,indexes/entity-meta-index}.ts`). Renaming requires a local index-store migration and is folded into Phase 6. |
| SDK bridges                                  | `packages/sdk/client-protocol/src/service.ts`, `packages/sdk/client-services/src/packlets/services/service-host.ts`                                                                              | Reference the RPC service registry key `dxos.client.services.QueueService` directly; plumb the RPC service across the worker boundary.                                                                                                                                                                                                                                           |
| Cloudflare worker runtime                    | `packages/core/compute/functions-runtime-cloudflare/src/{functions-client,internal/queue-service-impl,internal/service-container}.ts`, `…/README.md`                                             | Separate runtime; its `QueuesAPI` (`queryQueue`/`insertIntoQueue`) is the surface used by `plugin-script` templates.                                                                                                                                                                                                                                                             |
| Documentation / fixtures                     | `packages/core/echo/echo/AUDIT.md`, `packages/plugins/plugin-assistant/src/testing/data/trace-timeline.dx.json`                                                                                  | Doc/historical fixture.                                                                                                                                                                                                                                                                                                                                                          |

Note: the paths in the previous version of this table (`echo-db/src/queue/*`, `echo-pipeline/src/db-host/*`) are stale — `echo-db` and `echo-pipeline` were consolidated; the data-plane implementation now lives under `packages/core/echo/echo-host/src/db-host/`.

## Phase 5 COMPLETE — Source-level `Queue`→`Feed` renames

Renamed in-process, source-level "Queue" naming that means "Feed" (TS identifiers, comments, filenames) to `Feed` terminology, without touching any wire/RPC contract or persisted data. By the time this phase started, most of the imperative `space.queues`/`QueueFactory` call sites listed in the original Phase 5 plan below had already been migrated to the `Feed`/`Scope.feed` API by other work (the plan was stale) — the files (`plugin-feed/*.stories.tsx`, `curate-magazine.test.ts`, `sdk/client/src/tests/spaces.test.ts`, `build-exemplar-space.node.test.ts`, `echo-db/src/testing/queue.test.ts`, `echo-atom/src/query-atom.test.ts`) no longer exist at those paths and no longer use an imperative `Queue` class.

### What was renamed

- `packages/core/echo/echo/src/Feed.ts`: `Feed.getQueueUri()` → `Feed.getFeedUri()`, plus doc comments; updated all ~26 call sites across `echo`, `echo-client`, `index-core`, `devtools/cli`, and several plugins (`plugin-assistant`, `plugin-bluesky`, `plugin-debug`, `plugin-inbox`, `plugin-magazine`, `plugin-meeting`, `plugin-script`, `plugin-transcription`, `react-ui-form`, `stories-assistant`, `sdk/client-e2e`, `functions-testing`, `assistant-toolkit`), including renaming local variables (`queueDxn`/`transcriptQueueDxn`/`feedQueueDXN`) and error-message text that said "queue" where "feed" was meant.
- `packages/core/echo/echo-client/src/client/echo-client.ts` and `packages/core/echo/echo-client/src/proxy-db/database.ts`: renamed the in-process `queueService`/`_queuesService`/`#queueService` fields, params, and `_setQueueService` method to `feedService`/`_feedService`/`_setFeedService`. These wrap `FeedProtocol.QueueService` (the RPC type itself is unchanged) — only the local field/param names changed. Updated call sites in `sdk/client/src/client/client.ts`, `core/compute/functions/src/protocol/protocol.ts`, and `echo-client/src/testing/echo-test-builder.ts`. Also renamed the equivalent local variable in `sdk/react-client/src/echo/useFeedSyncState.ts`.
- `packages/plugins/plugin-routine/src/commands/trigger/{create,update}/queue.ts` → renamed to `feed.ts`; the exported `queue` command const renamed to `feed` (the CLI subcommand name was already `'feed'` from Phase 3 — only the file/export name lagged). Updated the two `index.ts` files that import them.

### What was deferred (with TODOs left in place)

- `packages/devtools/devtools/src/panels/echo/QueuesPanel/QueuesPanel.tsx` — kept the `QueuesPanel` name. `FeedsPanel` already names the unrelated hypercore feed-pipeline devtools panel (`packages/devtools/devtools/src/panels/echo/FeedsPanel/`), so renaming would collide; the panel itself is also currently stubbed pending a `Feed.Feed`-aware rewrite. TODO comment left at the component declaration.
- `packages/core/echo/echo-host/src/db-host/local-queue-service.ts` (`LocalQueueServiceImpl`) — kept the class name because it `implements FeedProtocol.QueueService`, the wire RPC interface; renaming the class would decouple it from the interface name. TODO left pointing at Phase 6.
- `packages/core/echo/echo-host/src/db-host/queue-data-source.ts` (`QueueDataSource.sourceName = 'queue'`) — kept because `sourceName` is persisted as a column value in the local `indexCursor`/`objectMeta` SQLite tables. TODO left pointing at the persisted schema.
- `space.queues` itself and the `QueueFactory`/`QueueImpl`/`FeedProtocol.QueueService` RPC contract were **not** touched — per the audit above, they are the RPC/data-plane layer, explicitly out of scope for this phase; see Phase 6.
- `packages/plugins/plugin-space/src/commands/queue/{query.ts,util.ts,index.ts}` — left untouched. This defines a user-facing CLI command group (`queue query`); renaming it changes CLI surface/muscle-memory for users, which is a different kind of compatibility concern than the source-level renames in scope here. Not touched, no TODO added (out of this phase's explicit scope, not a deferred decision).

### Verification note

`moon` (build/test task runner) could not run in this environment: its toolchain plugin download from `github.com/moonrepo/plugins` was blocked with a 403 by the sandbox's egress policy. Verification was instead done via `tsc --noEmit` on each touched package's `tsconfig.json` (pre-existing, unrelated "Cannot find module" errors remain from unbuilt/un-codegen'd dependencies — confirmed identical on files untouched by this change) plus exhaustive `rg` call-site audits for every renamed symbol.

## Phase 6 — `QueueFactory` removal

Once `space.queues` callers are fully on `Feed`-based APIs, the imperative `QueueFactory` exposed on `Space` (`space.queues`) can be replaced by a `Feed`-shaped surface. At that point the underlying `QueueImpl` / `LocalQueueServiceImpl` / `FeedProtocol.QueueService` RPC contract can be renamed to use `Feed`/`feed` terminology consistently (including `QueueDataSource`, its persisted `sourceName`/`queueId`/`queueNamespace` columns, and `KEY_QUEUE_POSITION`), with a local index-store data migration.
