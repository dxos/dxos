---
branch: HEAD
commit: 1b40b48e6290c98b7ce6a8c46ac6eb46bcf4623c
base: f20abf2340494295458ef52b0a6917d68c77e4fd
mode: fast
createdAt: 2026-10-03T00:34:17.632Z
isFinalized: true
groups: 1155
rules: [business-logic-out-of-ui, consistent-file-naming-within-folder, design-tokens-not-raw-spacing-sizing, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, errors-extend-base-error, extract-non-rendering-logic-from-component, import-as-namespace-is-all-or-nothing, inline-obj-parent, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle, no-styling-wrapper-divs, no-wrapper-div-around-asChild-single-child, options-object-with-defaults, story-for-new-ui-component, structured-logging-not-console, subscribe-where-you-read, test-asserts-real-behavior, test-real-scenario-not-narrower-proxy, toolbars-are-menu-actions]
reviewId: 1b40b48e62
---

_33 error(s), 102 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 1b40b48e62-1 - ignored - structured-logging-not-console - packages/core/compute/assistant-e2e/src/harness.ts:293
- 1b40b48e62-2 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- 1b40b48e62-3 - resolved - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/AutomationSkill.ts:1
- 1b40b48e62-4 - resolved - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/BrowserSkill.ts:1
- 1b40b48e62-5 - resolved - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/ChatContextSkill.ts:1
- 1b40b48e62-6 - resolved - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/DelegationSkill.ts:1
- 1b40b48e62-7 - resolved - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/MemorySkill.ts:1
- 1b40b48e62-8 - resolved - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/PlanningSkill.ts:1
- 1b40b48e62-9 - resolved - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/SkillManagerSkill.ts:1
- 1b40b48e62-10 - ignored - no-casts - packages/devtools/cli/src/bin.ts:239
- 1b40b48e62-11 - ignored - effect-requirement-type-not-erased - packages/devtools/cli/src/bin.ts:239
- 1b40b48e62-12 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81
- 1b40b48e62-13 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/create-object.ts:37
- 1b40b48e62-14 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:375
- 1b40b48e62-15 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:86
- 1b40b48e62-16 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130
- 1b40b48e62-17 - ignored - no-casts - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:70
- 1b40b48e62-18 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:122
- 1b40b48e62-19 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:122
- 1b40b48e62-20 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74
- 1b40b48e62-21 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.stories.tsx:22
- 1b40b48e62-22 - ignored - no-casts - packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.stories.tsx:26
- 1b40b48e62-23 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.stories.tsx:82
- 1b40b48e62-24 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:249
- 1b40b48e62-25 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82
- 1b40b48e62-26 - ignored - no-wrapper-div-around-asChild-single-child - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:118
- 1b40b48e62-27 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:130
- 1b40b48e62-28 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:65
- 1b40b48e62-29 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:139
- 1b40b48e62-30 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:151
- 1b40b48e62-31 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:284
- 1b40b48e62-32 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-assistant/src/plugin.test.ts:144
- 1b40b48e62-33 - ignored - test-asserts-real-behavior - packages/plugins/plugin-assistant/src/skills/assistant/skill.node.test.ts:29
- 1b40b48e62-34 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79
- 1b40b48e62-35 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-cloudflare/src/capabilities/connector.ts:22
- 1b40b48e62-36 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-commerce/src/containers/ResultCard/ResultCard.stories.tsx:53
- 1b40b48e62-37 - resolved - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-crm/src/CrmSkill.ts:1
- 1b40b48e62-38 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:68
- 1b40b48e62-39 - ignored - no-casts - packages/plugins/plugin-debug/src/components/SpaceGenerator/presets.ts:808
- 1b40b48e62-40 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx:27
- 1b40b48e62-41 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx:27
- 1b40b48e62-42 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51
- 1b40b48e62-43 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-debug/src/index.ts:1
- 1b40b48e62-44 - ignored - inline-obj-parent - packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:125
- 1b40b48e62-45 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/stories/SpaceTemplates.stories.tsx:27
- 1b40b48e62-46 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:47
- 1b40b48e62-47 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:135
- 1b40b48e62-48 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:57
- 1b40b48e62-49 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:188
- 1b40b48e62-50 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:496
- 1b40b48e62-51 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/capabilities/connector.ts:58
- 1b40b48e62-52 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.stories.tsx:26
- 1b40b48e62-53 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:31
- 1b40b48e62-54 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Lattice/Lattice.stories.tsx:29
- 1b40b48e62-55 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:23
- 1b40b48e62-56 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:39
- 1b40b48e62-57 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:75
- 1b40b48e62-58 - ignored - no-casts - packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.stories.tsx:27
- 1b40b48e62-59 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/capabilities/connector.ts:29
- 1b40b48e62-60 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-google/src/capabilities/connector.ts:44
- 1b40b48e62-61 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-illustrator/src/index.ts:1
- 1b40b48e62-62 - ignored - no-casts - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.stories.tsx:53
- 1b40b48e62-63 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:188
- 1b40b48e62-64 - ignored - subscribe-where-you-read - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:88
- 1b40b48e62-65 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:124
- 1b40b48e62-66 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-linear/src/capabilities/connector.ts:29
- 1b40b48e62-67 - ignored - no-casts - packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineArticle.stories.tsx:43
- 1b40b48e62-68 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-magazine/src/operations/curate-magazine.ts:128
- 1b40b48e62-69 - ignored - no-casts - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37
- 1b40b48e62-70 - ignored - options-object-with-defaults - packages/plugins/plugin-meeting/src/capabilities/call-extension.ts:25
- 1b40b48e62-71 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-meeting/src/capabilities/call-extension.ts:37
- 1b40b48e62-72 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:70
- 1b40b48e62-73 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:118
- 1b40b48e62-74 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:118
- 1b40b48e62-75 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:51
- 1b40b48e62-76 - ignored - no-casts - packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:117
- 1b40b48e62-77 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-mobile/src/components/Home/Home.stories.tsx:104
- 1b40b48e62-78 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:83
- 1b40b48e62-79 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95
- 1b40b48e62-80 - ignored - structured-logging-not-console - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.stories.tsx:27
- 1b40b48e62-81 - ignored - structured-logging-not-console - packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52
- 1b40b48e62-82 - ignored - business-logic-out-of-ui - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74
- 1b40b48e62-83 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:32
- 1b40b48e62-84 - ignored - no-casts - packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:123
- 1b40b48e62-85 - ignored - no-casts - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.stories.tsx:118
- 1b40b48e62-86 - ignored - error-messages-carry-context - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:438
- 1b40b48e62-87 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-projects/src/skills/project/routine.test.ts:32
- 1b40b48e62-88 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/skills/project/routine.test.ts:104
- 1b40b48e62-89 - ignored - no-casts - packages/plugins/plugin-review/src/stories/DocumentVersioning.stories.tsx:296
- 1b40b48e62-90 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:162
- 1b40b48e62-91 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-s3/src/capabilities/connector.ts:95
- 1b40b48e62-92 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.stories.tsx:81
- 1b40b48e62-93 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64
- 1b40b48e62-94 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:76
- 1b40b48e62-95 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:184
- 1b40b48e62-96 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/containers/ScriptArticle/ScriptArticle.stories.tsx:59
- 1b40b48e62-97 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:65
- 1b40b48e62-98 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:65
- 1b40b48e62-99 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchArticle/SearchArticle.stories.tsx:54
- 1b40b48e62-100 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:60
- 1b40b48e62-101 - ignored - dont-leak-internal-api-through-public-surface - packages/plugins/plugin-search/src/index.ts:1
- 1b40b48e62-102 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/containers/SheetArticle/SheetArticle.stories.tsx:84
- 1b40b48e62-103 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-slack/src/capabilities/connector.ts:29
- 1b40b48e62-104 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/components/CardMasonry/CardMasonry.stories.tsx:163
- 1b40b48e62-105 - ignored - inline-obj-parent - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51
- 1b40b48e62-106 - ignored - no-casts - packages/plugins/plugin-space/src/containers/RecordArticle/RecordArticle.stories.tsx:95
- 1b40b48e62-107 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:121
- 1b40b48e62-108 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:58
- 1b40b48e62-109 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:68
- 1b40b48e62-110 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:80
- 1b40b48e62-111 - ignored - inline-obj-parent - packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:99
- 1b40b48e62-112 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-studio/src/index.ts:1
- 1b40b48e62-113 - ignored - no-casts - packages/plugins/plugin-support/src/containers/FeedbackPanel/FeedbackPanel.stories.tsx:23
- 1b40b48e62-114 - ignored - no-casts - packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165
- 1b40b48e62-115 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:60
- 1b40b48e62-116 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:136
- 1b40b48e62-117 - ignored - no-casts - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- 1b40b48e62-118 - ignored - story-for-new-ui-component - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- 1b40b48e62-119 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-thread/src/index.ts:1
- 1b40b48e62-120 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181
- 1b40b48e62-121 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301
- 1b40b48e62-122 - ignored - no-casts - packages/plugins/plugin-transcription/src/testing/decorators.ts:24
- 1b40b48e62-123 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-transcription/src/testing/decorators.ts:24
- 1b40b48e62-124 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-transformer/src/index.ts:1
- 1b40b48e62-125 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-trello/src/capabilities/connector.ts:31
- 1b40b48e62-126 - ignored - no-casts - packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:54
- 1b40b48e62-127 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:102
- 1b40b48e62-128 - ignored - namespace-export-with-internal-hiding - packages/sdk/app-framework/src/index.ts:1
- 1b40b48e62-129 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Documents.stories.tsx:128
- 1b40b48e62-130 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:337
- 1b40b48e62-131 - ignored - no-casts - packages/stories/storybook-testing/src/decorators.tsx:312
- 1b40b48e62-132 - ignored - consistent-file-naming-within-folder - packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:111
- 1b40b48e62-133 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/testing/useSelection.ts:24
- 1b40b48e62-134 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:121
- 1b40b48e62-135 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:205

