---
branch: dm/oct-23-lkdg2j
commit: 0d76f61ed5c3809a1b3ad09771ad3b36abb5f89a
base: a70fb5a37303bc85789601b9c88130d67b89e92d
mode: fast
createdAt: 2026-10-25T04:16:12.670Z
isFinalized: true
groups: 86
rules: [bounded-live-state, deferred-callback-owns-its-context, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, no-casts, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-try-catch-in-effect-code]
reviewId: 0d76f61e
---

_2 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 0d76f61e-1 - ignored - no-module-level-object-caches - packages/core/echo/echo-client/src/core-db/object-core.ts:44
- 0d76f61e-2 - ignored - error-messages-carry-context - packages/core/echo/echo-client/src/core-db/object-core.ts:329
- 0d76f61e-3 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/object-core.ts:425
- 0d76f61e-4 - ignored - bounded-live-state - packages/core/echo/echo-host/src/db-host/echo-host.ts:249
- 0d76f61e-5 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/echo-host.ts:609
- 0d76f61e-6 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-host/src/db-host/echo-host.ts:1295
- 0d76f61e-7 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165
- 0d76f61e-8 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/query/sql/explain.test.ts:27

## Issues

# WARN 0d76f61e-1 no-module-level-object-caches `packages/core/echo/echo-client/src/core-db/object-core.ts:44`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.87. The likeliest place is lines 44-64 (`export interface IDatabaseBinding {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0d76f61e-2 error-messages-carry-context `packages/core/echo/echo-client/src/core-db/object-core.ts:329`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 329-352 (`getDoc(): AutomergeDoc<unknown> {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 0d76f61e-3 no-casts `packages/core/echo/echo-client/src/core-db/object-core.ts:425`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 425-448 (`this.#writeAndRefresh(() => handle.change(changeFn, options));`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 0d76f61e-4 bounded-live-state `packages/core/echo/echo-host/src/db-host/echo-host.ts:249`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 249-272 (`readonly #knownRetirements = new Map<DocumentId, Retirement & { spaceId: Spac...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0d76f61e-5 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/echo-host.ts:609`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 609-632 (`.pipe(RuntimeProvider.runPromise(this._runtime));`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0d76f61e-6 deferred-callback-owns-its-context `packages/core/echo/echo-host/src/db-host/echo-host.ts:1295`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.82. The likeliest place is lines 1295-1318 (`#scheduleReclaim(spaceId: SpaceId, departed: DocumentId[], retiredRoot?: Docu...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0d76f61e-7 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/space-state-manager.ts:165`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 165-176 (`async removeSpace(spaceId: SpaceId): Promise<void> {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0d76f61e-8 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/query/sql/explain.test.ts:27`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 27-41 (`const explain = (query: Query.Any) =>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a70fb5a37303bc85789601b9c88130d67b89e92d`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 225 uncertain, 112 clean, 0 unanswered
- left for an agentic reviewer: 75 batch(es)

```text
requests: 272 (101 verdicts re-asked with context the model requested)
estimated input tokens: 4179015
billed input tokens: 4222990 (cost $0.1774)
measured chars per token: 2.97
```
