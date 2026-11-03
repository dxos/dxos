---
branch: claude/assignee-delegation-research-ef06fd
commit: a8a5f543c79d2e858b5c0e33386aba175005c2c6
base: 27b3290291e8623b4d5fa59b93cfdd659ae435a4
mode: fast
createdAt: 2026-11-03T19:29:21.087Z
isFinalized: true
groups: 444
rules: [consistent-file-naming-within-folder, effect-fn-not-hand-wrapped-gen, empty-container-uses-empty, error-messages-carry-context, extract-non-rendering-logic-from-component, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, inline-obj-parent, minimal-precise-tests, mutate-echo-arrays-with-splice, named-durations-and-budgets, no-casts, no-module-level-object-caches, no-styling-wrapper-divs, no-try-catch-in-effect-code, obj-update-push, one-test-suite-per-module, ref-collections-via-query, stable-component-for-optional-content, story-for-new-ui-component]
reviewId: a8a5f543c79
---

_4 error(s), 36 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a8a5f543c79-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/assistant-evals/src/evals/chess-mcp.eval.ts:110
- a8a5f543c79-2 - ignored - one-test-suite-per-module - packages/core/compute/assistant-toolkit/src/skills/planning/operations/update-tasks.model.test.ts:51
- a8a5f543c79-3 - resolved - obj-update-push - packages/core/compute/assistant-toolkit/src/skills/planning/operations/update-tasks.test.ts:128
- a8a5f543c79-4 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/skills/planning/operations/update-tasks.test.ts:332
- a8a5f543c79-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.test.ts:141
- a8a5f543c79-6 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:31
- a8a5f543c79-7 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:159
- a8a5f543c79-8 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:464
- a8a5f543c79-9 - ignored - minimal-precise-tests - packages/plugins/plugin-debug/src/samples/fieldstone/projects/partial.test.ts:75
- a8a5f543c79-10 - ignored - no-casts - packages/plugins/plugin-debug/src/samples/fieldstone/projects/partial.test.ts:87
- a8a5f543c79-11 - ignored - no-casts - packages/plugins/plugin-debug/src/samples/fieldstone/projects/tasks.ts:1048
- a8a5f543c79-12 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/review/work.ts:160
- a8a5f543c79-13 - ignored - error-messages-carry-context - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:572
- a8a5f543c79-14 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:959
- a8a5f543c79-15 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:188
- a8a5f543c79-16 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:308
- a8a5f543c79-17 - ignored - stable-component-for-optional-content - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:380
- a8a5f543c79-18 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:428
- a8a5f543c79-19 - ignored - inline-obj-parent - packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts:212
- a8a5f543c79-20 - resolved - minimal-precise-tests - packages/plugins/plugin-projects/src/plugin.test.ts:78
- a8a5f543c79-21 - ignored - ref-collections-via-query - packages/plugins/plugin-projects/src/testing/AgentSimulator.ts:208
- a8a5f543c79-22 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:137
- a8a5f543c79-23 - ignored - error-messages-carry-context - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:610
- a8a5f543c79-24 - ignored - no-module-level-object-caches - packages/sdk/types/src/types/TaskMigration.ts:57
- a8a5f543c79-25 - ignored - inject-dependencies-via-constructor - packages/sdk/types/src/types/TaskMigration.ts:68
- a8a5f543c79-26 - ignored - named-durations-and-budgets - packages/stories/stories-assistant/src/stories/Chat.stories.tsx:462
- a8a5f543c79-27 - ignored - no-casts - packages/stories/stories-lens/src/stories/ObjectLens.stories.tsx:70
- a8a5f543c79-28 - ignored - ref-collections-via-query - packages/stories/stories-projects/src/stories/AgentSimulation.stories.tsx:216
- a8a5f543c79-29 - ignored - consistent-file-naming-within-folder - packages/stories/stories-projects/src/stories/AgentSimulation.stories.tsx:256
- a8a5f543c79-30 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:274
- a8a5f543c79-31 - ignored - story-for-new-ui-component - packages/ui/react-ui-task/src/components/TaskList/TaskEditorFields.tsx:75
- a8a5f543c79-32 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:716
- a8a5f543c79-33 - ignored - empty-container-uses-empty - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:740
- a8a5f543c79-34 - resolved - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1249
- a8a5f543c79-35 - ignored - error-messages-carry-context - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1282
- a8a5f543c79-36 - ignored - named-durations-and-budgets - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1595
- a8a5f543c79-37 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskListEditor.tsx:360
- a8a5f543c79-38 - resolved - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Badge/Badge.stories.tsx:18
- a8a5f543c79-39 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Badge/Badge.tsx:1
- a8a5f543c79-40 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Badge/index.ts:1

