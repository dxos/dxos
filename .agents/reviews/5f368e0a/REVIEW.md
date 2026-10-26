---
branch: dm/compassionate-cerf-8qfka1
commit: 5f368e0a4f576992afd125a940614eb73612b83a
base: bc50a909111ef54216970e243807b01cd0b0adf7
mode: fast
createdAt: 2026-10-26T03:27:28.022Z
isFinalized: true
groups: 173
rules: [extract-non-rendering-logic-from-component, flat-layer-composition, headless-leak-check-per-workerd-plugin, import-as-namespace-is-all-or-nothing, no-casts, no-try-catch-in-effect-code, operations-resolve-database-from-service, schema-declare-and-brand]
reviewId: 5f368e0a
---

_1 error(s), 8 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 5f368e0a-1 - ignored - no-casts - packages/common/keys/src/DXN.ts:255
- 5f368e0a-2 - ignored - schema-declare-and-brand - packages/common/keys/src/DXN.ts:255
- 5f368e0a-3 - ignored - headless-leak-check-per-workerd-plugin - packages/plugins/plugin-projects/moon.yml:13
- 5f368e0a-4 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/components/FeatureBoard/FeatureBoard.tsx:134
- 5f368e0a-5 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/components/FeatureKanban/FeatureKanban.tsx:197
- 5f368e0a-6 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-projects/src/hooks/useFeatureGraph.ts:26
- 5f368e0a-7 - ignored - flat-layer-composition - packages/plugins/plugin-projects/src/operations/feature/feature.test.ts:27
- 5f368e0a-8 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-projects/src/operations/ProjectOperationHandlerSet.ts:1
- 5f368e0a-9 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-projects/src/testing/FeatureSeed.ts:39

## Issues

# ERROR 5f368e0a-1 no-casts `packages/common/keys/src/DXN.ts:255`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 255-263 (`const Schema_: Schema.Codec<DXN, DXN> = Schema.String.pipe(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5f368e0a-2 schema-declare-and-brand `packages/common/keys/src/DXN.ts:255`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.95. The likeliest place is lines 255-263 (`const Schema_: Schema.Codec<DXN, DXN> = Schema.String.pipe(`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5f368e0a-3 headless-leak-check-per-workerd-plugin `packages/plugins/plugin-projects/moon.yml:13`

System One judges this a likely violation of `headless-leak-check-per-workerd-plugin` (Every plugin with a workerd variant has a React-leak check tracing only worker conditions, with a target of zero), p=0.95. The likeliest place is lines 13-24 (`# its React surfaces cannot load in a worker bundle — so they are the seam th...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5f368e0a-4 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/components/FeatureBoard/FeatureBoard.tsx:134`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 134-145 (`next.delete(status);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5f368e0a-5 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/components/FeatureKanban/FeatureKanban.tsx:197`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 197-208 (`const registry = useContext(RegistryContext);`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5f368e0a-6 no-try-catch-in-effect-code `packages/plugins/plugin-projects/src/hooks/useFeatureGraph.ts:26`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 26-35 (`const sourceOf = <R extends Relation.Unknown>(relation: R): Relation.SourceOf...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5f368e0a-7 flat-layer-composition `packages/plugins/plugin-projects/src/operations/feature/feature.test.ts:27`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 27-38 (`const testLayer = () =>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5f368e0a-8 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-projects/src/operations/ProjectOperationHandlerSet.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-11 (`import * as Operation from '@dxos/compute/Operation';`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5f368e0a-9 operations-resolve-database-from-service `packages/plugins/plugin-projects/src/testing/FeatureSeed.ts:39`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.89. The likeliest place is lines 39-50 (`export const seed = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `bc50a909111ef54216970e243807b01cd0b0adf7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 9 violations written to fragments, 228 uncertain, 919 clean, 0 unanswered
- left for an agentic reviewer: 86 batch(es)

```text
requests: 495 (142 verdicts re-asked with context the model requested)
estimated input tokens: 3219484
billed input tokens: 3048215 (cost $0.1280)
measured chars per token: 3.17
```
