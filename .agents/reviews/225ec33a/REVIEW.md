---
branch: dm/kind-clarke-wd8ipk
commit: 225ec33a669317057902fd3ad2764d38d13c9c2d
base: 6ba7a88dcf292626b76d827014019c3573a96728
mode: fast
createdAt: 2026-10-27T15:31:17.091Z
isFinalized: true
groups: 333
rules: [containers-share-core-hooks, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, keep-parallel-apis-structurally-aligned, mutate-echo-arrays-with-splice, no-casts, no-module-level-object-caches, no-trivial-wrappers-over-official-apis, no-try-catch-in-effect-code, operations-resolve-database-from-service, options-object-with-defaults, ref-collections-via-query, stable-component-for-optional-content, state-owned-once, structured-logging-not-console, toolbars-are-menu-actions]
reviewId: 225ec33a
---

_2 error(s), 26 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 225ec33a-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-code/src/capabilities/create-object.ts:37
- 225ec33a-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:253
- 225ec33a-3 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:409
- 225ec33a-4 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts:134
- 225ec33a-5 - ignored - options-object-with-defaults - packages/plugins/plugin-projects/src/capabilities/create-object.ts:18
- 225ec33a-6 - ignored - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-projects/src/capabilities/create-object.ts:54
- 225ec33a-7 - resolved - no-module-level-object-caches - packages/plugins/plugin-projects/src/capabilities/migrations.ts:58
- 225ec33a-8 - resolved - state-owned-once - packages/plugins/plugin-projects/src/capabilities/migrations.ts:72
- 225ec33a-9 - resolved - inject-dependencies-via-constructor - packages/plugins/plugin-projects/src/capabilities/migrations.ts:72
- 225ec33a-10 - ignored - containers-share-core-hooks - packages/plugins/plugin-projects/src/components/FeatureKanban/FeatureKanban.tsx:151
- 225ec33a-11 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/components/FeatureKanban/FeatureKanban.tsx:163
- 225ec33a-12 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-projects/src/containers/FeatureCompanion/FeatureCompanion.tsx:73
- 225ec33a-13 - ignored - no-casts - packages/plugins/plugin-projects/src/containers/index.ts:34
- 225ec33a-14 - ignored - ref-collections-via-query - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:94
- 225ec33a-15 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:130
- 225ec33a-16 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:214
- 225ec33a-17 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-projects/src/containers/SpecFeatures/SpecFeatures.stories.tsx:45
- 225ec33a-18 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-projects/src/containers/SpecFeatures/SpecFeatures.tsx:259
- 225ec33a-19 - ignored - stable-component-for-optional-content - packages/plugins/plugin-projects/src/containers/SpecFeatures/SpecFeatures.tsx:259
- 225ec33a-20 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-projects/src/hooks/useFeatureGraph.ts:26
- 225ec33a-21 - ignored - flat-layer-composition - packages/plugins/plugin-projects/src/operations/feature/feature.test.ts:30
- 225ec33a-22 - ignored - no-trivial-wrappers-over-official-apis - packages/plugins/plugin-projects/src/operations/feature/feature.test.ts:42
- 225ec33a-23 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-projects/src/testing/FeatureSeed.ts:41
- 225ec33a-24 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-projects/src/types/LegacyFeature.ts:1
- 225ec33a-25 - ignored - no-casts - packages/reflect/introspect/src/__sanity__/plugins.test.ts:31
- 225ec33a-26 - ignored - structured-logging-not-console - packages/reflect/introspect/src/indexer/plugins.ts:21
- 225ec33a-27 - ignored - no-try-catch-in-effect-code - packages/reflect/introspect/src/indexer/plugins.ts:105
- 225ec33a-28 - resolved - import-as-namespace-is-all-or-nothing - packages/sdk/types/src/types/SpecDocument.ts:1

## Issues

# WARN 225ec33a-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-code/src/capabilities/create-object.ts:37`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 37-48 (`createObject: (props, options) =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:253`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 253-264 (`() => buildChangelogGraph(changelog).nodes.filter((node): node is DecisionMod...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-3 toolbars-are-menu-actions `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:409`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 409-420 (`<Toolbar.ToggleGroup`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-4 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts:134`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 134-145 (`AppGraphNode.makeAction({`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-5 options-object-with-defaults `packages/plugins/plugin-projects/src/capabilities/create-object.ts:18`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.83. The likeliest place is lines 18-29 (`type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createOb...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-6 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-projects/src/capabilities/create-object.ts:54`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.81. The likeliest place is lines 54-65 (`{ object: Repo.make(props), target: options.target },`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-7 no-module-level-object-caches `packages/plugins/plugin-projects/src/capabilities/migrations.ts:58`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.92. The likeliest place is lines 58-71 (`type SpecsState = {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-8 state-owned-once `packages/plugins/plugin-projects/src/capabilities/migrations.ts:72`

