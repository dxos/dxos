---
branch: dm/pensive-shannon-sagi4p
commit: a3f02a32f869a9815ea4fbcc0c2c7d204dad6ff5
base: 4ba42e6a27fd63b2e44cb49af9bd6e8313e33eab
mode: default
createdAt: 2026-10-19T02:06:05.471Z
isFinalized: true
groups: 156
rules: [atom-lifetime-bound-to-owner, barrel-imports-not-internal-paths, capability-module-layout, comment-hygiene, constants-not-nullary-factories, design-tokens-not-raw-spacing-sizing, echo-sqlite-bound-parameters, effect-fn-not-hand-wrapped-gen, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-dispatch, import-as-namespace-is-all-or-nothing, intents-not-coordinates, jsdoc-non-obvious-identifiers, key-chords-live-in-the-table, late-capability-read-via-atom, leaf-owns-its-subscription, log-fire-and-forget-rejections, minimal-precise-tests, mutate-echo-arrays-with-splice, named-react-imports, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-eager-read-before-subscribe, no-echo-internal-in-sdk, no-lint-suppression-to-pass, no-module-level-object-caches, no-sleep-in-test, no-styling-wrapper-divs, no-try-catch-in-effect-code, obj-update-push, one-changeset-per-pr, one-operation-per-navigation-intent, operations-resolve-database-from-service, reactive-state-via-atom-bridge, retries-via-schedule-with-evidence, scope-multi-tenant-queries-by-space, setter-must-not-own-transaction, stable-component-for-optional-content, story-for-new-ui-component, subscribe-where-you-read, toolbars-are-menu-actions, typename-via-schema-not-string, use-context-scoped-cancellation, vendor-code-in-vendor-extension, workaround-is-documented-and-removable]
reviewId: a3f02a32
---

