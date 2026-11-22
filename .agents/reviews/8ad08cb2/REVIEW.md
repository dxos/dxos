---
branch: dm/pensive-shannon-bgdf6e
commit: 8ad08cb2be9afbc854637512e3fa36d633216698
base: 7ab1f89dbcb99233ace64753eed747adb9a119f2
mode: default
createdAt: 2026-11-02T02:05:49.439Z
isFinalized: true
groups: 166
rules: [atom-lifetime-bound-to-owner, containers-share-core-hooks, deferred-callback-owns-its-context, diagram-links-are-smart, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, empty-container-uses-empty, errors-extend-base-error, fix-root-cause-not-symptom, import-as-namespace-is-all-or-nothing, log-fire-and-forget-rejections, minimal-precise-tests, named-durations-and-budgets, no-bare-ref-schema-alias, no-casts, no-consumer-toggled-global-mode, no-invented-theme-tokens, no-lint-suppression-to-pass, no-silent-storage-fallback, no-styling-wrapper-divs, no-swallowed-assertions-in-e2e-helpers, no-try-catch-in-effect-code, no-unused-new-api, one-name-one-export-per-concept, one-test-suite-per-module, operation-owns-ui-state-transitions, per-test-mutable-fixtures, prefer-branded-types-over-raw-primitives, read-state-through-owning-api, repo-scripts-are-typescript-on-bun, retries-via-schedule-with-evidence, stable-component-for-optional-content, static-path-bindings, story-for-new-ui-component, structured-logging-not-console, subpath-lint-not-adhoc-entrypoints, todo-has-owner, workaround-is-documented-and-removable, workerd-variant-imports-conditioned-barrel]
reviewId: 8ad08cb2
---

