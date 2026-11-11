---
branch: HEAD
commit: 10124e1d21e8c40354c6ee58ef729fc51e35cbe1
base: 66304b6baf9d3b7678fb083f301b47df292d2b4e
mode: fast
createdAt: 2026-11-11T18:45:33.630Z
isFinalized: true
groups: 70
rules: [reuse-shared-test-layer]
reviewId: 10124e1d21
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 10124e1d21-1 - ignored - reuse-shared-test-layer - packages/plugins/plugin-discord/src/operations/agent/bot.test.ts:34

## Issues

# WARN 10124e1d21-1 reuse-shared-test-layer `packages/plugins/plugin-discord/src/operations/agent/bot.test.ts:34`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.81. The likeliest place is lines 34-44 (`const fakeBot = (members: DiscordBot.Member[]) =>`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `66304b6baf9d3b7678fb083f301b47df292d2b4e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 56 uncertain, 43 clean, 0 unanswered
- left for an agentic reviewer: 49 batch(es)

```text
requests: 59 (40 verdicts re-asked with context the model requested)
estimated input tokens: 366309
billed input tokens: 353244 (cost $0.0148)
measured chars per token: 3.11
```
