---
branch: dm/compassionate-carson-l2p1l5
commit: 7903353356e5cbe9f694edb01329dbc5a8ea1918
base: 9d66bcd4eb0db0a525c2eaa101acbf7111984262
mode: fast
createdAt: 2026-10-22T11:50:49.125Z
isFinalized: true
groups: 132
rules: [namespace-brand-key-prefixing]
reviewId: 79033533
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 79033533-1 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-code/src/components/ChangelogGraph/decision-model.ts:110

## Issues

# WARN 79033533-1 namespace-brand-key-prefixing `packages/plugins/plugin-code/src/components/ChangelogGraph/decision-model.ts:110`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.82. The likeliest place is lines 110-121 (`kind: 'decision',`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9d66bcd4eb0db0a525c2eaa101acbf7111984262`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 168 uncertain, 985 clean, 0 unanswered
- left for an agentic reviewer: 57 batch(es)

```text
requests: 475 (91 verdicts re-asked with context the model requested)
estimated input tokens: 2620395
billed input tokens: 2481811 (cost $0.1042)
measured chars per token: 3.17
```