_8 error(s), 87 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8ad08cb2-1 - unresolved - repo-scripts-are-typescript-on-bun - packages/apps/composer-app/scripts/memory/system-webkit-switch.ts:12
- 8ad08cb2-2 - unresolved - retries-via-schedule-with-evidence - packages/apps/composer-app/src/playwright/scenarios/perf-object-open.spec.ts:36
- 8ad08cb2-3 - unresolved - no-try-catch-in-effect-code - packages/apps/composer-app/src/playwright/scenarios/perf-object-open.spec.ts:38
- 8ad08cb2-4 - unresolved - retries-via-schedule-with-evidence - packages/apps/composer-app/src/playwright/scenarios/perf-space-switch.spec.ts:98
- 8ad08cb2-5 - unresolved - no-try-catch-in-effect-code - packages/apps/composer-app/src/playwright/scenarios/perf-space-switch.spec.ts:100
- 8ad08cb2-6 - unresolved - prefer-branded-types-over-raw-primitives - packages/apps/composer-app/src/playwright/scenarios/seeded-spaces.ts:26
- 8ad08cb2-7 - unresolved - per-test-mutable-fixtures - packages/core/compute/agent-runtime/src/agent-service/skill-hooks.test.ts:78
- 8ad08cb2-8 - unresolved - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-toolkit/src/skills/planning/operations/definitions.ts:1
- 8ad08cb2-9 - unresolved - errors-extend-base-error - packages/core/compute/assistant/src/session/AiSession.ts:43:14
- 8ad08cb2-10 - unresolved - per-test-mutable-fixtures - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:401
- 8ad08cb2-11 - unresolved - per-test-mutable-fixtures - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:435
- 8ad08cb2-12 - unresolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:2423
- 8ad08cb2-13 - unresolved - deferred-callback-owns-its-context - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:268
- 8ad08cb2-14 - unresolved - effect-requirement-type-not-erased - packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:269
- 8ad08cb2-15 - unresolved - named-durations-and-budgets - packages/core/compute/compute-runtime/src/prompt-scheduler.ts:5
- 8ad08cb2-16 - unresolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/storage-service-layer.test.ts:16
- 8ad08cb2-17 - unresolved - structured-logging-not-console - packages/core/compute/compute/src/Trace.ts:398
- 8ad08cb2-18 - unresolved - structured-logging-not-console - packages/core/compute/compute/src/Trace.ts:423
- 8ad08cb2-19 - unresolved - todo-has-owner - packages/core/compute/pipeline-transcription/src/stages/extraction.ts:70
- 8ad08cb2-20 - unresolved - todo-has-owner - packages/core/compute/pipeline-transcription/src/stages/summarization.ts:30
- 8ad08cb2-21 - unresolved - workaround-is-documented-and-removable - packages/e2e/composer-e2e/src/playwright/app-manager.ts:52
- 8ad08cb2-22 - unresolved - read-state-through-owning-api - packages/e2e/composer-e2e/src/playwright/app-manager.ts:156
- 8ad08cb2-23 - unresolved - no-swallowed-assertions-in-e2e-helpers - packages/e2e/composer-e2e/src/playwright/app-manager.ts:895
- 8ad08cb2-24 - unresolved - workerd-variant-imports-conditioned-barrel - packages/plugins/plugin-agent/dx.config.ts:94
- 8ad08cb2-25 - unresolved - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/brain/brain.test.ts:103
- 8ad08cb2-26 - unresolved - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/brain/two-chats.test.ts:143
- 8ad08cb2-27 - unresolved - minimal-precise-tests - packages/plugins/plugin-agent/src/brain/two-chats.test.ts:149
- 8ad08cb2-28 - unresolved - empty-container-uses-empty - packages/plugins/plugin-agent/src/components/AgentList/AgentList.tsx:70
- 8ad08cb2-29 - unresolved - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/ensure-reply-sent.test.ts:29
- 8ad08cb2-30 - unresolved - no-unused-new-api - packages/plugins/plugin-agent/src/operations/ensure-reply-sent.ts:20
- 8ad08cb2-31 - unresolved - fix-root-cause-not-symptom - packages/plugins/plugin-agent/src/operations/ensure-reply-sent.ts:53
- 8ad08cb2-32 - unresolved - one-test-suite-per-module - packages/plugins/plugin-agent/src/operations/triggers.test.ts:105
- 8ad08cb2-33 - unresolved - minimal-precise-tests - packages/plugins/plugin-agent/src/operations/triggers.test.ts:340
- 8ad08cb2-34 - unresolved - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/triggers.test.ts:588
- 8ad08cb2-35 - unresolved - no-casts - packages/plugins/plugin-assistant/src/containers/index.ts:18
- 8ad08cb2-36 - unresolved - story-for-new-ui-component - packages/plugins/plugin-assistant/src/containers/SpaceAssistantSettings/SpaceAssistantSettings.tsx:1
- 8ad08cb2-37 - unresolved - no-invented-theme-tokens - packages/plugins/plugin-assistant/src/containers/SpaceAssistantSettings/SpaceAssistantSettings.tsx:76
- 8ad08cb2-38 - unresolved - per-test-mutable-fixtures - packages/plugins/plugin-assistant/src/operations/analyze-turn.test.ts:52
- 8ad08cb2-39 - unresolved - diagram-links-are-smart - packages/plugins/plugin-canvas/src/model/handler.ts:439
- 8ad08cb2-40 - unresolved - empty-container-uses-empty - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:83
- 8ad08cb2-41 - unresolved - diagram-links-are-smart - packages/plugins/plugin-code-graph/src/components/CodeGraphCanvas/CodeGraphCanvas.tsx:152
- 8ad08cb2-42 - unresolved - empty-container-uses-empty - packages/plugins/plugin-code-graph/src/containers/CodeGraphArticle/CodeGraphArticle.tsx:241
- 8ad08cb2-43 - unresolved - empty-container-uses-empty - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:35
- 8ad08cb2-44 - unresolved - empty-container-uses-empty - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:122
- 8ad08cb2-45 - unresolved - empty-container-uses-empty - packages/plugins/plugin-deck/src/components/Companion/Companion.tsx:107
- 8ad08cb2-46 - unresolved - stable-component-for-optional-content - packages/plugins/plugin-deck/src/components/Plank/Plank.tsx:256
- 8ad08cb2-47 - unresolved - containers-share-core-hooks - packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1578
- 8ad08cb2-48 - unresolved - workaround-is-documented-and-removable - packages/plugins/plugin-deck/src/containers/DeckLayout/WorkspaceLayer.tsx:25
- 8ad08cb2-49 - unresolved - stable-component-for-optional-content - packages/plugins/plugin-deck/src/containers/DeckLayout/WorkspaceLayer.tsx:31
- 8ad08cb2-50 - unresolved - no-unused-new-api - packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:68
- 8ad08cb2-51 - unresolved - no-bare-ref-schema-alias - packages/plugins/plugin-discord/src/types/DiscordAgentOperation.ts:22:7
- 8ad08cb2-52 - unresolved - todo-has-owner - packages/plugins/plugin-freeq/src/capabilities/channel-backend.ts:160
- 8ad08cb2-53 - unresolved - empty-container-uses-empty - packages/plugins/plugin-illustrator/src/containers/DrawingScores/DrawingScores.tsx:65
- 8ad08cb2-54 - unresolved - static-path-bindings - packages/plugins/plugin-inbox/src/capabilities/app-graph-builder.ts:357
- 8ad08cb2-55 - unresolved - empty-container-uses-empty - packages/plugins/plugin-lighthouse/src/components/RelationsPanel/RelationsPanel.tsx:52
- 8ad08cb2-56 - unresolved - empty-container-uses-empty - packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:472
- 8ad08cb2-57 - unresolved - empty-container-uses-empty - packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineArticle.tsx:116
- 8ad08cb2-58 - unresolved - no-try-catch-in-effect-code - packages/plugins/plugin-mermaid/src/extensions/mermaid-extension.ts:195
- 8ad08cb2-59 - unresolved - empty-container-uses-empty - packages/plugins/plugin-messenger/src/components/NotificationsPanel/NotificationsPanel.tsx:202
- 8ad08cb2-60 - unresolved - empty-container-uses-empty - packages/plugins/plugin-messenger/src/containers/MessengerCompanion/MessengerCompanion.tsx:72
- 8ad08cb2-61 - unresolved - no-unused-new-api - packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts:396
- 8ad08cb2-62 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/capabilities/subject-context.test.ts:22
- 8ad08cb2-63 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/capabilities/subject-context.test.ts:82
- 8ad08cb2-64 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/capabilities/subject-context.test.ts:92
- 8ad08cb2-65 - unresolved - no-unused-new-api - packages/plugins/plugin-projects/src/capabilities/subject-context.ts:36
- 8ad08cb2-66 - unresolved - empty-container-uses-empty - packages/plugins/plugin-projects/src/components/MoveTaskPanel/MoveTaskPanel.tsx:45
- 8ad08cb2-67 - unresolved - empty-container-uses-empty - packages/plugins/plugin-projects/src/containers/AddFeatureDialog/AddFeatureDialog.tsx:82
- 8ad08cb2-68 - unresolved - empty-container-uses-empty - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:183
- 8ad08cb2-69 - unresolved - empty-container-uses-empty - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:35
- 8ad08cb2-70 - unresolved - empty-container-uses-empty - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:126
- 8ad08cb2-71 - unresolved - empty-container-uses-empty - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:516
- 8ad08cb2-72 - unresolved - no-unused-new-api - packages/plugins/plugin-sheet/src/integrations/thread-ranges.ts:21
- 8ad08cb2-73 - unresolved - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-sheet/src/types/SheetCapabilities.ts:1
- 8ad08cb2-74 - unresolved - errors-extend-base-error - packages/plugins/plugin-sheet/src/types/SheetUtil.ts:29:14
- 8ad08cb2-75 - unresolved - errors-extend-base-error - packages/plugins/plugin-sheet/src/types/SheetUtil.ts:31:14
- 8ad08cb2-76 - unresolved - errors-extend-base-error - packages/plugins/plugin-sheet/src/types/SheetUtil.ts:33:14
- 8ad08cb2-77 - unresolved - one-name-one-export-per-concept - packages/plugins/plugin-sheet/src/types/SheetUtil.ts:133
- 8ad08cb2-78 - unresolved - empty-container-uses-empty - packages/plugins/plugin-space/src/containers/SchemaContainer/SchemaContainer.tsx:32
- 8ad08cb2-79 - unresolved - empty-container-uses-empty - packages/plugins/plugin-studio/src/components/VariantGallery/VariantGallery.tsx:70
- 8ad08cb2-80 - unresolved - empty-container-uses-empty - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:158
- 8ad08cb2-81 - unresolved - operation-owns-ui-state-transitions - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:45
- 8ad08cb2-82 - unresolved - atom-lifetime-bound-to-owner - packages/sdk/app-graph/src/AppGraph.bench.ts:32:20
- 8ad08cb2-83 - unresolved - no-lint-suppression-to-pass - packages/sdk/app-graph/src/AppGraph.bench.ts:97
- 8ad08cb2-84 - unresolved - structured-logging-not-console - packages/sdk/app-graph/src/AppGraph.bench.ts:104
- 8ad08cb2-85 - unresolved - no-casts - packages/sdk/app-graph/src/AppGraph.ts:858
- 8ad08cb2-86 - unresolved - no-casts - packages/sdk/app-toolkit/src/app-framework/AppCapabilities.ts:385
- 8ad08cb2-87 - unresolved - no-silent-storage-fallback - packages/sdk/client/src/services/local-client-services.ts:198
- 8ad08cb2-88 - unresolved - no-styling-wrapper-divs - packages/ui/brand/src/components/backgrounds/Backgrounds.stories.tsx:52
- 8ad08cb2-89 - unresolved - no-styling-wrapper-divs - packages/ui/brand/src/components/backgrounds/Backgrounds.stories.tsx:54
- 8ad08cb2-90 - unresolved - no-invented-theme-tokens - packages/ui/brand/src/components/backgrounds/Backgrounds.stories.tsx:63
- 8ad08cb2-91 - unresolved - diagram-links-are-smart - packages/ui/react-ui-canvas-compute/src/scene/scene.ts:33
- 8ad08cb2-92 - unresolved - no-consumer-toggled-global-mode - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:321
- 8ad08cb2-93 - unresolved - empty-container-uses-empty - packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:246
- 8ad08cb2-94 - unresolved - subpath-lint-not-adhoc-entrypoints - packages/ui/ui-editor/package.json:26
- 8ad08cb2-95 - unresolved - log-fire-and-forget-rejections - packages/ui/ui-editor/src/extensions/decoration/pos.ts:258:8

