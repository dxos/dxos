---
branch: dm/magical-brown-vqb8bf
commit: 551ec134afd3ec6b23f486c55751a64d1d23ef39
base: 7654298d4575594a6abf017ccbbd6e98cc7ce647
mode: fast
createdAt: 2026-10-07T07:02:21.467Z
isFinalized: true
groups: 102
rules: [no-casts]
reviewId: 551ec134
---

_1 error(s), 0 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 551ec134-1 - ignored - no-casts - packages/sdk/client-protocol/src/service-rpc.ts:266

## Issues

# ERROR 551ec134-1 no-casts `packages/sdk/client-protocol/src/service-rpc.ts:266`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 266-278 (`export const makeClientServicesRpcFromRouter: Effect.Effect<`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** pre-existing code; this PR only adds `SqlService` to the RPC group, handler map and client interface. The flagged cast is the documented dynamic-to-static view of the router client.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7654298d4575594a6abf017ccbbd6e98cc7ce647`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 202 uncertain, 393 clean, 0 unanswered
- left for an agentic reviewer: 49 batch(es)

```text
requests: 328 (124 verdicts re-asked with context the model requested)
estimated input tokens: 2072655
billed input tokens: 1996210 (cost $0.0838)
measured chars per token: 3.11
```
