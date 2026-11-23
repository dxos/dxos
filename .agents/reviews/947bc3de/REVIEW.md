---
branch: dm/great-ride-sibmbk
commit: 947bc3decaecca7264e07cb6315d99ebe7bd37fa
base: 19e18130b89c82e607506931a650c4d77f9aac4d
mode: fast
createdAt: 2026-10-29T08:20:49.724Z
isFinalized: true
groups: 103
rules: [business-logic-out-of-ui, catalog-is-dependency-source-of-truth, collections-use-standard-containers, effect-fn-not-hand-wrapped-gen, import-as-namespace-is-all-or-nothing, no-styling-wrapper-divs, story-for-new-ui-component, workspace-deps]
reviewId: 947bc3de
---

_1 error(s), 9 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 947bc3de-1 - ignored - catalog-is-dependency-source-of-truth - packages/plugins/plugin-debug/autocue/ride-check/__fixtures__/worker/package.json:1
- 947bc3de-2 - ignored - workspace-deps - packages/plugins/plugin-debug/autocue/ride-check/__fixtures__/worker/package.json:13
- 947bc3de-3 - ignored - story-for-new-ui-component - packages/plugins/plugin-debug/autocue/ride-check/__fixtures__/worker/src/app/main.tsx:66
- 947bc3de-4 - ignored - business-logic-out-of-ui - packages/plugins/plugin-debug/autocue/ride-check/__fixtures__/worker/src/app/main.tsx:231
- 947bc3de-5 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/autocue/ride-check/__fixtures__/worker/src/app/main.tsx:243
- 947bc3de-6 - ignored - collections-use-standard-containers - packages/plugins/plugin-debug/autocue/ride-check/__fixtures__/worker/src/app/main.tsx:267
- 947bc3de-7 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-debug/src/samples/index.ts:1
- 947bc3de-8 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/ride-check/features.ts:67
- 947bc3de-9 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/ride-check/RideCheckSpace.ts:36
- 947bc3de-10 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/ride-check/spec.ts:24

## Issues

# WARN 947bc3de-1 catalog-is-dependency-source-of-truth `packages/plugins/plugin-debug/autocue/ride-check/__fixtures__/worker/package.json:1`

System One judges this a likely violation of `catalog-is-dependency-source-of-truth` (Bump, add, and remove dependency versions in the workspace catalog, not per-package.json), p=0.86. This is a single-shot classifier: confirm against the rule before acting.

Ignored: the fixture Worker is excluded from the workspace (`!**/__fixtures__/**`) and deploys on its own from npm, so it pins published versions; there is no catalog or workspace to resolve from.

# ERROR 947bc3de-2 workspace-deps `packages/plugins/plugin-debug/autocue/ride-check/__fixtures__/worker/package.json:13`

System One judges this a likely violation of `workspace-deps` (In-repo deps use the workspace protocol), p=0.84. The likeliest place is lines 13-24 (`"@dxos/ui-theme": "^0.16.0",`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

Ignored: as 947bc3de-1 — outside the workspace, `workspace:*` would not resolve.

# WARN 947bc3de-3 story-for-new-ui-component `packages/plugins/plugin-debug/autocue/ride-check/__fixtures__/worker/src/app/main.tsx:66`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.87. The likeliest place is lines 66-77 (`const VerdictCard = ({ forecast }: { forecast: Forecast }) => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

Ignored: the fixture is a standalone page deployed as a Cloudflare Worker, not a Composer component; the plugin UI rules do not apply.

# WARN 947bc3de-4 business-logic-out-of-ui `packages/plugins/plugin-debug/autocue/ride-check/__fixtures__/worker/src/app/main.tsx:231`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.92. The likeliest place is lines 231-242 (`const App = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

Ignored: as 947bc3de-3 — a standalone demo page with no operations runtime.

# WARN 947bc3de-5 no-styling-wrapper-divs `packages/plugins/plugin-debug/autocue/ride-check/__fixtures__/worker/src/app/main.tsx:243`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 243-254 (`<main className='mx-auto max-w-4xl flex flex-col gap-6 px-4 py-10'>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

Ignored: as 947bc3de-3.

# WARN 947bc3de-6 collections-use-standard-containers `packages/plugins/plugin-debug/autocue/ride-check/__fixtures__/worker/src/app/main.tsx:267`

System One judges this a likely violation of `collections-use-standard-containers` (A collection of objects renders in a standard container — list, masonry, kanban, or canvas), p=0.83. The likeliest place is lines 267-278 (`<WindowCard forecast={forecast} />`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

Ignored: as 947bc3de-3 — four fixed cards, not a collection of objects.

# WARN 947bc3de-7 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-debug/src/samples/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`export * as DemoSpace from './demo/DemoSpace.ts';`, location confidence 0.48). Judged with added `importers` context after a first pass of 0.62. This is a single-shot classifier: confirm against the rule before acting.

Ignored: the line added matches every other sample's re-export in this barrel.

# WARN 947bc3de-8 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/ride-check/features.ts:67`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 67-78 (`export const FeaturesPartial: SampleSpace.Partial<FeaturesResult, FeaturesInp...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

Ignored: `run: () => Effect.gen(...)` is the `SampleSpace.partial` callback shape every sibling sample uses (e.g. `samples/worker/spec.ts`).

# WARN 947bc3de-9 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/ride-check/RideCheckSpace.ts:36`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 36-47 (`export const make = (): SampleSpace.Definition<typeof partials, void> =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

Ignored: as 947bc3de-8 (`samples/worker/WorkerSpace.ts`).

# WARN 947bc3de-10 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/ride-check/spec.ts:24`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 24-38 (`export const SpecPartial: SampleSpace.Partial<SpecResult> = SampleSpace.parti...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: as 947bc3de-8.

## Appendix

### System One pass

- model: jev-latest
- base for context: `19e18130b89c82e607506931a650c4d77f9aac4d`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 10 violations written to fragments, 218 uncertain, 341 clean, 0 unanswered
- left for an agentic reviewer: 75 batch(es)

```text
requests: 332 (138 verdicts re-asked with context the model requested)
estimated input tokens: 1616790
billed input tokens: 1529991 (cost $0.0643)
measured chars per token: 3.17
```