## Issues

# WARN 8ad08cb2-1 repo-scripts-are-typescript-on-bun `packages/apps/composer-app/scripts/memory/system-webkit-switch.ts:12`

New repo script is documented as run with `node scripts/memory/system-webkit-switch.ts` and has no `#!/usr/bin/env bun` shebang; rule `repo-scripts-are-typescript-on-bun` wants new tooling scripts run directly with Bun. Change the usage line to `bun scripts/memory/system-webkit-switch.ts` and add the Bun shebang (check that `startPartitionProxy` and the `node:` imports work under Bun).

# WARN 8ad08cb2-2 retries-via-schedule-with-evidence `packages/apps/composer-app/src/playwright/scenarios/perf-object-open.spec.ts:36`

`switchTo` is a hand-written `for (let attempt ...)` retry loop that resends the switch up to 8 times when the URL does not change. The comment gives a plausible cause (boot navigates twice) but no evidence that a second attempt succeeds. Per `retries-via-schedule-with-evidence`, wait for the boot navigation to settle instead and delete the retry, or express it as `Effect.retry` with a `Schedule` bounded by `timeout`.

# WARN 8ad08cb2-3 no-try-catch-in-effect-code `packages/apps/composer-app/src/playwright/scenarios/perf-object-open.spec.ts:38`

New hand-rolled `try`/`catch` retry loop around `page.waitForURL`, violating `no-try-catch-in-effect-code`. Model the retry as an Effect (`Effect.tryPromise` plus `Effect.retry` with a bounded schedule) so the failure is typed instead of caught and rethrown by hand.

# WARN 8ad08cb2-4 retries-via-schedule-with-evidence `packages/apps/composer-app/src/playwright/scenarios/perf-space-switch.spec.ts:98`

`switchSettled` repeats the same counter-based retry loop (`attempt >= 7`), duplicating the one in perf-object-open.spec.ts. Per `retries-via-schedule-with-evidence`, remove the retry by waiting for boot to settle, or share one helper built on `Effect.retry` with a `Schedule`, and show evidence that the resend succeeds.

# WARN 8ad08cb2-5 no-try-catch-in-effect-code `packages/apps/composer-app/src/playwright/scenarios/perf-space-switch.spec.ts:100`

Same `try`/`catch` retry loop around `page.waitForURL` as in perf-object-open.spec.ts, violating `no-try-catch-in-effect-code`. Share one helper built on `Effect.tryPromise` and `Effect.retry` rather than duplicating the hand-written loop.

# WARN 8ad08cb2-6 prefer-branded-types-over-raw-primitives `packages/apps/composer-app/src/playwright/scenarios/seeded-spaces.ts:26`

