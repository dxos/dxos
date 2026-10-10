---
branch: dm/serene-hamilton-bdd2oe
commit: 17f7b8acf42c465392398e877b28f07cc77b7d81
base: 99e39bab26fb04efea25c1ec2a42ed1bf79d2152
mode: fast
createdAt: 2026-10-03T06:40:42.478Z
isFinalized: true
groups: 57
rules: [event-handler-naming-convention, no-casts, no-mixed-promise-effect-lifecycle]
reviewId: 17f7b8ac
---

_1 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 17f7b8ac-1 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:213
- 17f7b8ac-2 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29
- 17f7b8ac-3 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:73

## Issues

# ERROR 17f7b8ac-1 no-casts `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:213`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 213-224 (`const heads = ['hash1', 'hash2'];`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

Ignored: the casts are in the pre-existing `SqliteHeadsStore` tests (lines 212, 221); this PR adds none.

# WARN 17f7b8ac-2 event-handler-naming-convention `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 29-36 (`export type SqliteStorageCallbacks = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

Ignored: `SqliteStorageCallbacks.afterSave` predates this PR, which does not touch it.

# WARN 17f7b8ac-3 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:73`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 73-84 (`readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

Ignored: the adapter implements Automerge's Promise-based `StorageAdapterInterface`; `migrate` and `removeRangeEffect` were already Effects, and the new group commit keeps that split.

## Appendix

### System One pass

- model: jev-latest
- base for context: `99e39bab26fb04efea25c1ec2a42ed1bf79d2152`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 105 uncertain, 122 clean, 0 unanswered
- left for an agentic reviewer: 46 batch(es)

```text
requests: 136 (57 verdicts re-asked with context the model requested)
estimated input tokens: 1010044
billed input tokens: 993529 (cost $0.0417)
measured chars per token: 3.05
```
