# Audit: Queue → Feed migration

`Queue` is deprecated in [packages/core/echo/echo-db/src/queue/types.ts](packages/core/echo/echo-db/src/queue/types.ts) and replaced by `Feed` in [packages/core/echo/echo/src/Feed.ts](packages/core/echo/echo/src/Feed.ts).

This document tracks call sites of `Queue` (and related "queue"-scoped APIs) and migration issues, package by package.

## Queue in `@dxos/echo` (packages/core/echo/echo/)

`@dxos/echo` does **not** import the `Queue` interface from `@dxos/echo-db` anywhere. However, several APIs in this package still expose the legacy "queue" vocabulary at the type, JSDoc, or AST-property level, even though their public surface is the new `Feed` type.

### Call sites

| File                                                                   | Lines              | Kind              | Notes                                                                                                                                            |
| ---------------------------------------------------------------------- | ------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Feed.ts](packages/core/echo/echo/src/Feed.ts)                         | 99–110             | API               | `Feed.getQueueDxn(feed)` — bridges a `Feed` object to its underlying queue DXN. Internal storage is still queue-shaped.                          |
| [Feed.ts](packages/core/echo/echo/src/Feed.ts)                         | 112–131            | API               | `Feed.unsafeFromQueueDXN(queueDxn)` — explicit migration helper for `Ref(Queue) → Ref(Feed.Feed)`.                                               |
| [Database.ts](packages/core/echo/echo/src/Database.ts)                 | 40–45              | JSDoc             | `Queryable` interface comment reads "Common interface for Database and Queue." Stale wording — should now read "Database and Feed".              |
| [Hypergraph.ts](packages/core/echo/echo/src/Hypergraph.ts)             | 24–28              | API               | `RefResolutionContext.queue?: DXN` — resolution context still names the field `queue` and accepts a raw queue DXN rather than a `Feed.Feed`.     |
| [Query.ts](packages/core/echo/echo/src/Query.ts)                       | 162–164            | API               | `from(feeds: Feed.Feed \| Feed.Feed[])` overload — public surface uses `Feed`, good.                                                             |
| [Query.ts](packages/core/echo/echo/src/Query.ts)                       | 362, 387           | AST               | `options?.includeFeeds` → emits `allQueuesFromSpaces: true` in the scope AST. AST key still uses legacy name.                                    |
| [Query.ts](packages/core/echo/echo/src/Query.ts)                       | 413–427            | AST               | `Query.from(feed)` converts feeds to queue DXNs via `Feed.getQueueDxn` and stores them under the `queues:` AST key.                              |
| [Query.ts](packages/core/echo/echo/src/Query.ts)                       | 554                | AST               | `SCOPE_KEYS = new Set(['spaceIds', 'queues', 'allQueuesFromSpaces'])` — scope key allowlist.                                                     |
| [internal/Query.ts](packages/core/echo/echo/src/internal/Query.ts)     | 124–130            | AST               | `formatScope` prints `queues: [...]` and `allQueuesFromSpaces: ...`.                                                                             |
| [internal/Obj/ids.ts](packages/core/echo/echo/src/internal/Obj/ids.ts) | 7–12               | Deprecated helper | `createQueueDXN(spaceId, queueId)` — JSDoc says `@deprecated Use db.queues.create()`. That replacement API does not exist; the pointer is stale. |
| [Query.test.ts](packages/core/echo/echo/src/Query.test.ts)             | 526, 563, 576, 585 | Tests             | Assert serialized AST uses `allQueuesFromSpaces`, `queues: [...]`, and `DXN.kind.QUEUE`. Verifies queue-shaped wire format.                      |

Mentions of the word "Queue" in [internal/common/proxy/change-context.ts](packages/core/echo/echo/src/internal/common/proxy/change-context.ts), [typed-handler.ts](packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts), and [ownership.ts](packages/core/echo/echo/src/internal/common/proxy/ownership.ts) refer to **batched notification queueing** (`queueNotification`, `queueOwnerNotification`) and are unrelated to the deprecated `Queue` type.

### Migration issues

1. **~~Stale JSDoc — `Database.ts:41`.~~** ✅ **Phase 1.** Updated to "Common interface for Database, Feed, and Hypergraph".