`seedSpaces` returns `Promise<string[]>` (and `spaceIds` is `string[]`) although every element is validated with `isSpaceId` and the file already imports `SpaceId`. Type the return value and `spaceIds` as `SpaceId[]` so callers cannot mix them with unrelated strings (`prefer-branded-types-over-raw-primitives`); `switchTo(spaceId: string)` in `perf-space-switch.spec.ts:122` should take `SpaceId` too.

# WARN 8ad08cb2-7 per-test-mutable-fixtures `packages/core/compute/agent-runtime/src/agent-service/skill-hooks.test.ts:78`

Module-level `let hookLog` is reassigned inside tests to reset it, so handlers close over shared mutable state. Per rule `per-test-mutable-fixtures`, build the log and handlers in a closure or `beforeEach` within the describe.

# WARN 8ad08cb2-8 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/skills/planning/operations/definitions.ts:1`

The barrel exports this module as a namespace under a different name (`export * as PlanningOperations from './definitions.ts'`), and the module has no `// @import-as-namespace` directive. Rename the file to `PlanningOperations.ts`, add the directive under the copyright header and re-export it under the same name (rule `import-as-namespace-is-all-or-nothing`).

# ERROR 8ad08cb2-9 errors-extend-base-error `packages/core/compute/assistant/src/session/AiSession.ts:43:14`

`McpServersUnavailable` extends `Schema.TaggedError`, splitting the codebase into two error idioms. Define it as `class McpServersUnavailable extends BaseError.extend('McpServersUnavailable', 'The MCP servers could not be read') {}` from `@dxos/errors` (rule `errors-extend-base-error`), unless it is a declared RPC/tool contract schema.

# WARN 8ad08cb2-10 per-test-mutable-fixtures `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:401`

Module-level `capturedTraceMessages` is a mutable array shared across tests and cleared by hand (`length = 0`) in only one place. Per rule `per-test-mutable-fixtures`, create it in a closure or `beforeEach` inside the describe.

# WARN 8ad08cb2-11 per-test-mutable-fixtures `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:435`

Module-level mutable span arrays (`recordedSpans`, `spaceSpans`, `alarmSpans`, `rearmSpans`, `runtimeSpans`, `callerSpans`, `unusedRuntimeSpans`) are shared across tests and never reset, so spans from one test can satisfy another test's assertions. Per rule `per-test-mutable-fixtures`, create each array inside the test (or a `beforeEach` in the describe) and pass it to `makeRecordingTracer`.

# WARN 8ad08cb2-12 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:2423`

`Effect.fn` inside a test adds tracing with no value and is unnamed. Use `Effect.fnUntraced` here, per the rule.

# WARN 8ad08cb2-13 deferred-callback-owns-its-context `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:268`

`Effect.provideService(Scheduler.Scheduler, promptScheduler)` is provided around the whole invocation, and the comment says spawned processes keep it for their later alarms and events, so deferred alarm callbacks inherit the caller's context. Give the process/alarm scheduler its own context (provide the scheduler where the alarm is armed) rather than inheriting it from the invoking fiber.

# WARN 8ad08cb2-14 effect-requirement-type-not-erased `packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:269`

The result of `invoke(...).pipe(Effect.provideService(...))` is cast to `Effect.Effect<O, Error>`, which forces the requirement channel to `never` without proving every service is provided. Drop the cast and thread the real `R` through (or provide the missing services), per the rule that the requirement type is never cast away.

# WARN 8ad08cb2-15 named-durations-and-budgets `packages/core/compute/compute-runtime/src/prompt-scheduler.ts:5`

A local `BUDGET_MS = 4` time-slice constant plus a hand-rolled `performance.now()` budget loop duplicates tuning that belongs in the shared yield strategies (rule: named-durations-and-budgets). Use the shared `yieldOrContinue('interactive' | 'smooth' | 'idle')` helper (`@dxos/async` / `@dxos/effect` Yield) and name the budget there instead of keeping it local.

# WARN 8ad08cb2-16 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/storage-service-layer.test.ts:16`

`Effect.fn` is used inside a test where tracing adds no value, and it is unnamed. Use `Effect.fnUntraced`.

# WARN 8ad08cb2-17 structured-logging-not-console `packages/core/compute/compute/src/Trace.ts:398`

`layerConsole` writes through `console.log` in a module that already imports `@dxos/log`. Per the rule, replace it with `log.info`/`log.debug` (or document it as an explicit stdout sink) so one logging API is used.

# WARN 8ad08cb2-18 structured-logging-not-console `packages/core/compute/compute/src/Trace.ts:423`

`console.error('[trace] sink.write threw', err)` mixes `console` with the project logger and suppresses the lint rule with a disable comment. Use `log.catch(err)` or `log.warn` from `@dxos/log` instead.

# WARN 8ad08cb2-19 todo-has-owner `packages/core/compute/pipeline-transcription/src/stages/extraction.ts:70`

The TODO carries a topic tag `(LLM seam)` instead of an owner handle (rule: todo-has-owner). Rewrite as `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 8ad08cb2-20 todo-has-owner `packages/core/compute/pipeline-transcription/src/stages/summarization.ts:30`

The TODO carries a topic tag `(LLM seam)` instead of an owner handle (rule: todo-has-owner). Rewrite as `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 8ad08cb2-21 workaround-is-documented-and-removable `packages/e2e/composer-e2e/src/playwright/app-manager.ts:52`

`REGISTRY_WORKSPACE`, `WORKSPACE_KEY` and `NAVTREE_OPEN_STORAGE_PREFIX` duplicate constants from plugins to dodge a Playwright loader failure, with no `TODO(owner)` naming the proper fix (make the modules loadable or export constants from a light package) or a removal condition. Per workaround-is-documented-and-removable, add the TODO.