## Issues

# WARN 1b40b48e62-1 structured-logging-not-console `packages/core/compute/assistant-e2e/src/harness.ts:293`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.82. The likeliest place is lines 293-304 (`);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-2 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 49-62 (`import * as Observe from './Observe.ts';`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-3 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/AutomationSkill.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-11 (`import skill from './skills/automation/skill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-4 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/BrowserSkill.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 1-11 (`import skill from './skills/browser/skill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-5 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/ChatContextSkill.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-9 (`import skill from './skills/chat-context/skill.ts';`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-6 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/DelegationSkill.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-9 (`import skill from './skills/delegation/skill.ts';`, location confidence 0.56). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-7 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/MemorySkill.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-9 (`import skill from './skills/memory/skill.ts';`, location confidence 0.44). Judged with added `importers` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-8 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/PlanningSkill.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-9 (`import skill from './skills/planning/skill.ts';`, location confidence 0.35). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-9 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/SkillManagerSkill.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-9 (`import skill from './skills/skill-manager/skill.ts';`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-10 no-casts `packages/devtools/cli/src/bin.ts:239`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 239-250 (`(argv) =>`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-11 effect-requirement-type-not-erased `packages/devtools/cli/src/bin.ts:239`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.86. The likeliest place is lines 239-250 (`(argv) =>`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-12 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 81-92 (`AppGraphNode.makeAction({`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-13 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/create-object.ts:37`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 37-48 (`{ name: props?.name },`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-14 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:375`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 375-407 (`>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-15 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 86-97 (`useEffect(() => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-16 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 130-141 (`const RemountableThread = (props: { messages: MessageType.Message[]; viewType...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-17 no-casts `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 70-81 (`const meta = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-18 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:122`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 122-133 (`export const _ObjectsPanel: Story = {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-19 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.stories.tsx:122`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 122-133 (`export const _ObjectsPanel: Story = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-20 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 74-85 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-21 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.stories.tsx:22`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 22-25 (`const DefaultStory = (props: ToolboxProps) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-22 no-casts `packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.stories.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 26-37 (`const meta = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-23 no-casts `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.stories.tsx:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 82-93 (`const factory = createObjectFactory(space.db, random as any);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-24 no-casts `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:249`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 249-260 (`interval: 300,`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-25 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 82-93 (`useEffect(() => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-26 no-wrapper-div-around-asChild-single-child `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:118`