2. **~~`RefResolutionContext.queue` ([Hypergraph.ts:24–28](packages/core/echo/echo/src/Hypergraph.ts)).~~** ✅ **Phase 2.** Renamed field to `feed?: DXN` (still a queue-kinded DXN at the resolver layer). Callers updated in `echo-db/src/hypergraph.ts`, `echo-db/src/queue/queue-factory.ts`, `echo-db/src/client/index-query-source-provider.ts`, and `echo-db/src/testing/queue.test.ts`.

3. **~~Stale deprecation pointer — `internal/Obj/ids.ts:8`.~~** ✅ **Phase 1.** `@deprecated` pointer now references `Feed.make(...)` + `db.add(feed)` + `Feed.getQueueDxn(feed)`.

4. **~~AST-level "queue" terminology — `Query.ts` + `internal/Query.ts`.~~** ✅ **Phase 2.** Renamed in `@dxos/echo-protocol` `Scope` schema:
   - `queues` → `feeds`
   - `allQueuesFromSpaces` → `allFeedsFromSpaces`

   Producers and consumers updated across `@dxos/echo`, `@dxos/echo-query`, `@dxos/echo-db`, `@dxos/echo-pipeline`, `@dxos/app-toolkit`, and the relevant UI/plugin call sites (`react-ui-form`, `plugin-pipeline`, `plugin-space`, `plugin-debug`, `assistant-toolkit`). Wire-format breakage was accepted (no backwards-compat shim for serialized ASTs).

5. **~~`org.dxos.type.queue` vs `org.dxos.type.feed`.~~** ✅ **Phase 3** (disregarding stored-data migration per user direction). Removed the `Queue` schema declaration entirely from `echo-db/src/queue/types.ts` — the `Queue<T>` interface remains for typing runtime instances obtained via `QueueFactory`, but `org.dxos.type.queue` is no longer registered as a schema typename. Migrated `Ref(Queue) → Ref(Feed.Feed)` in:
   - `assistant-toolkit/src/types/Agent.ts` (`Agent.queue` field).
   - `conductor/src/nodes/registry.ts` (`make-queue` node output).
   - `conductor/src/nodes/gpt/gpt.ts` (`conversation` input/output).
   - `functions-runtime/src/trace.ts` (`InvocationTraceStartEvent.invocationTraceQueue` field and `InvocationSpan` type).
     `Feed.unsafeFromQueueDXN` is the bridge for any persisted `Ref(Queue)` data; we accepted breakage there.

6. **Behavioral gaps between `Queue` and `Feed`.** Callers using these `Queue` members must be rewritten, not just renamed:
   - `Queue.isLoading` / `Queue.error` / `Queue.objects` — no analogue on `Feed`; consumers must move to `Feed.query(...)` → `QueryResult.subscribe`.
   - `Queue.subscribe(callback)` — no analogue on `Feed`; must subscribe via `QueryResult.subscribe`.
   - `Queue.queryObjects()` / `Queue.getObjectsById()` / `Queue.refresh()` — replaced by `Feed.runQuery` / `Feed.query`.
   - `Queue.sync({ shouldPush, shouldPull })` — no analogue on `FeedService`. Either add to `FeedService` or expose at the EchoDB layer.
   - `Queue.delete(ids)` ↔ `Feed.remove(items)` — name differs and the parameter types differ (Queue takes ids, Feed takes objects/snapshots). Mechanical migration is non-trivial where call sites only have ids.
   - **Partial: pulled into Phase 3 by the schema rename.** `qualifier.ts` (assistant-toolkit project blueprint) was migrated from `queueTarget.append(items)` to `Feed.append(feed, items)` (Effect) and its operation now declares `Feed.FeedService` in `services`. Type/runtime mismatch at consumer boundaries (`useQuery`, `ExecutionGraphPanel`) is bridged with narrow casts in `devtools/InvocationTracePanel/InvocationTraceContainer.tsx`, `plugin-assistant/AgentArticle.tsx`, and `stories-assistant/ExecutionGraphModule.tsx` (TODOs flag the Feed-aware React integration that should replace them).

