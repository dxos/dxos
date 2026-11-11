---
branch: dm/agent-session-into-plugin-agent
commit: 4cedf1fa29dd8e9d4d61fb360b611cab8447f13c
base: 524906089ef496b70bf7b8012df48a700816940a
mode: fast
createdAt: 2026-11-11T14:45:00.233Z
isFinalized: true
groups: 81
rules: [import-as-namespace-is-all-or-nothing, namespace-brand-key-prefixing]
reviewId: 4cedf1fa
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4cedf1fa-1 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-agent/src/operations/errors.ts:1
- 4cedf1fa-2 - resolved - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-agent/src/types/AgentSession.ts:1

## Issues

# WARN 4cedf1fa-1 namespace-brand-key-prefixing `packages/plugins/plugin-agent/src/operations/errors.ts:1`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.84. The likeliest place is lines 1-15 (`import { BaseError } from '@dxos/errors';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4cedf1fa-2 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-agent/src/types/AgentSession.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-21 (`export const SESSION_SOURCE = 'org.dxos.agent/session';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `524906089ef496b70bf7b8012df48a700816940a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 120 uncertain, 190 clean, 0 unanswered
- left for an agentic reviewer: 57 batch(es)

```text
requests: 172 (79 verdicts re-asked with context the model requested)
estimated input tokens: 1047793
billed input tokens: 969883 (cost $0.0407)
measured chars per token: 3.24
```
