---
branch: claude/echo-session-pickup-77c9b6
commit: 4a716ab807f17dc087ab4ebd95e9c164d7121cd5
base: 20f8a6ff95b21ad444733ee420eca12e0f43d443
mode: fast
createdAt: 2026-10-01T12:14:42.631Z
isFinalized: true
groups: 49
rules: [jsdoc-non-obvious-identifiers, namespace-export-with-internal-hiding]
reviewId: 4a716ab807f
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4a716ab807f-1 - ignored - jsdoc-non-obvious-identifiers - packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts:24
- 4a716ab807f-2 - ignored - namespace-export-with-internal-hiding - packages/ui/ui-types/src/index.ts:13

## Issues

# WARN 4a716ab807f-1 jsdoc-non-obvious-identifiers `packages/ui/lit-ui/src/dx-anchor/dx-anchor.ts:24`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.80. The likeliest place is lines 24-35 (`export class DxAnchor extends LitElement {`, location confidence 0.95). Judged with added `imports, siblings` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 4a716ab807f-2 namespace-export-with-internal-hiding `packages/ui/ui-types/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.87. The likeliest place is lines 13-17 (`export * from './size.ts';`, location confidence 0.11). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `20f8a6ff95b21ad444733ee420eca12e0f43d443`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 64 uncertain, 108 clean, 0 unanswered
- left for an agentic reviewer: 28 batch(es)

```text
requests: 115 (49 verdicts re-asked with context the model requested)
estimated input tokens: 492695
billed input tokens: 475462 (cost $0.0200)
measured chars per token: 3.11
```