7. **Cursor / retention not yet implemented on Feed.** `Feed.cursor`, `Feed.next`, `Feed.nextOption`, `Feed.setRetention` are stubbed (`Effect.die`/`Effect.void`). Any caller relying on iteration semantics has no working replacement yet.

## Remaining phases

### Phase 4 — behavioral migration (#6) — partially complete

**Primitives landed:**

1. ✅ **`Feed.sync({ push, pull })` on `FeedService`** + bridge implementation in `echo-db/queue/feed-service.ts` + test.
2. ✅ **`useFeedQuery(feed, filter)` React hook** in `@dxos/react-client/echo`. Removes the three Phase 3 stopgap casts (InvocationTraceContainer, AgentArticle, ExecutionGraphModule).
3. ✅ **Reactive-subscribe test coverage** in [feed.test.ts](packages/core/echo/echo-db/src/queue/feed.test.ts) (`fire: true` + appended-item path).
4. ✅ **`createFeedServiceLayer` re-exported** from `@dxos/client/echo` so plugins don't need a runtime dependency on `@dxos/echo-db`.

**Consumer migrations landed:**

| File                                                                                                                     | Pattern                             | Replacement                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [plugin-feed/curate-magazine.ts](packages/plugins/plugin-feed/src/operations/curate-magazine.ts)                         | `queue.queryObjects()`              | `Feed.runQuery` Effect with per-call layer                                                             |
| [plugin-feed/sync-feed.ts](packages/plugins/plugin-feed/src/operations/sync-feed.ts)                                     | `queue.append(items)`               | `Feed.append` Effect                                                                                   |
| [plugin-bluesky/operations/sync.ts](packages/plugins/plugin-bluesky/src/operations/sync.ts)                              | `queue.append(items)`               | `EchoFeed.append` Effect                                                                               |
| [plugin-space/commands/queue/query.ts](packages/plugins/plugin-space/src/commands/queue/query.ts)                        | `queue.queryObjects()`              | `Feed.unsafeFromQueueDXN` + `Feed.runQuery` Effect                                                     |
| [plugin-assistant/queue-logger.ts](packages/plugins/plugin-assistant/src/queue-logger.ts)                                | main `_invocationTraceQueue.append` | `Feed.append` via `_appendToTraceFeed` helper. Per-invocation trace event queues retained — see below. |
| [stories-assistant/ResearchInputModule.tsx](packages/stories/stories-assistant/src/components/ResearchInputModule.tsx)   | `queue?.objects.map(...)`           | `useFeedQuery(feed, Filter.everything())`                                                              |
| [stories-assistant/ResearchOutputModule.tsx](packages/stories/stories-assistant/src/components/ResearchOutputModule.tsx) | `queue?.objects.map(...)`           | `useFeedQuery(feed, Filter.everything())`                                                              |

**Verified already Feed-aware (no change needed):**

- [plugin-slack/operations/sync.ts](packages/plugins/plugin-slack/src/operations/sync.ts) — `Feed.append`.
- [plugin-automation/capabilities/compute-runtime.ts](packages/plugins/plugin-automation/src/capabilities/compute-runtime.ts) — `createFeedServiceLayer`.
- [plugin-thread/operations/append-channel-message.ts](packages/plugins/plugin-thread/src/operations/append-channel-message.ts) — `Feed.append`.
- [plugin-assistant/operations/run-prompt-in-new-chat.ts](packages/plugins/plugin-assistant/src/operations/run-prompt-in-new-chat.ts) — `createFeedServiceLayer`.

**Remaining consumers — deferred to Phase 6** (require architectural changes, not mechanical migration):

