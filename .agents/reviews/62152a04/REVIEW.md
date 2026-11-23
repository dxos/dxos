---
branch: dm/agent-session-into-plugin-agent
commit: 62152a04c349d9c16b28e0ee251316581c002b9b
base: 524906089ef496b70bf7b8012df48a700816940a
mode: fast
createdAt: 2026-11-11T15:20:11.185Z
isFinalized: true
groups: 82
rules: [namespace-brand-key-prefixing]
reviewId: 62152a04
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 62152a04-1 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-agent/src/operations/errors.ts:1

## Issues

# WARN 62152a04-1 namespace-brand-key-prefixing `packages/plugins/plugin-agent/src/operations/errors.ts:1`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.85. The likeliest place is lines 1-15 (`import { BaseError } from '@dxos/errors';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `524906089ef496b70bf7b8012df48a700816940a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 125 uncertain, 189 clean, 0 unanswered
- left for an agentic reviewer: 58 batch(es)

```text
requests: 164 (80 verdicts re-asked with context the model requested)
estimated input tokens: 1076355
billed input tokens: 995205 (cost $0.0418)
measured chars per token: 3.24
```