## Issues

# WARN a8a5f543c79-1 no-try-catch-in-effect-code `packages/core/compute/assistant-evals/src/evals/chess-mcp.eval.ts:110`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.92. The likeliest place is lines 110-122 (`const parseProbe = (stdout: string): Probe | undefined => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-2 one-test-suite-per-module `packages/core/compute/assistant-toolkit/src/skills/planning/operations/update-tasks.model.test.ts:51`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.81. The likeliest place is lines 51-62 (`describe('UpdateTasks skill', { tags: ['model-fixture'] }, () => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-3 obj-update-push `packages/core/compute/assistant-toolkit/src/skills/planning/operations/update-tasks.test.ts:128`

System One judges this a likely violation of `obj-update-push` (Append inside Obj.update with push, not spread), p=0.89. The likeliest place is lines 128-139 (`yield* invoke([{ task: Ref.make(step), status: 'started' }]);`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-4 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/skills/planning/operations/update-tasks.test.ts:332`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 332-340 (`const messages = yield* Database.query(Query.select(Filter.type(Trace.Message...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-5 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.test.ts:141`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 141-152 (`const addChecklist = (chat: Chat.Chat) =>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-6 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 31-45 (`const resolveArtifactRef = (id: string): Effect.Effect<Ref.Ref<Obj.Unknown>, ...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-7 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:159`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 159-182 (`useEffect(() => {`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-8 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:464`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 464-485 (`const ChatContent = Util.composable<HTMLDivElement, ChatContentProps>(({ chil...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-9 minimal-precise-tests `packages/plugins/plugin-debug/src/samples/fieldstone/projects/partial.test.ts:75`

System One judges this a likely violation of `minimal-precise-tests` (Add the fewest tests that pin the change, each precise and readable), p=0.83. The likeliest place is lines 75-86 (`}, {});`, location confidence 0.41). Judged with added `diff, test` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# ERROR a8a5f543c79-10 no-casts `packages/plugins/plugin-debug/src/samples/fieldstone/projects/partial.test.ts:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 87-98 (`const chats = typed(archive.objects, 'assistant.chat');`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a8a5f543c79-11 no-casts `packages/plugins/plugin-debug/src/samples/fieldstone/projects/tasks.ts:1048`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 1048-1071 (`const subtasks = seeds.filter((seed) => seed.parent === parent.key);`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-12 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/review/work.ts:160`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 160-171 (`export const Work: SampleSpace.Partial<WorkResult, MediaResult> = SampleSpace...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-13 error-messages-carry-context `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:572`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.88. The likeliest place is lines 572-588 (`if (!view) {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-14 mutate-echo-arrays-with-splice `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:959`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.92. The likeliest place is lines 959-974 (`const artifact = space.db.add(Text.make({ name: ADDED_ARTIFACT, content: 'Mor...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-15 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:188`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 188-211 (`const fiber = Effect.runFork(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-16 mutate-echo-arrays-with-splice `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:308`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.93. The likeliest place is lines 308-331 (`const handleDeleteArtifact = useCallback(`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-17 stable-component-for-optional-content `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:380`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.80. The likeliest place is lines 380-403 (`{tab === 'overview' && !level && (`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-18 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:428`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 428-451 (`{/* Settings other plugins keep for this project, such as its folder on this ...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-19 inline-obj-parent `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts:212`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.84. The likeliest place is lines 212-223 (`assignee: { name: 'Riley', identityDid: 'did:key:riley' },`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-20 minimal-precise-tests `packages/plugins/plugin-projects/src/plugin.test.ts:78`

System One judges this a likely violation of `minimal-precise-tests` (Add the fewest tests that pin the change, each precise and readable), p=0.80. The likeliest place is lines 78-89 (`test('the settings default to showing task descriptions', async ({ expect }) ...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-21 ref-collections-via-query `packages/plugins/plugin-projects/src/testing/AgentSimulator.ts:208`

System One judges this a likely violation of `ref-collections-via-query` (List, count, or walk referenced objects through a query or Database.load, not by reading the ref array), p=0.85. The likeliest place is lines 208-214 (`const resolveSubtasks = (root: Task.Task): Task.Task[] =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-22 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:137`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 137-152 (`);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-23 error-messages-carry-context `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:610`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 610-633 (`throw new Error('Add sub-task item not found.');`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-24 no-module-level-object-caches `packages/sdk/types/src/types/TaskMigration.ts:57`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.80. The likeliest place is lines 57-67 (`type Plan = {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-25 inject-dependencies-via-constructor `packages/sdk/types/src/types/TaskMigration.ts:68`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.83. The likeliest place is lines 68-77 (`const planFor = async (db: Database.Database, taskId: string): Promise<Plan> ...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-26 named-durations-and-budgets `packages/stories/stories-assistant/src/stories/Chat.stories.tsx:462`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.85. The likeliest place is lines 462-485 (`await canvas.findByText(/sub-agent completed/i, {}, { timeout: 180_000 });`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a8a5f543c79-27 no-casts `packages/stories/stories-lens/src/stories/ObjectLens.stories.tsx:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 70-73 (`const onCreateSpace = async ({ space }: { space: { db: { add: (obj: any) => a...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-28 ref-collections-via-query `packages/stories/stories-projects/src/stories/AgentSimulation.stories.tsx:216`

System One judges this a likely violation of `ref-collections-via-query` (List, count, or walk referenced objects through a query or Database.load, not by reading the ref array), p=0.86. The likeliest place is lines 216-227 (`const root = delegatedTask();`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-29 consistent-file-naming-within-folder `packages/stories/stories-projects/src/stories/AgentSimulation.stories.tsx:256`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.83. The likeliest place is lines 256-273 (`const meta: Meta<typeof ModuleContainer> = {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-30 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:274`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 274-297 (`const [disclosures, setDisclosures] = useState<readonly TreeDisclosure[]>([]);`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-31 story-for-new-ui-component `packages/ui/react-ui-task/src/components/TaskList/TaskEditorFields.tsx:75`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.83. The likeliest place is lines 75-86 (`export const TaskEditorForm = ({`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-32 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:716`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 716-739 (`const ListDetailStory = ({ seed = seedQuestions }: { seed?: () => Task.Task[]...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-33 empty-container-uses-empty `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:740`

System One judges this a likely violation of `empty-container-uses-empty` (A container with nothing to show renders `Status.Empty`, not a hand-styled message), p=0.89. The likeliest place is lines 740-760 (`<TaskList.Viewport>`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a8a5f543c79-34 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1249`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 1249-1269 (`agents: true,`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-35 error-messages-carry-context `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1282`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.88. The likeliest place is lines 1282-1303 (`throw new Error('No delegated task is listed.');`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-36 named-durations-and-budgets `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1595`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.84. The likeliest place is lines 1595-1618 (`await new Promise((resolve) => setTimeout(resolve, 200));`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-37 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskListEditor.tsx:360`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 360-371 (`!flush && 'px-(--dx-gap-size)',`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-38 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Badge/Badge.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 18-29 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-39 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Badge/Badge.tsx:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-18 (`import React, { type HTMLAttributes, forwardRef } from 'react';`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN a8a5f543c79-40 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Badge/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.88. The likeliest place is lines 1-6 (`export * as Badge from './Badge.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `27b3290291e8623b4d5fa59b93cfdd659ae435a4`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 40 violations written to fragments, 812 uncertain, 3336 clean, 0 unanswered
- left for an agentic reviewer: 136 batch(es)

```text
requests: 1805 (476 verdicts re-asked with context the model requested)
estimated input tokens: 17225956
billed input tokens: 16571888 (cost $0.6960)
measured chars per token: 3.12
```

### Triage

- Resolved: 3 (append with `push`), 20 (test name matched its assertion), 34 (story without non-null assertions), 38 (`Flex` in the Badge story).
- Ignored, flagged lines this PR did not write: 1, 2, 4, 5, 6, 7, 8, 10, 11, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 33, 36, 37.
- Ignored, judged against the rule: 39 and 40 (Badge matches Avatar's namespace layout), 19 (the parent references the step, so the step is made first), 31 (`TaskEditorForm` is exercised by the `TaskList` editor stories), 35 (a story helper's assertion message), 9 (the change is two status counts), 12 (the PR changed one line of the partial).
