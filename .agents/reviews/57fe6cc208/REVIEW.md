---
branch: claude/sweet-mccarthy-svq6h1
commit: 57fe6cc208a2a5e4c677349714a7ad9e26e8243f
base: 2ee2abe597c3636315246ee90ceaa4a7730d4dae
mode: fast
createdAt: 2026-09-30T13:57:04.984Z
isFinalized: true
groups: 56
rules: [error-messages-carry-context, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, use-context-scoped-cancellation]
reviewId: 57fe6cc208
---

_7 error(s), 8 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 57fe6cc208-1 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:25
- 57fe6cc208-2 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747
- 57fe6cc208-3 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:353
- 57fe6cc208-4 - resolved - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:389
- 57fe6cc208-5 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/automerge-host.ts:692
- 57fe6cc208-6 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:764
- 57fe6cc208-7 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1287
- 57fe6cc208-8 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1767
- 57fe6cc208-9 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-repo-subduction.test.ts:285
- 57fe6cc208-10 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-repo-subduction.test.ts:549
- 57fe6cc208-11 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/collection-synchronizer.test.ts:25
- 57fe6cc208-12 - ignored - no-casts - packages/core/mesh/edge-client/src/testing/test-utils.ts:148
- 57fe6cc208-13 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/spaces/edge-feed-replicator.test.ts:30
- 57fe6cc208-14 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/edge-feed-replicator.test.ts:114
- 57fe6cc208-15 - ignored - no-casts - packages/sdk/client-services/src/Replication.ts:138

## Issues

# ERROR 57fe6cc208-1 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:25`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 25-50 (`import { TestReplicationNetwork, createTestSqliteRuntime } from '../testing/i...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 57fe6cc208-2 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:747`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 747-770 (`await sleep(NO_TRAFFIC_WINDOW_MS);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 57fe6cc208-3 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:353`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 353-364 (`await sleep(500);`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 57fe6cc208-4 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:389`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 389-400 (`const synchronizer = (host as any)._collectionSynchronizer;`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 57fe6cc208-5 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/automerge-host.ts:692`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 692-715 (`get subduction(): Promise<Subduction> {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 57fe6cc208-6 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:764`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 764-787 (`'A lease cannot be taken on a heads-pinned or path-scoped URL.',`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 57fe6cc208-7 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1287`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 1287-1310 (`const handle = this._repo.getHandle(documentId as any);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 57fe6cc208-8 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1767`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 1767-1790 (`this._replicationLeases.set(documentId, lease);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 57fe6cc208-9 no-casts `packages/core/echo/echo-host/src/automerge/automerge-repo-subduction.test.ts:285`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 285-308 (`const serverHandle = await repo.find<any>(documentId);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 57fe6cc208-10 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-repo-subduction.test.ts:549`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 549-572 (`test('accept/accept does not sync', async () => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 57fe6cc208-11 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/collection-synchronizer.test.ts:25`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.83. The likeliest place is lines 25-48 (`describe('CollectionSynchronizer', () => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 57fe6cc208-12 no-casts `packages/core/mesh/edge-client/src/testing/test-utils.ts:148`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 148-154 (`const decodePayload = async (request: Message, params: TestEdgeWsServerProps ...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 57fe6cc208-13 no-sleep-in-test `packages/sdk/client-services/src/internal/spaces/edge-feed-replicator.test.ts:30`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.97. The likeliest place is lines 30-41 (`describe('EdgeFeedReplicator', () => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 57fe6cc208-14 no-casts `packages/sdk/client-services/src/internal/spaces/edge-feed-replicator.test.ts:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 114-125 (`sendSpy.mockImplementationOnce(async (_ctx: any, request: any) => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 57fe6cc208-15 no-casts `packages/sdk/client-services/src/Replication.ts:138`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 138-149 (`}`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2ee2abe597c3636315246ee90ceaa4a7730d4dae`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 15 violations written to fragments, 240 uncertain, 148 clean, 0 unanswered
- left for an agentic reviewer: 47 batch(es)

```text
requests: 286 (147 verdicts re-asked with context the model requested)
estimated input tokens: 4815924
billed input tokens: 4789847 (cost $0.2012)
measured chars per token: 3.02
```
