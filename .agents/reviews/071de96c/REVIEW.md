---
branch: dm/modest-curie-mxt0yo
commit: 071de96ce934e263e21a70b778c6a6248d6ef27b
base: b0f8d0f075bd294c86f51f4370832d97dbfca105
mode: fast
createdAt: 2026-10-26T13:27:29.835Z
isFinalized: true
groups: 141
rules: [consistent-private-field-convention, deprecated-tag-must-be-accurate, error-messages-carry-context, log-fire-and-forget-rejections, named-durations-and-budgets, no-casts, no-env-vars-in-low-level-modules, no-invented-theme-tokens, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-retries-or-skips-for-flaky-tests, no-sleep-in-test, no-try-catch-in-effect-code, store-events-not-projections, structured-logging-not-console]
reviewId: 071de96c
---

_4 error(s), 20 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 071de96c-1 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:187
- 071de96c-2 - ignored - log-fire-and-forget-rejections - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:667
- 071de96c-3 - ignored - no-casts - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:691
- 071de96c-4 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:739
- 071de96c-5 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/query/query-metrics.test.ts:63
- 071de96c-6 - ignored - store-events-not-projections - packages/core/echo/echo-client/src/query/query-metrics.ts:100
- 071de96c-7 - ignored - error-messages-carry-context - packages/core/echo/echo-client/src/query/query-result.ts:119
- 071de96c-8 - ignored - no-casts - packages/core/echo/echo-client/src/query/query-result.ts:428
- 071de96c-9 - ignored - no-module-level-object-caches - packages/core/echo/echo-client/src/query/query-result.ts:615
- 071de96c-10 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:329
- 071de96c-11 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:808
- 071de96c-12 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:996
- 071de96c-13 - ignored - deprecated-tag-must-be-accurate - packages/core/echo/echo-host/src/db-host/query-service.ts:249
- 071de96c-14 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:321
- 071de96c-15 - ignored - named-durations-and-budgets - packages/core/echo/echo-host/src/db-host/query-service.ts:441
- 071de96c-16 - ignored - store-events-not-projections - packages/core/echo/echo-host/src/db-host/query-service.ts:489
- 071de96c-17 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/query-service.ts:501
- 071de96c-18 - ignored - no-invented-theme-tokens - packages/devtools/devtools/src/containers/panels/echo/QueriesArticle/QueryMetricsTable.tsx:42
- 071de96c-19 - ignored - structured-logging-not-console - packages/sdk/client-e2e/src/space-archive-queries.bench.ts:50
- 071de96c-20 - resolved - named-durations-and-budgets - packages/sdk/client-e2e/src/space-archive-queries.bench.ts:94
- 071de96c-21 - ignored - no-casts - packages/sdk/client-e2e/src/spaces.test.ts:305
- 071de96c-22 - ignored - no-retries-or-skips-for-flaky-tests - packages/sdk/client-e2e/src/spaces.test.ts:953
- 071de96c-23 - ignored - no-env-vars-in-low-level-modules - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:190
- 071de96c-24 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:490

## Issues

# WARN 071de96c-1 consistent-private-field-convention `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:187`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.83. The likeliest place is lines 187-210 (`#recordKeys?: { records: readonly QueryService.QueryResult[]; keys: ReadonlyS...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-2 log-fire-and-forget-rejections `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:667`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.94. The likeliest place is lines 667-690 (`private async _hydrateRecord(`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 071de96c-3 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:691`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 691-714 (`throw err;`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-4 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:739`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 739-762 (`record: Object.freeze(JSON.parse(result.recordJson)),`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-5 no-sleep-in-test `packages/core/echo/echo-client/src/query/query-metrics.test.ts:63`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.97. The likeliest place is lines 63-74 (`).run();`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-6 store-events-not-projections `packages/core/echo/echo-client/src/query/query-metrics.ts:100`

