---
branch: dm/plugin-ontology
commit: 0c3d91b8b15bc6b4e6bdf3642feddfee7c5d706b
base: 785408cae43ba9457ab8126dd42b7cb6730cea53
mode: fast
createdAt: 2026-11-12T08:49:47.500Z
isFinalized: true
groups: 69
rules: [import-as-namespace-is-all-or-nothing]
reviewId: 0c3d91b8
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 0c3d91b8-1 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-ontology/src/index.ts:1

## Issues

# WARN 0c3d91b8-1 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-ontology/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as OntologyPlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: `export * as OntologyPlugin from '#meta'` is the two-entrypoint plugin convention every plugin's `src/index.ts` follows (`#meta` is `dx.config.ts`, the `./OntologyPlugin` subpath), not a namespace module, so the rule does not apply.

## Appendix

### System One pass

- model: jev-latest
- base for context: `785408cae43ba9457ab8126dd42b7cb6730cea53`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 43 uncertain, 181 clean, 0 unanswered
- left for an agentic reviewer: 32 batch(es)

```text
requests: 109 (33 verdicts re-asked with context the model requested)
estimated input tokens: 312320
billed input tokens: 285199 (cost $0.0120)
measured chars per token: 3.29
```
