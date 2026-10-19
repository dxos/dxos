---
branch: claude/sweet-mccarthy-svq6h1
commit: 2ee382da26dd707e72903b0ae363bf8657f227ee
base: 57fe6cc208a2a5e4c677349714a7ad9e26e8243f
mode: fast
createdAt: 2026-09-30T15:42:43.116Z
isFinalized: true
groups: 55
rules: [error-messages-carry-context, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, use-context-scoped-cancellation]
reviewId: 2ee382da26
---

_3 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 2ee382da26-1 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:245
- 2ee382da26-2 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:353
- 2ee382da26-3 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:356
- 2ee382da26-4 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:500
- 2ee382da26-5 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/automerge-host.ts:644
- 2ee382da26-6 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1756
- 2ee382da26-7 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/collection-synchronizer.test.ts:25
- 2ee382da26-8 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/spaces/edge-feed-replicator.test.ts:30
- 2ee382da26-9 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/edge-feed-replicator.test.ts:114

## Issues

# ERROR 2ee382da26-1 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:245`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 245-256 (`const network = await new TestReplicationNetwork().open();`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ee382da26-2 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:353`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 353-364 (`await sleep(500);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ee382da26-3 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:356`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 356-379 (`invariant(handle, 'Document query has no attached handle.');`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2ee382da26-4 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:500`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 500-523 (`Event.wrap(this._echoNetworkAdapter, 'peer-candidate').on(`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ee382da26-5 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/automerge-host.ts:644`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 644-667 (`get migrate(): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ee382da26-6 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1756`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 1756-1779 (`let timer: ReturnType<typeof setTimeout> | undefined;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ee382da26-7 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/collection-synchronizer.test.ts:25`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.85. The likeliest place is lines 25-48 (`describe('CollectionSynchronizer', () => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ee382da26-8 no-sleep-in-test `packages/sdk/client-services/src/internal/spaces/edge-feed-replicator.test.ts:30`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 30-41 (`describe('EdgeFeedReplicator', () => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2ee382da26-9 no-casts `packages/sdk/client-services/src/internal/spaces/edge-feed-replicator.test.ts:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 114-125 (`sendSpy.mockImplementationOnce(async (_ctx: any, request: any) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `57fe6cc208a2a5e4c677349714a7ad9e26e8243f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 9 violations written to fragments, 137 uncertain, 63 clean, 0 unanswered
- left for an agentic reviewer: 47 batch(es)

```text
requests: 165 (91 verdicts re-asked with context the model requested)
estimated input tokens: 3003952
billed input tokens: 2993782 (cost $0.1257)
measured chars per token: 3.01
```
