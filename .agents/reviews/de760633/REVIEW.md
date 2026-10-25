---
branch: dm/serene-cray-cr404x
commit: de760633bbd3a8a5a66bb61566dbfc06fe2d417e
base: 39f6b21266cfdace7666c237e3b03ab3b290c399
mode: fast
createdAt: 2026-10-25T06:44:41.717Z
isFinalized: true
groups: 159
rules: [bounded-live-state, consistent-private-field-convention, deferred-callback-owns-its-context, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, event-handler-naming-convention, namespace-brand-key-prefixing, no-casts, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-sleep-in-test, no-try-catch-in-effect-code, store-events-not-projections, structured-logging-not-console]
reviewId: de760633
---

_7 error(s), 16 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- de760633-1 - ignored - no-sleep-in-test - packages/core/echo/echo-client-e2e/src/feed-options.test.ts:123
- de760633-2 - ignored - no-casts - packages/core/echo/echo-client/src/feed/feed.test.ts:737
- de760633-3 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:923
- de760633-4 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/db-host/echo-host.ts:124
- de760633-5 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-host/src/db-host/echo-host.ts:1655
- de760633-6 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/feed-data-source.ts:308
- de760633-7 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/db-host/query-service.ts:119
- de760633-8 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:318
- de760633-9 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/query-service.ts:486
- de760633-10 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:257
- de760633-11 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/query/query-executor.ts:401
- de760633-12 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:1277
- de760633-13 - ignored - no-module-level-object-caches - packages/core/echo/echo-host/src/query/query-executor.ts:1709
- de760633-14 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:1709
- de760633-15 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:2790
- de760633-16 - ignored - no-casts - packages/core/echo/feed/src/feed-store.test.ts:355
- de760633-17 - ignored - no-casts - packages/core/echo/feed/src/feed-store.ts:1056
- de760633-18 - ignored - bounded-live-state - packages/core/echo/feed/src/feed-store.ts:1128
- de760633-19 - ignored - store-events-not-projections - packages/core/echo/feed/src/feed-store.ts:1584
- de760633-20 - ignored - event-handler-naming-convention - packages/core/echo/feed/src/testing/test-builder.ts:64
- de760633-21 - ignored - structured-logging-not-console - packages/core/echo/feed/src/testing/test-builder.ts:131
- de760633-22 - resolved - bounded-live-state - packages/core/echo/index-core/src/feed-options-intent-store.ts:52
- de760633-23 - ignored - namespace-brand-key-prefixing - packages/core/echo/index-core/src/indexer-intent.ts:12

## Issues

# WARN de760633-1 no-sleep-in-test `packages/core/echo/echo-client-e2e/src/feed-options.test.ts:123`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.97. The likeliest place is lines 123-134 (`await EffectEx.runPromise(Feed.setRetention(feed, { maxAge: Duration.millis(M...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

Ignored: cross-runtime exception the rule allows -- the test checks wall-clock expiry end to end (client, host, SQLite store), where block timestamps (`FeedStore.appendLocal`) and the executor's age filter read `Date.now()`, so no virtual clock reaches them; the logic itself is covered under `TestClock` in `feed-store.test.ts`.

# ERROR de760633-2 no-casts `packages/core/echo/echo-client/src/feed/feed.test.ts:737`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 737-760 (`expect(EID.getEntityId(EID.parse(ref.uri))).toBe((queuePost as any).id);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: the `as any` casts at lines 737/745 are not in this PR's diff (the PR only adds the feed-options test at lines 311-344, which has no casts).

# ERROR de760633-3 no-casts `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:923`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 923-946 (`const readStoredHeads = host.automergeHost.getStoredHeads.bind(host.automerge...`, location confidence 0.13). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: lines 923-946 are not in this PR's diff; the PR's added lines in this file (592-667, 1078-1081) have no casts.

# WARN de760633-4 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/db-host/echo-host.ts:124`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 124-155 (`const trimUntilDone = <E, R>(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

Resolved: `trimUntilDone` is now `Effect.fnUntraced(function* <E, R>(...) {...})`.

# WARN de760633-5 deferred-callback-owns-its-context `packages/core/echo/echo-host/src/db-host/echo-host.ts:1655`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.81. The likeliest place is lines 1655-1678 (`this.#ftsFlushDeadline = undefined;`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: `#scheduleFtsFlush` (lines 1642-1667) is not in this PR's diff.

# WARN de760633-6 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/feed-data-source.ts:308`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.93. The likeliest place is lines 308-319 (`queuePosition: block.position ?? null,`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: both try/catch blocks exist on `origin/main`; the PR only adds the `queueInsertionId` field inside one.

# WARN de760633-7 event-handler-naming-convention `packages/core/echo/echo-host/src/db-host/query-service.ts:119`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 119-125 (`sendUnchanged: () => void;`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: line 119 is not in this PR's diff (the PR adds only the `feedStore` option and its pass-through).

# WARN de760633-8 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:318`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.87. The likeliest place is lines 318-329 (`async 'awaitQueryUpdates'(): Promise<void> {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: `awaitQueryUpdates` is not in this PR's diff.

