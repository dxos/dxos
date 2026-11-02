---
branch: claude/dreamy-cray-9d46d7
commit: 53a2f56bc5d5f515fcbc03a9b2f0adf3ab555977
base: 8ad08cb2be9afbc854637512e3fa36d633216698
mode: fast
createdAt: 2026-11-02T16:10:00.103Z
isFinalized: true
groups: 833
rules: [atom-lifetime-bound-to-owner, bounded-live-state, business-logic-out-of-ui, collections-use-standard-containers, containers-share-core-hooks, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, empty-container-uses-empty, error-messages-carry-context, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, inline-obj-parent, keep-parallel-apis-structurally-aligned, mutate-echo-arrays-with-splice, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-module-level-object-caches, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, no-try-catch-in-effect-code, no-unused-new-api, operations-resolve-database-from-service, options-object-with-defaults, reactive-state-via-atom-bridge, ref-collections-via-query, retries-via-schedule-with-evidence, reuse-shared-test-layer, setter-must-not-own-transaction, stable-component-for-optional-content, story-for-new-ui-component, structured-logging-not-console, test-asserts-real-behavior, test-at-owning-package, toolbars-are-menu-actions, use-context-scoped-cancellation]
reviewId: 53a2f56bc5d
---

_7 error(s), 69 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 53a2f56bc5d-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-code/src/capabilities/create-object.ts:13
- 53a2f56bc5d-2 - resolved - inline-obj-parent - packages/plugins/plugin-code/src/capabilities/migrations.test.ts:157
- 53a2f56bc5d-3 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-code/src/components/FeatureCanvas/FeatureCanvas.stories.tsx:102
- 53a2f56bc5d-4 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/components/FeatureCanvas/FeatureCanvas.tsx:206
- 53a2f56bc5d-5 - ignored - story-for-new-ui-component - packages/plugins/plugin-code/src/components/FeatureCanvas/FeatureCanvasCells.tsx:43
- 53a2f56bc5d-6 - resolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/components/FeatureCanvas/FeatureCanvasCells.tsx:55
- 53a2f56bc5d-7 - ignored - collections-use-standard-containers - packages/plugins/plugin-code/src/components/FeatureCard/FeatureCard.stories.tsx:117
- 53a2f56bc5d-8 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code/src/components/FeatureCard/index.ts:1
- 53a2f56bc5d-9 - ignored - event-handler-naming-convention - packages/plugins/plugin-code/src/components/FeatureCard/RequirementEditor.tsx:29
- 53a2f56bc5d-10 - ignored - story-for-new-ui-component - packages/plugins/plugin-code/src/components/FeatureCard/RequirementEditor.tsx:82
- 53a2f56bc5d-11 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-code/src/components/FeatureEmbeds/feature-embeds.ts:65
- 53a2f56bc5d-12 - ignored - containers-share-core-hooks - packages/plugins/plugin-code/src/components/FeatureKanban/FeatureKanban.tsx:150
- 53a2f56bc5d-13 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/components/FeatureKanban/FeatureKanban.tsx:162
- 53a2f56bc5d-14 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-code/src/constants.ts:31
- 53a2f56bc5d-15 - ignored - story-for-new-ui-component - packages/plugins/plugin-code/src/containers/AddFeatureDialog/AddFeatureDialog.tsx:34
- 53a2f56bc5d-16 - ignored - empty-container-uses-empty - packages/plugins/plugin-code/src/containers/AddFeatureDialog/AddFeatureDialog.tsx:82
- 53a2f56bc5d-17 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-code/src/containers/FeatureCardContent/FeatureCardContent.stories.tsx:30
- 53a2f56bc5d-18 - ignored - stable-component-for-optional-content - packages/plugins/plugin-code/src/containers/FeatureCardContent/FeatureCardContent.tsx:18
- 53a2f56bc5d-19 - ignored - story-for-new-ui-component - packages/plugins/plugin-code/src/containers/FeatureCompanion/FeatureCompanion.tsx:42
- 53a2f56bc5d-20 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-code/src/containers/FeatureCompanion/FeatureCompanion.tsx:90
- 53a2f56bc5d-21 - ignored - business-logic-out-of-ui - packages/plugins/plugin-code/src/containers/FeatureEmbeds/feature-embed-extensions.tsx:51
- 53a2f56bc5d-22 - ignored - story-for-new-ui-component - packages/plugins/plugin-code/src/containers/FeatureSection/FeatureSection.tsx:33
- 53a2f56bc5d-23 - ignored - no-casts - packages/plugins/plugin-code/src/containers/index.ts:24
- 53a2f56bc5d-24 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-code/src/containers/SpecArticle/spec-session.ts:34
- 53a2f56bc5d-25 - ignored - no-module-level-object-caches - packages/plugins/plugin-code/src/containers/SpecArticle/spec-session.ts:41
- 53a2f56bc5d-26 - ignored - inject-dependencies-via-constructor - packages/plugins/plugin-code/src/containers/SpecArticle/spec-session.ts:41
- 53a2f56bc5d-27 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.stories.tsx:169
- 53a2f56bc5d-28 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-code/src/containers/SpecArticle/useSpecSources.ts:55
- 53a2f56bc5d-29 - ignored - story-for-new-ui-component - packages/plugins/plugin-code/src/containers/SpecCompanion/SpecCompanion.tsx:24
- 53a2f56bc5d-30 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-code/src/containers/SpecFeatures/SpecFeatures.stories.tsx:46
- 53a2f56bc5d-31 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-code/src/containers/SpecFeatures/SpecFeatures.tsx:99
- 53a2f56bc5d-32 - ignored - stable-component-for-optional-content - packages/plugins/plugin-code/src/containers/SpecFeatures/SpecFeatures.tsx:111
- 53a2f56bc5d-33 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-code/src/hooks/useFeatureGraph.ts:28
- 53a2f56bc5d-34 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-code/src/index.ts:1
- 53a2f56bc5d-35 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code/src/index.ts:1
- 53a2f56bc5d-36 - ignored - flat-layer-composition - packages/plugins/plugin-code/src/operations/feature/feature.test.ts:33
- 53a2f56bc5d-37 - ignored - no-trivial-wrappers-over-official-apis - packages/plugins/plugin-code/src/operations/feature/feature.test.ts:56
- 53a2f56bc5d-38 - ignored - test-at-owning-package - packages/plugins/plugin-code/src/skills/feature-map/FeatureMapSkill.test.ts:30
- 53a2f56bc5d-39 - ignored - no-unused-new-api - packages/plugins/plugin-code/src/skills/feature-map/FeatureMapSkill.ts:43
- 53a2f56bc5d-40 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code/src/skills/feature-map/index.ts:1
- 53a2f56bc5d-41 - ignored - no-unused-new-api - packages/plugins/plugin-code/src/skills/feature-map/index.ts:1
- 53a2f56bc5d-42 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code/src/sync/index.ts:1
- 53a2f56bc5d-43 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-code/src/testing/FeatureSeed.ts:73
- 53a2f56bc5d-44 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-code/src/types/Feature.ts:152
- 53a2f56bc5d-45 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code/src/types/FeatureEmbed.ts:1
- 53a2f56bc5d-46 - ignored - no-trivial-wrappers-over-official-apis - packages/plugins/plugin-code/src/types/SpecText.test.ts:31
- 53a2f56bc5d-47 - ignored - bounded-live-state - packages/plugins/plugin-debug/src/samples/ride-check/features.ts:70
- 53a2f56bc5d-48 - ignored - bounded-live-state - packages/plugins/plugin-debug/src/samples/worker/features.ts:73
- 53a2f56bc5d-49 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/worker/features.ts:73
- 53a2f56bc5d-50 - ignored - reuse-shared-test-layer - packages/plugins/plugin-github/src/file-sync/sync-files.test.ts:117
- 53a2f56bc5d-51 - ignored - flat-layer-composition - packages/plugins/plugin-github/src/file-sync/sync-files.test.ts:349
- 53a2f56bc5d-52 - ignored - inject-dependencies-via-constructor - packages/plugins/plugin-github/src/file-sync/sync-files.ts:103
- 53a2f56bc5d-53 - ignored - retries-via-schedule-with-evidence - packages/plugins/plugin-github/src/file-sync/sync-files.ts:530
- 53a2f56bc5d-54 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-github/src/file-sync/TextMerge.ts:1
- 53a2f56bc5d-55 - ignored - flat-layer-composition - packages/plugins/plugin-presenter/src/operations/create-showcase.test.ts:21
- 53a2f56bc5d-56 - ignored - options-object-with-defaults - packages/plugins/plugin-projects/src/capabilities/create-object.ts:13
- 53a2f56bc5d-57 - ignored - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-projects/src/capabilities/create-object.ts:47
- 53a2f56bc5d-58 - ignored - no-casts - packages/plugins/plugin-projects/src/containers/index.ts:26
- 53a2f56bc5d-59 - ignored - error-messages-carry-context - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:703
- 53a2f56bc5d-60 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:958
- 53a2f56bc5d-61 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:188
- 53a2f56bc5d-62 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:308
- 53a2f56bc5d-63 - ignored - ref-collections-via-query - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:404
- 53a2f56bc5d-64 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:428
- 53a2f56bc5d-65 - ignored - stable-component-for-optional-content - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:452
- 53a2f56bc5d-66 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-projects/src/index.ts:1
- 53a2f56bc5d-67 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-projects/src/ProjectHooks.ts:1
- 53a2f56bc5d-68 - ignored - test-asserts-real-behavior - packages/plugins/plugin-projects/src/ProjectsPlugin.workerd.test.ts:16
- 53a2f56bc5d-69 - ignored - test-at-owning-package - packages/plugins/plugin-projects/src/skills/project/ProjectSkill.test.ts:27
- 53a2f56bc5d-70 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-projects/src/SpecCommands.ts:1
- 53a2f56bc5d-71 - ignored - no-casts - packages/reflect/introspect/src/__sanity__/plugins.test.ts:31
- 53a2f56bc5d-72 - ignored - structured-logging-not-console - packages/reflect/introspect/src/indexer/plugins.ts:21
- 53a2f56bc5d-73 - ignored - no-try-catch-in-effect-code - packages/reflect/introspect/src/indexer/plugins.ts:105
- 53a2f56bc5d-74 - ignored - no-try-catch-in-effect-code - packages/ui/react-ui-form/src/components/fields/ArrayField.tsx:91
- 53a2f56bc5d-75 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectForm.tsx:52
- 53a2f56bc5d-76 - ignored - no-casts - packages/ui/react-ui-form/src/components/resolve-field.ts:134

