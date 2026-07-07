# Feed Query Path Unification

Branch: `dm/feed-query-path`

## Goal

Remove parallel feed-query implementations and route all feed reads through the same hypergraph/indexer path as space queries.

## Current state

Three overlapping paths serve feed queries:

| Path | Location | Behavior |
|------|----------|----------|
| `Feed.FeedService` | `@dxos/echo/Feed.ts` | Deprecated Effect tag; unused except vestigial test wiring |
| `DatabaseImpl._queryFeed` | `echo-client/proxy-db/database.ts` | Intercepts `Scope.feed` queries and dispatches to `FeedHandle.query` when client-evaluable |
| `FeedQueryContext` | `echo-client/feed/feed-query-context.ts` | In-memory fetch + filter + order/skip/limit over polled queue JSON |

Space queries use `DatabaseImpl._query` → `Hypergraph.query` → working-set executor (client) or SQL indexer (host). Feed scopes are already supported in both executors (`FeedScope` in query plan).

Full-text and other index-only feed queries already fall through to the indexer. Simple filters take the `FeedQueryContext` shortcut.

## Target state

```
db.query(Query.select(filter).from(Scope.feed(uri)).limit(n).skip(k))
  → Hypergraph.query
  → working-set / SQL indexer (same as space-scoped queries)
```

- **No** `Feed.FeedService` Effect tag or `Feed.notAvailable` layer
- **No** `Database.queryFeed()` on the public `Database` interface
- **No** `FeedQueryContext` or `FeedHandle.query()` — `FeedHandle` retains append/delete/sync only
- **No** `isClientEvaluableFeedQuery` routing in `DatabaseImpl._query`
- `Feed.query` Effect helper delegates to `Database.query(...from(Scope.feed(...)))`

## Workstreams

### WS1 — Remove `Feed.FeedService`

- Delete `FeedService` class and `notAvailable` layer from `packages/core/echo/echo/src/Feed.ts`
- Remove stale references (`SandboxPlugin.test.ts`, JSDoc in `trace-pretty-print.ts`, skill docs)
- Verify no operation `services` arrays declare `Feed.FeedService`

### WS2 — Remove `Database.queryFeed` shortcut

- Remove `queryFeed` from `Database` interface (`echo/src/Database.ts`) and `DatabaseImpl`
- Remove `_queryFeed`, `getFeedScopeUri` feed routing branch, `isClientEvaluableFeedQuery`
- Update `Feed.query` in `Feed.ts` to use `Database.query` with `Scope.feed(Feed.getFeedUri(feed))`
- Ensure `Query.from(feed)` sugar still binds feed scope correctly

### WS3 — Remove `FeedQueryContext`

- Delete `feed-query-context.ts`
- Remove `FeedHandle.query`, polling-for-query path, `#queryResultCache` query usage
- Wire `WorkingSetDataProvider.getFeedItems` if not already connected for feed scopes
- Confirm indexer path handles order/skip/limit for feed scopes (planner must not push limit past feed filter steps)

## Preconditions (this PR)

Before refactoring, lock behavior in `@dxos/echo-client-e2e`:

1. Move `echo-client/src/query/query.test.ts` → `echo-client-e2e/src/query.test.ts`
2. Add `echo-client-e2e/src/feed-query-pagination.test.ts` covering feed-scoped:
   - `limit`, `skip`, `skip + limit`
   - `orderBy(Order.natural())` (insertion order)
   - `orderBy(Order.property(...))`
   - Both `from(feed)` and `Scope.feed(uri)` forms
   - Indexer path (`flush` + type filter) vs client-evaluable path

These tests are the regression gate for WS2/WS3.

## Out of scope

- Renaming `FeedProtocol.FeedService` RPC (wire protocol — separate concern)
- `Feed.ContextFeedService` (process-scoped feed injection for assistant tests)
- Feed append/delete/sync RPC paths
- Performance work on full-feed scan before skip/limit (documented TODO in old `FeedQueryContext`)

## Verification

```bash
moon run echo-client-e2e:test
moon run echo-client:build
moon run echo-client:test   # remaining unit tests only
```

After all workstreams:

```bash
moon run echo-client-e2e:test -- src/feed-query-pagination.test.ts
moon exec --on-failure continue --quiet :build
```