# WARN de760633-9 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/query-service.ts:486`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 486-497 (`query.sendResults(results, query.executor.truncated);`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: line 486 is not in this PR's diff.

# WARN de760633-10 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:257`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 257-280 (`}`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: lines 257-280 are not in this PR's diff.

# WARN de760633-11 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/query/query-executor.ts:401`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 401-422 (`try {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: the try at line 401 is not in this PR's diff.

# ERROR de760633-12 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:1277`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 1277-1300 (`({ workingSet: newWorkingSet, trace } = await this._execSqlStep(step));`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: the `(step as any)._tag` cast at line 1280 is on `origin/main`; the PR's change in that range (1293-1295) has no cast.

# WARN de760633-13 no-module-level-object-caches `packages/core/echo/echo-host/src/query/query-executor.ts:1709`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.85. The likeliest place is lines 1709-1732 (`let cached = this.#inQuerySetCache.get(cacheKey);`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

False positive and pre-existing: `#inQuerySetCache` is an instance field reset per run, not a module-level cache, and is on `origin/main`.

# WARN de760633-14 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:1709`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.84. The likeliest place is lines 1709-1732 (`let cached = this.#inQuerySetCache.get(cacheKey);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: the class already mixed `_field` and `#field` on `origin/main`; the fields this PR adds (`#feedStore`, `#storeFeeds`) use `#`, as CLAUDE.md asks for new code.

# WARN de760633-15 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:2790`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 2790-2813 (`private async _filterUnresolvableStrongDeps(workingSet: QueryItem[]): Promise...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: the `console.log` at line 1073 and `_filterUnresolvableStrongDeps` are on `origin/main`, not in this PR's diff.

# ERROR de760633-16 no-casts `packages/core/echo/feed/src/feed-store.test.ts:355`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 355-378 (`expect(feed1Res.nextCursor).toBeDefined();`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: lines 355-378 are not in this PR's diff (the PR's tests start at line 1207 and add no casts).

# ERROR de760633-17 no-casts `packages/core/echo/feed/src/feed-store.ts:1056`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1056-1079 (`const key = block.feedId!;`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: the `block.feedId!` assertions at lines 1056/1058 are on `origin/main`; the PR only changes lines 1046-1050.

# ERROR de760633-18 bounded-live-state `packages/core/echo/feed/src/feed-store.ts:1128`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 1128-1151 (`RETURNING position, insertionId`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: the `INSERT INTO blocks` at line 1128 is on `origin/main`; this PR is what bounds the table, through `maxLength`/`maxAge` retention and the host cap.

# WARN de760633-19 store-events-not-projections `packages/core/echo/feed/src/feed-store.ts:1584`

System One judges this a likely violation of `store-events-not-projections` (Store what happened, and compute what follows from it when it is read), p=0.80. The likeliest place is lines 1584-1607 (`const maxLength = own !== undefined && cap !== undefined ? Math.min(own, cap)...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

False positive: `#limits` and `#notExpired` store only the feed's options (the fact) and derive the cap and the expiry cut-off from the clock at read time, as the rule asks.

# WARN de760633-20 event-handler-naming-convention `packages/core/echo/feed/src/testing/test-builder.ts:64`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 64-75 (`sendMessage: (ctx, msg) => this.#routeMessage(ctx, msg),`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: `sendMessage` at line 64 is not in this PR's diff (the PR adds only `setFeedOptions`), and it is a transport method, not a callback prop.

# WARN de760633-21 structured-logging-not-console `packages/core/echo/feed/src/testing/test-builder.ts:131`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 131-138 (`const loggingTransformer: Statement.Transformer = (stmt, _make, _, _span) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

Pre-existing: `loggingTransformer` is not in this PR's diff.

# ERROR de760633-22 bounded-live-state `packages/core/echo/index-core/src/feed-options-intent-store.ts:52`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.86. The likeliest place is lines 52-63 (`(intents: readonly FeedOptionsIntent[]): Effect.Effect<void, SqlError.SqlErro...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

Resolved: `FeedOptionsIntentStore.record` deletes the feed's pending row before inserting the new one, so the table holds at most one row per Feed object; the AUTOINCREMENT id keeps a concurrent `clear` from erasing it (test added; index-core SPEC D-13).

# WARN de760633-23 namespace-brand-key-prefixing `packages/core/echo/index-core/src/indexer-intent.ts:12`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.82. The likeliest place is lines 12-21 (`export type ConvergenceKeyIntent = {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

False positive: `kind: 'convergence-key'` is a discriminant of the `IndexerIntent` union, not a brand or annotation key.

## Appendix

### System One pass

- model: jev-latest
- base for context: `39f6b21266cfdace7666c237e3b03ab3b290c399`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 23 violations written to fragments, 362 uncertain, 1084 clean, 0 unanswered
- left for an agentic reviewer: 86 batch(es)

```text
requests: 757 (228 verdicts re-asked with context the model requested)
estimated input tokens: 11366093
billed input tokens: 11258280 (cost $0.4728)
measured chars per token: 3.03
```
