---
branch: dm/serene-dijkstra-la97t0
commit: 27c560f8ebfb99d9434019e4c6aa3d8c0ce6e1c4
base: 1013a19b5685738bbba6addc57ea796f5e247257
mode: fast
createdAt: 2026-10-12T05:35:00.274Z
isFinalized: true
groups: 106
rules: [comment-hygiene, event-handler-naming-convention, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, use-context-scoped-cancellation]
reviewId: 27c560f8e
---

_7 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 27c560f8e-1 - resolved - no-sleep-in-test - packages/core/echo/echo-client-e2e/src/sync-query.test.ts:49
- 27c560f8e-2 - resolved - no-casts - packages/core/echo/echo-client-e2e/src/sync-query.test.ts:340
- 27c560f8e-3 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:108
- 27c560f8e-4 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:296
- 27c560f8e-5 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/doc-semaphore.ts:14
- 27c560f8e-6 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.ts:822
- 27c560f8e-7 - ignored - comment-hygiene - packages/core/echo/echo-client/src/core-db/entity-manager.ts:1134
- 27c560f8e-8 - ignored - no-casts - packages/core/echo/echo-client/src/query/query-result.ts:420
- 27c560f8e-9 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:42
- 27c560f8e-10 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/db-host/query-service.ts:108
- 27c560f8e-11 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/change-context.ts:142
- 27c560f8e-12 - ignored - no-casts - packages/core/echo/echo/src/Query.ts:357

## Issues

# WARN 27c560f8e-1 no-sleep-in-test `packages/core/echo/echo-client-e2e/src/sync-query.test.ts:49`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 49-53 (`const quiesce = async (db: EchoDatabase): Promise<void> => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 27c560f8e-2 no-casts `packages/core/echo/echo-client-e2e/src/sync-query.test.ts:340`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 340-351 (`const first = db.add(person({ name: 'alice' }));`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 27c560f8e-3 no-casts `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 108-119 (`private readonly _onDelete: () => void;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 27c560f8e-4 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:296`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 296-319 (`settle(() => reject(new TimeoutError(queryTimeout, 'index query')));`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 27c560f8e-5 no-casts `packages/core/echo/echo-client/src/core-db/doc-semaphore.ts:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 14-25 (`export const docChangeSemaphore = (handle: any) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 27c560f8e-6 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:822`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 822-845 (`delete draft.branches![id];`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 27c560f8e-7 comment-hygiene `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1134`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 1134-1157 (`getCurrentBranch(objectId: string): string {`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 27c560f8e-8 no-casts `packages/core/echo/echo-client/src/query/query-result.ts:420`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 420-431 (`const _asResultRows = <T>(rows: readonly unknown[]): T[] => rows as unknown a...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 27c560f8e-9 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:42`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 42-53 (`updateIndexes: () => Promise<void>;`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 27c560f8e-10 event-handler-naming-convention `packages/core/echo/echo-host/src/db-host/query-service.ts:108`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 108-114 (`sendUnchanged: () => void;`, location confidence 0.60). Judged with added `siblings` context after a first pass of 0.71. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 27c560f8e-11 no-casts `packages/core/echo/echo/src/internal/common/proxy/change-context.ts:142`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 142-153 (`(ownerTarget as any)[EventId]?.emit();`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 27c560f8e-12 no-casts `packages/core/echo/echo/src/Query.ts:357`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 357-380 (`class QueryClass implements Any {`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

- 27c560f8e-1: the `sleep(100)` window is gone; the test now proves silence with a matching marker write and waits for the index to answer it.
- 27c560f8e-2: the non-null assertion on `echoed` is replaced by an `expect(...).toBeDefined()` on the id.
- 27c560f8e-3, -4, -5, -6, -7, -8, -9, -12: the flagged lines are pre-existing code this PR does not change (`_onDelete`, the one-shot `setTimeout`, `docChangeSemaphore(handle: any)`, `draft.branches!` in a body only moved behind `runInCommit`, `getCurrentBranch`, `_asResultRows`, `updateIndexes`, `QueryClass`); fixing them would widen the PR.
- 27c560f8e-10: `sendUnchanged` sits beside the existing `sendResults` field on the same internal record and follows its name.
- 27c560f8e-11: the `as any` lines in `executeChange` are pre-existing; this PR only re-indented them inside the new commit `try`.

### System One pass

- model: jev-latest
- base for context: `1013a19b5685738bbba6addc57ea796f5e247257`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 12 violations written to fragments, 182 uncertain, 862 clean, 0 unanswered
- left for an agentic reviewer: 52 batch(es)

```text
requests: 465 (99 verdicts re-asked with context the model requested)
estimated input tokens: 5285214
billed input tokens: 5160199 (cost $0.2167)
measured chars per token: 3.07
```