## Issues

# WARN 53a2f56bc5d-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-code/src/capabilities/create-object.ts:13`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 13-24 (`import { CodeProject } from '#types';`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-2 inline-obj-parent `packages/plugins/plugin-code/src/capabilities/migrations.test.ts:157`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.81. The likeliest place is lines 157-168 (`Obj.setParent(sync, inbox);`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-3 no-styling-wrapper-divs `packages/plugins/plugin-code/src/components/FeatureCanvas/FeatureCanvas.stories.tsx:102`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 102-113 (`max={10}`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-4 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/components/FeatureCanvas/FeatureCanvas.tsx:206`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 206-217 (`useEffect(`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-5 story-for-new-ui-component `packages/plugins/plugin-code/src/components/FeatureCanvas/FeatureCanvasCells.tsx:43`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 43-54 (`export const FeatureCanvasCells = ({ onCreate, onAdd, onPin }: FeatureCanvasC...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-6 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/components/FeatureCanvas/FeatureCanvasCells.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 55-66 (`const origin = useRef<HTMLDivElement>(null);`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-7 collections-use-standard-containers `packages/plugins/plugin-code/src/components/FeatureCard/FeatureCard.stories.tsx:117`

System One judges this a likely violation of `collections-use-standard-containers` (A collection of objects renders in a standard container — list, masonry, kanban, or canvas), p=0.88. The likeliest place is lines 117-128 (`const DefaultStory = ({ ids, features = SAMPLE_FEATURES, variant, onOpen }: S...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-8 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code/src/components/FeatureCard/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-10 (`export * from './feature.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-9 event-handler-naming-convention `packages/plugins/plugin-code/src/components/FeatureCard/RequirementEditor.tsx:29`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.82. The likeliest place is lines 29-40 (`const CommitField = ({ value, label, testId, autoFocus, onCommit }: CommitFie...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-10 story-for-new-ui-component `packages/plugins/plugin-code/src/components/FeatureCard/RequirementEditor.tsx:82`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.87. The likeliest place is lines 82-93 (`export const RequirementEditor = ({ requirements, onChange }: RequirementEdit...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-11 use-context-scoped-cancellation `packages/plugins/plugin-code/src/components/FeatureEmbeds/feature-embeds.ts:65`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 65-76 (`if (!after.has(id)) {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-12 containers-share-core-hooks `packages/plugins/plugin-code/src/components/FeatureKanban/FeatureKanban.tsx:150`

System One judges this a likely violation of `containers-share-core-hooks` (A container builds on the shared container hooks, never its own navigation, selection or focus), p=0.80. The likeliest place is lines 150-161 (`export const FeatureKanban = Util.composable<HTMLDivElement, FeatureKanbanPro...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-13 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/components/FeatureKanban/FeatureKanban.tsx:162`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 162-173 (`const [featuresAtom] = useState(() => Atom.make<readonly FeatureModel[]>(feat...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-14 namespace-brand-key-prefixing `packages/plugins/plugin-code/src/constants.ts:31`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.84. The likeliest place is lines 31-40 (`export const INTROSPECT_MCP_KEY = 'org.dxos.mcp.introspect';`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-15 story-for-new-ui-component `packages/plugins/plugin-code/src/containers/AddFeatureDialog/AddFeatureDialog.tsx:34`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.94. The likeliest place is lines 34-45 (`export const AddFeatureDialog = ({ spec, parentId, exclude, position }: AddFe...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-16 empty-container-uses-empty `packages/plugins/plugin-code/src/containers/AddFeatureDialog/AddFeatureDialog.tsx:82`

System One judges this a likely violation of `empty-container-uses-empty` (A container with nothing to show renders `Status.Empty`, not a hand-styled message), p=0.91. The likeliest place is lines 82-93 (`onSelect={() => handleSelect(feature)}`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-17 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-code/src/containers/FeatureCardContent/FeatureCardContent.stories.tsx:30`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.91. The likeliest place is lines 30-41 (`const DefaultStory = () => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-18 stable-component-for-optional-content `packages/plugins/plugin-code/src/containers/FeatureCardContent/FeatureCardContent.tsx:18`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.80. The likeliest place is lines 18-31 (`export const FeatureCardContent = ({ subject }: FeatureCardContentProps) => {`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-19 story-for-new-ui-component `packages/plugins/plugin-code/src/containers/FeatureCompanion/FeatureCompanion.tsx:42`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.93. The likeliest place is lines 42-53 (`export const FeatureCompanion = ({ role, spec, attendableId, onZoom }: Featur...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-20 toolbars-are-menu-actions `packages/plugins/plugin-code/src/containers/FeatureCompanion/FeatureCompanion.tsx:90`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 90-101 (`variant='ghost'`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-21 business-logic-out-of-ui `packages/plugins/plugin-code/src/containers/FeatureEmbeds/feature-embed-extensions.tsx:51`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.85. The likeliest place is lines 51-62 (`onChange: ({ removed }) => void SpecText.sync(spec, { removed }),`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-22 story-for-new-ui-component `packages/plugins/plugin-code/src/containers/FeatureSection/FeatureSection.tsx:33`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.93. The likeliest place is lines 33-44 (`export const FeatureSection = ({ subject, attendableId }: FeatureSectionProps...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 53a2f56bc5d-23 no-casts `packages/plugins/plugin-code/src/containers/index.ts:24`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 24-44 (`export const AddFeatureDialog: ComponentType<AddFeatureDialogProps> = lazy(() =>`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-24 atom-lifetime-bound-to-owner `packages/plugins/plugin-code/src/containers/SpecArticle/spec-session.ts:34`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.95. The likeliest place is lines 34-40 (`export const specSession = Atom.family((id: string) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-25 no-module-level-object-caches `packages/plugins/plugin-code/src/containers/SpecArticle/spec-session.ts:41`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.82. The likeliest place is lines 41-52 (`export const registerEditor = (id: string, editor: EditorView): (() => void) ...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-26 inject-dependencies-via-constructor `packages/plugins/plugin-code/src/containers/SpecArticle/spec-session.ts:41`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.90. The likeliest place is lines 41-52 (`export const registerEditor = (id: string, editor: EditorView): (() => void) ...`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-27 no-styling-wrapper-divs `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.stories.tsx:169`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 169-180 (`export const Companion: Story = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-28 reactive-state-via-atom-bridge `packages/plugins/plugin-code/src/containers/SpecArticle/useSpecSources.ts:55`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.91. The likeliest place is lines 55-66 (`export const useLocalTexts = (keys: readonly string[]): ReadonlyMap<string, s...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-29 story-for-new-ui-component `packages/plugins/plugin-code/src/containers/SpecCompanion/SpecCompanion.tsx:24`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.93. The likeliest place is lines 24-29 (`export const SpecCompanion = ({ companionTo }: SpecCompanionProps) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-30 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-code/src/containers/SpecFeatures/SpecFeatures.stories.tsx:46`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 46-54 (`<Layout.Grid classNames='dx-fill grid-cols-[1fr_24rem] divide-x divide-separa...`, location confidence 1.00). Judged with added `siblings, test` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-31 no-styling-wrapper-divs `packages/plugins/plugin-code/src/containers/SpecFeatures/SpecFeatures.tsx:99`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 99-110 (`<div className='grid min-h-0 h-full' data-testid='feature-map.document'>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-32 stable-component-for-optional-content `packages/plugins/plugin-code/src/containers/SpecFeatures/SpecFeatures.tsx:111`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.85. The likeliest place is lines 111-122 (`return <Status.Empty classNames='h-full'>{t('feature-map.empty.message')}</St...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-33 no-try-catch-in-effect-code `packages/plugins/plugin-code/src/hooks/useFeatureGraph.ts:28`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 28-40 (`const sourceOf = <R extends Relation.Unknown>(relation: R): Relation.SourceOf...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-34 namespace-export-with-internal-hiding `packages/plugins/plugin-code/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-8 (`export * as CodePlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-35 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.87. The likeliest place is lines 1-8 (`export * as CodePlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-36 flat-layer-composition `packages/plugins/plugin-code/src/operations/feature/feature.test.ts:33`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 33-44 (`const testLayer = () =>`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-37 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-code/src/operations/feature/feature.test.ts:56`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.80. The likeliest place is lines 56-62 (`const featureIds = (spec: Spec.Spec) =>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-38 test-at-owning-package `packages/plugins/plugin-code/src/skills/feature-map/FeatureMapSkill.test.ts:30`

System One judges this a likely violation of `test-at-owning-package` (Test behavior in the lowest package that implements it, not through a plugin), p=0.80. The likeliest place is lines 30-41 (`expect(unprojectable).toEqual([]);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-39 no-unused-new-api `packages/plugins/plugin-code/src/skills/feature-map/FeatureMapSkill.ts:43`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.83. The likeliest place is lines 43-57 (`export const make = (): Skill.Skill =>`, location confidence 0.76). Judged with added `diff, importers, public-api` context after a first pass of 0.70. This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-40 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code/src/skills/feature-map/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-6 (`export * as FeatureMapSkill from './FeatureMapSkill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-41 no-unused-new-api `packages/plugins/plugin-code/src/skills/feature-map/index.ts:1`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.83. The likeliest place is lines 1-6 (`export * as FeatureMapSkill from './FeatureMapSkill.ts';`, location confidence 1.00). Judged with added `diff, importers, public-api` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-42 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code/src/sync/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.86. The likeliest place is lines 1-9 (`export * as FrontMatter from './front-matter.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-43 operations-resolve-database-from-service `packages/plugins/plugin-code/src/testing/FeatureSeed.ts:73`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.91. The likeliest place is lines 73-84 (`export const seed = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-44 setter-must-not-own-transaction `packages/plugins/plugin-code/src/types/Feature.ts:152`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.89. The likeliest place is lines 152-163 (`export const setSources = (feature: Feature, sources: readonly string[]): voi...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-45 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code/src/types/FeatureEmbed.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-12 (`import { EID } from '@dxos/echo';`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-46 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-code/src/types/SpecText.test.ts:31`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.82. The likeliest place is lines 31-42 (`await builder.close();`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 53a2f56bc5d-47 bounded-live-state `packages/plugins/plugin-debug/src/samples/ride-check/features.ts:70`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.80. The likeliest place is lines 70-81 (`export const FeaturesPartial: SampleSpace.Partial<FeaturesResult, FeaturesInp...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 53a2f56bc5d-48 bounded-live-state `packages/plugins/plugin-debug/src/samples/worker/features.ts:73`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 73-84 (`export const FeaturesPartial: SampleSpace.Partial<FeaturesResult, FeaturesInp...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-49 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/worker/features.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 73-84 (`export const FeaturesPartial: SampleSpace.Partial<FeaturesResult, FeaturesInp...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-50 reuse-shared-test-layer `packages/plugins/plugin-github/src/file-sync/sync-files.test.ts:117`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.80. The likeliest place is lines 117-128 (`const fakeFetch =`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-51 flat-layer-composition `packages/plugins/plugin-github/src/file-sync/sync-files.test.ts:349`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 349-360 (`Effect.provideService(FetchHttpClient.Fetch, fakeFetch(git)),`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-52 inject-dependencies-via-constructor `packages/plugins/plugin-github/src/file-sync/sync-files.ts:103`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.80. The likeliest place is lines 103-114 (`const cacheBlob = (sha: string, content: string) => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-53 retries-via-schedule-with-evidence `packages/plugins/plugin-github/src/file-sync/sync-files.ts:530`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.87. The likeliest place is lines 530-541 (`let commit: string | undefined;`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-54 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-github/src/file-sync/TextMerge.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.87. The likeliest place is lines 1-15 (`import { next as A } from '@automerge/automerge';`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-55 flat-layer-composition `packages/plugins/plugin-presenter/src/operations/create-showcase.test.ts:21`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 21-34 (`const testLayer = () =>`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-56 options-object-with-defaults `packages/plugins/plugin-projects/src/capabilities/create-object.ts:13`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.84. The likeliest place is lines 13-22 (`import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-57 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-projects/src/capabilities/create-object.ts:47`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.81. The likeliest place is lines 47-58 (`const { id, subject, project } = yield* Operation.invoke(`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 53a2f56bc5d-58 no-casts `packages/plugins/plugin-projects/src/containers/index.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 26-29 (`export const ProjectArticle: ComponentType<any> = lazy(() =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-59 error-messages-carry-context `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:703`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 703-720 (`if (!chat) {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-60 mutate-echo-arrays-with-splice `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:958`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.92. The likeliest place is lines 958-971 (`project.artifacts.push(Ref.make(artifact));`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-61 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:188`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 188-211 (`const fiber = Effect.runFork(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-62 mutate-echo-arrays-with-splice `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:308`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.93. The likeliest place is lines 308-331 (`const handleDeleteArtifact = useCallback(`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-63 ref-collections-via-query `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:404`

System One judges this a likely violation of `ref-collections-via-query` (List, count, or walk referenced objects through a query or Database.load, not by reading the ref array), p=0.80. The likeliest place is lines 404-427 (`)}`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-64 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:428`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 428-451 (`{/* Settings other plugins keep for this project, such as its folder on this ...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-65 stable-component-for-optional-content `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:452`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.80. The likeliest place is lines 452-475 (`{/* The ledger gets the whole panel here, so the list scrolls on its own rath...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-66 namespace-export-with-internal-hiding `packages/plugins/plugin-projects/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 1-13 (`export * as ProjectsPlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-67 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-projects/src/ProjectHooks.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-8 (`export * from './hooks/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-68 test-asserts-real-behavior `packages/plugins/plugin-projects/src/ProjectsPlugin.workerd.test.ts:16`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 16-29 (`describe('ProjectsPlugin in workerd', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-69 test-at-owning-package `packages/plugins/plugin-projects/src/skills/project/ProjectSkill.test.ts:27`

System One judges this a likely violation of `test-at-owning-package` (Test behavior in the lowest package that implements it, not through a plugin), p=0.83. The likeliest place is lines 27-38 (`expect(unprojectable).toEqual([]);`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-70 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-projects/src/SpecCommands.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-8 (`export * from './components/SpecDocumentEditor/slash-commands.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 53a2f56bc5d-71 no-casts `packages/reflect/introspect/src/__sanity__/plugins.test.ts:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 31-42 (`expect(Array.isArray(code!.tags)).toBe(true);`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-72 structured-logging-not-console `packages/reflect/introspect/src/indexer/plugins.ts:21`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 21-24 (`const warn = (msg: string, err?: unknown): void => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-73 no-try-catch-in-effect-code `packages/reflect/introspect/src/indexer/plugins.ts:105`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.88. The likeliest place is lines 105-116 (`skipFileDependencyResolution: true,`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53a2f56bc5d-74 no-try-catch-in-effect-code `packages/ui/react-ui-form/src/components/fields/ArrayField.tsx:91`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 91-102 (`log.catch(err);`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 53a2f56bc5d-75 no-casts `packages/ui/react-ui-form/src/components/ObjectForm.tsx:52`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 52-63 (`export const useCreateObject = (db: Database.Database | undefined) =>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 53a2f56bc5d-76 no-casts `packages/ui/react-ui-form/src/components/resolve-field.ts:134`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 134-143 (`? SchemaEx.getDiscriminatedType(baseNode, value as any)`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `8ad08cb2be9afbc854637512e3fa36d633216698`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 76 violations written to fragments, 1347 uncertain, 7607 clean, 0 unanswered
- left for an agentic reviewer: 184 batch(es)

```text
requests: 3641 (903 verdicts re-asked with context the model requested)
estimated input tokens: 22456049
billed input tokens: 20697131 (cost $0.8693)
measured chars per token: 3.25
```

### Triage

Resolved:

- 2: the migration test sets each parent at make time with `[Obj.Parent]` where the parent exists first. The legacy-spec tests keep `Obj.setParent`, because there the parent holds refs to its children and is made after them.
- 6: `FeatureCanvasCells` tracks the hovered cell in a `useHoveredCell` hook, which also drops the `as Element` cast for an `instanceof` check.
- 27: the `Companion` story lays out with `Layout.Grid`.

Ignored, because the flagged line is unchanged from main (the stack only moved the file from plugin-projects, or did not touch the line): 1, 3, 4, 7, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 23, 28, 30, 31, 32, 33, 34, 35, 36, 37, 42, 47, 48, 49, 50, 51, 53, 54, 55, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 69, 71, 72, 73, 74, 76.

Ignored on reading:

- 5, 15, 22, 29 (story-for-new-ui-component): each renders only inside a canvas, dialog or companion surface, and a container story drives it there: `FeatureLevel` AddFeature and AddExistingFeature, `SpecFeatures` NewFeature, `FeatureEmbeds` (via `FeatureEmbedSection`) and `SpecArticle` Companion.
- 11 (use-context-scoped-cancellation): a CodeMirror extension's debounce timer, which has no `Context` in scope.
- 21 (business-logic-out-of-ui): the extension only forwards the removed ids to `SpecText.sync`, which holds the logic.
- 24 (atom-lifetime-bound-to-owner): the spec session is shared by the spec's editor and its companion panel, which mount and unmount apart; `keepAlive` keeps the view choice across that, at one small atom per spec opened.
- 25 (no-module-level-object-caches): the editor registry holds an entry only while its editor is mounted; `registerEditor` returns the cleanup.
- 26, 52 (inject-dependencies-via-constructor): module functions, not methods of a class with collaborators.
- 46 (no-trivial-wrappers-over-official-apis): test teardown, not a wrapper.
- 38 (test-at-owning-package): the test checks plugin-code's own skill definition.
- 39, 41 (no-unused-new-api): `FeatureMapSkill` is contributed in `skill-definition.ts` and referenced by the feature spec template.
- 40, 45, 67, 70 (import-as-namespace-is-all-or-nothing): these modules follow the namespace pattern; `check-module-structure` and the subpath lint pass.
- 43 (operations-resolve-database-from-service): `FeatureSeed.seed` is a testing helper, not an operation.
- 44 (setter-must-not-own-transaction): no caller invokes `Feature.setSources` inside an open `Obj.update`; `update.ts` runs two updates one after the other.
- 56 (options-object-with-defaults): `(props, options)` is the `CreateObjectEntry.createObject` contract.
- 68 (test-asserts-real-behavior): the test activates the plugin headless and asserts what it contributes.
- 75 (no-casts): `useCreateObject` has no cast; it narrows with `invariant`.

