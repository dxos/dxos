---
branch: main-mf2dnc
commit: f3c9ed3cd667a232cdf5aa5c0ac911472f192038
base: b0f8d0f075bd294c86f51f4370832d97dbfca105
mode: fast
createdAt: 2026-10-26T04:15:56.278Z
isFinalized: true
groups: 88
rules: [consistent-private-field-convention, error-messages-carry-context, log-fire-and-forget-rejections, no-casts, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-sleep-in-test, no-try-catch-in-effect-code, prefer-branded-types-over-raw-primitives, use-context-scoped-cancellation]
reviewId: f3c9ed3c
---

_2 error(s), 12 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f3c9ed3c-1 - ignored - no-casts - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230
- f3c9ed3c-2 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:494
- f3c9ed3c-3 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:513
- f3c9ed3c-4 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:513
- f3c9ed3c-5 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:122
- f3c9ed3c-6 - ignored - log-fire-and-forget-rejections - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:210
- f3c9ed3c-7 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:642
- f3c9ed3c-8 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:786
- f3c9ed3c-9 - ignored - no-casts - packages/core/echo/echo-client/src/query/query-result.ts:312
- f3c9ed3c-10 - ignored - error-messages-carry-context - packages/core/echo/echo-client/src/query/query-result.ts:408
- f3c9ed3c-11 - ignored - no-module-level-object-caches - packages/core/echo/echo-client/src/query/query-result.ts:612
- f3c9ed3c-12 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/query/working-set-executor.ts:770
- f3c9ed3c-13 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/query/working-set-view.ts:39
- f3c9ed3c-14 - ignored - prefer-branded-types-over-raw-primitives - packages/core/echo/echo-client/src/query/working-set-view.ts:123

## Issues

# ERROR f3c9ed3c-1 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:230`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 230-241 (`loaded = { id: objectId } as unknown as Entity.Unknown;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f3c9ed3c-2 no-sleep-in-test `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:494`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 494-505 (`indexProgress,`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN f3c9ed3c-3 consistent-private-field-convention `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:513`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.85. The likeliest place is lines 513-520 (`const makeQueryClient = async (handlers: QueryService.Handlers): Promise<Quer...`, location confidence 0.07). Judged with added `test` context after a first pass of 0.15. This is a single-shot classifier: confirm against the rule before acting.

# WARN f3c9ed3c-4 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:513`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 513-520 (`const makeQueryClient = async (handlers: QueryService.Handlers): Promise<Quer...`, location confidence 0.23). Judged with added `imports, test` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN f3c9ed3c-5 consistent-private-field-convention `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:122`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.81. The likeliest place is lines 122-137 (`export class IndexQuerySource implements RemoteQuerySource {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN f3c9ed3c-6 log-fire-and-forget-rejections `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:210`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.93. The likeliest place is lines 210-233 (`void this._hydrationCtx?.dispose().catch(() => {});`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN f3c9ed3c-7 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:642`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.89. The likeliest place is lines 642-665 (`private async _hydrateChunk(`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN f3c9ed3c-8 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:786`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 786-809 (`const json = JSON.parse(result.documentJson);`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f3c9ed3c-9 no-casts `packages/core/echo/echo-client/src/query/query-result.ts:312`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 312-323 (`entries: groupEntries as unknown as QueryResult.EntityEntry<T>[],`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN f3c9ed3c-10 error-messages-carry-context `packages/core/echo/echo-client/src/query/query-result.ts:408`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 408-417 (`'Query must have at least 1 subscriber for `.results` and `.entries` to be us...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN f3c9ed3c-11 no-module-level-object-caches `packages/core/echo/echo-client/src/query/query-result.ts:612`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.84. The likeliest place is lines 612-615 (`const QUERY_FINALIZATION = new FinalizationRegistry<WeakRef<QueryDiagnostic>>...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN f3c9ed3c-12 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/query/working-set-executor.ts:770`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 770-788 (`const _valueReferencesAny = (value: unknown, targetIds: Set<EntityId>): boole...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN f3c9ed3c-13 consistent-private-field-convention `packages/core/echo/echo-client/src/query/working-set-view.ts:39`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.80. The likeliest place is lines 39-50 (`export class WorkingSetView {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN f3c9ed3c-14 prefer-branded-types-over-raw-primitives `packages/core/echo/echo-client/src/query/working-set-view.ts:123`

System One judges this a likely violation of `prefer-branded-types-over-raw-primitives` (Type a domain value with its existing branded type, not a raw string), p=0.80. The likeliest place is lines 123-134 (`survivorId(id: string): string {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b0f8d0f075bd294c86f51f4370832d97dbfca105`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 14 violations written to fragments, 243 uncertain, 134 clean, 0 unanswered
- left for an agentic reviewer: 69 batch(es)

```text
requests: 235 (128 verdicts re-asked with context the model requested)
estimated input tokens: 3120581
billed input tokens: 3079988 (cost $0.1294)
measured chars per token: 3.04
```