| File                                                                                                                                                           | Why deferred                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [plugin-transcription/transcriber/transcription-manager.ts](packages/plugins/plugin-transcription/src/transcriber/transcription-manager.ts)                    | Class state `_queue: Queue<Message>` set via `setQueue(queue)`. Caller `plugin-meeting/handle-payload.ts` constructs the queue from a stored DXN string — Feed migration requires a data-model change so `transcriptDxn` becomes a `Ref(Feed.Feed)`. |
| [plugin-transcription/normalization/message-normalizer.ts](packages/plugins/plugin-transcription/src/normalization/message-normalizer.ts)                      | Class state uses `queue.objects.filter`, `queue.subscribe`, `queue.append` — full reactive pattern is tied to the `Queue<T>` runtime interface. Rewrite to `Feed.query(...).subscribe(...)` is invasive.                                             |
| [plugin-transcription/hooks/useQueueModelAdapter.ts](packages/plugins/plugin-transcription/src/hooks/useQueueModelAdapter.ts)                                  | Reads `queue.isLoading`, `queue.objects` directly. No 1:1 Feed equivalent — `useFeedQuery` returns objects but doesn't expose loading state.                                                                                                         |
| [plugin-assistant/queue-logger.ts](packages/plugins/plugin-assistant/src/queue-logger.ts) (per-invocation trace event queues)                                  | The per-invocation queues are addressed by raw DXN with no backing `Feed.Feed` object. Migration is blocked on either (a) materializing a Feed per invocation, or (b) a lower-level `FeedService.appendByDxn` primitive.                             |
| [plugin-assistant/containers/ChatContainer/ChatContainer.tsx](packages/plugins/plugin-assistant/src/containers/ChatContainer/ChatContainer.tsx)                | UI component holds a `Queue` and consumes `queue.objects` deep inside its render tree.                                                                                                                                                               |
| [assistant-toolkit/crud/graph.ts](packages/core/compute/assistant-toolkit/src/crud/graph.ts)                                                                   | Uses `ContextQueueService` Context.Tag (`{ queue: Queue<T> }`). Migration requires a parallel `ContextFeedService` (or replacement of the existing Tag) plus updating every provider.                                                                |
| [devtools/QueuesPanel.tsx](packages/devtools/devtools/src/panels/echo/QueuesPanel/QueuesPanel.tsx)                                                             | DXN-driven debug panel — `useQueue` is the correct entrypoint for a raw queue DXN. `useFeedQuery` requires a persisted `Feed.Feed`.                                                                                                                  |
| [devtools/InvocationTracePanel/hooks.ts](packages/devtools/devtools/src/panels/edge/InvocationTracePanel/hooks.ts)                                             | DXN-driven polling — same constraint as `QueuesPanel`.                                                                                                                                                                                               |
| Conductor compute nodes ([registry.ts](packages/core/compute/conductor/src/nodes/registry.ts), [gpt.ts](packages/core/compute/conductor/src/nodes/gpt/gpt.ts)) | Use `QueueService` (the low-level `QueueAPI` factory) directly — not the `Queue<T>` interface. Out of scope for Queue→Feed migration; will continue to work after Phase 6.                                                                           |

### Phase 5 — implement Feed iteration / retention (#7)

**Status:** speculative. No consumer currently imports `Feed.cursor`, `Feed.next`, `Feed.nextOption`, or `Feed.setRetention`. Phase 5 can be deferred indefinitely; this spec captures the intended shape so it can be picked up when a real use case arrives.

**Cursor iteration:**

- `Feed.cursor<T>(feed): Effect<Cursor<T>, never, FeedService>` — opens an iteration session over the underlying queue starting from the first item.
- `Feed.next<T>(cursor): Effect<T, FeedExhausted, FeedService>` — pulls the next item, failing with `FeedExhausted` at end-of-stream.
- `Feed.nextOption<T>(cursor): Effect<Option<T>, never, FeedService>` — same as `next` but returns `Option.none` instead of failing at end-of-stream.
- Internally backed by the existing queue block-level cursor that the indexer already uses ([queue-data-source.ts](packages/core/echo/echo-pipeline/src/db-host/queue-data-source.ts)); expose it through `FeedService.cursor(feed)` returning a token that opaquely carries the queue DXN, namespace, and last-read position.
- Likely worth surfacing as an Effect `Stream` (`Feed.stream(feed): Stream<T>`) once the primitive lands, since `.cursor` + `.next` is awkward in Effect-gen code.

**Retention:**

