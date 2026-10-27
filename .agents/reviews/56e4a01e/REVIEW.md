---
branch: dm/jsonb-snapshots
commit: 56e4a01eab1806827d0fb3c19cf7b3996c6381ee
base: 04d5fb15a8b5e81ebbabcfc78abdadb969765750
mode: fast
createdAt: 2026-10-27T05:30:08.255Z
isFinalized: true
groups: 156
rules: [consistent-private-field-convention, deferred-callback-owns-its-context, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, isolate-benchmark-setup-and-flaky-tests, log-fire-and-forget-rejections, named-durations-and-budgets, namespace-brand-key-prefixing, no-casts, no-module-level-object-caches, no-sleep-in-test, no-try-catch-in-effect-code, prefer-branded-types-over-raw-primitives, retries-via-schedule-with-evidence, structured-logging-not-console, use-context-scoped-cancellation]
reviewId: 56e4a01e
---

_5 error(s), 20 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 56e4a01e-1 - ignored - prefer-branded-types-over-raw-primitives - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:48
- 56e4a01e-2 - ignored - log-fire-and-forget-rejections - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:188
- 56e4a01e-3 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:188
- 56e4a01e-4 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:596
- 56e4a01e-5 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:836
- 56e4a01e-6 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/feed/feed-handle.ts:79
- 56e4a01e-7 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/feed/feed-handle.ts:415
- 56e4a01e-8 - ignored - retries-via-schedule-with-evidence - packages/core/echo/echo-client/src/feed/feed-handle.ts:463
- 56e4a01e-9 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/feed/feed-handle.ts:823
- 56e4a01e-10 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:330
- 56e4a01e-11 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:997
- 56e4a01e-12 - ignored - no-module-level-object-caches - packages/core/echo/echo-host/src/query/query-executor.ts:189
- 56e4a01e-13 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:1171
- 56e4a01e-14 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:2222
- 56e4a01e-15 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:2679
- 56e4a01e-16 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:3164
- 56e4a01e-17 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/query/query-executor.ts:3368
- 56e4a01e-18 - resolved - named-durations-and-budgets - packages/core/echo/echo-host/src/query/snapshot-storage.bench.ts:202
- 56e4a01e-19 - ignored - isolate-benchmark-setup-and-flaky-tests - packages/core/echo/echo-host/src/query/snapshot-storage.bench.ts:214
- 56e4a01e-20 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/query/sql/compile.test.ts:135
- 56e4a01e-21 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-host/src/query/sql/compile.test.ts:350
- 56e4a01e-22 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/json-serializer.ts:280
- 56e4a01e-23 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:280
- 56e4a01e-24 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:280
- 56e4a01e-25 - ignored - no-casts - packages/core/echo/index-core/src/indexes/object-snapshot-index.test.ts:159

## Issues

# WARN 56e4a01e-1 prefer-branded-types-over-raw-primitives `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:48`