System One judges this a likely violation of `no-wrapper-div-around-asChild-single-child` (A composite's asChild/single-child slot takes the actionable element directly, never a wrapper div), p=0.80. The likeliest place is lines 118-129 (`<Panel.Content asChild>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-27 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 130-141 (`className='absolute bottom-0 left-0 right-0 dx-document grid grid-cols-[minma...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-28 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 65-76 (`{roles.map((role) => (`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-29 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:139`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 139-150 (`const SnapshotStory = () => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-30 no-casts `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:151`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 151-162 (`() => [...allMessages].sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.even...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-31 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:284`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 284-295 (`<IconButton icon='ph--skip-back--regular' iconOnly label='Reset (R)' onClick=...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-32 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-assistant/src/plugin.test.ts:144`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 144-155 (`AssistantPlugin({`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-33 test-asserts-real-behavior `packages/plugins/plugin-assistant/src/skills/assistant/skill.node.test.ts:29`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 29-40 (`describe('Assistant Skill', () => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-34 consistent-file-naming-within-folder `packages/plugins/plugin-brain/src/containers/FactsCompanion/FactsCompanion.stories.tsx:79`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.81. The likeliest place is lines 79-83 (`export const Default: Story = {};`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-35 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-cloudflare/src/capabilities/connector.ts:22`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 22-33 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-36 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-commerce/src/containers/ResultCard/ResultCard.stories.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 53-64 (`const meta: Meta<typeof DefaultStory> = {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-37 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-crm/src/CrmSkill.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-11 (`import skill from './skills/crm/skill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-38 no-styling-wrapper-divs `packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 68-79 (`</Toolbar.Root>`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-39 no-casts `packages/plugins/plugin-debug/src/components/SpaceGenerator/presets.ts:808`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 808-824 (`const attachTrigger = (functionTrigger: Trigger.Trigger | undefined, computeM...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-40 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 27-34 (`const Render = (props: DebugPanelRootProps) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-41 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.stories.tsx:27`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 27-34 (`const Render = (props: DebugPanelRootProps) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-42 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 51-64 (`const DefaultStory = () => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-43 namespace-export-with-internal-hiding `packages/plugins/plugin-debug/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-8 (`export * as DebugPlugin from './DebugPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-44 inline-obj-parent `packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:125`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.82. The likeliest place is lines 125-136 (`const chat = yield* Database.add(`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-45 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/stories/SpaceTemplates.stories.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 27-41 (`const DefaultStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-46 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:47`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 47-58 (`const StoryTile = (props: MosaicTileProps<Obj.Any>) => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-47 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:135`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 135-146 (`return (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-48 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 57-68 (`const DefaultStory = () => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-49 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:188`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 188-213 (`return (`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-50 extract-non-rendering-logic-from-component `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:496`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 496-519 (`useEffect(() => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-51 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/capabilities/connector.ts:58`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 58-69 (`const validateToken = (token: string) =>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-52 no-casts `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.stories.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 26-29 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-53 no-casts `packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 31-34 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-54 no-casts `packages/plugins/plugin-explorer/src/components/Lattice/Lattice.stories.tsx:29`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 29-34 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-55 no-casts `packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 23-26 (`const generator = random as any as ValueGenerator;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-56 extract-non-rendering-logic-from-component `packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 39-50 (`let cancelled = false;`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-57 no-styling-wrapper-divs `packages/plugins/plugin-explorer/src/components/Tree/EdgeBundling.stories.tsx:75`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 75-86 (`<div className='relative flex dx-fill'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-58 no-casts `packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.stories.tsx:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 27-32 (`const generator = random as any as ValueGenerator;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-59 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/capabilities/connector.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 29-40 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-60 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-google/src/capabilities/connector.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 44-55 (`const getAccountEmail = (token: string, account: string | undefined) =>`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-61 namespace-export-with-internal-hiding `packages/plugins/plugin-illustrator/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-10 (`export * as IllustratorPlugin from './IllustratorPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-62 no-casts `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.stories.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 53-64 (`const { defaultSpace } = yield* initializeIdentity(client);`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-63 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:188`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 188-199 (`.subgraph(graphActions(graph, get, id, { filter: isToolbarAction, surface: TO...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-64 subscribe-where-you-read `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:88`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.84. The likeliest place is lines 88-99 (`const DefaultComponent = () => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-65 no-styling-wrapper-divs `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:124`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 124-135 (`return null;`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-66 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-linear/src/capabilities/connector.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 29-40 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-67 no-casts `packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineArticle.stories.tsx:43`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 43-54 (`const seedSpace =`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-68 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-magazine/src/operations/curate-magazine.ts:128`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 128-142 (`const loadValidFeeds = (magazine: Magazine.Magazine) =>`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-69 no-casts `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 37-49 (`import { Text } from '@dxos/schema';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-70 options-object-with-defaults `packages/plugins/plugin-meeting/src/capabilities/call-extension.ts:25`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.82. The likeliest place is lines 25-36 (`type MeetingPayload = buf.MessageInitShape<typeof MeetingPayloadSchema>;`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-71 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-meeting/src/capabilities/call-extension.ts:37`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 37-48 (`const identity = Option.getOrUndefined(haloIdentity.getSnapshot());`, location confidence 0.44). Judged with added `imports, public-api` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-72 extract-non-rendering-logic-from-component `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 70-81 (`if (!transcriptionManagerProvider || !space || !feed) {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-73 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:118`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 118-129 (`return (`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-74 toolbars-are-menu-actions `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:118`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.93. The likeliest place is lines 118-129 (`return (`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-75 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 51-62 (`const event = events[0];`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-76 no-casts `packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 117-128 (`yield* Effect.promise(() => space.db.flush({ indexes: true }));`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-77 no-styling-wrapper-divs `packages/plugins/plugin-mobile/src/components/Home/Home.stories.tsx:104`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 104-117 (`const HomeWithNavBarStoryRoot = () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-78 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:83`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 83-94 (`<Focus.Item asChild ref={rootElement}>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-79 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 95-106 (`<div className={mx(container, 'm-2 bg-current-surface')}>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-80 structured-logging-not-console `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.stories.tsx:27`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.80. The likeliest place is lines 27-38 (`const menuActions = random.helpers.multiple(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-81 structured-logging-not-console `packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.81. The likeliest place is lines 52-58 (`() => Extensions.promptRunExtension({ onRun: (promptText) => console.log('[ru...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-82 business-logic-out-of-ui `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 74-85 (`let result = await login({ hubUrl, email, redirectUrl: window.location.origin...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-83 no-styling-wrapper-divs `packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 32-43 (`const DefaultStory = () => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-84 no-casts `packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx:123`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 123-134 (`title: random.lorem.sentence(),`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-85 no-casts `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.stories.tsx:118`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 118-129 (`name: 'Messages',`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-86 error-messages-carry-context `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:438`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 438-455 (`if (!chat) {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-87 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-projects/src/skills/project/routine.test.ts:32`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 32-40 (`const { text, toolCall } = ScriptedLanguageModel;`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-88 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/skills/project/routine.test.ts:104`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 104-115 (`const seed = () =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-89 no-casts `packages/plugins/plugin-review/src/stories/DocumentVersioning.stories.tsx:296`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 296-320 (`for (const { creator, content } of context.args.suggestions ?? []) {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-90 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:162`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 162-175 (`}`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-91 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-s3/src/capabilities/connector.ts:95`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 95-106 (`onValidate: ({ values }) =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-92 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.stories.tsx:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 81-87 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-93 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 64-75 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-94 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 76-87 (`});`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-95 toolbars-are-menu-actions `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:184`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 184-195 (`<NotebookMenu onCellInsert={handleCellInsert} />`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-96 no-styling-wrapper-divs `packages/plugins/plugin-script/src/containers/ScriptArticle/ScriptArticle.stories.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 59-69 (`if (!script || !sourceReady) {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-97 no-styling-wrapper-divs `packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 65-76 (`if (!space) {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-98 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:65`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 65-76 (`if (!space) {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-99 no-casts `packages/plugins/plugin-search/src/containers/SearchArticle/SearchArticle.stories.tsx:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 54-65 (`onClientInitialized: ({ client }) =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-100 no-casts `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 60-71 (`onClientInitialized: ({ client }) =>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-101 dont-leak-internal-api-through-public-surface `packages/plugins/plugin-search/src/index.ts:1`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.80. The likeliest place is lines 1-11 (`export * as SearchPlugin from './SearchPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-102 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/containers/SheetArticle/SheetArticle.stories.tsx:84`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 84-95 (`export const Spec = () => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-103 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-slack/src/capabilities/connector.ts:29`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 29-40 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-104 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/components/CardMasonry/CardMasonry.stories.tsx:163`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 163-174 (`const CompactStory = () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-105 inline-obj-parent `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 51-59 (`const makeBookmark = (props: Omit<Obj.MakeProps<typeof Bookmark>, 'visits'>):...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-106 no-casts `packages/plugins/plugin-space/src/containers/RecordArticle/RecordArticle.stories.tsx:95`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 95-106 (`StorybookPlugin.make({}),`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-107 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:121`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 121-132 (`const DefaultStory = ({ type }: StoryArgs) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-108 no-styling-wrapper-divs `packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 58-68 (`}, [updateState]);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-109 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:68`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 68-79 (`}`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-110 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:80`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 80-86 (`<div className='grid overflow-hidden border-s border-separator'>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-111 inline-obj-parent `packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.stories.tsx:99`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.86. The likeliest place is lines 99-110 (`yield* initializeIdentity(client);`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-112 namespace-export-with-internal-hiding `packages/plugins/plugin-studio/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-9 (`export * as StudioPlugin from './StudioPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-113 no-casts `packages/plugins/plugin-support/src/containers/FeedbackPanel/FeedbackPanel.stories.tsx:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 23-36 (`const makeObservability = (): Observability.Observability =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-114 no-casts `packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 165-176 (`return {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-115 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 60-73 (`<div className='dx-expand grid grid-cols-3 gap-3 p-3'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-116 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:136`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 136-151 (`);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-117 no-casts `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-118 story-for-new-ui-component `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.85. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-119 namespace-export-with-internal-hiding `packages/plugins/plugin-thread/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-10 (`export * as ThreadPlugin from './ThreadPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-120 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 181-192 (`useEffect(() => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-121 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 301-312 (`return (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-122 no-casts `packages/plugins/plugin-transcription/src/testing/decorators.ts:24`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 24-35 (`export const enableQueryIndexes = (services: { QueryService?: any }) =>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-123 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-transcription/src/testing/decorators.ts:24`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 24-35 (`export const enableQueryIndexes = (services: { QueryService?: any }) =>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-124 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-transformer/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as TransformerPlugin from './TransformerPlugin.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.70. This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-125 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-trello/src/capabilities/connector.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.92. The likeliest place is lines 31-42 (`const onTokenCreated: ConnectorSpec.OnTokenCreated = ({ accessToken }) =>`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-126 no-casts `packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 54-65 (`const extension = yield* AppGraphBuilder.createExtension({`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-127 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:102`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 102-113 (`const planTripExtension = yield* AppGraphBuilder.createExtension({`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-128 namespace-export-with-internal-hiding `packages/sdk/app-framework/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.80. The likeliest place is lines 1-12 (`export * from './common/index.ts';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-129 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Documents.stories.tsx:128`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 128-139 (`const submitPrompt = async (canvasElement: HTMLElement, prompt: string) => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-130 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:337`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.87. The likeliest place is lines 337-348 (`ServiceResolver.provide({ space: space.id }, Database.Service).pipe(`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-131 no-casts `packages/stories/storybook-testing/src/decorators.tsx:312`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 312-323 (`}) as any;`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-132 consistent-file-naming-within-folder `packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:111`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.83. The likeliest place is lines 111-117 (`export const Default: Story = {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-133 no-casts `packages/ui/react-ui-canvas-editor/src/testing/useSelection.ts:24`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 24-35 (`for (const id of Array.from(selected.values())) {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1b40b48e62-134 no-casts `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:121`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 121-132 (`queueMicrotask(() => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1b40b48e62-135 no-styling-wrapper-divs `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:205`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 205-216 (`if (node) {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `f20abf2340494295458ef52b0a6917d68c77e4fd`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 135 violations written to fragments, 1357 uncertain, 12765 clean, 0 unanswered
- left for an agentic reviewer: 136 batch(es)

```text
requests: 5698 (1014 verdicts re-asked with context the model requested)
estimated input tokens: 29940538
billed input tokens: 27510168 (cost $1.1554)
measured chars per token: 3.27
```
