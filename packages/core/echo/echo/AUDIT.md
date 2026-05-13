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
