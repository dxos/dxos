---
branch: claude/peaceful-shtern-cc9986
commit: 0808111967d9ffa57aeddc76e2cf68dd99cbf902
base: origin/claude/assignee-delegation-research-ef06fd
mode: fast
createdAt: 2026-11-03T21:14:12.446Z
isFinalized: true
groups: 286
rules: [consistent-file-naming-within-folder, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, jsdoc-non-obvious-identifiers, keep-parallel-apis-structurally-aligned, mutate-echo-arrays-with-splice, no-sleep-in-test, no-styling-wrapper-divs, no-try-catch-in-effect-code, no-unused-new-api, options-object-with-defaults, setter-must-not-own-transaction, state-owned-once, story-for-new-ui-component, test-real-scenario-not-narrower-proxy, workerd-variant-imports-conditioned-barrel]
reviewId: 0808111967d
---

_0 error(s), 28 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 0808111967d-1 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-claude/src/agents/EdgeAgent.test.ts:33
- 0808111967d-2 - ignored - no-sleep-in-test - packages/plugins/plugin-claude/src/agents/EdgeAgent.test.ts:329
- 0808111967d-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-claude/src/agents/EdgeAgent.ts:481
- 0808111967d-4 - ignored - flat-layer-composition - packages/plugins/plugin-claude/src/e2e/ClaudeCodeEdge.e2e.test.ts:139
- 0808111967d-5 - ignored - workerd-variant-imports-conditioned-barrel - packages/plugins/plugin-code/dx.config.ts:110
- 0808111967d-6 - ignored - inline-obj-parent - packages/plugins/plugin-code/src/capabilities/migrations.test.ts:241
- 0808111967d-7 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code/src/skills/index.ts:1
- 0808111967d-8 - ignored - no-unused-new-api - packages/plugins/plugin-code/src/skills/RepositoriesSkill.ts:20
- 0808111967d-9 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/review/work.ts:160
- 0808111967d-10 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/stockfish/project.ts:58
- 0808111967d-11 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/tidepool/project.ts:28
- 0808111967d-12 - ignored - options-object-with-defaults - packages/plugins/plugin-projects/src/capabilities/create-object.ts:13
- 0808111967d-13 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/capabilities/create-object.ts:35
- 0808111967d-14 - ignored - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-projects/src/capabilities/create-object.ts:47
- 0808111967d-15 - ignored - error-messages-carry-context - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:883
- 0808111967d-16 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:995
- 0808111967d-17 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:190
- 0808111967d-18 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:334
- 0808111967d-19 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:454
- 0808111967d-20 - ignored - inline-obj-parent - packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts:188
- 0808111967d-21 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-projects/src/testing/SoftwareConfigPlugin.ts:1
- 0808111967d-22 - ignored - state-owned-once - packages/plugins/plugin-projects/src/types/LegacyProject.ts:76
- 0808111967d-23 - ignored - jsdoc-non-obvious-identifiers - packages/plugins/plugin-projects/src/types/ProjectSurface.ts:14
- 0808111967d-24 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-tasks/src/components/Outline/Outline.stories.tsx:78
- 0808111967d-25 - resolved - story-for-new-ui-component - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskMilestoneFilter.tsx:23
- 0808111967d-26 - ignored - setter-must-not-own-transaction - packages/sdk/types/src/types/Repo.ts:111
- 0808111967d-27 - ignored - consistent-file-naming-within-folder - packages/stories/stories-projects/src/stories/ProjectTaskDetail.stories.tsx:137
- 0808111967d-28 - ignored - no-try-catch-in-effect-code - packages/ui/react-ui-form/src/components/fields/ArrayField.tsx:96

## Issues

# WARN 0808111967d-1 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-claude/src/agents/EdgeAgent.test.ts:33`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.83. The likeliest place is lines 33-44 (`class FakeEdge implements EdgeAgent.ProcessControl {`, location confidence 0.58). Judged with added `imports, test` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-2 no-sleep-in-test `packages/plugins/plugin-claude/src/agents/EdgeAgent.test.ts:329`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 329-340 (`if (key && key.id.endsWith(':2')) {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-3 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-claude/src/agents/EdgeAgent.ts:481`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 481-492 (`export const composerMcpCredentials = (`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-4 flat-layer-composition `packages/plugins/plugin-claude/src/e2e/ClaudeCodeEdge.e2e.test.ts:139`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 139-150 (`Effect.provide(TestLayer),`, location confidence 0.56). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-5 workerd-variant-imports-conditioned-barrel `packages/plugins/plugin-code/dx.config.ts:110`

