---
branch: dm/magical-brown-vqb8bf
commit: 2eacd90e920fa59dedae43109485694c6f9772d7
base: 7654298d4575594a6abf017ccbbd6e98cc7ce647
mode: fast
createdAt: 2026-10-07T07:18:23.961Z
isFinalized: true
groups: 103
rules: [no-casts, no-sleep-in-test]
reviewId: 2eacd90e
---

_1 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 2eacd90e-1 - resolved - no-sleep-in-test - packages/core/compute/compute/src/SqlService.test.ts:132
- 2eacd90e-2 - ignored - no-casts - packages/sdk/client-protocol/src/service-rpc.ts:266

## Issues

# WARN 2eacd90e-1 no-sleep-in-test `packages/core/compute/compute/src/SqlService.test.ts:132`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 132-143 (`'a',`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** the test now synchronizes on `Deferred`s and `Effect.yieldNow` instead of `Effect.sleep`.

# ERROR 2eacd90e-2 no-casts `packages/sdk/client-protocol/src/service-rpc.ts:266`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 266-278 (`export const makeClientServicesRpcFromRouter: Effect.Effect<`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** pre-existing code; this PR only adds `SqlService` to the RPC group, handler map and client interface. The flagged cast is the documented dynamic-to-static view of the router client.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7654298d4575594a6abf017ccbbd6e98cc7ce647`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 217 uncertain, 380 clean, 0 unanswered
- left for an agentic reviewer: 49 batch(es)

```text
requests: 331 (134 verdicts re-asked with context the model requested)
estimated input tokens: 2256270
billed input tokens: 2171249 (cost $0.0912)
measured chars per token: 3.12
```