System One judges this a likely violation of `state-owned-once` (Track state on the record that owns it, not in a side-table), p=0.80. The likeliest place is lines 72-81 (`const getState = (db: Database.Database): SpecsState => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-9 inject-dependencies-via-constructor `packages/plugins/plugin-projects/src/capabilities/migrations.ts:72`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.88. The likeliest place is lines 72-81 (`const getState = (db: Database.Database): SpecsState => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-10 containers-share-core-hooks `packages/plugins/plugin-projects/src/components/FeatureKanban/FeatureKanban.tsx:151`

System One judges this a likely violation of `containers-share-core-hooks` (A container builds on the shared container hooks, never its own navigation, selection or focus), p=0.82. The likeliest place is lines 151-162 (`export const FeatureKanban = Util.composable<HTMLDivElement, FeatureKanbanPro...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-11 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/components/FeatureKanban/FeatureKanban.tsx:163`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 163-174 (`const [featuresAtom] = useState(() => Atom.make<readonly FeatureModel[]>(feat...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-12 toolbars-are-menu-actions `packages/plugins/plugin-projects/src/containers/FeatureCompanion/FeatureCompanion.tsx:73`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 73-84 (`<Panel.Root role={role} data-testid='feature-companion'>`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 225ec33a-13 no-casts `packages/plugins/plugin-projects/src/containers/index.ts:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 34-37 (`export const ProjectArticle: ComponentType<any> = lazy(() =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-14 ref-collections-via-query `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:94`

System One judges this a likely violation of `ref-collections-via-query` (List, count, or walk referenced objects through a query or Database.load, not by reading the ref array), p=0.83. The likeliest place is lines 94-105 (`const [milestoneRefs = []] = useObject(taskSet, 'milestones');`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-15 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:130`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 130-141 (`useEffect(() => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-16 mutate-echo-arrays-with-splice `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:214`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.94. The likeliest place is lines 214-225 (`});`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-17 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-projects/src/containers/SpecFeatures/SpecFeatures.stories.tsx:45`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 45-53 (`<Layout.Grid classNames='dx-fill grid-cols-[1fr_24rem] divide-x divide-separa...`, location confidence 1.00). Judged with added `siblings, test` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-18 toolbars-are-menu-actions `packages/plugins/plugin-projects/src/containers/SpecFeatures/SpecFeatures.tsx:259`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 259-270 (`{zoomed && (`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-19 stable-component-for-optional-content `packages/plugins/plugin-projects/src/containers/SpecFeatures/SpecFeatures.tsx:259`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.83. The likeliest place is lines 259-270 (`{zoomed && (`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-20 no-try-catch-in-effect-code `packages/plugins/plugin-projects/src/hooks/useFeatureGraph.ts:26`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 26-38 (`const sourceOf = <R extends Relation.Unknown>(relation: R): Relation.SourceOf...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-21 flat-layer-composition `packages/plugins/plugin-projects/src/operations/feature/feature.test.ts:30`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 30-41 (`const testLayer = () =>`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-22 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-projects/src/operations/feature/feature.test.ts:42`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.80. The likeliest place is lines 42-55 (`Task.Task,`, location confidence 0.61). Judged with added `importers, test` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-23 operations-resolve-database-from-service `packages/plugins/plugin-projects/src/testing/FeatureSeed.ts:41`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.89. The likeliest place is lines 41-52 (`export const seed = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-24 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-projects/src/types/LegacyFeature.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-16 (`import * as Schema from 'effect/Schema';`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 225ec33a-25 no-casts `packages/reflect/introspect/src/__sanity__/plugins.test.ts:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 31-42 (`expect(Array.isArray(code!.tags)).toBe(true);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-26 structured-logging-not-console `packages/reflect/introspect/src/indexer/plugins.ts:21`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 21-24 (`const warn = (msg: string, err?: unknown): void => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-27 no-try-catch-in-effect-code `packages/reflect/introspect/src/indexer/plugins.ts:105`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 105-116 (`let metaSource: SourceFile;`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 225ec33a-28 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/SpecDocument.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-13 (`import * as Schema from 'effect/Schema';`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `6ba7a88dcf292626b76d827014019c3573a96728`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 28 violations written to fragments, 522 uncertain, 2452 clean, 0 unanswered
- left for an agentic reviewer: 115 batch(es)

```text
requests: 1236 (331 verdicts re-asked with context the model requested)
estimated input tokens: 7956090
billed input tokens: 7338378 (cost $0.3082)
measured chars per token: 3.25
```
