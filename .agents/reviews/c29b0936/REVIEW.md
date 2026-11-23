---
branch: worktree-agent-afd1126c742e4cdeb
commit: c29b0936c391d3c2d423a6801ad5f1b4e78deb76
base: 4a20392c50dd8da257e4500fe01d5179d88e5134
mode: fast
createdAt: 2026-10-28T10:42:16.473Z
isFinalized: true
groups: 163
rules: [bounded-live-state, effect-fn-not-hand-wrapped-gen, flat-layer-composition, inject-dependencies-via-constructor, inline-obj-parent, keep-parallel-apis-structurally-aligned, no-casts, no-module-level-object-caches, no-try-catch-in-effect-code, operations-resolve-database-from-service, options-object-with-defaults, state-owned-once]
reviewId: c29b0936
---

_2 error(s), 11 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c29b0936-1 - ignored - flat-layer-composition - packages/plugins/plugin-presenter/src/operations/create-showcase.test.ts:21
- c29b0936-2 - ignored - bounded-live-state - packages/plugins/plugin-presenter/src/operations/create-showcase.ts:30
- c29b0936-3 - resolved - no-module-level-object-caches - packages/plugins/plugin-presenter/src/types/ShowcaseMigration.ts:12
- c29b0936-4 - resolved - state-owned-once - packages/plugins/plugin-presenter/src/types/ShowcaseMigration.ts:12
- c29b0936-5 - resolved - inject-dependencies-via-constructor - packages/plugins/plugin-presenter/src/types/ShowcaseMigration.ts:12
- c29b0936-6 - ignored - options-object-with-defaults - packages/plugins/plugin-projects/src/capabilities/create-object.ts:18
- c29b0936-7 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/capabilities/create-object.ts:30
- c29b0936-8 - ignored - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-projects/src/capabilities/create-object.ts:42
- c29b0936-9 - ignored - inline-obj-parent - packages/plugins/plugin-projects/src/capabilities/migrations.ts:104
- c29b0936-10 - ignored - no-casts - packages/plugins/plugin-projects/src/containers/index.ts:32
- c29b0936-11 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-projects/src/hooks/useFeatureGraph.ts:26
- c29b0936-12 - ignored - flat-layer-composition - packages/plugins/plugin-projects/src/operations/feature/feature.test.ts:30
- c29b0936-13 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-projects/src/testing/FeatureSeed.ts:42

## Issues

# WARN c29b0936-1 flat-layer-composition `packages/plugins/plugin-presenter/src/operations/create-showcase.test.ts:21`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 21-34 (`const testLayer = () =>`, location confidence 0.99). Judged with added `importers` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# ERROR c29b0936-2 bounded-live-state `packages/plugins/plugin-presenter/src/operations/create-showcase.ts:30`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.82. The likeliest place is lines 30-41 (`const presentation = yield* Database.add(`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c29b0936-3 no-module-level-object-caches `packages/plugins/plugin-presenter/src/types/ShowcaseMigration.ts:12`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.91. The likeliest place is lines 12-17 (`const pending = new Map<string, Slide[]>();`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c29b0936-4 state-owned-once `packages/plugins/plugin-presenter/src/types/ShowcaseMigration.ts:12`

System One judges this a likely violation of `state-owned-once` (Track state on the record that owns it, not in a side-table), p=0.81. The likeliest place is lines 12-17 (`const pending = new Map<string, Slide[]>();`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c29b0936-5 inject-dependencies-via-constructor `packages/plugins/plugin-presenter/src/types/ShowcaseMigration.ts:12`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.92. The likeliest place is lines 12-17 (`const pending = new Map<string, Slide[]>();`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c29b0936-6 options-object-with-defaults `packages/plugins/plugin-projects/src/capabilities/create-object.ts:18`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.83. The likeliest place is lines 18-29 (`type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createOb...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN c29b0936-7 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/capabilities/create-object.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 30-41 (`export default Capability.makeModule(`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN c29b0936-8 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-projects/src/capabilities/create-object.ts:42`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.82. The likeliest place is lines 42-53 (`{ name, templateId },`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN c29b0936-9 inline-obj-parent `packages/plugins/plugin-projects/src/capabilities/migrations.ts:104`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.85. The likeliest place is lines 104-115 (`const getContainer = async (db: Database.Database, state: SpecsState, placeme...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c29b0936-10 no-casts `packages/plugins/plugin-projects/src/containers/index.ts:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 32-35 (`export const ProjectArticle: ComponentType<any> = lazy(() =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c29b0936-11 no-try-catch-in-effect-code `packages/plugins/plugin-projects/src/hooks/useFeatureGraph.ts:26`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 26-38 (`const sourceOf = <R extends Relation.Unknown>(relation: R): Relation.SourceOf...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c29b0936-12 flat-layer-composition `packages/plugins/plugin-projects/src/operations/feature/feature.test.ts:30`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 30-41 (`const testLayer = () =>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN c29b0936-13 operations-resolve-database-from-service `packages/plugins/plugin-projects/src/testing/FeatureSeed.ts:42`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.90. The likeliest place is lines 42-53 (`export const seed = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `4a20392c50dd8da257e4500fe01d5179d88e5134`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 13 violations written to fragments, 224 uncertain, 948 clean, 0 unanswered
- left for an agentic reviewer: 85 batch(es)

```text
requests: 483 (169 verdicts re-asked with context the model requested)
estimated input tokens: 2904794
billed input tokens: 2663239 (cost $0.1119)
measured chars per token: 3.27
```
