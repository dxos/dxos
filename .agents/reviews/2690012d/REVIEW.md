---
branch: HEAD
commit: 2690012df6ae86a0eb31a4711b6d59973bac3108
base: 8d0cdd56273306ee09bdf75f5a035a12256e3b88
mode: fast
createdAt: 2026-10-03T08:18:46.399Z
isFinalized: true
groups: 141
rules: [dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, event-handler-naming-convention, namespace-export-with-internal-hiding, no-casts, no-env-vars-in-low-level-modules, no-mixed-promise-effect-lifecycle]
reviewId: 2690012d
---

_5 error(s), 11 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 2690012d-1 - ignored - no-casts - packages/common/sql-sqlite/src/internal/opfs-client.ts:139
- 2690012d-2 - ignored - no-casts - packages/common/sql-sqlite/src/OpfsWorker.ts:105
- 2690012d-3 - ignored - namespace-export-with-internal-hiding - packages/common/util/src/index.ts:1
- 2690012d-4 - ignored - error-messages-carry-context - packages/core/echo/echo-client/src/query/query-result.ts:119
- 2690012d-5 - ignored - no-casts - packages/core/echo/echo-client/src/query/query-result.ts:408
- 2690012d-6 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:500
- 2690012d-7 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/automerge-host.ts:620
- 2690012d-8 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1007
- 2690012d-9 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29
- 2690012d-10 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:89
- 2690012d-11 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:200
- 2690012d-12 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:39
- 2690012d-13 - ignored - dont-leak-internal-api-through-public-surface - packages/e2e/perf-harness/src/collectors/network.ts:85
- 2690012d-14 - ignored - namespace-export-with-internal-hiding - packages/e2e/perf-harness/src/index.ts:1
- 2690012d-15 - ignored - no-env-vars-in-low-level-modules - packages/e2e/perf-harness/src/report.ts:552
- 2690012d-16 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/worker-framework/src/RpcTiming.test.ts:32

Every row above was confirmed against the diff and points at code this PR does not change (pre-existing casts, wildcard barrels, env reads and naming); fixing them is outside this PR's scope.

## Issues

# ERROR 2690012d-1 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:139`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 139-150 (`sqlite3.vfs_register(vfs as any, false);`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2690012d-2 no-casts `packages/common/sql-sqlite/src/OpfsWorker.ts:105`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 105-116 (`const message = event.data as OpfsWorkerMessage;`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2690012d-3 namespace-export-with-internal-hiding `packages/common/util/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 1-12 (`export * from './array-to-hex.ts';`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2690012d-4 error-messages-carry-context `packages/core/echo/echo-client/src/query/query-result.ts:119`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 119-130 (`async first(opts?: { timeout?: number }): Promise<T> {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2690012d-5 no-casts `packages/core/echo/echo-client/src/query/query-result.ts:408`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 408-419 (`const _asResultRows = <T>(rows: readonly unknown[]): T[] => rows as unknown a...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2690012d-6 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:500`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 500-523 (`((e: PeerDisconnectedPayload) => !peerLifecycleSuppressed(e.peerId) && this._...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2690012d-7 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/automerge-host.ts:620`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 620-643 (`private async _runSubductionMigrations(): Promise<void> {`, location confidence 0.35). Judged with added `importers, imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 2690012d-8 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1007`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 1007-1030 (`const handle = this._repo.import<T>(save(initialValue as Doc<T>), { docId: op...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2690012d-9 event-handler-naming-convention `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.83. The likeliest place is lines 29-33 (`export type SqliteStorageCallbacks = {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2690012d-10 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:89`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 89-100 (`readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>...`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2690012d-11 no-casts `packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:200`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 200-211 (`protected override async _close(): Promise<void> {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2690012d-12 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:39`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 39-50 (`updateIndexes: () => Promise<void>;`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2690012d-13 dont-leak-internal-api-through-public-surface `packages/e2e/perf-harness/src/collectors/network.ts:85`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.80. The likeliest place is lines 85-96 (`export const classifyOrigin = (url: string, edgeHosts: readonly string[] = DE...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2690012d-14 namespace-export-with-internal-hiding `packages/e2e/perf-harness/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.95. The likeliest place is lines 1-12 (`export * from './browser.ts';`, location confidence 0.16). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2690012d-15 no-env-vars-in-low-level-modules `packages/e2e/perf-harness/src/report.ts:552`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.81. The likeliest place is lines 552-563 (`export const publishPosthogBatch = (workspaceRoot: string, file: string): boo...`, location confidence 0.98). Judged with added `importers, package` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 2690012d-16 effect-fn-not-hand-wrapped-gen `packages/sdk/worker-framework/src/RpcTiming.test.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 32-43 (`const timingHandlers = RpcTiming.applyMiddleware(TimingRpcs).toLayer(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `8d0cdd56273306ee09bdf75f5a035a12256e3b88`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 16 violations written to fragments, 180 uncertain, 1120 clean, 0 unanswered
- left for an agentic reviewer: 50 batch(es)

```text
requests: 579 (94 verdicts re-asked with context the model requested)
estimated input tokens: 5645326
billed input tokens: 5461153 (cost $0.2294)
measured chars per token: 3.10
```
