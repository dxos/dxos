---
branch: dm/jsonb-snapshots
commit: c1411d28780159a531db7c365596539ca5f0ee4a
base: 5ae589b2c6005ecc91b783e266d9d07a6c93385d
mode: fast
createdAt: 2026-10-27T12:22:22.814Z
isFinalized: true
groups: 156
rules: [consistent-private-field-convention, deferred-callback-owns-its-context, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, isolate-benchmark-setup-and-flaky-tests, log-fire-and-forget-rejections, namespace-brand-key-prefixing, no-casts, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-sleep-in-test, no-try-catch-in-effect-code, prefer-branded-types-over-raw-primitives, retries-via-schedule-with-evidence, structured-logging-not-console, subpath-lint-not-adhoc-entrypoints, use-context-scoped-cancellation]
reviewId: c1411d28
---

_6 error(s), 22 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c1411d28-1 - ignored - subpath-lint-not-adhoc-entrypoints - packages/common/util/package.json:13
- c1411d28-2 - ignored - no-casts - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:232
- c1411d28-3 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:568
- c1411d28-4 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:587
- c1411d28-5 - ignored - prefer-branded-types-over-raw-primitives - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:48
- c1411d28-6 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:191
- c1411d28-7 - ignored - log-fire-and-forget-rejections - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:215
- c1411d28-8 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:599
- c1411d28-9 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:975
- c1411d28-10 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/feed/feed-handle.ts:79
- c1411d28-11 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/feed/feed-handle.ts:415
- c1411d28-12 - ignored - retries-via-schedule-with-evidence - packages/core/echo/echo-client/src/feed/feed-handle.ts:463
- c1411d28-13 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/feed/feed-handle.ts:823
- c1411d28-14 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:330
- c1411d28-15 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:997
- c1411d28-16 - ignored - no-module-level-object-caches - packages/core/echo/echo-host/src/query/query-executor.ts:189
- c1411d28-17 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:795
- c1411d28-18 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:1171
- c1411d28-19 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/query/query-executor.ts:2032
- c1411d28-20 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:2801
- c1411d28-21 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:3164
- c1411d28-22 - ignored - isolate-benchmark-setup-and-flaky-tests - packages/core/echo/echo-host/src/query/snapshot-storage.bench.ts:291
- c1411d28-23 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/query/sql/compile.test.ts:135
- c1411d28-24 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-host/src/query/sql/compile.test.ts:350
- c1411d28-25 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/json-serializer.ts:280
- c1411d28-26 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:280
- c1411d28-27 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:280
- c1411d28-28 - ignored - no-casts - packages/core/echo/index-core/src/indexes/object-snapshot-index.test.ts:256

## Issues

# WARN c1411d28-1 subpath-lint-not-adhoc-entrypoints `packages/common/util/package.json:13`

