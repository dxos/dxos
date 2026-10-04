---
branch: dm/awesome-hawking-5110zl
commit: 539aaea4bf99c1e60f9ab64c88e30d471c8e2cb1
base: a6d32c6eb7810d93f171895cc5cc7778d367e4c4
mode: fast
createdAt: 2026-10-03T19:50:41.582Z
isFinalized: true
groups: 110
rules: [effect-fn-not-hand-wrapped-gen, import-as-namespace-is-all-or-nothing, namespace-export-with-internal-hiding, no-casts]
reviewId: 539aaea4
---

_1 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 539aaea4-1 - ignored - namespace-export-with-internal-hiding - packages/common/diagram/src/index.ts:1
- 539aaea4-2 - ignored - import-as-namespace-is-all-or-nothing - packages/common/diagram/src/index.ts:25
- 539aaea4-3 - resolved - no-casts - packages/common/diagram/src/mermaid-engine.ts:209
- 539aaea4-4 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-illustrator/src/model/dx-svg.ts:97
- 539aaea4-5 - resolved - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-illustrator/src/model/index.ts:1

## Issues

# WARN 539aaea4-1 namespace-export-with-internal-hiding `packages/common/diagram/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.88. The likeliest place is lines 1-12 (`export * from './content.ts';`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 539aaea4-2 import-as-namespace-is-all-or-nothing `packages/common/diagram/src/index.ts:25`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 25-29 (`export * as UmlGrid from './uml-grid.ts';`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 539aaea4-3 no-casts `packages/common/diagram/src/mermaid-engine.ts:209`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 209-232 (`const compactGroups = (`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 539aaea4-4 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-illustrator/src/model/dx-svg.ts:97`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 97-108 (`export const importDxSvg = (svg: string) =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 539aaea4-5 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-illustrator/src/model/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-7 (`export * from './builder.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a6d32c6eb7810d93f171895cc5cc7778d367e4c4`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 95 uncertain, 791 clean, 0 unanswered
- left for an agentic reviewer: 42 batch(es)

```text
requests: 371 (64 verdicts re-asked with context the model requested)
estimated input tokens: 2794590
billed input tokens: 2643980 (cost $0.1110)
measured chars per token: 3.17
```
