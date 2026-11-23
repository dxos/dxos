---
branch: dm/magical-lovelace-37fbda
commit: 2e96da4d72ed4cdf3b178b3cc4f88b39f74e2e9c
base: 45e1c93327f2f95d392615847aebc8c444c617e4
mode: fast
createdAt: 2026-10-29T11:13:44.371Z
isFinalized: true
groups: 76
rules: [named-durations-and-budgets]
reviewId: 2e96da4d
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 2e96da4d-1 - ignored - named-durations-and-budgets - packages/plugins/plugin-projects/src/templates/composer-plugin.ts:226

## Issues

# WARN 2e96da4d-1 named-durations-and-budgets `packages/plugins/plugin-projects/src/templates/composer-plugin.ts:226`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.94. The likeliest place is lines 226-237 (``Fetch it with \`curl -fsSL https://raw.githubusercontent.com/dxos/dxos/${too...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `45e1c93327f2f95d392615847aebc8c444c617e4`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 67 uncertain, 74 clean, 0 unanswered
- left for an agentic reviewer: 51 batch(es)

```text
requests: 79 (54 verdicts re-asked with context the model requested)
estimated input tokens: 618854
billed input tokens: 586401 (cost $0.0246)
measured chars per token: 3.17
```
