---
branch: dm/dazzling-goldberg-fdw85c
commit: 7ea1e7d9026ec49f8c2440d0dbf1f2587d0bf3e4
base: 0e1eb16cd1aaf8818d06dcecd4034abc63b5a69f
mode: fast
createdAt: 2026-09-30T16:14:07.049Z
isFinalized: true
groups: 50
rules: [namespace-brand-key-prefixing]
reviewId: 7ea1e7d9
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 7ea1e7d9-1 - resolved - namespace-brand-key-prefixing - packages/common/permission/src/Command.ts:14

## Issues

# WARN 7ea1e7d9-1 namespace-brand-key-prefixing `packages/common/permission/src/Command.ts:14`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.93. The likeliest place is lines 14-33 (`export const Command = Schema.String.pipe(`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `0e1eb16cd1aaf8818d06dcecd4034abc63b5a69f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 18 uncertain, 95 clean, 0 unanswered
- left for an agentic reviewer: 17 batch(es)

```text
requests: 55 (11 verdicts re-asked with context the model requested)
estimated input tokens: 188225
billed input tokens: 168158 (cost $0.0071)
measured chars per token: 3.36
```