# WARN 8ad08cb2-22 read-state-through-owning-api `packages/e2e/composer-e2e/src/playwright/app-manager.ts:156`

The test reads the navtree open-state directly from `localStorage` using a restated key prefix (`NAVTREE_OPEN_STORAGE_PREFIX`), scattering knowledge of where view-state lives. Per read-state-through-owning-api, read it through the view-state accessor (or an exported key helper that does not drag in the plugin graph) so a storage move needs one edit.

# WARN 8ad08cb2-23 no-swallowed-assertions-in-e2e-helpers `packages/e2e/composer-e2e/src/playwright/app-manager.ts:895`

The click-and-retry loop swallows every click failure with `.catch(() => {})`, so a control that is genuinely broken or unclickable is silently ignored (rule: no-swallowed-assertions-in-e2e-helpers). Let the click's own error surface (or use `toPass`/a web-first wait for the expected state) rather than catching and looping.

# WARN 8ad08cb2-24 workerd-variant-imports-conditioned-barrel `packages/plugins/plugin-agent/dx.config.ts:94`

The `appGraphBuilder` (and the sibling skill/operation modules) in a plugin with a `workerd` export lists no `environments`, so its headless/UI scope is implicit. Per workerd-variant-imports-conditioned-barrel, list `environments` explicitly on each module (headless ones include `workerd`, UI ones `['browser', 'tauri']`).

# WARN 8ad08cb2-25 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/brain/brain.test.ts:103`

Module-level `refs` object is mutated per test (`Object.assign`) and shared across tests. Per rule `per-test-mutable-fixtures`, create it in a closure or `beforeEach` inside the describe.

# WARN 8ad08cb2-26 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/brain/two-chats.test.ts:143`

Module-level mutable `compiler`, `cancelWhileComposing`, `offset` and `refs` are shared across tests and reset in `afterEach`. Per rule `per-test-mutable-fixtures`, create them in a closure or `beforeEach` inside the describe.

# WARN 8ad08cb2-27 minimal-precise-tests `packages/plugins/plugin-agent/src/brain/two-chats.test.ts:149`

The `say`/`settle`/`open private chats`/`makeScript` helpers and the `refs` wiring are copy-pasted with small variations across `brain.test.ts`, `two-chats.test.ts` and `operations/triggers.test.ts`. Per rule `minimal-precise-tests`, move shared setup into one named helper in `brain/testing.ts` and have each file call it.

# WARN 8ad08cb2-28 empty-container-uses-empty `packages/plugins/plugin-agent/src/components/AgentList/AgentList.tsx:70`

Hand-styled empty state (<p text-fg-muted text-center>); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-29 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/ensure-reply-sent.test.ts:29`

Module-level `CapabilityManager` is a mutable registry shared across tests. Per rule `per-test-mutable-fixtures`, create it inside the describe or per test.

# WARN 8ad08cb2-30 no-unused-new-api `packages/plugins/plugin-agent/src/operations/ensure-reply-sent.ts:20`

`REMINDER` is exported only so ensure-reply-sent.test.ts can import it; nothing in non-test code calls it (rule no-unused-new-api). Make it module-private and assert on the reminder text through the operation's public output.

# WARN 8ad08cb2-31 fix-root-cause-not-symptom `packages/plugins/plugin-agent/src/operations/ensure-reply-sent.ts:53`

`Effect.orElseSucceed(() => false)` discards a handler-lookup failure and treats it as "did not reply", which then makes the hook send a follow-up reminder. An internal lookup failure should surface (or at least be logged), not be converted into a wrong decision. Same pattern at lines 29 and 34 for `getChat` and `history`; handle the specific expected failure or log it.

# WARN 8ad08cb2-32 one-test-suite-per-module `packages/plugins/plugin-agent/src/operations/triggers.test.ts:105`

This operations-folder test file mixes six unrelated suites (`toRules`, `renderMessage`, `TriggerRegistry`, `AgentPresence.delivers`, `end-of-turn triggers`, `keep me posted`) and has no matching `triggers.ts` module. Per rule `one-test-suite-per-module`, move each suite next to the module it tests, or name each suite after the single operation (`RunTriggers`, `ListTriggers`) it exercises.

# WARN 8ad08cb2-33 minimal-precise-tests `packages/plugins/plugin-agent/src/operations/triggers.test.ts:340`

Duplicates the `say` and `settle` helpers already defined in `brain/brain.test.ts` and `brain/two-chats.test.ts`. Per rule `minimal-precise-tests`, share the setup in one named helper in `brain/testing.ts`.

# WARN 8ad08cb2-34 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/triggers.test.ts:588`

Module-level mutable `postedPrompts`, `postedRefs` and `refs` are shared across tests and cleared by hand. Per rule `per-test-mutable-fixtures`, create them per test in a closure or `beforeEach` inside the describe.

# ERROR 8ad08cb2-35 no-casts `packages/plugins/plugin-assistant/src/containers/index.ts:18`

`ComponentType<any>` widens the component props to `any`, which the no-casts rule forbids. Type the lazy container with its real props (or `ComponentType<unknown>`-compatible props type) instead of `any`.

# WARN 8ad08cb2-36 story-for-new-ui-component `packages/plugins/plugin-assistant/src/containers/SpaceAssistantSettings/SpaceAssistantSettings.tsx:1`

Newly added container with no `SpaceAssistantSettings.stories.tsx` alongside it, so there is no resting-state snapshot to catch visual regressions (`story-for-new-ui-component`). Add a story at the container level that renders `SpaceAssistantSettings` with only the dependencies it actually uses.

# WARN 8ad08cb2-37 no-invented-theme-tokens `packages/plugins/plugin-assistant/src/containers/SpaceAssistantSettings/SpaceAssistantSettings.tsx:76`