System One judges this a likely violation of `subpath-lint-not-adhoc-entrypoints` (Expose a package's modules as namespaces via the subpath lint, not hand-added entry points), p=0.80. The likeliest place is lines 13-24 (`"sideEffects": false,`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1411d28-2 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:232`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 232-243 (`loaded = { id: objectId } as unknown as Entity.Unknown;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-3 no-sleep-in-test `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:568`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 568-579 (`indexProgress,`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-4 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:587`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 587-594 (`const makeQueryClient = async (handlers: QueryService.Handlers): Promise<Quer...`, location confidence 0.26). Judged with added `imports, test` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-5 prefer-branded-types-over-raw-primitives `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:48`

System One judges this a likely violation of `prefer-branded-types-over-raw-primitives` (Type a domain value with its existing branded type, not a raw string), p=0.80. The likeliest place is lines 48-65 (`export type ObjectUpdate = {`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-6 consistent-private-field-convention `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:191`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.80. The likeliest place is lines 191-214 (`#recordKeys?: { records: readonly QueryService.QueryResult[]; keys: ReadonlyS...`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-7 log-fire-and-forget-rejections `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:215`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.94. The likeliest place is lines 215-238 (`this._reactiveQueryId = undefined;`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-8 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:599`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.85. The likeliest place is lines 599-622 (`timer ??= setTimeout(onTimer, budget);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-9 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:975`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 975-982 (`const typenameOf = (jsonb: Uint8Array): string | undefined => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-10 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/feed/feed-handle.ts:79`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.84. The likeliest place is lines 79-102 (`readonly #appendScheduler = new UpdateScheduler(this._ctx, () => this.#flushD...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-11 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/feed/feed-handle.ts:415`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 415-438 (`{`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-12 retries-via-schedule-with-evidence `packages/core/echo/echo-client/src/feed/feed-handle.ts:463`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.90. The likeliest place is lines 463-486 (`feedId: this._feedId,`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-13 use-context-scoped-cancellation `packages/core/echo/echo-client/src/feed/feed-handle.ts:823`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.91. The likeliest place is lines 823-846 (`this._error = error;`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-14 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:330`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.86. The likeliest place is lines 330-345 (`await expect.poll(() => received.at(-1)).toEqual({ fullText: { done: 0, total...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1411d28-15 no-casts `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:997`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 997-1020 (`const readStoredHeads = host.automergeHost.getStoredHeads.bind(host.automerge...`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-16 no-module-level-object-caches `packages/core/echo/echo-host/src/query/query-executor.ts:189`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.89. The likeliest place is lines 189-203 (`manifest?: readonly QueryService.ManifestEntry[];`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1411d28-17 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:795`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 795-810 (`const isGrouped = (workingSet: QueryItem[]): boolean => workingSet.length > 0...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-18 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:1171`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 1171-1194 (`if (TRACE_QUERY_EXECUTION) {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-19 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/query/query-executor.ts:2032`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 2032-2055 (`case 'ReferenceTraversal': {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-20 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:2801`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.85. The likeliest place is lines 2801-2824 (`if (this.#allFeedsSpaces.size === 0) {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-21 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:3164`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.88. The likeliest place is lines 3164-3187 (`const extractQueueWindow = (step: QueryPlan.SelectStep): QueueWindow | undefi...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-22 isolate-benchmark-setup-and-flaky-tests `packages/core/echo/echo-host/src/query/snapshot-storage.bench.ts:291`

System One judges this a likely violation of `isolate-benchmark-setup-and-flaky-tests` (Move one-time setup out of the measured block; isolate flaky tests, never downgrade to reporting-only), p=0.87. The likeliest place is lines 291-302 (`const fixture = await getFixture();`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-23 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/query/sql/compile.test.ts:135`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 135-153 (`const run = (fixture: Fixture, query: Query.Any) =>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-24 namespace-brand-key-prefixing `packages/core/echo/echo-host/src/query/sql/compile.test.ts:350`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.85. The likeliest place is lines 350-361 (`it.effect('orders by an annotation value with non-scalars and missing values ...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1411d28-25 no-casts `packages/core/echo/echo/src/internal/Obj/json-serializer.ts:280`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 280-292 (`const normalizeMeta = (meta: any): any => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1411d28-26 no-casts `packages/core/echo/echo/src/Obj.ts:280`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 280-316 (`export const getSnapshot: <T extends Unknown>(obj: T) => Snapshot<T> = objInt...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1411d28-27 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:280`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 280-316 (`export const getSnapshot: <T extends Unknown>(obj: T) => Snapshot<T> = objInt...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1411d28-28 no-casts `packages/core/echo/index-core/src/indexes/object-snapshot-index.test.ts:256`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 256-267 (`yield* metaIndex.update(objects);`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `5ae589b2c6005ecc91b783e266d9d07a6c93385d`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 28 violations written to fragments, 295 uncertain, 781 clean, 0 unanswered
- left for an agentic reviewer: 86 batch(es)

```text
requests: 559 (172 verdicts re-asked with context the model requested)
estimated input tokens: 8510694
billed input tokens: 8504358 (cost $0.3572)
measured chars per token: 3.00
```
