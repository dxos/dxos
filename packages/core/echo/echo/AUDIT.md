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

1. **Stale JSDoc — `Database.ts:41`.** `Queryable` comment refers to "Database and Queue"; should say "Database and Feed" (or, more accurately, "Database, Feed, and Hypergraph", all of which extend `Queryable`).

2. **`RefResolutionContext.queue` ([Hypergraph.ts:24–28](packages/core/echo/echo/src/Hypergraph.ts)).** The resolution-context API still uses `queue?: DXN`. After migration the natural shape is either:
   - rename to `feed?: Feed.Feed` and resolve to a queue DXN internally via `Feed.getQueueDxn`, or
   - keep the DXN but rename to e.g. `feedScope?: DXN` for naming consistency.
     This is a breaking API change for any code currently passing a queue DXN here.

3. **Stale deprecation pointer — `internal/Obj/ids.ts:8`.** `createQueueDXN` is `@deprecated Use db.queues.create()`, but `db.queues` is not part of the new Feed surface. The pointer should redirect to `Feed.make(...)` + `Feed.getQueueDxn(...)` (or the function should be removed entirely once call sites are gone).

4. **AST-level "queue" terminology — `Query.ts` + `internal/Query.ts`.** Scope keys `queues` and `allQueuesFromSpaces` (lines 362, 387, 414–426, 554; internal/Query.ts 124–130) and `DXN.kind.QUEUE` (Query.test.ts:576) leak the queue vocabulary into the public AST. The public input is `Feed`, but the wire format reads "queues". Renaming requires:
   - changing `QueryAST.QueryOptions`/scope schema (likely in `@dxos/echo-protocol` or wherever `QueryAST` is defined),
   - updating `Query.test.ts` assertions,
   - coordinating with the index/query backend that consumes this AST.
     Until then, this is the largest piece of "queue" terminology still surfaced through `@dxos/echo`.

5. **`org.dxos.type.queue` vs `org.dxos.type.feed`.** `Queue` registers typename `org.dxos.type.queue` (echo-db `queue/types.ts:88`); `Feed` registers `org.dxos.type.feed` (Feed.ts:47). Existing persisted `Ref(Queue)` fields point at the old typename. The migration helper `Feed.unsafeFromQueueDXN` exists, but a schema-level rewrite pass is needed for stored data and `Ref(Queue) → Ref(Feed.Feed)` typed fields.

6. **Behavioral gaps between `Queue` and `Feed`.** Callers using these `Queue` members must be rewritten, not just renamed:
   - `Queue.isLoading` / `Queue.error` / `Queue.objects` — no analogue on `Feed`; consumers must move to `Feed.query(...)` → `QueryResult.subscribe`.
   - `Queue.subscribe(callback)` — no analogue on `Feed`; must subscribe via `QueryResult.subscribe`.
   - `Queue.queryObjects()` / `Queue.getObjectsById()` / `Queue.refresh()` — replaced by `Feed.runQuery` / `Feed.query`.
   - `Queue.sync({ shouldPush, shouldPull })` — no analogue on `FeedService`. Either add to `FeedService` or expose at the EchoDB layer.
   - `Queue.delete(ids)` ↔ `Feed.remove(items)` — name differs and the parameter types differ (Queue takes ids, Feed takes objects/snapshots). Mechanical migration is non-trivial where call sites only have ids.

7. **Cursor / retention not yet implemented on Feed.** `Feed.cursor`, `Feed.next`, `Feed.nextOption`, `Feed.setRetention` are stubbed (`Effect.die`/`Effect.void`). Any caller relying on iteration semantics has no working replacement yet.