`text-description` is not a `--color-*` property declared in the theme (`semantic.css`/`roles.css`), so it generates no CSS and the empty message renders in the inherited color. Use a live token such as `text-fg-muted` or `text-fg-subtle` (rule `no-invented-theme-tokens`).

# WARN 8ad08cb2-38 per-test-mutable-fixtures `packages/plugins/plugin-assistant/src/operations/analyze-turn.test.ts:52`

Module-level `let captured` and `let telemetryEnabled` are mutable state shared across tests and reset by hand. Per rule `per-test-mutable-fixtures`, create them per test in a closure or `beforeEach` inside the describe.

# WARN 8ad08cb2-39 diagram-links-are-smart `packages/plugins/plugin-canvas/src/model/handler.ts:439`

`createLink({ type: 'line', ... })` builds connectors for a generated diagram. Per `diagram-links-are-smart`, use `type: 'smart'`.

# WARN 8ad08cb2-40 empty-container-uses-empty `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:83`

Hand-styled empty state (early-return <p text-fg-muted>); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-41 diagram-links-are-smart `packages/plugins/plugin-code-graph/src/components/CodeGraphCanvas/CodeGraphCanvas.tsx:152`

The dynamic layout options passed to `createDynamicProjection` set `link: { type: 'curve', ... }`, so generated code-graph connectors run straight port to port and can cross cards. Per `diagram-links-are-smart`, use `type: 'smart'` here.

# WARN 8ad08cb2-42 empty-container-uses-empty `packages/plugins/plugin-code-graph/src/containers/CodeGraphArticle/CodeGraphArticle.tsx:241`

Hand-styled empty state (Layout.Flex center text-description); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-43 empty-container-uses-empty `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:35`

Hand-styled empty state (Layout.Grid text-fg-muted); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-44 empty-container-uses-empty `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:122`

Hand-styled empty state (div p-2 text-fg-muted); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-45 empty-container-uses-empty `packages/plugins/plugin-deck/src/components/Companion/Companion.tsx:107`

Hand-styled empty state (grid place-items-center <p text-fg-muted>); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-46 stable-component-for-optional-content `packages/plugins/plugin-deck/src/components/Plank/Plank.tsx:256`

Chooses between the static `PLANK_LOADING` node and `Surface.Surface` on `node.data === undefined || !articleReady`, so the Surface mounts only after data lands and remounts the subtree. Per rule `stable-component-for-optional-content`, always render the `Surface` (it already takes `placeholder={PLANK_LOADING}`) and let it handle the not-ready case.

# WARN 8ad08cb2-47 containers-share-core-hooks `packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1578`

The plank `Mosaic.Stack` implements its own collection navigation: ArrowLeft/ArrowRight stepping and Cmd+Arrow reordering from a hand-written key handler, `document.activeElement` lookups, and a manual scroll-to-plank routine (`scrollIntoViewId` effect). Per `containers-share-core-hooks`, route plank selection, focus and scrolling through the shared hooks (`useListNavigation`, `useListSelection`, `Focus.Item`) or extend them for horizontal stacks, instead of reimplementing them in the deck.

# WARN 8ad08cb2-48 workaround-is-documented-and-removable `packages/plugins/plugin-deck/src/containers/DeckLayout/WorkspaceLayer.tsx:25`

The `opacity-[0.99]` / `will-change` hack works around a WebKit unpainted-layer behavior but carries no `TODO(owner)` naming the proper fix, an upstream issue link, or a removal condition. Per workaround-is-documented-and-removable, add a TODO with those next to it.

# WARN 8ad08cb2-49 stable-component-for-optional-content `packages/plugins/plugin-deck/src/containers/DeckLayout/WorkspaceLayer.tsx:31`

Switches between `<Deck.ContentEmpty />` and `<Deck.Planks />` on whether `deck.active` has entries, so the subtree remounts when planks arrive a commit later. Per rule `stable-component-for-optional-content`, render one always-present component (e.g. `Deck.Planks`) at a stable position that renders its own empty state.

# WARN 8ad08cb2-50 no-unused-new-api `packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:68`

`trailPaths` is exported only for useBreadcrumbs.test.ts; its sole production caller is in the same file (rule no-unused-new-api). Keep it module-private and test via the hook/public API.

# WARN 8ad08cb2-51 no-bare-ref-schema-alias `packages/plugins/plugin-discord/src/types/DiscordAgentOperation.ts:22:7`

The module-level `agent` constant is only `Ref.Ref(Agent.Agent).annotate(...)` and is reused as a field in several operation inputs (lines 40, 68, 93). Inline `Ref.Ref(Agent.Agent).annotate({ description: ... })` at each field with the description that field needs (rule `no-bare-ref-schema-alias`).

# WARN 8ad08cb2-52 todo-has-owner `packages/plugins/plugin-freeq/src/capabilities/channel-backend.ts:160`

