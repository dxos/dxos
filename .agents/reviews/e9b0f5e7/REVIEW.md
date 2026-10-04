---
branch: dm/bold-ramanujan-f1p8mi
commit: e9b0f5e7cd52c83a6698c8fe505070fc9f9804f8
base: 2c72c3f31411496a6d5b6187be20ec868a921427
mode: fast
createdAt: 2026-10-04T16:18:51.533Z
isFinalized: true
groups: 49
rules: [flat-layer-composition]
reviewId: e9b0f5e7
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e9b0f5e7-1 - ignored - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:783

## Issues

# WARN e9b0f5e7-1 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:783`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 783-806 (`const session = yield* ComputeAgentService.getSession(chat).pipe(Effect.provi...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2c72c3f31411496a6d5b6187be20ec868a921427`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 33 uncertain, 10 clean, 0 unanswered
- left for an agentic reviewer: 38 batch(es)

```text
requests: 30 (26 verdicts re-asked with context the model requested)
estimated input tokens: 616172
billed input tokens: 573735 (cost $0.0241)
measured chars per token: 3.22
```