System One judges this a likely violation of `store-events-not-projections` (Store what happened, and compute what follows from it when it is read), p=0.81. The likeliest place is lines 100-111 (`executed(query: string, duration: number, count: number, kind: 'run' | 'react...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-7 error-messages-carry-context `packages/core/echo/echo-client/src/query/query-result.ts:119`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 119-130 (`async first(opts?: { timeout?: number }): Promise<T> {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 071de96c-8 no-casts `packages/core/echo/echo-client/src/query/query-result.ts:428`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 428-439 (`const _asResultRows = <T>(rows: readonly unknown[]): T[] => rows as unknown a...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-9 no-module-level-object-caches `packages/core/echo/echo-client/src/query/query-result.ts:615`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.80. The likeliest place is lines 615-618 (`const QUERY_FINALIZATION = new FinalizationRegistry<WeakRef<QueryDiagnostic>>...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-10 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:329`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.87. The likeliest place is lines 329-344 (`await expect.poll(() => received.at(-1)).toEqual({ fullText: { done: 0, total...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-11 consistent-private-field-convention `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:808`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.80. The likeliest place is lines 808-819 (`vi.spyOn(host['_spaceStateManager'], 'spaceIds', 'get').mockReturnValue([spac...`, location confidence 0.46). Judged with added `test` context after a first pass of 0.16. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 071de96c-12 no-casts `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:996`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 996-1019 (`const readStoredHeads = host.automergeHost.getStoredHeads.bind(host.automerge...`, location confidence 0.10). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-13 deprecated-tag-must-be-accurate `packages/core/echo/echo-host/src/db-host/query-service.ts:249`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.82. The likeliest place is lines 249-260 (`return Effect.void;`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-14 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:321`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 321-332 (`async 'awaitQueryUpdates'(): Promise<void> {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-15 named-durations-and-budgets `packages/core/echo/echo-host/src/db-host/query-service.ts:441`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.83. The likeliest place is lines 441-452 (`let sliceStart = performance.now();`, location confidence 0.81). Judged with added `imports` context after a first pass of 0.73. This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-16 store-events-not-projections `packages/core/echo/echo-host/src/db-host/query-service.ts:489`

System One judges this a likely violation of `store-events-not-projections` (Store what happened, and compute what follows from it when it is read), p=0.80. The likeliest place is lines 489-500 (`query.debouncedUntil =`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-17 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/query-service.ts:501`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 501-512 (`query.sendUnchanged(finishedAt - begin);`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-18 no-invented-theme-tokens `packages/devtools/devtools/src/containers/panels/echo/QueriesArticle/QueryMetricsTable.tsx:42`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.84. The likeliest place is lines 42-53 (`},`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-19 structured-logging-not-console `packages/sdk/client-e2e/src/space-archive-queries.bench.ts:50`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 50-63 (`const openArchive = async (path: string): Promise<Space> => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-20 named-durations-and-budgets `packages/sdk/client-e2e/src/space-archive-queries.bench.ts:94`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.83. The likeliest place is lines 94-105 (`const burst = async (space: Space, queries: readonly Query.Any[], awaited: nu...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 071de96c-21 no-casts `packages/sdk/client-e2e/src/spaces.test.ts:305`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 305-328 (`const feed2 = hypercoreStore2.getHypercore(feedKey!)!;`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-22 no-retries-or-skips-for-flaky-tests `packages/sdk/client-e2e/src/spaces.test.ts:953`

System One judges this a likely violation of `no-retries-or-skips-for-flaky-tests` (Fix a flaky test's cause; don't add retries, CI skips, or lean on quarantine), p=0.93. The likeliest place is lines 953-976 (`test('import archive applies tags to the new space', { timeout: 5_000, retry:...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-23 no-env-vars-in-low-level-modules `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:190`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.92. The likeliest place is lines 190-201 (`);`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 071de96c-24 no-try-catch-in-effect-code `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:490`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 490-501 (`messages: blocks.map((block) => JSON.parse(Buffer.from(block.data, 'base64')....`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b0f8d0f075bd294c86f51f4370832d97dbfca105`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 24 violations written to fragments, 444 uncertain, 308 clean, 0 unanswered
- left for an agentic reviewer: 90 batch(es)

```text
requests: 464 (259 verdicts re-asked with context the model requested)
estimated input tokens: 5715666
billed input tokens: 5709808 (cost $0.2398)
measured chars per token: 3.00
```