The TODO carries a topic tag `(Task 11)` instead of an owner handle (rule: todo-has-owner). Rewrite as `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 8ad08cb2-53 empty-container-uses-empty `packages/plugins/plugin-illustrator/src/containers/DrawingScores/DrawingScores.tsx:65`

Hand-styled empty state (<p p-trim-md text-fg-muted>); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-54 static-path-bindings `packages/plugins/plugin-inbox/src/capabilities/app-graph-builder.ts:357`

Mints a parallel `message` URL key (and `event` at line 472) beside `mail`, distinguished only by `minDepth: 2`, where one key under the owner with deeper ids would do. Per rule `static-path-bindings`, bind messages under the mailbox's `mail` key and distinguish children by id depth rather than a sibling key.

# WARN 8ad08cb2-55 empty-container-uses-empty `packages/plugins/plugin-lighthouse/src/components/RelationsPanel/RelationsPanel.tsx:52`

Hand-styled empty state (span text-fg-muted); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-56 empty-container-uses-empty `packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:472`

Hand-styled empty state (div p-8 text-fg-muted); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-57 empty-container-uses-empty `packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineArticle.tsx:116`

Hand-styled empty state (Layout.Flex center text-fg-subtle); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-58 no-try-catch-in-effect-code `packages/plugins/plugin-mermaid/src/extensions/mermaid-extension.ts:195`

New `try`/`catch` around `Mermaid.parse`/`Mermaid.render` that converts any failure into a string via `String(err)`, violating `no-try-catch-in-effect-code`. Wrap the render in `Effect.tryPromise` with a typed error and use `Effect.catchTag` to fill the error state, so unrelated bugs are not swallowed.

# WARN 8ad08cb2-59 empty-container-uses-empty `packages/plugins/plugin-messenger/src/components/NotificationsPanel/NotificationsPanel.tsx:202`

Hand-styled empty state (Layout.Flex center text-fg-subtle); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-60 empty-container-uses-empty `packages/plugins/plugin-messenger/src/containers/MessengerCompanion/MessengerCompanion.tsx:72`

Hand-styled empty state (Layout.Flex center text-fg-subtle); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-61 no-unused-new-api `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts:396`

`SPEC_BRANCH_TYPE` is exported only so app-graph-builder.test.ts can import it; no non-test importer exists (rule no-unused-new-api). Keep it module-private.

# WARN 8ad08cb2-62 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/capabilities/subject-context.test.ts:22`

The `it.effect` callback is an arrow whose body is only `Effect.gen(function* () {...})` (also at lines 45 and 57). Pass `Effect.fnUntraced(function* () {...})` instead of hand-wrapping `Effect.gen`.

# WARN 8ad08cb2-63 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/capabilities/subject-context.test.ts:82`

`addProject` is an unnamed `Effect.fn(function* ...)`, and this is test-only code. Use `Effect.fnUntraced` (same for `addFeature` at line 92).

# WARN 8ad08cb2-64 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/capabilities/subject-context.test.ts:92`

`addFeature` is an unnamed `Effect.fn(function* ...)` in a test. Use `Effect.fnUntraced`.

# WARN 8ad08cb2-65 no-unused-new-api `packages/plugins/plugin-projects/src/capabilities/subject-context.ts:36`

`featureBindings` is exported only for subject-context.test.ts; the only production use is in the same file (rule no-unused-new-api). Keep it module-private and test through the capability.

# WARN 8ad08cb2-66 empty-container-uses-empty `packages/plugins/plugin-projects/src/components/MoveTaskPanel/MoveTaskPanel.tsx:45`

Hand-styled empty state (<p text-fg-muted>); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-67 empty-container-uses-empty `packages/plugins/plugin-projects/src/containers/AddFeatureDialog/AddFeatureDialog.tsx:82`

Hand-styled empty state (<p text-fg-muted>); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-68 empty-container-uses-empty `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:183`

Hand-styled empty state (div p-4 text-fg-muted); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-69 empty-container-uses-empty `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:35`

Hand-styled empty state (div p-4 text-fg-muted); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-70 empty-container-uses-empty `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:126`

Hand-styled empty state (Message component with Layout.Grid text-fg-muted); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-71 empty-container-uses-empty `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:516`

Hand-styled empty state (Layout.Flex center text-fg-subtle with an icon and literal text); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-72 no-unused-new-api `packages/plugins/plugin-sheet/src/integrations/thread-ranges.ts:21`

`findThreadAnchorAtCell` is exported only for thread-ranges.test.ts; its only production caller is in the same file (rule no-unused-new-api). Keep it module-private and test through the public API.

# WARN 8ad08cb2-73 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-sheet/src/types/SheetCapabilities.ts:1`

The `types` barrel re-exports this module as the `SheetCapabilities` namespace, but the file has no `// @import-as-namespace` directive. Add it directly under the copyright header so the four namespace conventions agree (rule `import-as-namespace-is-all-or-nothing`).

# ERROR 8ad08cb2-74 errors-extend-base-error `packages/plugins/plugin-sheet/src/types/SheetUtil.ts:29:14`

`ApiError` extends the built-in `Error`, so it lacks `_tag`, structured `context`, `is` and `wrap`. Define it with `BaseError.extend('ApiError', ...)` from `@dxos/errors` (rule `errors-extend-base-error`).

# ERROR 8ad08cb2-75 errors-extend-base-error `packages/plugins/plugin-sheet/src/types/SheetUtil.ts:31:14`

`ReadonlyException` subclasses `ApiError` (itself an `Error` subclass) under a new name, so its `is` will not match its parent. Define it as a sibling `BaseError.extend('ReadonlyException', ...)` (rule `errors-extend-base-error`).

# ERROR 8ad08cb2-76 errors-extend-base-error `packages/plugins/plugin-sheet/src/types/SheetUtil.ts:33:14`

`RangeException` subclasses `ApiError` (an `Error` subclass). Define it as a sibling `BaseError.extend('RangeException', ...)` taking `{ n }` as typed context instead of a bare constructor argument (rule `errors-extend-base-error`).

# WARN 8ad08cb2-77 one-name-one-export-per-concept `packages/plugins/plugin-sheet/src/types/SheetUtil.ts:133`

`rangeToAnchor` only calls `rangeToIndex` under a synonym, so readers must guess which is canonical (rule one-name-one-export-per-concept). Delete the alias and call `rangeToIndex` (or rename it to the single anchor term) at every usage, including the tests and `anchorFromSelection`.

# WARN 8ad08cb2-78 empty-container-uses-empty `packages/plugins/plugin-space/src/containers/SchemaContainer/SchemaContainer.tsx:32`