System One judges this a likely violation of `workerd-variant-imports-conditioned-barrel` (A plugin's workerd build is the `dx.config.ts` modules scoped by `environments` plus a workerd-conditioned `#operations`, never a hand-picked capability module), p=0.89. The likeliest place is lines 110-121 (`environments: ['browser', 'node', 'tauri'],`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-6 inline-obj-parent `packages/plugins/plugin-code/src/capabilities/migrations.test.ts:241`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.88. The likeliest place is lines 241-252 (`const legacy = db.add(`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-7 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code/src/skills/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-8 (`export { default as CoderSkill } from './coder.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-8 no-unused-new-api `packages/plugins/plugin-code/src/skills/RepositoriesSkill.ts:20`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.82. The likeliest place is lines 20-31 (`export const make = (): Skill.Skill =>`, location confidence 0.97). Judged with added `diff, importers, public-api` context after a first pass of 0.68. This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-9 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/review/work.ts:160`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 160-171 (`export const Work: SampleSpace.Partial<WorkResult, MediaResult> = SampleSpace...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-10 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/stockfish/project.ts:58`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 58-69 (`export const ProjectPartial: SampleSpace.Partial<ProjectResult, ProjectInput>...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-11 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/tidepool/project.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 28-39 (`export const ProjectPartial: SampleSpace.Partial<ProjectResult, ProjectInput>...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-12 options-object-with-defaults `packages/plugins/plugin-projects/src/capabilities/create-object.ts:13`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.85. The likeliest place is lines 13-22 (`import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-13 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/capabilities/create-object.ts:35`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 35-46 (`export default Capability.makeModule(`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-14 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-projects/src/capabilities/create-object.ts:47`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.80. The likeliest place is lines 47-58 (`const { id, subject, project } = yield* Operation.invoke(`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-15 error-messages-carry-context `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:883`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 883-904 (`throw new Error('Chat not found.');`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-16 mutate-echo-arrays-with-splice `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:995`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.91. The likeliest place is lines 995-1018 (`await showTab(canvas, 'overview');`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-17 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:190`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 190-213 (`() => updateView((prev) => ({ ...prev, tab: 'tasks', pipeline: !prev.pipeline...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-18 mutate-echo-arrays-with-splice `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:334`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.94. The likeliest place is lines 334-357 (`(object: Obj.Unknown) => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-19 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:454`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 454-477 (`}`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-20 inline-obj-parent `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts:188`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.81. The likeliest place is lines 188-199 (`assignee: { name: 'Riley', identityDid: 'did:key:riley' },`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-21 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-projects/src/testing/SoftwareConfigPlugin.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-12 (`import * as Effect from 'effect/Effect';`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-22 state-owned-once `packages/plugins/plugin-projects/src/types/LegacyProject.ts:76`

System One judges this a likely violation of `state-owned-once` (Track state on the record that owns it, not in a side-table), p=0.80. The likeliest place is lines 76-87 (`const makeProjectRepositories = (): Migration.ObjectMigration => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-23 jsdoc-non-obvious-identifiers `packages/plugins/plugin-projects/src/types/ProjectSurface.ts:14`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.84. The likeliest place is lines 14-27 (`export type SpecViewData = {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-24 consistent-file-naming-within-folder `packages/plugins/plugin-tasks/src/components/Outline/Outline.stories.tsx:78`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.81. The likeliest place is lines 78-83 (`export const Default: Story = {};`, location confidence 0.63). Judged with added `package, siblings` context after a first pass of 0.73. This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-25 story-for-new-ui-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskMilestoneFilter.tsx:23`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.83. The likeliest place is lines 23-34 (`export const TaskMilestoneFilter = ({ milestones, value, onChange }: TaskMile...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-26 setter-must-not-own-transaction `packages/sdk/types/src/types/Repo.ts:111`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.82. The likeliest place is lines 111-122 (`export const setRepositories = (object: Obj.Unknown, repositories: readonly R...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-27 consistent-file-naming-within-folder `packages/stories/stories-projects/src/stories/ProjectTaskDetail.stories.tsx:137`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.81. The likeliest place is lines 137-148 (`export const Default: Story = {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0808111967d-28 no-try-catch-in-effect-code `packages/ui/react-ui-form/src/components/fields/ArrayField.tsx:96`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 96-107 (`createdRef.current.add(id);`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

- 0808111967d-25: TaskSetArticle's `MilestoneFilter` story drives the new filter, as `StatusFilter` does for its sibling.
- 1–6, 9–11, 15, 17, 20, 23, 27, 28: the flagged lines predate this PR, which does not touch them.
- 7, 21: the namespace modules agree: `// @import-as-namespace`, a PascalCase file, `export * as` and a named import; line 1 of `skills/index.ts` is the pre-existing `CoderSkill`.
- 8: `RepositoriesSkill.make` is used by the skill definition and its test.
- 12–14: this PR changes only a doc comment in `create-object.ts`.
- 16, 18, 19: the flagged reassignment and wrapper div predate this PR; its added lines there are a comment, an assertion and `Form.FieldSet`s.
- 22: the map carries refs from the transform to `onMigration`, since the transform cannot write meta; each entry is deleted as it is read.
- 24: this PR adds a story to an existing folder without renaming anything.
- 26: `Repo.setRepositories` is the public entrypoint for the annotation, like `Annotation.update` that it wraps; no caller batches it with other writes.

### System One pass

- model: jev-latest
- base for context: `origin/claude/assignee-delegation-research-ef06fd`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 28 violations written to fragments, 515 uncertain, 2103 clean, 0 unanswered
- left for an agentic reviewer: 122 batch(es)

```text
requests: 1073 (304 verdicts re-asked with context the model requested)
estimated input tokens: 8440540
billed input tokens: 7916751 (cost $0.3325)
measured chars per token: 3.20
```
