---
branch: dm/eager-darwin-b2qc3z
commit: f61fdc99269cac64bb90d2ffc0f485b3c7f2ac00
base: fe3aaf6bfc4ef9e6c16b70b6db3ef49d0a1841b2
mode: fast
createdAt: 2026-11-10T12:37:00.956Z
isFinalized: true
groups: 92
rules: [card-content-in-middle-column, flat-layer-composition]
reviewId: f61fdc99
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f61fdc99-1 - ignored - card-content-in-middle-column - packages/plugins/plugin-code/src/components/DefinitionGraph/DefinitionGraph.tsx:82
- f61fdc99-2 - ignored - flat-layer-composition - packages/reflect/deus/src/cli/cli.test.ts:34

## Issues

# WARN f61fdc99-1 card-content-in-middle-column `packages/plugins/plugin-code/src/components/DefinitionGraph/DefinitionGraph.tsx:82`

System One judges this a likely violation of `card-content-in-middle-column` (A card whose header uses the rails is a `grid` card, so its rows start in the middle column under the title), p=0.90. The likeliest place is lines 82-93 (`>`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN f61fdc99-2 flat-layer-composition `packages/reflect/deus/src/cli/cli.test.ts:34`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 34-50 (`const run = (args: string[], env: Record<string, string> = {}) => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `fe3aaf6bfc4ef9e6c16b70b6db3ef49d0a1841b2`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 152 uncertain, 168 clean, 0 unanswered
- left for an agentic reviewer: 63 batch(es)

```text
requests: 184 (81 verdicts re-asked with context the model requested)
estimated input tokens: 1631681
billed input tokens: 1638348 (cost $0.0688)
measured chars per token: 2.99
```

### Dismissed

- f61fdc99-1: lines 82-93 of `DefinitionGraph.tsx` are the existing card markup; this PR changes only the `statusOf` lookup at line 296.
- f61fdc99-2: `run` in `cli.test.ts` is the existing test harness; this PR adds tests that call it and does not change how it provides layers.