Hand-styled empty state (div text-center py-4); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-79 empty-container-uses-empty `packages/plugins/plugin-studio/src/components/VariantGallery/VariantGallery.tsx:70`

Hand-styled empty state (Layout.Flex center text-fg-subtle); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-80 empty-container-uses-empty `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:158`

Hand-styled empty state (Layout.Flex center text-fg-subtle); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-81 operation-owns-ui-state-transitions `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:45`

Keeps the last non-null `selectedLayer` in `lastSelectedLayer.current`, mutated during render, so content stays on screen after `selected` is cleared. This masks a close/clear ordering problem; per rule `operation-owns-ui-state-transitions`, flip the open flag first and clear `selected` only once the close animation has exited (in the owning handler/operation), then render `selectedLayer` directly.

# WARN 8ad08cb2-82 atom-lifetime-bound-to-owner `packages/sdk/app-graph/src/AppGraph.bench.ts:32:20`

New `Atom.keepAlive` pins the `revision` atom so it never expires (atom-lifetime-bound-to-owner). Drop `Atom.keepAlive` and let the registry/subscriber own the atom's lifetime (an owned or idle-TTL atom).

# WARN 8ad08cb2-83 no-lint-suppression-to-pass `packages/sdk/app-graph/src/AppGraph.bench.ts:97`

Added `// eslint-disable-next-line no-console` to log a result from `afterAll`. The suppression silences the rule for later edits too (`no-lint-suppression-to-pass`); report the figure through `@dxos/log` or the bench's own reporting instead, or justify a config override for bench files.

# WARN 8ad08cb2-84 structured-logging-not-console `packages/sdk/app-graph/src/AppGraph.bench.ts:104`

`console.log` left in committed code. Per the rule, use `log` from `@dxos/log` (at `info` or lower) rather than `console`.

# ERROR 8ad08cb2-85 no-casts `packages/sdk/app-graph/src/AppGraph.ts:858`

`stableData` takes `data: any` and returns `any`, widening both its signature and the node data it returns. Make it generic (`<T>(…, data: T): T`) or use `unknown` plus a narrowing check, per the no-casts rule.

# ERROR 8ad08cb2-86 no-casts `packages/sdk/app-toolkit/src/app-framework/AppCapabilities.ts:385`

The new `anchorFromSelection?: (obj: any, …)` widens a signature parameter to `any`. Type `obj` as the object type the comment config handles (or make the config generic) rather than `any`, per the no-casts rule.

# ERROR 8ad08cb2-87 no-silent-storage-fallback `packages/sdk/client/src/services/local-client-services.ts:198`

When `sqlite_mode` is unspecified the default branch logs a warning and continues on `layerMemory`, silently running on an in-memory database. Per no-silent-storage-fallback, fail startup with an error naming the missing/failed persistent backend, or require explicit `MEMORY` mode.

# WARN 8ad08cb2-88 no-styling-wrapper-divs `packages/ui/brand/src/components/backgrounds/Backgrounds.stories.tsx:52`

Hand-rolled `<div className='flex flex-col gap-4 …'>` wrapper. Replace with `Flex column gap='md'` (and `ScrollArea` for the overflow) per `no-styling-wrapper-divs`.

# WARN 8ad08cb2-89 no-styling-wrapper-divs `packages/ui/brand/src/components/backgrounds/Backgrounds.stories.tsx:54`

Hand-rolled `<div className='flex flex-col gap-1'>` per tile. Use `<Flex column gap='xs'>` per `no-styling-wrapper-divs`.

# WARN 8ad08cb2-90 no-invented-theme-tokens `packages/ui/brand/src/components/backgrounds/Backgrounds.stories.tsx:63`

`text-description` is not declared as a `--color-` property in the theme, so the label gets no color. Use `text-fg-muted` (rule `no-invented-theme-tokens`).

# WARN 8ad08cb2-91 diagram-links-are-smart `packages/ui/react-ui-canvas-compute/src/scene/scene.ts:33`

Links generated in code for the compute scene use `type: 'curve'`. Per `diagram-links-are-smart`, a code-built diagram should create `smart` links so arrows route around nodes.

# WARN 8ad08cb2-92 no-consumer-toggled-global-mode `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:321`

`flushSync` is inserted so the disclosure phase renders before the model's synchronous (external-store) commit, forcing ordering at the call site because the model update is not batched. Per no-consumer-toggled-global-mode, fix the shared model/store update policy generically instead of forcing order with `flushSync` in this one consumer.

# WARN 8ad08cb2-93 empty-container-uses-empty `packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:246`

Hand-styled empty state (<p text-fg-muted p-trim-md>); render `<Status.Empty classNames=...>{t(...)}</Status.Empty>` from `@dxos/react-ui/Status` per `empty-container-uses-empty` so padding, colour and status announcement match other panels.

# WARN 8ad08cb2-94 subpath-lint-not-adhoc-entrypoints `packages/ui/ui-editor/package.json:26`

Hand-adds a `./hunks` export whose module (`src/hunks.ts`) re-exports loose functions (`cherryPickHunk`, `computeWordHunks`, `revertHunk`) to split out a few symbols, bypassing the import-as-namespace convention. Per rule `subpath-lint-not-adhoc-entrypoints`, enroll the package in the subpath lint and expose a namespace file instead.

# WARN 8ad08cb2-95 log-fire-and-forget-rejections `packages/ui/ui-editor/src/extensions/decoration/pos.ts:258:8`

The `void parse(text).then(...)` chain ends in `.catch(() => {})`, so a failing parse or dispatch is swallowed invisibly (rule `log-fire-and-forget-rejections`). Replace it with `.catch((err) => log.catch(err))` (importing `log` from `@dxos/log`).
