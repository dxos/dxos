---
branch: dm/amazing-cerf-qgswar
commit: 233ed39885f26a06d798eefa9be9fe4d0446f969
base: origin/main
mode: fast
createdAt: 2026-10-12T07:49:52.635Z
isFinalized: true
groups: 53
rules: [flat-layer-composition]
reviewId: 233ed398
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 233ed398-1 - ignored - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:169

## Issues

# WARN 233ed398-1 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:169`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 169-185 (`const assistantTestLayerOptions = {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Dismissals

- 233ed398-1: pre-existing test layer setup, not part of this diff.

### System One pass

- model: jev-latest
- base for context: `origin/main`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 62 uncertain, 21 clean, 0 unanswered
- left for an agentic reviewer: 42 batch(es)

```text
requests: 56 (38 verdicts re-asked with context the model requested)
estimated input tokens: 957705
billed input tokens: 874858 (cost $0.0367)
measured chars per token: 3.28
```
