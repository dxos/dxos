---
branch: dm/serene-hamilton-bdd2oe
commit: a441cba497b53b99a61d069e8e227122d7637fd3
base: 17f7b8acf42c465392398e877b28f07cc77b7d81
mode: fast
createdAt: 2026-10-03T07:04:26.737Z
isFinalized: true
groups: 54
rules: [error-messages-carry-context, event-handler-naming-convention, namespace-brand-key-prefixing, no-casts, no-mixed-promise-effect-lifecycle, structured-logging-not-console, use-context-scoped-cancellation]
reviewId: a441cba4
---

_1 error(s), 7 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a441cba4-1 - ignored - namespace-brand-key-prefixing - packages/core/compute/assistant-e2e/src/playwright/perf/suite.ts:1
- a441cba4-2 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/automerge-host.ts:620
- a441cba4-3 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1005
- a441cba4-4 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1269
- a441cba4-5 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1725
- a441cba4-6 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29
- a441cba4-7 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:73
- a441cba4-8 - ignored - structured-logging-not-console - packages/e2e/perf-harness/src/score/run.ts:107

## Issues

# WARN a441cba4-1 namespace-brand-key-prefixing `packages/core/compute/assistant-e2e/src/playwright/perf/suite.ts:1`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 1-12 (`import { type ExtraScale } from '@dxos/perf-harness/score';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.71. This is a single-shot classifier: confirm against the rule before acting.

Ignored: False positive: `BUSY_SCALE` is an `ExtraScale` options object (scale, metric-id prefix, group), not a brand or annotation key.

# WARN a441cba4-2 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/automerge-host.ts:620`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 620-643 (`private async _runSubductionMigrations(): Promise<void> {`, location confidence 0.39). Judged with added `importers, imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

Ignored: Pre-existing: `_runSubductionMigrations` is not touched by this PR.

# WARN a441cba4-3 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1005`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 1005-1028 (`const handle = this._repo.import<T>(save(initialValue as Doc<T>), { docId: op...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

Ignored: Pre-existing: document creation at this line is not touched by this PR.

# ERROR a441cba4-4 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1269`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1269-1292 (`private async _getContainingSpaceForDocument(documentId: string): Promise<Pub...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

Ignored: Pre-existing: `_getContainingSpaceForDocument` is not touched by this PR, which adds no casts.

# WARN a441cba4-5 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1725`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 1725-1748 (`}`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

Ignored: Pre-existing: this scheduling code is not touched by this PR.

# WARN a441cba4-6 event-handler-naming-convention `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.84. The likeliest place is lines 29-36 (`export type SqliteStorageCallbacks = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

Ignored: Pre-existing: `SqliteStorageCallbacks.afterSave` predates this PR (as in review 17f7b8ac).

# WARN a441cba4-7 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:73`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 73-84 (`readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

Ignored: The adapter implements Automerge's Promise-based `StorageAdapterInterface`; `migrate` and `removeRangeEffect` were already Effects (as in review 17f7b8ac).

# WARN a441cba4-8 structured-logging-not-console `packages/e2e/perf-harness/src/score/run.ts:107`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 107-118 (`console.log(markdown);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

Ignored: Pre-existing: printing the markdown report to the CI log predates this PR; `scoreStageRun` runs as a CLI script.

## Appendix

### System One pass

- model: jev-latest
- base for context: `17f7b8acf42c465392398e877b28f07cc77b7d81`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 88 uncertain, 92 clean, 0 unanswered
- left for an agentic reviewer: 42 batch(es)

```text
requests: 140 (44 verdicts re-asked with context the model requested)
estimated input tokens: 1668146
billed input tokens: 1655551 (cost $0.0695)
measured chars per token: 3.02
```