System One judges this a likely violation of `prefer-branded-types-over-raw-primitives` (Type a domain value with its existing branded type, not a raw string), p=0.80. The likeliest place is lines 48-65 (`export type ObjectUpdate = {`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-2 log-fire-and-forget-rejections `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:188`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.93. The likeliest place is lines 188-211 (`#recordKeys?: { records: readonly QueryService.QueryResult[]; keys: ReadonlyS...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-3 consistent-private-field-convention `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:188`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.80. The likeliest place is lines 188-211 (`#recordKeys?: { records: readonly QueryService.QueryResult[]; keys: ReadonlyS...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-4 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:596`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.88. The likeliest place is lines 596-619 (`timer ??= setTimeout(onTimer, budget);`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-5 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:836`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 836-859 (`const type = documentJsonb !== undefined ? Jsonb.readTopLevelString(documentJ...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-6 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/feed/feed-handle.ts:79`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.83. The likeliest place is lines 79-102 (`readonly #appendScheduler = new UpdateScheduler(this._ctx, () => this.#flushD...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-7 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/feed/feed-handle.ts:415`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 415-438 (`{`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-8 retries-via-schedule-with-evidence `packages/core/echo/echo-client/src/feed/feed-handle.ts:463`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.90. The likeliest place is lines 463-486 (`feedId: this._feedId,`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-9 use-context-scoped-cancellation `packages/core/echo/echo-client/src/feed/feed-handle.ts:823`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.91. The likeliest place is lines 823-846 (`this._error = error;`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-10 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:330`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.87. The likeliest place is lines 330-345 (`await expect.poll(() => received.at(-1)).toEqual({ fullText: { done: 0, total...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 56e4a01e-11 no-casts `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:997`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 997-1020 (`const readStoredHeads = host.automergeHost.getStoredHeads.bind(host.automerge...`, location confidence 0.14). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-12 no-module-level-object-caches `packages/core/echo/echo-host/src/query/query-executor.ts:189`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.88. The likeliest place is lines 189-203 (`manifest?: readonly QueryService.ManifestEntry[];`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-13 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:1171`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 1171-1194 (`if (TRACE_QUERY_EXECUTION) {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 56e4a01e-14 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:2222`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 2222-2245 (`throw new Error(`Unknown traversal type: ${(step.traversal as any)._tag}`);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-15 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:2679`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.84. The likeliest place is lines 2679-2702 (`async #readCurrentSnapshots(`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-16 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:3164`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 3164-3187 (`const extractQueueWindow = (step: QueryPlan.SelectStep): QueueWindow | undefi...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-17 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/query/query-executor.ts:3368`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 3368-3391 (`const parseEdges = (text: string): HopEdge[] | undefined => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-18 named-durations-and-budgets `packages/core/echo/echo-host/src/query/snapshot-storage.bench.ts:202`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.81. The likeliest place is lines 202-213 (`const run = <A>(fixture: Fixture, effect: Effect.Effect<A, unknown, SqlClient...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-19 isolate-benchmark-setup-and-flaky-tests `packages/core/echo/echo-host/src/query/snapshot-storage.bench.ts:214`

System One judges this a likely violation of `isolate-benchmark-setup-and-flaky-tests` (Move one-time setup out of the measured block; isolate flaky tests, never downgrade to reporting-only), p=0.82. The likeliest place is lines 214-225 (`bench(`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-20 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/query/sql/compile.test.ts:135`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 135-153 (`const run = (fixture: Fixture, query: Query.Any) =>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-21 namespace-brand-key-prefixing `packages/core/echo/echo-host/src/query/sql/compile.test.ts:350`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.86. The likeliest place is lines 350-361 (`it.effect('orders by an annotation value with non-scalars and missing values ...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 56e4a01e-22 no-casts `packages/core/echo/echo/src/internal/Obj/json-serializer.ts:280`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 280-292 (`const normalizeMeta = (meta: any): any => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 56e4a01e-23 no-casts `packages/core/echo/echo/src/Obj.ts:280`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 280-316 (`export const getSnapshot: <T extends Unknown>(obj: T) => Snapshot<T> = objInt...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 56e4a01e-24 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:280`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 280-316 (`export const getSnapshot: <T extends Unknown>(obj: T) => Snapshot<T> = objInt...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 56e4a01e-25 no-casts `packages/core/echo/index-core/src/indexes/object-snapshot-index.test.ts:159`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 159-170 (`expect(snapshots[0].recordId).toBe(object.recordId!);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `04d5fb15a8b5e81ebbabcfc78abdadb969765750`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 25 violations written to fragments, 266 uncertain, 700 clean, 0 unanswered
- left for an agentic reviewer: 83 batch(es)

```text
requests: 525 (157 verdicts re-asked with context the model requested)
estimated input tokens: 7569135
billed input tokens: 7559444 (cost $0.3175)
measured chars per token: 3.00
```