_17 error(s), 191 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a3f02a32-1 - unresolved - one-changeset-per-pr - .changeset/retire-unloadable-documents.md:1
- a3f02a32-2 - unresolved - no-try-catch-in-effect-code - packages/apps/composer-app/src/pages/recovery.ts:159
- a3f02a32-3 - unresolved - namespace-brand-key-prefixing - packages/apps/composer-app/src/util/window-corners.ts:55
- a3f02a32-4 - unresolved - retries-via-schedule-with-evidence - packages/apps/composer-crx/src/core/actions/invoke.ts:54
- a3f02a32-5 - unresolved - constants-not-nullary-factories - packages/common/eslint-plugin-rules/src/__fixtures__/namespace-alias/Hooks.ts:1
- a3f02a32-6 - unresolved - constants-not-nullary-factories - packages/common/eslint-plugin-rules/src/__fixtures__/package-imports/src/hooks/useThing.ts:1
- a3f02a32-7 - unresolved - constants-not-nullary-factories - packages/common/eslint-plugin-rules/src/__fixtures__/subpath-reexport/src/hooks/index.ts:1
- a3f02a32-8 - unresolved - no-eager-read-before-subscribe - packages/common/graph/src/selection.ts:56
- a3f02a32-9 - unresolved - constants-not-nullary-factories - packages/common/log/src/processors/console-stub.ts:1
- a3f02a32-10 - unresolved - workaround-is-documented-and-removable - packages/common/sql-sqlite/src/internal/sqlite-module.ts:59
- a3f02a32-11 - unresolved - retries-via-schedule-with-evidence - packages/common/util/src/retry.ts:48
- a3f02a32-12 - unresolved - workaround-is-documented-and-removable - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.test.ts:25
- a3f02a32-13 - unresolved - retries-via-schedule-with-evidence - packages/core/compute/assistant-evals/src/claude-harness.ts:249
- a3f02a32-14 - unresolved - typename-via-schema-not-string - packages/core/compute/assistant-evals/src/evals/planning.eval.ts:86
- a3f02a32-15 - unresolved - vendor-code-in-vendor-extension - packages/core/compute/assistant-evals/src/Observe.ts:82
- a3f02a32-16 - unresolved - retries-via-schedule-with-evidence - packages/core/compute/compute-runtime/src/RemoteProcessHandle.ts:438
- a3f02a32-17 - unresolved - workaround-is-documented-and-removable - packages/core/compute/pipeline-email/src/fact-pipeline.ts:103
- a3f02a32-18 - unresolved - workaround-is-documented-and-removable - packages/core/compute/pipeline-email/src/stages/extract-facts-commit.ts:47
- a3f02a32-19 - unresolved - retries-via-schedule-with-evidence - packages/core/echo/blob/src/hosted/replicator.ts:140
- a3f02a32-20 - unresolved - retries-via-schedule-with-evidence - packages/core/echo/echo-client-e2e/src/sync-refresh.test.ts:50
- a3f02a32-21 - unresolved - retries-via-schedule-with-evidence - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:302
- a3f02a32-22 - unresolved - retries-via-schedule-with-evidence - packages/core/echo/echo-client/src/feed/feed-handle.ts:462
- a3f02a32-23 - unresolved - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host-quarantine.test.ts:100
- a3f02a32-24 - unresolved - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1488
- a3f02a32-25 - unresolved - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:2079
- a3f02a32-26 - unresolved - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/echo-host-retirement.test.ts:171
- a3f02a32-27 - unresolved - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/echo-host.ts:899
- a3f02a32-28 - unresolved - echo-sqlite-bound-parameters - packages/core/echo/echo-sqlite/src/sql/compile.ts:309
- a3f02a32-29 - unresolved - scope-multi-tenant-queries-by-space - packages/core/echo/index-core/src/indexes/entity-meta-index.ts:535
- a3f02a32-30 - unresolved - workaround-is-documented-and-removable - packages/core/mesh/rpc-tunnel/src/ports/iframe.ts:22
- a3f02a32-31 - unresolved - retries-via-schedule-with-evidence - packages/core/mesh/teleport-extension-automerge-replicator/src/automerge-replicator.ts:165
- a3f02a32-32 - unresolved - typename-via-schema-not-string - packages/devtools/cli/src/commands/chat/non-interactive.ts:19
- a3f02a32-33 - unresolved - flat-dispatch - packages/e2e/blade-runner/src/analysys/stats.ts:108
- a3f02a32-34 - unresolved - retries-via-schedule-with-evidence - packages/plugins/plugin-agent/src/operations/compile-goal.ts:84
- a3f02a32-35 - unresolved - retries-via-schedule-with-evidence - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60
- a3f02a32-36 - unresolved - workaround-is-documented-and-removable - packages/plugins/plugin-calls/src/calls/media-manager.ts:276
- a3f02a32-37 - unresolved - retries-via-schedule-with-evidence - packages/plugins/plugin-calls/src/calls/media-manager.ts:348
- a3f02a32-38 - unresolved - workaround-is-documented-and-removable - packages/plugins/plugin-calls/src/components/Media/AudioStream.tsx:35
- a3f02a32-39 - unresolved - no-sleep-in-test - packages/plugins/plugin-canvas/src/model/store.test.ts:174
- a3f02a32-40 - unresolved - minimal-precise-tests - packages/plugins/plugin-canvas/src/samples/architecture/diagrams.test.ts:41
- a3f02a32-41 - unresolved - operations-resolve-database-from-service - packages/plugins/plugin-canvas/src/samples/architecture/diagrams.ts:56
- a3f02a32-42 - unresolved - one-operation-per-navigation-intent - packages/plugins/plugin-client/src/operations/open-usage.ts:15
- a3f02a32-43 - unresolved - one-operation-per-navigation-intent - packages/plugins/plugin-client/src/operations/share-identity.ts:16
- a3f02a32-44 - unresolved - retries-via-schedule-with-evidence - packages/plugins/plugin-code/src/agents/CodeAgent.ts:321
- a3f02a32-45 - unresolved - workaround-is-documented-and-removable - packages/plugins/plugin-crm/src/operations/process-mailbox.ts:29
- a3f02a32-46 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/fieldstone/docs/partial.test.ts:85
- a3f02a32-47 - unresolved - no-casts - packages/plugins/plugin-debug/src/samples/fieldstone/inbox-crm/partial.test.ts:97
- a3f02a32-48 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/fieldstone/inbox-crm/pipeline.ts:40
- a3f02a32-49 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/fieldstone/inbox-crm/views.ts:30
- a3f02a32-50 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/fieldstone/projects/docs.ts:173
- a3f02a32-51 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/fieldstone/projects/history.ts:1
- a3f02a32-52 - unresolved - no-casts - packages/plugins/plugin-debug/src/samples/fieldstone/projects/partial.test.ts:110
- a3f02a32-53 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/fieldstone/projects/partial.ts:45
- a3f02a32-54 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/fieldstone/projects/projects.ts:149
- a3f02a32-55 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/fieldstone/projects/routines.ts:35
- a3f02a32-56 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/fieldstone/projects/tasks.ts:1003
- a3f02a32-57 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/worker/project.ts:45
- a3f02a32-58 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/worker/tasks.ts:81
- a3f02a32-59 - unresolved - log-fire-and-forget-rejections - packages/plugins/plugin-deck/src/capabilities/notification-tracker.ts:65
- a3f02a32-60 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:59
- a3f02a32-61 - unresolved - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:93
- a3f02a32-62 - unresolved - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:134
- a3f02a32-63 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:98
- a3f02a32-64 - unresolved - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:212
- a3f02a32-65 - unresolved - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useCompanions.ts:57
- a3f02a32-66 - unresolved - mutate-echo-arrays-with-splice - packages/plugins/plugin-inbox/src/capabilities/app-graph-builder.ts:127
- a3f02a32-67 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/capabilities/app-graph-builder.ts:511
- a3f02a32-68 - unresolved - capability-module-layout - packages/plugins/plugin-inbox/src/capabilities/mailbox-processors.ts:28
- a3f02a32-69 - unresolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:297
- a3f02a32-70 - unresolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:74
- a3f02a32-71 - unresolved - subscribe-where-you-read - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:102
- a3f02a32-72 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:126
- a3f02a32-73 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:634
- a3f02a32-74 - unresolved - no-casts - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.stories.tsx:75
- a3f02a32-75 - unresolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:77
- a3f02a32-76 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:221
- a3f02a32-77 - unresolved - stable-component-for-optional-content - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:245
- a3f02a32-78 - unresolved - no-casts - packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:145
- a3f02a32-79 - unresolved - obj-update-push - packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:20
- a3f02a32-80 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:44
- a3f02a32-81 - unresolved - operations-resolve-database-from-service - packages/plugins/plugin-inbox/src/types/InboxOperation.ts:73
- a3f02a32-82 - unresolved - jsdoc-non-obvious-identifiers - packages/plugins/plugin-inbox/src/types/InboxOperation.ts:117
- a3f02a32-83 - unresolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.stories.tsx:51
- a3f02a32-84 - unresolved - no-casts - packages/plugins/plugin-kanban/src/containers/index.ts:1
- a3f02a32-85 - unresolved - story-for-new-ui-component - packages/plugins/plugin-kanban/src/containers/KanbanCard/KanbanCard.tsx:14
- a3f02a32-86 - unresolved - no-echo-internal-in-sdk - packages/plugins/plugin-kanban/src/hooks/useKanbanBoardModel.browser.test.tsx:13
- a3f02a32-87 - unresolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:193
- a3f02a32-88 - unresolved - no-casts - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:198
- a3f02a32-89 - unresolved - one-operation-per-navigation-intent - packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:157
- a3f02a32-90 - unresolved - one-operation-per-navigation-intent - packages/plugins/plugin-onboarding/src/onboarding-manager.ts:252
- a3f02a32-91 - unresolved - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:92
- a3f02a32-92 - unresolved - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-preview/src/cards/PersonCard.tsx:55
- a3f02a32-93 - unresolved - late-capability-read-via-atom - packages/plugins/plugin-registry/src/capabilities/index.ts:20
- a3f02a32-94 - unresolved - atom-lifetime-bound-to-owner - packages/plugins/plugin-registry/src/filter.ts:1
- a3f02a32-95 - unresolved - one-operation-per-navigation-intent - packages/plugins/plugin-registry/src/operations/open-plugin-registry.ts:17
- a3f02a32-96 - unresolved - no-try-catch-in-effect-code - packages/plugins/plugin-review/src/capabilities/agent-runner.ts:140
- a3f02a32-97 - unresolved - no-casts - packages/plugins/plugin-review/src/capabilities/agent-runner.ts:248
- a3f02a32-98 - unresolved - barrel-imports-not-internal-paths - packages/plugins/plugin-review/src/operations/add-message.ts:13
- a3f02a32-99 - unresolved - no-try-catch-in-effect-code - packages/plugins/plugin-review/src/operations/create.ts:59
- a3f02a32-100 - unresolved - no-casts - packages/plugins/plugin-review/src/should-trigger-agent.test.ts:14
- a3f02a32-101 - unresolved - no-casts - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:86
- a3f02a32-102 - unresolved - setter-must-not-own-transaction - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:158
- a3f02a32-103 - unresolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:302
- a3f02a32-104 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:470
- a3f02a32-105 - unresolved - reactive-state-via-atom-bridge - packages/plugins/plugin-sheet/src/components/SheetContent/util.ts:155
- a3f02a32-106 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/containers/SheetArticle/SheetArticle.stories.tsx:85
- a3f02a32-107 - unresolved - namespace-brand-key-prefixing - packages/plugins/plugin-sheet/src/types/SheetRange.ts:1
- a3f02a32-108 - unresolved - capability-module-layout - packages/plugins/plugin-slack/src/capabilities/channel-backend.ts:35
- a3f02a32-109 - unresolved - capability-module-layout - packages/plugins/plugin-space/src/capabilities/default-parent.ts:20
- a3f02a32-110 - unresolved - typename-via-schema-not-string - packages/plugins/plugin-space/src/capabilities/repair.ts:26
- a3f02a32-111 - unresolved - retries-via-schedule-with-evidence - packages/plugins/plugin-space/src/capabilities/spaces-available.ts:131
- a3f02a32-112 - unresolved - retries-via-schedule-with-evidence - packages/plugins/plugin-space/src/commands/space/join/join.ts:70
- a3f02a32-113 - unresolved - leaf-owns-its-subscription - packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:130
- a3f02a32-114 - unresolved - retries-via-schedule-with-evidence - packages/plugins/plugin-stream-deck/src/bridge/StreamDeckBridge.ts:150
- a3f02a32-115 - unresolved - constants-not-nullary-factories - packages/plugins/plugin-wnfs/src/helpers/common.ts:62
- a3f02a32-116 - unresolved - workaround-is-documented-and-removable - packages/sdk/app-framework/src/vite-plugin/composer/index.ts:88
- a3f02a32-117 - unresolved - typename-via-schema-not-string - packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:67
- a3f02a32-118 - unresolved - retries-via-schedule-with-evidence - packages/sdk/client-services/src/internal/invitations/invitations-handler.ts:584
- a3f02a32-119 - unresolved - retries-via-schedule-with-evidence - packages/sdk/client-services/src/internal/spaces/data-space.ts:535
- a3f02a32-120 - unresolved - vendor-code-in-vendor-extension - packages/sdk/observability/src/extensions/posthog/llm-analytics.ts:59
- a3f02a32-121 - unresolved - vendor-code-in-vendor-extension - packages/sdk/observability/src/extensions/posthog/log-processor.ts:58
- a3f02a32-122 - unresolved - retries-via-schedule-with-evidence - packages/stories/stories-brain/src/testing/harness/internal/embeddings.ts:28
- a3f02a32-123 - unresolved - no-eager-read-before-subscribe - packages/ui/react-ui-attention/src/types/Attention.ts:66
- a3f02a32-124 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/FrameHeader/FrameHeader.tsx:1
- a3f02a32-125 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/FrameHeader/FrameHeader.tsx:48
- a3f02a32-126 - unresolved - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:159
- a3f02a32-127 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:169
- a3f02a32-128 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Properties/FontField.tsx:1
- a3f02a32-129 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Properties/LineStyleField.tsx:1
- a3f02a32-130 - unresolved - story-for-new-ui-component - packages/ui/react-ui-canvas/src/components/Properties/LineStyleField.tsx:22
- a3f02a32-131 - unresolved - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas/src/components/Properties/Properties.stories.tsx:67
- a3f02a32-132 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:22
- a3f02a32-133 - unresolved - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:22
- a3f02a32-134 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.tsx:1
- a3f02a32-135 - unresolved - intents-not-coordinates - packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:1224
- a3f02a32-136 - unresolved - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:1272
- a3f02a32-137 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:53
- a3f02a32-138 - unresolved - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:57
- a3f02a32-139 - unresolved - atom-lifetime-bound-to-owner - packages/ui/react-ui-canvas/src/model/animate.ts:45
- a3f02a32-140 - unresolved - no-module-level-object-caches - packages/ui/react-ui-canvas/src/model/timeline.ts:343
- a3f02a32-141 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui-dashboard/src/Dashboard.tsx:292
- a3f02a32-142 - unresolved - no-casts - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:90
- a3f02a32-143 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:282
- a3f02a32-144 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:113
- a3f02a32-145 - unresolved - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:383
- a3f02a32-146 - unresolved - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-plot/src/components/Plot/Plot.stories.tsx:14
- a3f02a32-147 - unresolved - extract-non-rendering-logic-from-component - packages/ui/react-ui-plot/src/components/Plot/Plot.tsx:58
- a3f02a32-148 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:361
- a3f02a32-149 - unresolved - comment-hygiene - packages/ui/react-ui/src/components/AlertDialog/AlertDialog.stories.tsx:132
- a3f02a32-150 - unresolved - no-sleep-in-test - packages/ui/react-ui/src/components/AlertDialog/AlertDialog.test.tsx:23
- a3f02a32-151 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Avatar/Avatar.stories.tsx:28
- a3f02a32-152 - unresolved - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Avatar/index.ts:1
- a3f02a32-153 - unresolved - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Banner/index.ts:1
- a3f02a32-154 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Card/Card.stories.tsx:96
- a3f02a32-155 - unresolved - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Carousel/index.ts:1
- a3f02a32-156 - unresolved - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/components/Combobox/Combobox.tsx:138
- a3f02a32-157 - unresolved - comment-hygiene - packages/ui/react-ui/src/components/DateInput/DateInput.stories.tsx:216
- a3f02a32-158 - unresolved - comment-hygiene - packages/ui/react-ui/src/components/Dialog/Dialog.stories.tsx:114
- a3f02a32-159 - unresolved - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Dialog/index.ts:1
- a3f02a32-160 - unresolved - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/DragHandle/index.ts:1
- a3f02a32-161 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Editable/Editable.stories.tsx:200
- a3f02a32-162 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/components/ErrorFallback/ErrorFallback.stories.tsx:36
- a3f02a32-163 - unresolved - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/ErrorFallback/ErrorFallback.stories.tsx:43
- a3f02a32-164 - unresolved - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/FloatingPanel/index.ts:1
- a3f02a32-165 - unresolved - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/HoverCard/index.ts:1
- a3f02a32-166 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Image/Image.stories.tsx:44
- a3f02a32-167 - unresolved - story-for-new-ui-component - packages/ui/react-ui/src/components/Label/Label.tsx:15
- a3f02a32-168 - unresolved - event-handler-naming-convention - packages/ui/react-ui/src/components/Main/Main.tsx:532
- a3f02a32-169 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/components/MediaPlayer/MediaPlayer.stories.tsx:21
- a3f02a32-170 - unresolved - no-lint-suppression-to-pass - packages/ui/react-ui/src/components/Menu/Menu.test.tsx:11
- a3f02a32-171 - unresolved - comment-hygiene - packages/ui/react-ui/src/components/Panel/Panel.tsx:38
- a3f02a32-172 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/components/PasswordInput/PasswordInput.stories.tsx:98
- a3f02a32-173 - unresolved - comment-hygiene - packages/ui/react-ui/src/components/Popover/Popover.stories.tsx:117
- a3f02a32-174 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Progress/Progress.stories.tsx:18
- a3f02a32-175 - unresolved - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Progress/Progress.stories.tsx:28
- a3f02a32-176 - unresolved - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/QrCode/index.ts:1
- a3f02a32-177 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/components/QrCode/QrCode.stories.tsx:16
- a3f02a32-178 - unresolved - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/ScrollArea/index.ts:1
- a3f02a32-179 - unresolved - story-for-new-ui-component - packages/ui/react-ui/src/components/ScrollArea/PopupScroll.tsx:99
- a3f02a32-180 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/components/ScrollArea/ScrollArea.stories.tsx:45
- a3f02a32-181 - unresolved - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/ScrollContainer/index.ts:1
- a3f02a32-182 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Skeleton/Skeleton.stories.tsx:18
- a3f02a32-183 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Steps/Steps.stories.tsx:64
- a3f02a32-184 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/components/TextCrawl/TextCrawl.stories.tsx:43
- a3f02a32-185 - unresolved - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/components/TextCrawl/TextCrawl.tsx:117
- a3f02a32-186 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Timestamp/Timestamp.stories.tsx:34
- a3f02a32-187 - unresolved - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/components/Timestamp/Timestamp.stories.tsx:53
- a3f02a32-188 - unresolved - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Toast/index.ts:1
- a3f02a32-189 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/components/Toast/Toast.stories.tsx:24
- a3f02a32-190 - unresolved - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/components/Toast/Toast.tsx:213
- a3f02a32-191 - unresolved - comment-hygiene - packages/ui/react-ui/src/components/Tooltip/Tooltip.stories.tsx:114
- a3f02a32-192 - unresolved - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Tour/index.ts:1
- a3f02a32-193 - unresolved - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/components/Typography/index.ts:1
- a3f02a32-194 - unresolved - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/focus.stories.tsx:50
- a3f02a32-195 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78
- a3f02a32-196 - unresolved - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78
- a3f02a32-197 - unresolved - no-casts - packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:108
- a3f02a32-198 - unresolved - event-handler-naming-convention - packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:108
- a3f02a32-199 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/flow/Show.stories.tsx:16
- a3f02a32-200 - unresolved - namespace-export-with-internal-hiding - packages/ui/react-ui/src/index.ts:1
- a3f02a32-201 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/playground/Playground.stories.tsx:539
- a3f02a32-202 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/components.stories.tsx:101
- a3f02a32-203 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/Loading.tsx:30
- a3f02a32-204 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/stories.tsx:45
- a3f02a32-205 - unresolved - workaround-is-documented-and-removable - packages/ui/react-ui/src/util/mobile.ts:8
- a3f02a32-206 - unresolved - no-sleep-in-test - packages/ui/ui-editor/src/extensions/state/selection.test.ts:45
- a3f02a32-207 - unresolved - no-styling-wrapper-divs - packages/ui/ui-theme/src/Theme.stories.tsx:109
- a3f02a32-208 - unresolved - workaround-is-documented-and-removable - packages/ui/ui/src/device.ts:5

