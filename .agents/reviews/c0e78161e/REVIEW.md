---
branch: dm/serene-dijkstra-la97t0
commit: c0e78161ee2571cbe696742f5b15feaf828b2cf9
base: 9b93ba29a5baac091776107840beb2ee6765120d
mode: fast
createdAt: 2026-10-14T12:26:24.760Z
isFinalized: true
groups: 86
rules: [consistent-private-field-convention, error-messages-carry-context, no-casts, no-module-level-object-caches, no-try-catch-in-effect-code, structured-logging-not-console]
reviewId: c0e78161e
---

_3 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c0e78161e-1 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/automerge-data-source.ts:156
- c0e78161e-2 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:171
- c0e78161e-3 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:267
- c0e78161e-4 - ignored - no-module-level-object-caches - packages/core/echo/echo-host/src/query/query-executor.ts:134
- c0e78161e-5 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:278
- c0e78161e-6 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:661
- c0e78161e-7 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:709
- c0e78161e-8 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:949
- c0e78161e-9 - resolved - no-casts - packages/core/echo/index-core/src/indexes/object-snapshot-index.test.ts:61

## Issues

# WARN c0e78161e-1 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/automerge-data-source.ts:156`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.92. The likeliest place is lines 156-167 (`for (const { documentId, heads: docHeads } of changedDocuments) {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN c0e78161e-2 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:171`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.88. The likeliest place is lines 171-182 (`private async _sendWhenLoaded(documentId: DocumentId, syncState: DocSyncState...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c0e78161e-3 no-casts `packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:267`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 267-278 (`if (!mutation) {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN c0e78161e-4 no-module-level-object-caches `packages/core/echo/echo-host/src/query/query-executor.ts:134`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.89. The likeliest place is lines 134-181 (`collapsed?: { size: number };`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN c0e78161e-5 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:278`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.88. The likeliest place is lines 278-325 (`throw new Error('Invalid query item');`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c0e78161e-6 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:661`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 661-708 (`const serializeItemGroupKey = (item: QueryItem): string => GroupBy.serializeG...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN c0e78161e-7 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:709`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.84. The likeliest place is lines 709-756 (`#dependencyCache = new Map<string, Promise<QueryItem | null>>();`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN c0e78161e-8 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:949`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 949-996 (`trace.details = JSON.stringify({ id: this._id, query: Query.pretty(Query.from...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c0e78161e-9 no-casts `packages/core/echo/index-core/src/indexes/object-snapshot-index.test.ts:61`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 61-72 (`const recordIds = objects.map((o) => o.recordId!);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9b93ba29a5baac091776107840beb2ee6765120d`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 9 violations written to fragments, 280 uncertain, 296 clean, 0 unanswered
- left for an agentic reviewer: 66 batch(es)

```text
requests: 363 (159 verdicts re-asked with context the model requested)
estimated input tokens: 3836164
billed input tokens: 3855537 (cost $0.1619)
measured chars per token: 2.98
```

- Issues 1-8 point at echo-host code this PR leaves as it was; its only change to those files is where `backingJson` is imported from. Issue 9: the new test uses an `invariant` instead of non-null assertions; line 61 is an older test.
