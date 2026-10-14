---
branch: dm/pensive-curie-hlco63
commit: 31dc6d3a85d3fb95e4f6b0ffbcb11ea82fc0c4f8
base: 94d4f855ad36637b91c3c78d172a40007a62861e
mode: fast
createdAt: 2026-10-13T07:04:47.342Z
isFinalized: true
groups: 209
rules: [bounded-live-state, consistent-private-field-convention, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, extract-non-rendering-logic-from-component, no-casts, no-sleep-in-test, no-styling-wrapper-divs, structured-logging-not-console]
reviewId: 31dc6d3a
---

_6 error(s), 8 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 31dc6d3a-1 - ignored - no-sleep-in-test - packages/common/async/src/yield.test.ts:56
- 31dc6d3a-2 - ignored - no-casts - packages/common/sql-sqlite/src/internal/opfs-client.ts:139
- 31dc6d3a-3 - ignored - bounded-live-state - packages/core/compute/sparql-sqlite/src/store.ts:175
- 31dc6d3a-4 - resolved - error-messages-carry-context - packages/core/compute/sparql-sqlite/src/testing/w3c/results.ts:71
- 31dc6d3a-5 - ignored - no-casts - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:296
- 31dc6d3a-6 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:200
- 31dc6d3a-7 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:260
- 31dc6d3a-8 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:643
- 31dc6d3a-9 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:667
- 31dc6d3a-10 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:835
- 31dc6d3a-11 - ignored - no-casts - packages/core/echo/echo-panproto/src/react.ts:76
- 31dc6d3a-12 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/relay.test.ts:98
- 31dc6d3a-13 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:49
- 31dc6d3a-14 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:61

## Issues

# WARN 31dc6d3a-1 no-sleep-in-test `packages/common/async/src/yield.test.ts:56`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.82. The likeliest place is lines 56-64 (`const yielded = async (strategy: YieldStrategy): Promise<boolean> => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 31dc6d3a-2 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:139`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 139-150 (`sqlite3.vfs_register(vfs as any, false);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 31dc6d3a-3 bounded-live-state `packages/core/compute/sparql-sqlite/src/store.ts:175`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.85. The likeliest place is lines 175-186 (`sql.exec('CREATE TABLE IF NOT EXISTS dts (id INTEGER PRIMARY KEY, iri TEXT NO...`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN 31dc6d3a-4 error-messages-carry-context `packages/core/compute/sparql-sqlite/src/testing/w3c/results.ts:71`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 71-82 (`export const parseSrx = (xml: string): ResultSet => {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 31dc6d3a-5 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:296`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 296-319 (`throw new TimeoutError(hydrationTimeout, _describeStall(stalled, response.res...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 31dc6d3a-6 no-casts `packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:200`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 200-211 (`protected override async _close(): Promise<void> {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 31dc6d3a-7 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:260`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.88. The likeliest place is lines 260-283 (`throw new Error('Invalid query item');`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 31dc6d3a-8 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:643`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 643-666 (`const serializeItemGroupKey = (item: QueryItem): string => GroupBy.serializeG...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 31dc6d3a-9 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:667`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.87. The likeliest place is lines 667-690 (`private _plan: QueryPlan.Plan;`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 31dc6d3a-10 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:835`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 835-858 (`trace.details = JSON.stringify({ id: this._id, query: Query.pretty(Query.from...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 31dc6d3a-11 no-casts `packages/core/echo/echo-panproto/src/react.ts:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 76-88 (`},`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 31dc6d3a-12 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/relay.test.ts:98`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 98-105 (`const chatMessages = (chat: Chat.Chat) =>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 31dc6d3a-13 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:49`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 49-60 (`Hooks.useAsyncEffect(async () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 31dc6d3a-14 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 61-74 (`<div className='dx-expand grid grid-cols-3 gap-3 p-3'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `94d4f855ad36637b91c3c78d172a40007a62861e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 14 violations written to fragments, 357 uncertain, 1505 clean, 0 unanswered
- left for an agentic reviewer: 77 batch(es)

```text
requests: 919 (212 verdicts re-asked with context the model requested)
estimated input tokens: 9135912
billed input tokens: 8917371 (cost $0.3745)
measured chars per token: 3.07
```
