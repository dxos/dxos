# Migration Plan: QueueService → Feed.FeedService

## Status

- **Phase 1 COMPLETE**: Renamed `Feed.Service` → `Feed.FeedService` and updated all references.
- **Phase 2 COMPLETE**: Migrated `AiConversation` and `AiContextBinder` to use `Feed` object and `feedRuntime` instead of `Queue`.
- **Phase 3 COMPLETE** (PR #11483): Migrated `TriggerDispatcher` to `Feed.FeedService`; renamed the `'queue'` trigger kind (spec, event, helpers, cursor key) to `'feed'`. `Trigger.specQueue` was removed; `Trigger.QueueSpec`/`TriggerEvent.QueueEvent` are now `Trigger.FeedSpec`/`TriggerEvent.FeedEvent`; spec storage changed from a queue DXN string to `Ref.Ref(Feed.Feed)`. Trivial follow-ups bundled with that PR: dropped `QueueService` from `AgentArticle.resetHistory`, `AgentWorker`/`CreateAgent` operation `services` lists, and the `ServiceResolver.provide` lists in `plugin-assistant/src/capabilities/create-object.ts` and `useChatProcessor.ts`.
- **Phase 4 IN PROGRESS**: Eliminate the remaining concrete `QueueService` consumers (conductor nodes, CLI `trace`, devtools workflow panel), prune type-only unions, then delete the `QueueService` Effect tag.

## Decisions (from PR review)

1. **Trigger Dispatcher**: ~~Do NOT migrate~~ Migrated in Phase 3 (decision reversed).
2. **Service Container**: Deprecated; updates fine but not critical.
3. **AiConversation**: Takes a `Feed` object instead of `Queue`. Done in Phase 2.
4. **`ContextQueueService`**: Removed; no remaining references in the tree.
5. **`QueueService`** Effect tag (`@dxos/functions/QueueService`): Keep with `@deprecated` JSDoc during the transition; remove after all Group D below are migrated.
6. **Queue methods (`sync`/`refresh`/`subscribe`)**: If code paths need these, leave on `QueueService`.

## Out of scope

- The lower-level `FeedProtocol.QueueService` interface in `@dxos/protocols/FeedProtocol` (the RPC service used by `EchoClient`, `EchoHost`, `LocalQueueServiceImpl`, etc.). That is the data plane and is not being deprecated.
- `KEY_QUEUE_POSITION = 'org.dxos.key.queue-position'` in `@dxos/protocols/FeedProtocol`: persisted foreign-key source string in feed item meta. Renaming requires a data migration and is intentionally NOT part of this effort.
- `Feed.getQueueDxn(feed)` helper: still returns a queue-style DXN derived from the feed object id (`Feed/getQueueDxn`). This is the wire-level identifier for the feed in the data plane (`space.queues.get(dxn)`) and stays for now; it appears in 49 call sites that build DXNs for diagnostics, refs, or imperative `space.queues.*` calls.

## API surface today

```ts
// Deprecated
export class QueueService extends Context.Tag('@dxos/functions/QueueService')<
  QueueService,
  { readonly queues: QueueAPI }
>() { /* notAvailable, make, layer, getQueue, createQueue, append */ }

interface QueueAPI {
  get<T>(dxn: DXN): Queue<T>;
  create<T>(options?: { subspaceTag?: QueueSubspaceTag }): Queue<T>;
}

// Replacement
class FeedService {
  append(feed: Feed, items: Entity.Unknown[]): Promise<void>;
  remove(feed: Feed, ids: string[]): Promise<void>;
  query(feed: Feed, queryOrFilter): QueryResult;
  sync(feed: Feed, options?): Promise<void>;
}
// + Effect helpers: Feed.append / Feed.remove / Feed.query / Feed.runQuery / Feed.sync
```

### Gaps vs QueueService

1. **No DXN-keyed access.** `FeedService` takes a `Feed.Feed` object. Sites that only have a queue DXN must first resolve the `Feed` from the database. For most call sites the matching `Feed` is already linked from a parent object (`chat.feed`, `agent.feed`, `properties.invocationTraceFeed`). The conductor's raw `make-queue`/`queue`/`append` nodes have no parent `Feed` and are the awkward case.
2. **No imperative `create`.** New feeds are created via `Database.add(Feed.make())`.

## Exhaustive audit (post-#11483)

Sources: `rg -l "QueueService" --type ts` (43 files), `rg -n "space\.queues\."` (19 hits), `rg -n "yield\* QueueService"`, `rg -n "queue\.append|queue\.queryObjects|\.createQueue|\.getQueue"`.

### A. Type-only unions referencing `QueueService`

Each is `| QueueService` in a service-union alias. Safe to drop only when no concrete consumer in scope still yields `QueueService`.

| File | Alias | Concrete consumer in scope? |
| --- | --- | --- |
| `packages/core/compute/functions/src/sdk.ts` | `FunctionServices` (`@deprecated`) | Yes — `local-function-execution.ts` still `yield* QueueService` (Group D). |
| `packages/core/compute/conductor/src/types/compute.ts` | `ComputeRequirements` | Yes — `gpt.ts` and `registry.ts` nodes (Group D). |
| `packages/ui/react-ui-canvas-compute/src/graph/controller.ts` | `ComputeServices` | Indirectly — runs the conductor compute nodes above. |
| `packages/devtools/cli/src/util/runtime.ts` | `AiChatServices` | **No** — no chat command file `yield* QueueService`. Trivial to drop. |
| `packages/devtools/cli/src/util/trigger-runtime.ts` | trigger union (extends `AiChatServices`) | No — follows from the above. |
| `packages/plugins/plugin-assistant/src/processor/processor.ts` | `AiChatServices`/`SpaceServices` | Already cleaned (Phase 3). |

### B. Layer wiring (`provides`/`ServiceResolver.provide`/`Layer.succeed`)

These publish the `QueueService` tag into a layer/spec. Removing them is safe only after Group D handlers stop yielding the tag.

- `packages/plugins/plugin-client/src/capabilities/layer-specs.ts` — `DatabaseLayerSpec` publishes `QueueService.layer(space.queues)` alongside `createFeedServiceLayer(space.queues)`.
- `packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx` — `ServiceResolver.provide(..., Feed.FeedService, QueueService, ...)`.
- `packages/plugins/plugin-automation/src/capabilities/layer-specs.ts` — `TriggerDispatcherSpec.requires` (re-check post-#11483; trigger dispatcher no longer reads it).
- `packages/plugins/plugin-doctor/src/diagnostics/providers/operations.ts` — `KNOWN_SERVICES` whitelist. Remove last (after all `Operation` `services` lists drop the tag).
- `packages/core/compute/functions/src/protocol/protocol.ts` — `wrapFunctionHandler` checks `serviceTags.includes(QueueService.key)`; `FunctionContext.createLayer` provides `QueueService.layer(this.queues)` or `QueueService.notAvailable`.
- `packages/core/compute/functions-runtime/src/services/service-container.ts` — `queues: QueueService` field (already `@deprecated`).
- `packages/core/compute/functions-runtime/src/services/local-function-execution.ts` — provides `QueueService` to invoked operations.
- `packages/core/compute/functions-runtime/src/testing/services.ts` — `queues: QueueService.make(space?.queues || queues)` in test container.
- `packages/core/compute/functions-runtime/src/testing/assistant-test-layer.ts` — declares `QueueService` requirement on the test layer.
- `packages/core/compute/conductor/src/compiler/fiber-compiler.ts` — `Layer.succeed(QueueService, yield* QueueService)` republishes the tag for compiled fibers.
- `packages/core/echo/echo-db/src/testing/test-database-layer.ts` — `Effect.provideService(QueueService, QueueService.make(queues))` in test factory.
- `packages/core/compute-runtime/src/testing/layer.ts` — mirror of the above for `@dxos/compute-runtime` tests.
- `packages/devtools/cli-util/src/util/space.ts` — `spaceLayer` returns `Layer.Layer<Database.Service | QueueService, never, ClientService>`.
- `packages/devtools/devtools/src/panels/edge/WorkflowPanel/WorkflowDebugPanel.tsx` — `createLocalExecutionContext` builds the deprecated `ServiceContainer` with `queues: QueueService.make(space.queues)` (also Group D).
- `packages/stories/stories-assistant/src/testing/testing.tsx` — `ServiceResolver.provide(..., Feed.FeedService, QueueService)` for story runtimes.
- `packages/devtools/cli/src/util/runtime.ts` — `chatLayer` exposes the tag via `spaceLayer`.

### C. Operation `services` lists

`Operation.make({ services: [...] })` declarative dependency lists.

- All identified entries in `assistant-toolkit` blueprints (`project/.../definitions.ts`, `project-wizard/.../definitions.ts`) were trimmed in Phase 3. `rg "QueueService" packages/core/compute/assistant-toolkit/src/blueprints/` currently returns no hits.

### D. Concrete `yield* QueueService` or `QueueService.make(...)` consumers

Real code that must be re-implemented before the tag can be removed.

| # | Location | Use | Plan |
| - | -------- | --- | ---- |
| D1 | `packages/core/compute/conductor/src/nodes/gpt/gpt.ts:125` | `queues.get(conversation.dxn).queryObjects()` to load chat history. `conversation` is a queue-DXN ref. | Resolve the `Feed` for the conversation DXN (the matching `Feed` is `chat.feed`) and use `Feed.runQuery(feed, Filter.everything())`. The compute input schema accepts a DXN today — either teach the resolver to find a feed by queue-DXN, or change the GPT node input to take a `Feed.Feed` ref. |
| D2 | `packages/core/compute/conductor/src/nodes/registry.ts:140,208,231` | `make-queue` / `queue` / `append` compute graph nodes operate on raw queue DXNs (no parent `Feed`). | Decide whether these nodes should be re-modelled to operate on `Feed` objects, or whether they remain as the only legitimate consumers of the imperative queue API. Likely the cleanest move is: rename to `make-feed`/`feed`/`append-feed`, take a `Ref.Ref(Feed.Feed)` input, and use `Database.add(Feed.make())` + `Feed.append(...)`. |
| D3 | `packages/devtools/cli/src/commands/function/trace/trace.tsx:42` | `const { queues } = yield* QueueService` then passed into `<Trace db={db} queues={queues} queueDXN={...} ...>`. The `<Trace>` ink UI in `cli/src/commands/function/trace/components/Trace.tsx` calls `queues.get(dxn).queryObjects()` / `.subscribe(...)`. | Refactor `<Trace>` to take a `Feed.Feed` and use `Feed.runQuery` / `Feed.query` for live updates. Drop `queues` from the prop set. |
| D4 | `packages/devtools/devtools/src/panels/edge/WorkflowPanel/WorkflowDebugPanel.tsx:243` | `createLocalExecutionContext` constructs a deprecated `ServiceContainer({ queues: QueueService.make(space.queues), ... })`. | Migrate the local workflow runner off `ServiceContainer` to the Effect service-resolver style used by the rest of the app, OR delete this debug panel if the workflow runner is fully replaced by the conductor. |
| D5 | `packages/core/compute/functions-runtime/src/services/local-function-execution.ts:32` | `yield* QueueService` is provided to operations on every invocation. | Stop providing `QueueService` to operations. The only operation handlers that should require queues are the conductor nodes in D1/D2; once those migrate, drop this. |
| D6 | `packages/core/compute/functions-runtime/src/testing/services.ts:88` | `queues: space || queues ? QueueService.make(space?.queues || queues!) : undefined` for legacy test container. | Delete after D5 lands (test container mirrors `local-function-execution`). |
| D7 | `packages/core/compute/functions/src/protocol/protocol.ts:85,213` | RPC bridge: `serviceTags.includes(QueueService.key)` decides whether to layer `QueueService.layer(this.queues)` for handlers declaring the tag. | Remove the `QueueService.key` branch once no operations declare `QueueService` in their `services` list. |

### E. Imperative `space.queues.*` (no Effect involvement)

These bypass the Effect service entirely and use the `QueueFactory` exposed on `Space`. They are independent of the `QueueService` Effect tag; cleaning them up is part of moving the JS surface off the imperative `Queue` API entirely.

- `packages/plugins/plugin-script/src/templates/discord.ts:67,97` — `space.queues.queryQueue(...)` / `space.queues.insertIntoQueue(...)`.
- `packages/plugins/plugin-script/src/templates/gmail.ts:77,135` — same pattern; reads `mailbox.queue.dxn` (i.e. a legacy `queue` ref on a mailbox object).
- `packages/plugins/plugin-space/src/commands/queue/query.ts:44` — `space.queues.get(dxn).queryObjects()`.
- `packages/plugins/plugin-feed/src/containers/MagazineArticle/MagazineArticle.stories.tsx:132,140` — story uses `space.queues.get(feedDXN).queryObjects()`.
- `packages/plugins/plugin-feed/src/operations/curate-magazine.test.ts` — multiple `queue.append(...)` / `queue.queryObjects()` (test fixture; uses the imperative API for setup).
- `packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:113` — derives `messageQueueDXN` then uses it via the queue API.
- `packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:133` — `transcriptFeedDXN`.
- `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:91` — `queue.append([kai, dxos])` in story setup.
- `packages/plugins/plugin-inbox/src/operations/google/gmail/sync-e2e.test.ts:198,219` — `space.queues.get(queueDXN)`.
- `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.stories.tsx:66` — `space.queues.create()` to seed the agent feed.
- `packages/stories/stories-assistant/src/stories/Chat.stories.tsx:329,624,751,830` — multiple `space.queues.get(...).append(...)` for story fixtures.
- `packages/sdk/client/src/tests/spaces.test.ts:596,660,699` — `space.queues.create()` / `space.queues.get(dxn)` in client tests.
- `packages/apps/composer-app/test/build-exemplar-space.node.test.ts:284` — fixture seed.
- `packages/core/compute/functions-testing/src/testing/util.ts:88` — `await space.queues.get(traceFeedDXN).queryObjects()` (test util).
- `packages/core/echo/echo-db/src/testing/queue.test.ts` — unit tests for the `Queue` class itself; appropriate to keep until the class is removed.
- `packages/core/echo/echo-atom/src/query-atom.test.ts:221,243` — `peer.client.constructQueueFactory(...)` for tests.

### F. SDK / protocol scaffolding that mentions `QueueService`

These are mostly type re-exports or RPC-service plumbing not tied to the Effect tag. Keep as-is until the deprecation is fully unwound.

- `packages/sdk/client-protocol/src/service.ts` — re-exports `QueueService` RPC schema from `@dxos/protocols/proto/dxos/client/services`.
- `packages/sdk/client/src/client/client.ts:479` — passes `this._services.services.QueueService` into the RPC bridge.
- `packages/sdk/client-services/src/packlets/services/service-host.ts:368` — wires `QueueService` from `echoHost.queuesService`.
- `packages/sdk/app-framework/src/common/capabilities.ts:150` — JSDoc example.
- `packages/core/protocols/src/FeedProtocol.ts` / `FunctionProtocol.ts` / `edge/EdgeFunctionEnv.ts` — RPC-level interface (`FeedProtocol.QueueService`), explicitly out of scope.
- `packages/core/echo/echo-pipeline/src/db-host/{echo-host,local-queue-service,stub,queue-service.test}.ts` — implementation of the RPC service, out of scope.
- `packages/core/echo/echo-db/src/queue/{queue,queue-factory,queue-service,stub}.ts` — implementation of the imperative `Queue` class consumed by Group E (and the imperative `space.queues` API).
- `packages/core/compute/functions-runtime-cloudflare/src/internal/{queue-service-impl,service-container,functions-client}.ts` — Cloudflare worker glue (separate runtime; out of scope for this plan).
- `packages/core/compute/compute/src/ServiceResolver.ts:161` — JSDoc example mentioning `QueueService`.
- `packages/core/compute/conductor/src/types/compute.ts` (also in Group A).

## Roadmap

### Phase 4a — Trivial type/comment cleanup (this branch)

Items judged safe to land without behavioural changes. These DO NOT remove the `QueueService` Effect tag.

1. **`packages/devtools/cli/src/util/runtime.ts`**: drop `QueueService` from `AiChatServices`. No consumer in `commands/chat/` yields it, and `trigger-runtime.ts` will reflect the narrower alias. `spaceLayer` still publishes the tag because `commands/function/trace/trace.tsx` (D3) uses it; the alias only documents what `chatLayer` callers may yield.
2. **`packages/sdk/app-framework/src/common/capabilities.ts:150`**: update the JSDoc example to use `Feed.FeedService` instead of `QueueService` (purely cosmetic).
3. **`packages/core/compute/compute/src/ServiceResolver.ts:161`**: same — update JSDoc example.
4. **`packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:36`**: drop the stale `// TODO(burdon): Clear input queue also.` comment; `resetHistory` now resets via `Agent.resetChatHistory` and re-creates the `Feed` if absent.

### Phase 4b — Migrate Group D consumers

In approximate dependency order:

1. **D3 — `<Trace>` CLI component** (smallest blast radius; one file plus components).
2. **D4 — `WorkflowDebugPanel`** (or delete if dead code).
3. **D1 — `gpt.ts` history loader** (needs a `conversation`-to-`Feed` resolution decision).
4. **D2 — conductor `make-queue` / `queue` / `append` nodes** (likely a rename + input-schema change; affects saved graphs).
5. **D5 / D6 — drop `QueueService` from `local-function-execution.ts` and the mirror in `functions-runtime/testing/services.ts`.**
6. **D7 — `protocol.ts`** branch on `QueueService.key`.

### Phase 4c — Layer wiring cleanup

Once Group D is empty:

- Drop `QueueService` from `provides` in `plugin-client/.../layer-specs.ts:DatabaseLayerSpec`.
- Drop `QueueService` from `ServiceResolver.provide(...)` in `CanvasArticle.tsx`, `useChatProcessor.ts` (already done in Phase 3), `stories-assistant/testing/testing.tsx`, and any other surviving provide sites.
- Remove `QueueService` field from `ServiceContainer` (`functions-runtime/services/service-container.ts`).
- Collapse `spaceLayer`'s return type in `cli-util/src/util/space.ts` to `Database.Service` only.
- Remove `QueueService` from `FunctionServices`, `ComputeRequirements`, `ComputeServices`, `assistant-test-layer.ts` union, and `KNOWN_SERVICES`.

### Phase 4d — Delete the tag

- Delete `QueueService` and `feedServiceFromQueueServiceLayer` from `packages/core/echo/echo-db/src/effect-queue-service.ts`.
- Remove the re-export in `packages/core/compute/functions/src/services/queues.ts`.
- Remove all `Effect.provideService(QueueService, ...)` / `QueueService.layer(...)` / `QueueService.notAvailable` / `QueueService.make(...)` call sites.
- Remove `QueueService` imports across the repo.
- Replace the test factories (`test-database-layer.ts`, `compute-runtime/testing/layer.ts`) so they no longer need `feedServiceFromQueueServiceLayer`.

### Phase 5 (separate effort) — Imperative `space.queues` and `Queue` class

Group E sites use the imperative `QueueFactory` API (`space.queues.get`, `space.queues.create`, `queue.append`, `queue.queryObjects`). They are independent of the Effect tag. Migrating them to `Feed`-based APIs is a follow-up effort scoped per plugin/test, and is not blocked by Phase 4.

## Escape hatch

`feedServiceFromQueueServiceLayer` in `packages/core/echo/echo-db/src/effect-queue-service.ts` remains the bridge used by `test-database-layer.ts` and `compute-runtime/testing/layer.ts` to provide `Feed.FeedService` from a `QueueFactory`. Removed in Phase 4d.