- `Feed.setRetention(feed, options): Effect<void, never, FeedService>` where `options: { cursor?: string; count?: number }` — set local-only retention policy (server-side eviction is out of scope).
- Requires a `FeedService.setRetention(feed, options)` method and a wire-protocol change in the EDGE queue service to honor a retention hint.
- Open question: where does retention state live — on the `Feed.Feed` schema as a field, or on the queue server as side data? Until that's decided, leave `setRetention` as `Effect.void`.

**Testing:**

- Add cursor iteration tests in [feed.test.ts](packages/core/echo/echo-db/src/queue/feed.test.ts) mirroring the existing append/query tests.
- Add a retention test once the wire-protocol piece is in place.

### Phase 6 — delete the legacy `Queue<T>` surface

In progress (PR #11337 + follow-ups).

**Prerequisite primitives:**

| Primitive | Status | Unblocks |
| --------- | ------ | -------- |
| `FeedService.appendByDxn(queueDxn, items)` | ✅ landed in PR #11337 | per-invocation trace queues in `plugin-assistant/queue-logger.ts` |
| `FeedService.queryByDxn(queueDxn, filter)` + `useFeedQueryByDxn(dxn, filter)` React hook | ⬜ next | DXN-driven debug panels (devtools `QueuesPanel`, `InvocationTracePanel/hooks.ts`) |
| `ContextFeedService` Context.Tag with `{ feed: Feed.Feed }` (replaces `ContextQueueService`) | ⬜ | `assistant-toolkit/crud/graph.ts` (graph_writer toolkit) |
| `useFeedQuery` extended with loading state (or parallel `useFeedQueryWithState`) | ⬜ | `plugin-transcription/hooks/useQueueModelAdapter.ts` |

**Consumer migrations after primitives land:**

- ✅ `plugin-assistant/queue-logger.ts` per-invocation queues (PR #11337).
- ⬜ `plugin-transcription/transcriber/transcription-manager.ts`.
- ⬜ `plugin-transcription/normalization/message-normalizer.ts`.
- ⬜ `plugin-transcription/hooks/useQueueModelAdapter.ts`.
- ⬜ `plugin-assistant/containers/ChatContainer/ChatContainer.tsx`.
- ⬜ `assistant-toolkit/crud/graph.ts`.
- ⬜ `devtools/panels/echo/QueuesPanel/QueuesPanel.tsx`.
- ⬜ `devtools/panels/edge/InvocationTracePanel/hooks.ts`.
- ⬜ `sdk/client/src/util/helpers.ts`.

**Deletions** (after all consumers migrate):

- `Queue<T>` interface in [echo-db/queue/types.ts](packages/core/echo/echo-db/src/queue/types.ts).
- `QueueFactory`, `QueueImpl`, `MemoryQueue`, and the legacy `QueueService` in [echo-db/queue/](packages/core/echo/echo-db/src/queue/) — or repurpose them as Feed internals.
- The legacy `effect-queue-service.ts` bridge layer (and its `ContextQueueService` export).
- The `useQueue` hook in `@dxos/react-client/echo` (replaced by `useFeedQuery` / `useFeedQueryByDxn`).
- All remaining `as Queue` stopgap casts (2 known: `InvocationTraceContainer.tsx` line 201 boundary for `ExecutionGraphPanel`, `ExecutionGraphModule.tsx` line 20 boundary for `useExecutionGraph`).

**Downstream API changes:**

- `useExecutionGraph(queue?: Queue)` in `react-ui-components` → accept `Feed.Feed`.
- `ExecutionGraphPanel` in `devtools` → accept `Feed.Feed`.
- Re-exports through `@dxos/client/echo` — drop `type Queue` (keep `createFeedServiceLayer`).

### Phase 7 — optional: make `Feed.Feed` directly Queryable

Not currently planned; needs design. Options:

1. `useFeedQuery` hook only (covered by Phase 4 — recommended baseline).
2. Make `Ref(Feed.Feed).target` return a runtime handle bundling Feed data + Queryable methods.
3. Merge `Queue<T>` interface into `Feed.Feed` (extends Phase 6 with a richer runtime type).

**Suggested order:** 4 → 6 → 5. Phase 5 (cursor/retention) is functionally orthogonal and can slip; the priority is finishing #6 so `Queue` can be deleted.