## Issues

# WARN a3f02a32-1 one-changeset-per-pr `.changeset/retire-unloadable-documents.md:1`

System One judges this a likely violation of `one-changeset-per-pr` (A PR carries at most one changeset, and none for a chore), p=0.93. This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-2 no-try-catch-in-effect-code `packages/apps/composer-app/src/pages/recovery.ts:159`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 159-170 (`const runAction = async (label: string, task: () => Promise<void>) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-3 namespace-brand-key-prefixing `packages/apps/composer-app/src/util/window-corners.ts:55`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 55-66 (`export const watchWindowCorners = async (tauri: boolean): Promise<void> => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-4 retries-via-schedule-with-evidence `packages/apps/composer-crx/src/core/actions/invoke.ts:54`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.80. The likeliest place is lines 54-65 (`export const deliverInvoke = async (`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-5 constants-not-nullary-factories `packages/common/eslint-plugin-rules/src/__fixtures__/namespace-alias/Hooks.ts:1`

System One judges this a likely violation of `constants-not-nullary-factories` (Export a fixed value as a constant, not a zero-argument function), p=0.84. The likeliest place is lines 1-8 (`export const useThing = () => 1;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-6 constants-not-nullary-factories `packages/common/eslint-plugin-rules/src/__fixtures__/package-imports/src/hooks/useThing.ts:1`

System One judges this a likely violation of `constants-not-nullary-factories` (Export a fixed value as a constant, not a zero-argument function), p=0.91. The likeliest place is lines 1-6 (`export const useThing = () => 1;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-7 constants-not-nullary-factories `packages/common/eslint-plugin-rules/src/__fixtures__/subpath-reexport/src/hooks/index.ts:1`

System One judges this a likely violation of `constants-not-nullary-factories` (Export a fixed value as a constant, not a zero-argument function), p=0.85. The likeliest place is lines 1-6 (`export const useThing = () => 1;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-8 no-eager-read-before-subscribe `packages/common/graph/src/selection.ts:56`

System One judges this a likely violation of `no-eager-read-before-subscribe` (Don't read an atom just before subscribing to force it to build), p=0.95. The likeliest place is lines 56-67 (`this._registry.get(this._selected);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-9 constants-not-nullary-factories `packages/common/log/src/processors/console-stub.ts:1`

System One judges this a likely violation of `constants-not-nullary-factories` (Export a fixed value as a constant, not a zero-argument function), p=0.80. The likeliest place is lines 1-7 (`export const CONSOLE_PROCESSOR = () => {};`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-10 workaround-is-documented-and-removable `packages/common/sql-sqlite/src/internal/sqlite-module.ts:59`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.86. The likeliest place is lines 59-68 (`export const instantiateSqliteModule = <T>(factory: SqliteModuleFactory<T>, c...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-11 retries-via-schedule-with-evidence `packages/common/util/src/retry.ts:48`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.82. The likeliest place is lines 48-59 (`export const retry = async <T>(options: RetryOptions<T>, cb: () => Promise<T>...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-12 workaround-is-documented-and-removable `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.test.ts:25`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.84. The likeliest place is lines 25-28 (`// Workaround: @effect/ai-anthropic v0.26.0 declares AnthropicWebSearch with`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-13 retries-via-schedule-with-evidence `packages/core/compute/assistant-evals/src/claude-harness.ts:249`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.86. The likeliest place is lines 249-260 (`const createEdgeAgent = async (client: Client): Promise<void> => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-14 typename-via-schema-not-string `packages/core/compute/assistant-evals/src/evals/planning.eval.ts:86`

System One judges this a likely violation of `typename-via-schema-not-string` (Refer to a type's typename through its schema, never a string literal), p=0.80. The likeliest place is lines 86-95 (`description: 'The outline was never written via a raw database object-create/...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-15 vendor-code-in-vendor-extension `packages/core/compute/assistant-evals/src/Observe.ts:82`

System One judges this a likely violation of `vendor-code-in-vendor-extension` (Vendor-specific mapping lives in the vendor's extension, not a generic package), p=0.88. The likeliest place is lines 82-93 (`distinctId: DISTINCT_ID,`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-16 retries-via-schedule-with-evidence `packages/core/compute/compute-runtime/src/RemoteProcessHandle.ts:438`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.86. The likeliest place is lines 438-449 (`#readPage(cursor: number, attempt = 0): Effect.Effect<RemoteProcessManager.Ev...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-17 workaround-is-documented-and-removable `packages/core/compute/pipeline-email/src/fact-pipeline.ts:103`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.81. The likeliest place is lines 103-114 (`let cursorKey = Cursor.parseKey(cursor.max);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-18 workaround-is-documented-and-removable `packages/core/compute/pipeline-email/src/stages/extract-facts-commit.ts:47`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.80. The likeliest place is lines 47-54 (`{ concurrency },`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-19 retries-via-schedule-with-evidence `packages/core/echo/blob/src/hosted/replicator.ts:140`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.92. The likeliest place is lines 140-151 (`yield* Queue.take(wake);`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-20 retries-via-schedule-with-evidence `packages/core/echo/echo-client-e2e/src/sync-refresh.test.ts:50`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.88. The likeliest place is lines 50-61 (`const readerCopy = async <T extends Obj.Any>(peers: Peers, id: string): Promi...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-21 retries-via-schedule-with-evidence `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:302`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.90. The likeliest place is lines 302-325 (`await this._sendPending();`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-22 retries-via-schedule-with-evidence `packages/core/echo/echo-client/src/feed/feed-handle.ts:462`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.90. The likeliest place is lines 462-485 (`async waitForPendingWrites(): Promise<void> {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-23 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host-quarantine.test.ts:100`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 100-111 (`const pending = host.loadDoc(Context.default(), documentId);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-24 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1488`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 1488-1511 (`const handle = this._repo.getHandle(documentId as any);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-25 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:2079`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 2079-2102 (`if (this._replicationLeases.delete(documentId)) {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-26 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/echo-host-retirement.test.ts:171`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 171-182 (`await automergeHost.flush(Context.default());`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-27 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/echo-host.ts:899`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 899-915 (`const previous = this.#retirements.get(spaceId) ?? Promise.resolve();`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-28 echo-sqlite-bound-parameters `packages/core/echo/echo-sqlite/src/sql/compile.ts:309`

System One judges this a likely violation of `echo-sqlite-bound-parameters` (SQL values are bound, never interpolated), p=0.80. The likeliest place is lines 309-320 (`const uri = raw(`CASE t.type WHEN 'object' THEN json_extract(t.value, '$."/"'...`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-29 scope-multi-tenant-queries-by-space `packages/core/echo/index-core/src/indexes/entity-meta-index.ts:535`

System One judges this a likely violation of `scope-multi-tenant-queries-by-space` (Every space-scoped query and key leads with spaceId), p=0.81. The likeliest place is lines 535-558 (`}: {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-30 workaround-is-documented-and-removable `packages/core/mesh/rpc-tunnel/src/ports/iframe.ts:22`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.84. The likeliest place is lines 22-34 (`const sendToIFrame = (iframe: HTMLIFrameElement, origin: string, message: Mes...`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-31 retries-via-schedule-with-evidence `packages/core/mesh/teleport-extension-automerge-replicator/src/automerge-replicator.ts:165`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.85. The likeliest place is lines 165-172 (`if (retries % retryPolicy.retriesBeforeBackoff === 0) {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-32 typename-via-schema-not-string `packages/devtools/cli/src/commands/chat/non-interactive.ts:19`

System One judges this a likely violation of `typename-via-schema-not-string` (Refer to a type's typename through its schema, never a string literal), p=0.81. The likeliest place is lines 19-30 (`const TRACKED_TYPENAMES: ReadonlyArray<{ typename: string; kind: string }> = [`, location confidence 0.52). Judged with added `imports` context after a first pass of 0.71. This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-33 flat-dispatch `packages/e2e/blade-runner/src/analysys/stats.ts:108`

System One judges this a likely violation of `flat-dispatch` (Dispatch messages and events flat, not through nested conditionals), p=0.81. The likeliest place is lines 108-119 (`switch (data.type) {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-34 retries-via-schedule-with-evidence `packages/plugins/plugin-agent/src/operations/compile-goal.ts:84`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.88. The likeliest place is lines 84-95 (`let feedback: string | undefined;`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-35 retries-via-schedule-with-evidence `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.91. The likeliest place is lines 60-71 (`const attachActiveHandle = (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-36 workaround-is-documented-and-removable `packages/plugins/plugin-calls/src/calls/media-manager.ts:276`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.81. The likeliest place is lines 276-287 (`await cancelWithContext(this._ctx, sleep(800));`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-37 retries-via-schedule-with-evidence `packages/plugins/plugin-calls/src/calls/media-manager.ts:348`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.86. The likeliest place is lines 348-359 (`const shouldRetry = pushVideoResult.shouldRetry || pushAudioResult.shouldRetr...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-38 workaround-is-documented-and-removable `packages/plugins/plugin-calls/src/components/Media/AudioStream.tsx:35`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.81. The likeliest place is lines 35-48 (`audio.addEventListener('canplay', () => audio.play(), { once: true });`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-39 no-sleep-in-test `packages/plugins/plugin-canvas/src/model/store.test.ts:174`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 174-185 (`canvas.content[nodeKey('f')] = {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-40 minimal-precise-tests `packages/plugins/plugin-canvas/src/samples/architecture/diagrams.test.ts:41`

System One judges this a likely violation of `minimal-precise-tests` (Add the fewest tests that pin the change, each precise and readable), p=0.81. The likeliest place is lines 41-52 (`if (!canvas) {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-41 operations-resolve-database-from-service `packages/plugins/plugin-canvas/src/samples/architecture/diagrams.ts:56`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.88. The likeliest place is lines 56-64 (`export const loadDiagramSet = async (db: Database.Database, set: DiagramSet):...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-42 one-operation-per-navigation-intent `packages/plugins/plugin-client/src/operations/open-usage.ts:15`

System One judges this a likely violation of `one-operation-per-navigation-intent` (One operation call carries a navigation intent; don't chain operations that race), p=0.89. The likeliest place is lines 15-27 (`const handler: Operation.WithHandler<typeof ClientOperation.OpenUsage> = Clie...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-43 one-operation-per-navigation-intent `packages/plugins/plugin-client/src/operations/share-identity.ts:16`

System One judges this a likely violation of `one-operation-per-navigation-intent` (One operation call carries a navigation intent; don't chain operations that race), p=0.89. The likeliest place is lines 16-29 (`const handler: Operation.WithHandler<typeof ClientOperation.ShareIdentity> = ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-44 retries-via-schedule-with-evidence `packages/plugins/plugin-code/src/agents/CodeAgent.ts:321`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.89. The likeliest place is lines 321-332 (`const probe = (`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-45 workaround-is-documented-and-removable `packages/plugins/plugin-crm/src/operations/process-mailbox.ts:29`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.82. The likeliest place is lines 29-40 (`const index = overlayIdentityIndex(identitySpecs, yield* getIdentityIndex(db,...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-46 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/fieldstone/docs/partial.test.ts:85`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 85-96 (`describe('Alien Labs docs', () => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-47 no-casts `packages/plugins/plugin-debug/src/samples/fieldstone/inbox-crm/partial.test.ts:97`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 97-108 (`const personByEmail = new Map(people.map((person) => [person.emails?.[0]?.val...`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-48 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/fieldstone/inbox-crm/pipeline.ts:40`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 40-51 (`export const makePipeline = (orgs: Record<OrgKey, Organization.Organization>)...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-49 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/fieldstone/inbox-crm/views.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 30-40 (`export const makeViews = () =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-50 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/fieldstone/projects/docs.ts:173`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 173-187 (`export const makeDocs = ({ inboxCrm }: { readonly inboxCrm?: InboxCrmLinks }) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-51 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/fieldstone/projects/history.ts:1`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 1-25 (`import * as Effect from 'effect/Effect';`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-52 no-casts `packages/plugins/plugin-debug/src/samples/fieldstone/projects/partial.test.ts:110`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 110-121 (`chatsByTask.set(idOf(ref)!, [...(chatsByTask.get(idOf(ref)!) ?? []), chat]);`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-53 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/fieldstone/projects/partial.ts:45`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 45-56 (`export const Partial: SampleSpace.Partial<Provides, Requires> = SampleSpace.p...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-54 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/fieldstone/projects/projects.ts:149`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 149-160 (`export const makeProjects = ({ team, taskSets, artifacts, inboxCrm }: Project...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-55 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/fieldstone/projects/routines.ts:35`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 35-46 (`export const makeRoutines = ({ team, projects, inboxCrm }: RoutinesInput) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-56 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/fieldstone/projects/tasks.ts:1003`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 1003-1020 (`.sort((a, b) => a.at - b.at)`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-57 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/worker/project.ts:45`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 45-56 (`export const ProjectPartial: SampleSpace.Partial<ProjectResult, ProjectInput>...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-58 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/worker/tasks.ts:81`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 81-92 (`export const Tasks: SampleSpace.Partial<TasksResult> = SampleSpace.partial('t...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-59 log-fire-and-forget-rejections `packages/plugins/plugin-deck/src/capabilities/notification-tracker.ts:65`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.96. The likeliest place is lines 65-76 (`const operation = yield* OperationHandlerSet.getHandlerByKey(handlers, action...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-60 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 59-70 (`const DefaultStory = () => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-61 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:93`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 93-107 (`const BreadcrumbStory = () => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-62 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:134`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 134-145 (`classNames={[`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-63 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 98-109 (`'py-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] border-s bord...`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-64 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:212`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.85. The likeliest place is lines 212-223 (`<Toolbar.Root size='lg' style={iconSize(5)} classNames='h-(--dx-rail-content)...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-65 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useCompanions.ts:57`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.81. The likeliest place is lines 57-68 (`const unsubscribe = registry.subscribe(atom, update);`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-66 mutate-echo-arrays-with-splice `packages/plugins/plugin-inbox/src/capabilities/app-graph-builder.ts:127`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.86. The likeliest place is lines 127-138 (`owner.filters = (owner.filters ?? []).filter((entry) => entry.name !== name);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-67 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/capabilities/app-graph-builder.ts:511`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 511-522 (`if (!binding) {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-68 capability-module-layout `packages/plugins/plugin-inbox/src/capabilities/mailbox-processors.ts:28`

System One judges this a likely violation of `capability-module-layout` (A capability is defined inline in its contribute call, in a module named after its directory), p=0.82. The likeliest place is lines 28-39 (`export const inboxMailboxProcessors: readonly InboxCapabilities.MailboxProces...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-69 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:297`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 297-320 (`const content = tile.querySelector<HTMLElement>('.dx-expand .cm-content');`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-70 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:74`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 74-85 (`const seeded = useRef(false);`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-71 subscribe-where-you-read `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:102`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.80. The likeliest place is lines 102-113 (`const CompanionStory = () => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-72 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:126`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 126-134 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-73 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:634`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 634-645 (`return (`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-74 no-casts `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.stories.tsx:75`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 75-86 (`Event.make({`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-75 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:77`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 77-88 (`const resolveTagIds = useFilterTagIds(tagIndex, debouncedFilter);`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-76 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:221`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 221-232 (`useArticleKeyboardNavigation({ articleId: id, items: events, currentId, onSel...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-77 stable-component-for-optional-content `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:245`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.83. The likeliest place is lines 245-256 (`{events.length === 0 && !filtering ? (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-78 no-casts `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:145`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 145-156 (`const viewFilter = buildMailboxSelection('', undefined);`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-79 obj-update-push `packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:20`

System One judges this a likely violation of `obj-update-push` (Append inside Obj.update with push, not spread), p=0.96. The likeliest place is lines 20-31 (`export const SaveFilterPopover = ({ owner, filter }: { owner: QueryFilterOwne...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-80 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 44-55 (`onKeyDown={({ key }) => key === 'Enter' && doneButton.current?.click()}`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-81 operations-resolve-database-from-service `packages/plugins/plugin-inbox/src/types/InboxOperation.ts:73`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.96. The likeliest place is lines 73-84 (`export const DraftEmailAndOpen = Operation.make({`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-82 jsdoc-non-obvious-identifiers `packages/plugins/plugin-inbox/src/types/InboxOperation.ts:117`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.81. The likeliest place is lines 117-131 (`export const RenameFilter = Operation.make({`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-83 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.stories.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 51-62 (`const jsonSchema = JsonSchema.toJsonSchema(Organization.Organization);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-84 no-casts `packages/plugins/plugin-kanban/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 1-10 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-85 story-for-new-ui-component `packages/plugins/plugin-kanban/src/containers/KanbanCard/KanbanCard.tsx:14`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 14-25 (`export const KanbanCard = ({ subject }: AppSurface.ObjectCardProps<Kanban.Kan...`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-86 no-echo-internal-in-sdk `packages/plugins/plugin-kanban/src/hooks/useKanbanBoardModel.browser.test.tsx:13`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.80. The likeliest place is lines 13-24 (`import { DXN, Filter, JsonSchema, Obj, Query, Type, type View } from '@dxos/e...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-87 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:193`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 193-204 (`.reduce((acc: Extension[], provider) => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-88 no-casts `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:198`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 198-209 (`});`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-89 one-operation-per-navigation-intent `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:157`

System One judges this a likely violation of `one-operation-per-navigation-intent` (One operation call carries a navigation intent; don't chain operations that race), p=0.84. The likeliest place is lines 157-168 (`: 'expanded'`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-90 one-operation-per-navigation-intent `packages/plugins/plugin-onboarding/src/onboarding-manager.ts:252`

System One judges this a likely violation of `one-operation-per-navigation-intent` (One operation call carries a navigation intent; don't chain operations that race), p=0.84. The likeliest place is lines 252-263 (`id: 'passkey-setup-toast',`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-91 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:92`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 92-103 (`Obj.setValue(subject, parts, value);`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-92 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-preview/src/cards/PersonCard.tsx:55`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 55-66 (`</Card.Row>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-93 late-capability-read-via-atom `packages/plugins/plugin-registry/src/capabilities/index.ts:20`

System One judges this a likely violation of `late-capability-read-via-atom` (Read a capability that arrives later through its atom, not by gating activation on another plugin's event), p=0.87. The likeliest place is lines 20-41 (`export const PrivateRegistry = Capability.lazyModule(`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-94 atom-lifetime-bound-to-owner `packages/plugins/plugin-registry/src/filter.ts:1`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.89. The likeliest place is lines 1-12 (`import * as Atom from 'effect/reactivity/Atom';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-95 one-operation-per-navigation-intent `packages/plugins/plugin-registry/src/operations/open-plugin-registry.ts:17`

System One judges this a likely violation of `one-operation-per-navigation-intent` (One operation call carries a navigation intent; don't chain operations that race), p=0.86. The likeliest place is lines 17-28 (`const handler: Operation.WithHandler<typeof SettingsOperation.OpenPluginRegis...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-96 no-try-catch-in-effect-code `packages/plugins/plugin-review/src/capabilities/agent-runner.ts:140`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 140-150 (`} catch (err) {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-97 no-casts `packages/plugins/plugin-review/src/capabilities/agent-runner.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 248-259 (`const original = (target.text as unknown as { content: string }).content ?? '';`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-98 barrel-imports-not-internal-paths `packages/plugins/plugin-review/src/operations/add-message.ts:13`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.81. The likeliest place is lines 13-21 (`import * as ObservabilityOperation from '@dxos/plugin-observability/Observabi...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-99 no-try-catch-in-effect-code `packages/plugins/plugin-review/src/operations/create.ts:59`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 59-70 (`yield* Operation.invoke(CommentOperation.AddMessage, { subject, anchor, sende...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-100 no-casts `packages/plugins/plugin-review/src/should-trigger-agent.test.ts:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 14-20 (`const makeMessage = (role: 'user' | 'assistant' | undefined, text: string): M...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-101 no-casts `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 86-97 (`export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticlePro...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-102 setter-must-not-own-transaction `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:158`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.80. The likeliest place is lines 158-169 (`Obj.update(subject, (subject) => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-103 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:302`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 302-313 (`}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-104 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:470`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 470-481 (`onRemove={handleRemoveTrack}`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-105 reactive-state-via-atom-bridge `packages/plugins/plugin-sheet/src/components/SheetContent/util.ts:155`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 155-166 (`const handleCellsUpdate = () => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-106 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/containers/SheetArticle/SheetArticle.stories.tsx:85`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 85-96 (`export const Spec = () => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-107 namespace-brand-key-prefixing `packages/plugins/plugin-sheet/src/types/SheetRange.ts:1`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.89. The likeliest place is lines 1-22 (`import { addressFromA1Notation, addressToA1Notation, rangeFromA1Notation } fr...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-108 capability-module-layout `packages/plugins/plugin-slack/src/capabilities/channel-backend.ts:35`

System One judges this a likely violation of `capability-module-layout` (A capability is defined inline in its contribute call, in a module named after its directory), p=0.81. The likeliest place is lines 35-46 (`export const slackChannelBackend: ThreadCapabilities.ChannelBackendProvider = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-109 capability-module-layout `packages/plugins/plugin-space/src/capabilities/default-parent.ts:20`

System One judges this a likely violation of `capability-module-layout` (A capability is defined inline in its contribute call, in a module named after its directory), p=0.80. The likeliest place is lines 20-31 (`export const rootCollectionRule: AppCapabilities.DefaultParent = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-110 typename-via-schema-not-string `packages/plugins/plugin-space/src/capabilities/repair.ts:26`

System One judges this a likely violation of `typename-via-schema-not-string` (Refer to a type's typename through its schema, never a string literal), p=0.84. The likeliest place is lines 26-37 (`const removeQueryCollections = async (space: Space) => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-111 retries-via-schedule-with-evidence `packages/plugins/plugin-space/src/capabilities/spaces-available.ts:131`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.87. The likeliest place is lines 131-142 (`}`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-112 retries-via-schedule-with-evidence `packages/plugins/plugin-space/src/commands/space/join/join.ts:70`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.92. The likeliest place is lines 70-81 (`for (let i = 0; i < maxRetries; i++) {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-113 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:130`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.84. The likeliest place is lines 130-141 (`const useCollectionItems = (collection: Collection.Collection, attendableId?:...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-114 retries-via-schedule-with-evidence `packages/plugins/plugin-stream-deck/src/bridge/StreamDeckBridge.ts:150`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.84. The likeliest place is lines 150-161 (`this.#timer = setTimeout(() => this.#connect(), this.#backoff);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-115 constants-not-nullary-factories `packages/plugins/plugin-wnfs/src/helpers/common.ts:62`

System One judges this a likely violation of `constants-not-nullary-factories` (Export a fixed value as a constant, not a zero-argument function), p=0.88. The likeliest place is lines 62-67 (`export const storeName = () => 'dxos/wnfs';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-116 workaround-is-documented-and-removable `packages/sdk/app-framework/src/vite-plugin/composer/index.ts:88`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.80. The likeliest place is lines 88-99 (`const REQUIRE_SHIM_BANNER = [`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-117 typename-via-schema-not-string `packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:67`

System One judges this a likely violation of `typename-via-schema-not-string` (Refer to a type's typename through its schema, never a string literal), p=0.80. The likeliest place is lines 67-78 (`.map((space) => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-118 retries-via-schedule-with-evidence `packages/sdk/client-services/src/internal/invitations/invitations-handler.ts:584`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.83. The likeliest place is lines 584-595 (`extension: InvitationGuestExtension,`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-119 retries-via-schedule-with-evidence `packages/sdk/client-services/src/internal/spaces/data-space.ts:535`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.80. The likeliest place is lines 535-558 (`this._echoHost.loadDoc<DatabaseDirectory>(this._ctx, rootUrl, {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-120 vendor-code-in-vendor-extension `packages/sdk/observability/src/extensions/posthog/llm-analytics.ts:59`

System One judges this a likely violation of `vendor-code-in-vendor-extension` (Vendor-specific mapping lives in the vendor's extension, not a generic package), p=0.88. The likeliest place is lines 59-73 (`$ai_cache_read_input_tokens: inference.cacheReadTokens,`, location confidence 0.22). Judged with added `package` context after a first pass of 0.74. This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-121 vendor-code-in-vendor-extension `packages/sdk/observability/src/extensions/posthog/log-processor.ts:58`

System One judges this a likely violation of `vendor-code-in-vendor-extension` (Vendor-specific mapping lives in the vendor's extension, not a generic package), p=0.82. The likeliest place is lines 58-66 (`posthog.captureException(capturedError, additionalProperties);`, location confidence 0.80). Judged with added `package` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-122 retries-via-schedule-with-evidence `packages/stories/stories-brain/src/testing/harness/internal/embeddings.ts:28`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.83. The likeliest place is lines 28-39 (`export const embedText = async (text: string): Promise<number[]> => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-123 no-eager-read-before-subscribe `packages/ui/react-ui-attention/src/types/Attention.ts:66`

System One judges this a likely violation of `no-eager-read-before-subscribe` (Don't read an atom just before subscribing to force it to build), p=0.92. The likeliest place is lines 66-77 (`const atom = this.#getAtom(id);`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-124 named-react-imports `packages/ui/react-ui-canvas/src/components/FrameHeader/FrameHeader.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-15 (`import React from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-125 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/FrameHeader/FrameHeader.tsx:48`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 48-59 (`<div className='relative w-full shrink-0 bg-base-surface' data-testid='frame-...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-126 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/Layers/Layers.tsx:159`

System One judges this a likely violation of `key-chords-live-in-the-table` (Every chord is a KEY_BINDINGS entry, matched and labelled from it), p=0.85. The likeliest place is lines 159-170 (`const content = (`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-127 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:169`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 169-180 (`<div key={group.name} className='flex flex-col p-1'>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-128 named-react-imports `packages/ui/react-ui-canvas/src/components/Properties/FontField.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-17 (`import React from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-129 named-react-imports `packages/ui/react-ui-canvas/src/components/Properties/LineStyleField.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.96. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-130 story-for-new-ui-component `packages/ui/react-ui-canvas/src/components/Properties/LineStyleField.tsx:22`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 22-33 (`export const LineStyleField: FormFieldRenderer = ({ jsonPath, label, readonly...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-131 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas/src/components/Properties/Properties.stories.tsx:67`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 67-76 (`return (`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-132 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:22`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 22-33 (`const DefaultStory = ({ indeterminate, readonly, theme: initialTheme }: Story...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-133 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.stories.tsx:22`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 22-33 (`const DefaultStory = ({ indeterminate, readonly, theme: initialTheme }: Story...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-134 named-react-imports `packages/ui/react-ui-canvas/src/components/Properties/StyleGrid.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.96. The likeliest place is lines 1-12 (`import React from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-135 intents-not-coordinates `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:1224`

System One judges this a likely violation of `intents-not-coordinates` (The surface emits intents; only a projection writes coordinates), p=0.82. The likeliest place is lines 1224-1247 (`displayScene: reduceIntent(scene, { kind: 'update', id: drag.id, values: { po...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-136 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:1272`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 1272-1295 (`const linkHoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-137 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:53`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 53-56 (`</div>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-138 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:57`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 57-66 (`const meta: Meta = {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-139 atom-lifetime-bound-to-owner `packages/ui/react-ui-canvas/src/model/animate.ts:45`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.87. The likeliest place is lines 45-59 (`export const animate = (base: Projection, options: AnimateOptions): Projectio...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-140 no-module-level-object-caches `packages/ui/react-ui-canvas/src/model/timeline.ts:343`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.90. The likeliest place is lines 343-348 (`const sampled = new WeakMap<Scene, { t: number; scene: Scene }>();`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-141 no-styling-wrapper-divs `packages/ui/react-ui-dashboard/src/Dashboard.tsx:292`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 292-303 (`return (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-142 no-casts `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:90`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 90-99 (`const BoardColumnRoot = BoardColumnRootInner as <TColumn = unknown>(`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-143 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:282`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 282-293 (`<BoardColumnBody data={data} eventHandler={eventHandler} debug={debugHandler}...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-144 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:113`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 113-124 (`</Card.Row>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-145 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:383`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 383-394 (`const MosaicVirtualStack = MosaicVirtualStackInner as <TData = any>(`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-146 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-plot/src/components/Plot/Plot.stories.tsx:14`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 14-28 (`const data = toPlotData(`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-147 extract-non-rendering-logic-from-component `packages/ui/react-ui-plot/src/components/Plot/Plot.tsx:58`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 58-69 (`let plot = createPlot(datums, options, { width, height, label });`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-148 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:361`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 361-374 (`ref={windowRef}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-149 comment-hygiene `packages/ui/react-ui/src/components/AlertDialog/AlertDialog.stories.tsx:132`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 132-143 (`await waitFor(() => expect(body.queryByRole('alertdialog')).toBeNull());`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-150 no-sleep-in-test `packages/ui/react-ui/src/components/AlertDialog/AlertDialog.test.tsx:23`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 23-37 (`<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-151 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Avatar/Avatar.stories.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 28-39 (`const DefaultStory = ({ size, variant, status, hue, hueVariant, fallback }: S...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-152 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Avatar/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Avatar from './Avatar.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-153 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Banner/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Banner from './Banner.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-154 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Card/Card.stories.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 96-107 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-155 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Carousel/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as Carousel from './Carousel.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-156 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/components/Combobox/Combobox.tsx:138`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 138-161 (`return undefined;`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-157 comment-hygiene `packages/ui/react-ui/src/components/DateInput/DateInput.stories.tsx:216`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 216-227 (`let calendar = await openCalendar(canvasElement, `date-${size}`);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-158 comment-hygiene `packages/ui/react-ui/src/components/Dialog/Dialog.stories.tsx:114`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 114-120 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => (`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-159 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Dialog/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as Dialog from './Dialog.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-160 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/DragHandle/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as DragHandle from './DragHandle.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-161 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Editable/Editable.stories.tsx:200`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 200-211 (`return (`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-162 no-styling-wrapper-divs `packages/ui/react-ui/src/components/ErrorFallback/ErrorFallback.stories.tsx:36`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 36-42 (`const DefaultStory = ({ title, message }: StoryArgs) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-163 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/ErrorFallback/ErrorFallback.stories.tsx:43`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 43-58 (`const meta = {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-164 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/FloatingPanel/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as FloatingPanel from './FloatingPanel.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-165 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/HoverCard/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as HoverCard from './HoverCard.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-166 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Image/Image.stories.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 44-55 (`const DefaultStory = ({ size }: SizeArgs) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-167 story-for-new-ui-component `packages/ui/react-ui/src/components/Label/Label.tsx:15`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.85. The likeliest place is lines 15-26 (`export const Label = composable<HTMLLabelElement, LabelProps>(({ children, sr...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-168 event-handler-naming-convention `packages/ui/react-ui/src/components/Main/Main.tsx:532`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 532-543 (`const handleHandleKeyDown = useCallback(`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-169 no-styling-wrapper-divs `packages/ui/react-ui/src/components/MediaPlayer/MediaPlayer.stories.tsx:21`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 21-32 (`const DefaultStory = ({ fit, controls, muted, loop }: StoryArgs) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-170 no-lint-suppression-to-pass `packages/ui/react-ui/src/components/Menu/Menu.test.tsx:11`

System One judges this a likely violation of `no-lint-suppression-to-pass` (Don't add a lint-disable comment to get past a rule; fix what it points at), p=0.84. The likeliest place is lines 11-22 (`describe('Menu', () => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-171 comment-hygiene `packages/ui/react-ui/src/components/Panel/Panel.tsx:38`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 38-49 (`const PanelRoot = slottable<HTMLDivElement, PanelRootProps>(`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-172 no-styling-wrapper-divs `packages/ui/react-ui/src/components/PasswordInput/PasswordInput.stories.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 98-107 (`const BlurStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-173 comment-hygiene `packages/ui/react-ui/src/components/Popover/Popover.stories.tsx:117`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 117-123 (`};`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-174 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Progress/Progress.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 18-27 (`const DefaultStory = ({ value, indeterminate, error, countdown, paused }: Sto...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-175 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Progress/Progress.stories.tsx:28`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 28-46 (`const meta = {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-176 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/QrCode/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as QrCode from './QrCode.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-177 no-styling-wrapper-divs `packages/ui/react-ui/src/components/QrCode/QrCode.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 16-25 (`const DefaultStory = ({ value, errorCorrection, icon }: StoryArgs) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-178 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/ScrollArea/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as ScrollArea from './ScrollArea.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-179 story-for-new-ui-component `packages/ui/react-ui/src/components/ScrollArea/PopupScroll.tsx:99`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.81. The likeliest place is lines 99-105 (`export const PopupScroll = ({ size, classNames, children, outside }: PopupScr...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-180 no-styling-wrapper-divs `packages/ui/react-ui/src/components/ScrollArea/ScrollArea.stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 45-56 (`const Pane = ({ prefix, mode, width, native }: PaneProps) => (`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-181 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/ScrollContainer/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-6 (`export * as ScrollContainer from './ScrollContainer.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-182 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Skeleton/Skeleton.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 18-30 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-183 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Steps/Steps.stories.tsx:64`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 64-75 (`const TestStory = ({ size }: StoryArgs) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-184 no-styling-wrapper-divs `packages/ui/react-ui/src/components/TextCrawl/TextCrawl.stories.tsx:43`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 43-54 (`<Button onClick={() => setLines((lines) => [...lines, `[${lines.length + 1}] ...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-185 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/components/TextCrawl/TextCrawl.tsx:117`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 117-128 (`const settled = paintedRef.current;`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-186 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Timestamp/Timestamp.stories.tsx:34`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 34-45 (`const DefaultStory = ({ live }: StoryArgs) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-187 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/components/Timestamp/Timestamp.stories.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 53-67 (`const meta = {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-188 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Toast/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Toast from './Toast.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-189 no-styling-wrapper-divs `packages/ui/react-ui/src/components/Toast/Toast.stories.tsx:24`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 24-35 (`const DefaultStory = ({ size, duration, title, description }: StoryArgs) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-190 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/components/Toast/Toast.tsx:213`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 213-224 (`() => () => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-191 comment-hygiene `packages/ui/react-ui/src/components/Tooltip/Tooltip.stories.tsx:114`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 114-125 (`const chip = content.getBoundingClientRect().height;`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-192 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Tour/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Tour from './Tour.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-193 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/components/Typography/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Typography from './Typography.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-194 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/focus.stories.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 50-61 (`const Column = ({ items }: { items: string[] }) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-195 no-styling-wrapper-divs `packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 78-84 (`const Host = ({ width, children }: PropsWithChildren<Pick<StoryArgs, 'width'>...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-196 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 78-84 (`const Host = ({ width, children }: PropsWithChildren<Pick<StoryArgs, 'width'>...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a3f02a32-197 no-casts `packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 108-119 (`const ScrollToolbar = ({`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-198 event-handler-naming-convention `packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:108`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 108-119 (`const ScrollToolbar = ({`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-199 no-styling-wrapper-divs `packages/ui/react-ui/src/flow/Show.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 16-30 (`const ShowStory = () => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-200 namespace-export-with-internal-hiding `packages/ui/react-ui/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 1-11 (`export * from './flow/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-201 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/Playground.stories.tsx:539`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 539-565 (`const SkeletonSection = () => (`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-202 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/components.stories.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 101-108 (`const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-203 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/Loading.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 30-41 (`<div`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-204 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 45-56 (`export const withSizes =`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-205 workaround-is-documented-and-removable `packages/ui/react-ui/src/util/mobile.ts:8`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.80. The likeliest place is lines 8-12 (`export const hasIosKeyboard = () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-206 no-sleep-in-test `packages/ui/ui-editor/src/extensions/state/selection.test.ts:45`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.97. The likeliest place is lines 45-56 (`describe('selectionState', () => {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-207 no-styling-wrapper-divs `packages/ui/ui-theme/src/Theme.stories.tsx:109`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 109-122 (`export const Styles = {`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN a3f02a32-208 workaround-is-documented-and-removable `packages/ui/ui/src/device.ts:5`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.80. The likeliest place is lines 5-9 (`export const hasIosKeyboard = () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `4ba42e6a27fd63b2e44cb49af9bd6e8313e33eab`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 208 violations written to fragments, 2665 uncertain, 20722 clean, 53 unanswered
- left for an agentic reviewer: 267 batch(es)

```text
requests: 12576 (1939 verdicts re-asked with context the model requested)
estimated input tokens: 80803261
failed requests: 319 (their pairs are listed as unanswered)
billed input tokens: 71328139 (cost $2.9958)
measured chars per token: 3.10
```

- Fixes attempted: `named-react-imports` findings 124, 128, 129, 134 are false positives. The package compiles with `jsx: react`, so `import React from 'react'` supplies the JSX factory (removing it raised TS2686). They are marked ignored.
- The 267 follow-up batches for uncertain pairs and `system-one: off` rules were not run; 53 pairs were unanswered after `max_tokens_exceeded` failures.
