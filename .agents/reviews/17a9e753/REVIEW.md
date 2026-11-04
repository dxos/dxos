---
branch: dm/pensive-shannon-rr8de0
commit: 17a9e753e0984a78ecdaf1d3e4402dbbcc868cc3
base: f8fc57941c4eccb77c735b4aa4ff87df8e2cba18
mode: default
createdAt: 2026-10-26T02:06:12.631Z
isFinalized: true
groups: 159
rules: [atom-family-keys, atom-lifetime-bound-to-owner, barrel-imports-not-internal-paths, call-effect-api-not-promise-bridge, comment-hygiene, consistent-file-naming-within-folder, container-story-with-fixtures, containers-share-core-hooks, diagram-links-are-smart, effect-fn-not-hand-wrapped-gen, empty-container-uses-empty, extract-non-rendering-logic-from-component, import-as-namespace-is-all-or-nothing, layout-only-wrapper-invisible-to-a11y, leaf-objects-render-as-cards, leaf-owns-its-subscription, minimal-precise-tests, name-for-general-behavior, named-durations-and-budgets, namespace-export-with-internal-hiding, no-hand-rolled-lists, no-impossible-state-handling, no-invented-theme-tokens, no-pointless-indirection, no-premature-abstraction, no-silent-storage-fallback, no-styling-wrapper-divs, no-swallowed-assertions-in-e2e-helpers, no-unused-new-api, object-fields-render-as-form, one-changeset-per-pr, operations-take-refs-not-ids, prefer-branded-types-over-raw-primitives, query-capability-extends-filter-query-dsl, state-owned-once, subscribe-where-you-read, test-at-owning-package, todo-has-owner, toolbars-are-menu-actions]
reviewId: 17a9e753
---

_2 error(s), 116 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 17a9e753-1 - ignored - one-changeset-per-pr - .changeset/review-comment-agent-mode.md:1
- 17a9e753-2 - unresolved - todo-has-owner - packages/apps/tasks/src/App.tsx:43
- 17a9e753-3 - unresolved - todo-has-owner - packages/common/debug/src/inspect-custom.ts:17
- 17a9e753-4 - unresolved - todo-has-owner - packages/common/esbuild-plugins/src/node-globals-polyfill-plugin.ts:15
- 17a9e753-5 - unresolved - todo-has-owner - packages/core/compute/compute-runtime/src/url.ts:8
- 17a9e753-6 - unresolved - todo-has-owner - packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:88
- 17a9e753-7 - unresolved - todo-has-owner - packages/core/compute/pipeline-transcription/src/stages/diarization.ts:22
- 17a9e753-8 - unresolved - todo-has-owner - packages/core/compute/pipeline-transcription/src/stages/extraction.ts:70
- 17a9e753-9 - unresolved - todo-has-owner - packages/core/compute/pipeline-transcription/src/stages/summarization.ts:30
- 17a9e753-10 - unresolved - todo-has-owner - packages/core/compute/pipeline-transcription/src/stages/translation.ts:24
- 17a9e753-11 - unresolved - todo-has-owner - packages/core/echo/echo-solid/src/useType.test.tsx:97
- 17a9e753-12 - unresolved - todo-has-owner - packages/core/echo/index-core/src/indexes/reverse-ref-index.ts:63
- 17a9e753-13 - unresolved - todo-has-owner - packages/core/mesh/edge-client/src/auth.ts:80
- 17a9e753-14 - unresolved - todo-has-owner - packages/core/mesh/network-manager/src/transport/webrtc/rtc-peer-connection.ts:31
- 17a9e753-15 - unresolved - todo-has-owner - packages/core/mesh/teleport-extension-replicator/src/replicator-extension.test.ts:133
- 17a9e753-16 - unresolved - todo-has-owner - packages/core/mesh/teleport/src/control-extension.ts:146
- 17a9e753-17 - unresolved - todo-has-owner - packages/core/mesh/websocket-rpc/src/token-auth.ts:16
- 17a9e753-18 - unresolved - todo-has-owner - packages/devtools/devtools-extension/src/playwright/playwright.config.ts:5
- 17a9e753-19 - unresolved - todo-has-owner - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:38
- 17a9e753-20 - unresolved - no-swallowed-assertions-in-e2e-helpers - packages/e2e/composer-e2e/src/playwright/app-manager.ts:895
- 17a9e753-21 - unresolved - container-story-with-fixtures - packages/plugins/plugin-agent/src/components/AgentKnowledge/AgentKnowledge.stories.tsx:38
- 17a9e753-22 - unresolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/comment-agent-runner.ts:29:7
- 17a9e753-23 - unresolved - call-effect-api-not-promise-bridge - packages/plugins/plugin-assistant/src/capabilities/comment-agent-runner.ts:36
- 17a9e753-24 - unresolved - call-effect-api-not-promise-bridge - packages/plugins/plugin-assistant/src/capabilities/comment-agent-runner.ts:38
- 17a9e753-25 - unresolved - empty-container-uses-empty - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:83
- 17a9e753-26 - unresolved - diagram-links-are-smart - packages/plugins/plugin-code-graph/src/components/CodeGraphCanvas/CodeGraphCanvas.tsx:152
- 17a9e753-27 - unresolved - empty-container-uses-empty - packages/plugins/plugin-code-graph/src/containers/CodeGraphArticle/CodeGraphArticle.tsx:240
- 17a9e753-28 - unresolved - empty-container-uses-empty - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:34
- 17a9e753-29 - unresolved - empty-container-uses-empty - packages/plugins/plugin-deck/src/components/Companion/Companion.tsx:101
- 17a9e753-30 - unresolved - no-hand-rolled-lists - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:142
- 17a9e753-31 - unresolved - todo-has-owner - packages/plugins/plugin-file-system/src/util.ts:47
- 17a9e753-32 - unresolved - todo-has-owner - packages/plugins/plugin-freeq/src/capabilities/channel-backend.ts:160
- 17a9e753-33 - unresolved - toolbars-are-menu-actions - packages/plugins/plugin-github/src/containers/PullRequestsArticle/PullRequestsArticle.tsx:146
- 17a9e753-34 - unresolved - atom-lifetime-bound-to-owner - packages/plugins/plugin-illustrator/src/capabilities/refit-state.ts:14
- 17a9e753-35 - unresolved - state-owned-once - packages/plugins/plugin-illustrator/src/capabilities/refit-state.ts:14
- 17a9e753-36 - unresolved - empty-container-uses-empty - packages/plugins/plugin-illustrator/src/containers/DrawingScores/DrawingScores.tsx:64
- 17a9e753-37 - unresolved - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-illustrator/src/skills/DrawingSkill.ts:1
- 17a9e753-38 - unresolved - no-impossible-state-handling - packages/plugins/plugin-illustrator/src/util/refit.ts:16
- 17a9e753-39 - unresolved - containers-share-core-hooks - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:290:7
- 17a9e753-40 - unresolved - empty-container-uses-empty - packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:472
- 17a9e753-41 - unresolved - empty-container-uses-empty - packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineArticle.tsx:116
- 17a9e753-42 - unresolved - todo-has-owner - packages/plugins/plugin-magazine/src/testing/builder.ts:51
- 17a9e753-43 - unresolved - todo-has-owner - packages/plugins/plugin-magazine/src/types/Subscription.ts:15
- 17a9e753-44 - unresolved - atom-family-keys - packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:35
- 17a9e753-45 - unresolved - todo-has-owner - packages/plugins/plugin-observability/src/translations.ts:21
- 17a9e753-46 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/Deck/Deck.tsx:418
- 17a9e753-47 - unresolved - no-invented-theme-tokens - packages/plugins/plugin-presenter/src/components/Pager/Pager.tsx:28
- 17a9e753-48 - unresolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-presenter/src/components/PresentationShell/PresentationShell.tsx:51
- 17a9e753-49 - unresolved - no-pointless-indirection - packages/plugins/plugin-presenter/src/components/Slide/canvas.tsx:40
- 17a9e753-50 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/SlideGrid/SlideGrid.tsx:117
- 17a9e753-51 - unresolved - no-invented-theme-tokens - packages/plugins/plugin-presenter/src/components/SlideGrid/SlideGrid.tsx:122
- 17a9e753-52 - unresolved - leaf-objects-render-as-cards - packages/plugins/plugin-presenter/src/components/SlideGrid/SlideGrid.tsx:158:7
- 17a9e753-53 - unresolved - subscribe-where-you-read - packages/plugins/plugin-presenter/src/components/SlideGrid/SlideGrid.tsx:201
- 17a9e753-54 - unresolved - toolbars-are-menu-actions - packages/plugins/plugin-presenter/src/containers/PresentationArticle/PresentationArticle.tsx:129
- 17a9e753-55 - unresolved - empty-container-uses-empty - packages/plugins/plugin-projects/src/components/MoveTaskPanel/MoveTaskPanel.tsx:44
- 17a9e753-56 - unresolved - object-fields-render-as-form - packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:367
- 17a9e753-57 - unresolved - empty-container-uses-empty - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:184
- 17a9e753-58 - unresolved - consistent-file-naming-within-folder - packages/plugins/plugin-review/src/components/CommentThread/CommentThread.stories.tsx:37:7
- 17a9e753-59 - unresolved - subscribe-where-you-read - packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:206
- 17a9e753-60 - unresolved - subscribe-where-you-read - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:493
- 17a9e753-61 - unresolved - layout-only-wrapper-invisible-to-a11y - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:503:7
- 17a9e753-62 - unresolved - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:567
- 17a9e753-63 - resolved - barrel-imports-not-internal-paths - packages/plugins/plugin-review/src/hooks/useThreadMessages.ts:11
- 17a9e753-64 - unresolved - no-unused-new-api - packages/plugins/plugin-review/src/hooks/useThreadMessages.ts:23
- 17a9e753-65 - unresolved - call-effect-api-not-promise-bridge - packages/plugins/plugin-review/src/operations/add-message.ts:97
- 17a9e753-66 - unresolved - call-effect-api-not-promise-bridge - packages/plugins/plugin-review/src/operations/delete-message.ts:33
- 17a9e753-67 - resolved - barrel-imports-not-internal-paths - packages/plugins/plugin-review/src/operations/respond-to-thread.ts:18
- 17a9e753-68 - unresolved - call-effect-api-not-promise-bridge - packages/plugins/plugin-review/src/operations/respond-to-thread.ts:42
- 17a9e753-69 - unresolved - call-effect-api-not-promise-bridge - packages/plugins/plugin-review/src/operations/respond-to-thread.ts:49
- 17a9e753-70 - unresolved - call-effect-api-not-promise-bridge - packages/plugins/plugin-review/src/operations/restore-message.ts:24
- 17a9e753-71 - unresolved - test-at-owning-package - packages/plugins/plugin-review/src/thread-feed.test.ts:19:3
- 17a9e753-72 - unresolved - minimal-precise-tests - packages/plugins/plugin-review/src/thread-feed.test.ts:61
- 17a9e753-73 - unresolved - operations-take-refs-not-ids - packages/plugins/plugin-review/src/types/CommentOperation.ts:183
- 17a9e753-74 - unresolved - empty-container-uses-empty - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:36
- 17a9e753-75 - unresolved - empty-container-uses-empty - packages/plugins/plugin-sheet/src/components/ChartCompanion/ChartCompanion.tsx:187
- 17a9e753-76 - unresolved - empty-container-uses-empty - packages/plugins/plugin-space/src/containers/SchemaContainer/SchemaContainer.tsx:33
- 17a9e753-77 - unresolved - empty-container-uses-empty - packages/plugins/plugin-studio/src/components/VariantGallery/VariantGallery.tsx:71
- 17a9e753-78 - unresolved - empty-container-uses-empty - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:158
- 17a9e753-79 - unresolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.tsx:41
- 17a9e753-80 - unresolved - no-silent-storage-fallback - packages/sdk/app-framework/src/plugin-process-manager/idb-key-value-store.ts:22
- 17a9e753-81 - unresolved - todo-has-owner - packages/sdk/app-framework/src/vite-plugin/import-map/index.ts:375
- 17a9e753-82 - unresolved - todo-has-owner - packages/sdk/client-e2e/src/invitations.test.ts:472
- 17a9e753-83 - unresolved - todo-has-owner - packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:101
- 17a9e753-84 - unresolved - todo-has-owner - packages/sdk/client-services/src/internal/identity/identity-manager.ts:591
- 17a9e753-85 - unresolved - todo-has-owner - packages/sdk/client-services/src/internal/identity/identity-manager.ts:592
- 17a9e753-86 - unresolved - todo-has-owner - packages/sdk/client-services/src/internal/invitations/invitations-handler.ts:93
- 17a9e753-87 - unresolved - todo-has-owner - packages/sdk/client-services/src/internal/metadata/metadata-store.ts:433
- 17a9e753-88 - unresolved - todo-has-owner - packages/sdk/client-services/src/internal/services/network-lifecycle.ts:163
- 17a9e753-89 - unresolved - todo-has-owner - packages/sdk/client-services/src/internal/space/space-protocol.browser.test.ts:87
- 17a9e753-90 - unresolved - todo-has-owner - packages/sdk/client-services/src/Replication.ts:61
- 17a9e753-91 - unresolved - todo-has-owner - packages/sdk/client/src/services/agent-hosting-provider.ts:41
- 17a9e753-92 - unresolved - todo-has-owner - packages/sdk/client/src/services/agent-hosting-provider.ts:53
- 17a9e753-93 - unresolved - todo-has-owner - packages/sdk/client/src/services/agent-hosting-provider.ts:107
- 17a9e753-94 - unresolved - todo-has-owner - packages/sdk/client/src/services/agent-hosting-provider.ts:173
- 17a9e753-95 - unresolved - todo-has-owner - packages/sdk/client/src/services/agent-hosting-provider.ts:427
- 17a9e753-96 - unresolved - todo-has-owner - packages/sdk/examples/src/playwright/basic.spec.ts:74
- 17a9e753-97 - unresolved - todo-has-owner - packages/sdk/examples/src/playwright/playwright.config.ts:5
- 17a9e753-98 - unresolved - todo-has-owner - packages/sdk/observability/src/extensions/otel/metrics.ts:91
- 17a9e753-99 - unresolved - todo-has-owner - packages/sdk/observability/src/extensions/otel/metrics.ts:118
- 17a9e753-100 - unresolved - query-capability-extends-filter-query-dsl - packages/sdk/types/src/types/Thread.ts:74
- 17a9e753-101 - resolved - comment-hygiene - packages/stories/stories-agent/src/stories/CommentAgent.stories.tsx:298
- 17a9e753-102 - resolved - comment-hygiene - packages/stories/stories-agent/src/stories/DiscordPipeline.stories.tsx:55
- 17a9e753-103 - unresolved - effect-fn-not-hand-wrapped-gen - packages/stories/stories-agent/src/testing/fake-comment-agent.ts:23:5
- 17a9e753-104 - unresolved - call-effect-api-not-promise-bridge - packages/stories/stories-agent/src/testing/fake-comment-agent.ts:30
- 17a9e753-105 - unresolved - name-for-general-behavior - packages/stories/stories-agent/src/testing/story-settings.ts:45:14
- 17a9e753-106 - unresolved - namespace-export-with-internal-hiding - packages/stories/storybook-testing/src/index.ts:10
- 17a9e753-107 - unresolved - no-silent-storage-fallback - packages/ui/react-ui-attention/src/core/backends.ts:44
- 17a9e753-108 - unresolved - diagram-links-are-smart - packages/ui/react-ui-canvas-compute/src/scene/scene.ts:33
- 17a9e753-109 - unresolved - containers-share-core-hooks - packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:497:5
- 17a9e753-110 - unresolved - containers-share-core-hooks - packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:220:7
- 17a9e753-111 - unresolved - subscribe-where-you-read - packages/ui/react-ui-thread/src/Message/Message.tsx:182
- 17a9e753-112 - unresolved - leaf-owns-its-subscription - packages/ui/react-ui-thread/src/Message/Message.tsx:182
- 17a9e753-113 - unresolved - prefer-branded-types-over-raw-primitives - packages/ui/react-ui-thread/src/types.ts:52
- 17a9e753-114 - unresolved - no-unused-new-api - packages/ui/react-ui/src/components/Timestamp/Timestamp.tsx:58
- 17a9e753-115 - unresolved - no-premature-abstraction - packages/ui/react-ui/src/components/Timestamp/Timestamp.tsx:58
- 17a9e753-116 - unresolved - named-durations-and-budgets - packages/ui/react-ui/src/util/format-time.ts:110
- 17a9e753-117 - unresolved - named-durations-and-budgets - packages/ui/react-ui/src/util/format-time.ts:177
- 17a9e753-118 - unresolved - todo-has-owner - packages/ui/solid-ui-geo/src/components/Globe/Globe.tsx:166

## Issues

# WARN 17a9e753-1 one-changeset-per-pr `.changeset/review-comment-agent-mode.md:1`

This PR adds two new changesets (`listbox-tile-width.md` and `review-comment-agent-mode.md`), which fragments the release notes per `one-changeset-per-pr`. Merge them into a single changeset that summarizes the whole PR (union of the packages, one description).

# WARN 17a9e753-2 todo-has-owner `packages/apps/tasks/src/App.tsx:43`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-3 todo-has-owner `packages/common/debug/src/inspect-custom.ts:17`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-4 todo-has-owner `packages/common/esbuild-plugins/src/node-globals-polyfill-plugin.ts:15`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-5 todo-has-owner `packages/core/compute/compute-runtime/src/url.ts:8`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-6 todo-has-owner `packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:88`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-7 todo-has-owner `packages/core/compute/pipeline-transcription/src/stages/diarization.ts:22`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-8 todo-has-owner `packages/core/compute/pipeline-transcription/src/stages/extraction.ts:70`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-9 todo-has-owner `packages/core/compute/pipeline-transcription/src/stages/summarization.ts:30`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-10 todo-has-owner `packages/core/compute/pipeline-transcription/src/stages/translation.ts:24`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-11 todo-has-owner `packages/core/echo/echo-solid/src/useType.test.tsx:97`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-12 todo-has-owner `packages/core/echo/index-core/src/indexes/reverse-ref-index.ts:63`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-13 todo-has-owner `packages/core/mesh/edge-client/src/auth.ts:80`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-14 todo-has-owner `packages/core/mesh/network-manager/src/transport/webrtc/rtc-peer-connection.ts:31`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-15 todo-has-owner `packages/core/mesh/teleport-extension-replicator/src/replicator-extension.test.ts:133`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-16 todo-has-owner `packages/core/mesh/teleport/src/control-extension.ts:146`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-17 todo-has-owner `packages/core/mesh/websocket-rpc/src/token-auth.ts:16`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-18 todo-has-owner `packages/devtools/devtools-extension/src/playwright/playwright.config.ts:5`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-19 todo-has-owner `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:38`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-20 no-swallowed-assertions-in-e2e-helpers `packages/e2e/composer-e2e/src/playwright/app-manager.ts:895`

`closeCompanions` clicks the close control with `.catch(() => {})` and loops to retry, so a click that fails for a real reason (control stuck, covered) is swallowed until the final count check; this is the click-and-retry fallback the rule forbids. Fix: wrap the loop body in `expect(...).toPass()` or click only after the control is stable (web-first assertion on visibility/enabled), without swallowing the click error.

# WARN 17a9e753-21 container-story-with-fixtures `packages/plugins/plugin-agent/src/components/AgentKnowledge/AgentKnowledge.stories.tsx:38`

The container story builds its content from a handful of inline literals (facts f1-f4, goals g1-g2) rather than shared fixtures or a generator with long titles and many items (container-story-with-fixtures). Generate the knowledge from a fixture generator so overflow and empty cases show.

# WARN 17a9e753-22 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/comment-agent-runner.ts:29:7`

`run: ({ thread, subject, message }) => Effect.gen(function* () {...})` hand-wraps `Effect.gen` in an arrow. Define it as `run: Effect.fnUntraced(function* ({ thread, subject, message }) {...})` (or a named `Effect.fn` if a trace span is wanted), per the effect-fn-not-hand-wrapped-gen rule.

# WARN 17a9e753-23 call-effect-api-not-promise-bridge `packages/plugins/plugin-assistant/src/capabilities/comment-agent-runner.ts:36`

`Effect.promise(() => thread.feed.load())` bridges to the Promise form of a ref load; `Database.load(thread.feed)` is the Effect form with a typed error (rule call-effect-api-not-promise-bridge). Yield it directly.

# WARN 17a9e753-24 call-effect-api-not-promise-bridge `packages/plugins/plugin-assistant/src/capabilities/comment-agent-runner.ts:38`

`Effect.promise(() => db.query(...).run())` wraps the Promise query runner inside Effect code; use the Effect form (`Database.query(...)`/`yield*` the query) so errors stay typed (rule call-effect-api-not-promise-bridge).

# WARN 17a9e753-25 empty-container-uses-empty `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:83`

Hand-styled empty message (empty-container-uses-empty). Replace it with <Status.Empty classNames='dx-fill'>{t(...)}</Status.Empty> from @dxos/react-ui/Status so the empty state is uniform and announced as a status.

# WARN 17a9e753-26 diagram-links-are-smart `packages/plugins/plugin-code-graph/src/components/CodeGraphCanvas/CodeGraphCanvas.tsx:152`

`LAYOUT.link` is `{ type: 'curve' }` and is passed to `createDynamicProjection` as the dynamic layout's link options, so generated connectors run straight port to port and can cross cards. Use `type: 'smart'` per rule `diagram-links-are-smart`.

# WARN 17a9e753-27 empty-container-uses-empty `packages/plugins/plugin-code-graph/src/containers/CodeGraphArticle/CodeGraphArticle.tsx:240`

Hand-styled empty message (empty-container-uses-empty). Replace it with <Status.Empty classNames='dx-fill'>{t(...)}</Status.Empty> from @dxos/react-ui/Status so the empty state is uniform and announced as a status.

# WARN 17a9e753-28 empty-container-uses-empty `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:34`

Hand-styled empty message (empty-container-uses-empty). Replace it with <Status.Empty classNames='dx-fill'>{t(...)}</Status.Empty> from @dxos/react-ui/Status so the empty state is uniform and announced as a status. (diagnostics empty; the console empty at line 121 has the same issue)

# WARN 17a9e753-29 empty-container-uses-empty `packages/plugins/plugin-deck/src/components/Companion/Companion.tsx:101`

Hand-styled empty message (empty-container-uses-empty). Replace it with <Status.Empty classNames='dx-fill'>{t(...)}</Status.Empty> from @dxos/react-ui/Status so the empty state is uniform and announced as a status.

# WARN 17a9e753-30 no-hand-rolled-lists `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:142`

The pull-request list is a hand-rolled `<ul>` mapping `PullRow` `<li>` rows, re-implementing keyboard navigation and row rhythm (rule `no-hand-rolled-lists`). Render it with a non-selectable `Listbox` (`Listbox.Root`/`Viewport`/`Content`/`Item`) from `@dxos/react-ui-list` instead.

# WARN 17a9e753-31 todo-has-owner `packages/plugins/plugin-file-system/src/util.ts:47`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-32 todo-has-owner `packages/plugins/plugin-freeq/src/capabilities/channel-backend.ts:160`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-33 toolbars-are-menu-actions `packages/plugins/plugin-github/src/containers/PullRequestsArticle/PullRequestsArticle.tsx:146`

The container toolbar places a bare `Button.Root` (filter clear) beside the sort/group menus rather than composing menu actions, and never threads `attendableId` into the menu (it only drives `inactive`) (rule `toolbars-are-menu-actions`). Build the actions with `MenuBuilder`/`useMenuActions` and render via `Menu.Root` with `attendableId`.

# WARN 17a9e753-34 atom-lifetime-bound-to-owner `packages/plugins/plugin-illustrator/src/capabilities/refit-state.ts:14`

The Refit atom is pinned with `Atom.keepAlive`, so it never expires and the per-drawing refit counters it holds leak for the life of the registry (rule `atom-lifetime-bound-to-owner`). Drop `Atom.keepAlive` and let the registry's idle TTL expire it, or make it an owned atom (`AtomEx.owned`) tied to the capability's owner.

# WARN 17a9e753-35 state-owned-once `packages/plugins/plugin-illustrator/src/capabilities/refit-state.ts:14`

The `Refit` capability is a keepAlive side-table (`Record<canvasURI, number>`) holding a per-canvas refit counter that `requestRefit` bumps by id and `CanvasArticle` reads back by id; this state belongs to the canvas view that refits, not a module-level map keyed by entity id that never evicts entries (state-owned-once). Fix: have the owner of the canvas view hold the signal (e.g. an operation/event the mounted `CanvasArticle` subscribes to, or a field on the owning record), and delete the keyed side-table.

# WARN 17a9e753-36 empty-container-uses-empty `packages/plugins/plugin-illustrator/src/containers/DrawingScores/DrawingScores.tsx:64`

Hand-styled empty message (empty-container-uses-empty). Replace it with <Status.Empty classNames='dx-fill'>{t(...)}</Status.Empty> from @dxos/react-ui/Status so the empty state is uniform and announced as a status.

# WARN 17a9e753-37 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-illustrator/src/skills/DrawingSkill.ts:1`

The module is re-exported as a namespace (`export * as DrawingSkill from './DrawingSkill.ts'` in `skills/index.ts`) and consumed as `DrawingSkill.*`, but it carries no `// @import-as-namespace` directive under the copyright header. Add the directive so the module's directive, filename and barrel re-export agree (rule `import-as-namespace-is-all-or-nothing`); `DrawingSkill.test.ts` should likewise import the namespace rather than the member `semanticDiagrams`.

# WARN 17a9e753-38 no-impossible-state-handling `packages/plugins/plugin-illustrator/src/util/refit.ts:16`

`requestRefit` silently returns when the `Refit` capability is absent, yet `IllustratorPlugin` itself contributes it at startup (`RefitState`), so absence is an impossible state hidden as a no-op (and `CanvasArticle` mirrors it with `refitAtom ?? NO_REFITS`). Fix: require the capability with `Capability.get(IllustratorCapabilities.Refit)` (and `Hooks.useCapability` in the article) and drop the fallback branch and the `NO_REFITS` atom.

# WARN 17a9e753-39 containers-share-core-hooks `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:290:7`

ConversationStack calls `tile.scrollIntoView` and manages focus of a tile by hand with a ResizeObserver settle window. Scroll-to-item for a tile collection belongs to the shared container core (`useVisibleItems` / Mosaic `Container` scroll handling) per `containers-share-core-hooks`; extend that rather than re-implementing it here.

# WARN 17a9e753-40 empty-container-uses-empty `packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:472`

Hand-styled empty message (empty-container-uses-empty). Replace it with <Status.Empty classNames='dx-fill'>{t(...)}</Status.Empty> from @dxos/react-ui/Status so the empty state is uniform and announced as a status.

# WARN 17a9e753-41 empty-container-uses-empty `packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineArticle.tsx:116`

Hand-styled empty message (empty-container-uses-empty). Replace it with <Status.Empty classNames='dx-fill'>{t(...)}</Status.Empty> from @dxos/react-ui/Status so the empty state is uniform and announced as a status. Also resolves the TODO to factor out a common empty state.

# WARN 17a9e753-42 todo-has-owner `packages/plugins/plugin-magazine/src/testing/builder.ts:51`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-43 todo-has-owner `packages/plugins/plugin-magazine/src/types/Subscription.ts:15`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-44 atom-family-keys `packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts:35`

`activeMeetingFamily`, `activeMeetingOrPlaceholderFamily` and `transcriptionManagerFamily` are keyed by a live `MeetingStateStore` (a plain object with a `state` getter and an atom) that has no `[Hash.symbol]`/`[Equal.symbol]`, so the default structural key walks its getters. Key by reference as `Identity.atom` and `fromObservable` do (`Equal.byReferenceUnsafe(store)`), or key by a stable id, per the atom-family-keys rule.

# WARN 17a9e753-45 todo-has-owner `packages/plugins/plugin-observability/src/translations.ts:21`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-46 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/Deck/Deck.tsx:418`

The overlay `<div>` is a hand-rolled flex box (`flex items-center gap-4`). Express the layout with `Layout.Flex` (`align='center'`, `gap='md'`, `asChild` if needed) and keep only the absolute positioning in classes, per rule `no-styling-wrapper-divs`.

# WARN 17a9e753-47 no-invented-theme-tokens `packages/plugins/plugin-presenter/src/components/Pager/Pager.tsx:28`

`text-description` is not a theme token (no `--color-description` in the theme CSS), so it generates no CSS. Use `text-fg-muted` per rule `no-invented-theme-tokens`. Same at lines 87 and 109.

# WARN 17a9e753-48 extract-non-rendering-logic-from-component `packages/plugins/plugin-presenter/src/components/PresentationShell/PresentationShell.tsx:51`

The fade-in `useEffect` inlines a resource lifecycle (ResizeObserver, settle timer and cap timer, with their cleanup) in the component body, which should only render. Per `extract-non-rendering-logic-from-component`, extract a named hook such as `useSettledSize(ref, { enabled: fullscreen })` returning `visible`, as `SlideCanvas` did with `useContainerSize`.

# WARN 17a9e753-49 no-pointless-indirection `packages/plugins/plugin-presenter/src/components/Slide/canvas.tsx:40`

`mx('dx-expand absolute')` runs a single static class string through the class-merging helper with nothing to merge (no-pointless-indirection). Fix: use `className='dx-expand absolute'` directly.

# WARN 17a9e753-50 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/SlideGrid/SlideGrid.tsx:117`

Hand-rolled `<div className='flex flex-col p-1 gap-1'>`. Use `Layout.Flex column gap='xs'` (with padding via a primitive or `asChild`) per rule `no-styling-wrapper-divs`; `gap-1` is also a Tailwind number rather than a ramp step.

# WARN 17a9e753-51 no-invented-theme-tokens `packages/plugins/plugin-presenter/src/components/SlideGrid/SlideGrid.tsx:122`

`text-description` is not a theme token and produces no CSS. Use `text-fg-muted` per rule `no-invented-theme-tokens`.

# WARN 17a9e753-52 leaf-objects-render-as-cards `packages/plugins/plugin-presenter/src/components/SlideGrid/SlideGrid.tsx:158:7`

`SlideTile` renders each slide as a bespoke `Listbox.Item` with a hand-built bordered thumbnail `div` and caption, with no icon/title/menu frame. Render each leaf with `Card.Root` + `Card.Header` (icon, `Card.Title`, `Card.Menu`) and `Card.Body` content, or `CardTile.Root` + `CardTile.Header` inside a Mosaic container, per `leaf-objects-render-as-cards`.

# WARN 17a9e753-53 subscribe-where-you-read `packages/plugins/plugin-presenter/src/components/SlideGrid/SlideGrid.tsx:201`

`useSlideLabel` reads `Obj.getLabel(source.object)` in render for the `object` kind with no subscription, so the caption goes stale when the linked object is renamed (rule `subscribe-where-you-read`). Subscribe with `useObject(source.kind === 'object' ? source.object : undefined)` and derive the label from that snapshot.

# WARN 17a9e753-54 toolbars-are-menu-actions `packages/plugins/plugin-presenter/src/containers/PresentationArticle/PresentationArticle.tsx:129`

The container renders a bare `Toolbar.Root` of `Button.Root`s (add slide, layout, grid size, play) instead of menu actions, so graph actions, plugin extensions and shortcuts cannot compose into it (rule `toolbars-are-menu-actions`). Build the actions with `MenuBuilder` in an `Atom`, pass them through `useMenuActions`, render with `Menu.Root`, and pass `attendableId`; list `gridSize` in the memo deps.

# WARN 17a9e753-55 empty-container-uses-empty `packages/plugins/plugin-projects/src/components/MoveTaskPanel/MoveTaskPanel.tsx:44`

Hand-styled empty message (empty-container-uses-empty). Replace it with <Status.Empty classNames='dx-fill'>{t(...)}</Status.Empty> from @dxos/react-ui/Status so the empty state is uniform and announced as a status.

# WARN 17a9e753-56 object-fields-render-as-form `packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:367`

PluginDetail gives each scalar property of one plugin (scope, resources links, versions) its own Section.Heading plus body, a custom stacked layout per property (object-fields-render-as-form). Render the plain properties as one read-only Form (or Card.Rows) with label/value rows; keep headings only for collection-like parts such as screenshots and the description body.

# WARN 17a9e753-57 empty-container-uses-empty `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:184`

Hand-styled empty message (empty-container-uses-empty). Replace it with <Status.Empty classNames='dx-fill'>{t(...)}</Status.Empty> from @dxos/react-ui/Status so the empty state is uniform and announced as a status.

# WARN 17a9e753-58 consistent-file-naming-within-folder `packages/plugins/plugin-review/src/components/CommentThread/CommentThread.stories.tsx:37:7`

The story's default render component is named `Render` (used as `render: Render` at line 85). Per the rule, a storybook's default render component is named `DefaultStory`; rename it, as the sibling stories (`CommentsArticle.stories.tsx`, `Deck.stories.tsx`) do.

# WARN 17a9e753-59 subscribe-where-you-read `packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:206`

`thread.name` is read in render, but `thread` comes from `Relation.getSource` and the only subscription is `useObject(thread, 'status')`, so a rename never re-renders the header (rule `subscribe-where-you-read`). Also read `name` via `useObject(thread, 'name')` (or subscribe to the whole thread).

# WARN 17a9e753-60 subscribe-where-you-read `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:493`

Render-path reads of `thread.status` (via `Relation.getSource(anchor)`) and `markdownDoc?.history?.branches` (line 497) have no subscription on the thread or `subject` document, so resolve/branch changes do not re-filter the list (rule `subscribe-where-you-read`). Subscribe with `useObject(markdownDoc, 'history')` and derive the unresolved filter from subscribed thread status (e.g. a per-thread atom or leaf-level filtering).

# WARN 17a9e753-61 layout-only-wrapper-invisible-to-a11y `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:503:7`

The bare `<div>` wrapping the mapped `CommentThreadItem`s carries no className, role or semantics; it only groups children, so it appears as a meaningless node in the accessibility tree (rule `layout-only-wrapper-invisible-to-a11y`). Replace it with `<>...</>`, or add `role='none'` if a DOM node is required.

# WARN 17a9e753-62 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:567`

The container toolbar renders a bare `Button.Root` (add object comment) directly, so plugin and keyboard-shortcut actions cannot compose in and `attendableId` is not given to the toolbar (rule `toolbars-are-menu-actions`). Build it with `MenuBuilder` in an `Atom`, `useMenuActions`, and `Menu.Root` with `attendableId`.

# WARN 17a9e753-63 barrel-imports-not-internal-paths `packages/plugins/plugin-review/src/hooks/useThreadMessages.ts:11`

Imports `hideSupersededPending` from the file `../util/pending.ts` although `util/index.ts` re-exports it. Import from `'../util/index.ts'` (rule: barrel imports, not internal paths).

# WARN 17a9e753-64 no-unused-new-api `packages/plugins/plugin-review/src/hooks/useThreadMessages.ts:23`

`isCommentMessage` is exported (and surfaces through `hooks/index.ts` via `export *`) but its only use is inside `useThreadMessages` in the same file. Make it module-private by dropping `export`, per `no-unused-new-api`.

# WARN 17a9e753-65 call-effect-api-not-promise-bridge `packages/plugins/plugin-review/src/operations/add-message.ts:97`

`Effect.promise(() => thread.feed.load())` is a Promise bridge; use `yield* Database.load(thread.feed)` (rule call-effect-api-not-promise-bridge).

# WARN 17a9e753-66 call-effect-api-not-promise-bridge `packages/plugins/plugin-review/src/operations/delete-message.ts:33`

`Effect.promise(() => thread.feed.load())` is a Promise bridge; use `yield* Database.load(thread.feed)` (rule call-effect-api-not-promise-bridge).

# WARN 17a9e753-67 barrel-imports-not-internal-paths `packages/plugins/plugin-review/src/operations/respond-to-thread.ts:18`

Imports `FAILED_TEXT, PENDING_TEXT` from the file `../util/pending.ts` although `util/index.ts` is a barrel that re-exports `pending.ts`. Import from `'../util/index.ts'` instead (rule: barrel imports, not internal paths).

# WARN 17a9e753-68 call-effect-api-not-promise-bridge `packages/plugins/plugin-review/src/operations/respond-to-thread.ts:42`

`Effect.promise(() => thread.feed.load())` is a Promise bridge; use `yield* Database.load(thread.feed)` (rule call-effect-api-not-promise-bridge).

# WARN 17a9e753-69 call-effect-api-not-promise-bridge `packages/plugins/plugin-review/src/operations/respond-to-thread.ts:49`

`Effect.promise(() => db.appendToFeed(...))` bridges to the Promise API although `Feed.append` is the Effect form (it wraps `db.appendToFeed` with a span); call `Feed.append(feed, [...])` (rule call-effect-api-not-promise-bridge). The `removeFeedItemsByIds` call at line 58 is the same pattern if an Effect form exists.

# WARN 17a9e753-70 call-effect-api-not-promise-bridge `packages/plugins/plugin-review/src/operations/restore-message.ts:24`

`Effect.promise(() => thread.feed.load())` is a Promise bridge; use `yield* Database.load(thread.feed)` (rule call-effect-api-not-promise-bridge).

# WARN 17a9e753-71 test-at-owning-package `packages/plugins/plugin-review/src/thread-feed.test.ts:19:3`

Three of the four tests exercise `Thread.make`/`Thread.loadMessages` (`@dxos/types`), `db.appendToFeed`/`removeFeedItemsByIds` (echo) and `Chat.make` feed ownership, none of which is implemented in plugin-review; only the `threadMessagesToFeed` migration test covers plugin wiring. Move the feed ordering, remove/re-append and chat-feed ownership tests next to `Thread` in `packages/sdk/types` (or echo), per `test-at-owning-package`, and keep only the migration test here.

# WARN 17a9e753-72 minimal-precise-tests `packages/plugins/plugin-review/src/thread-feed.test.ts:61`

The "chat running on a thread feed" test re-asserts `Obj.getParent(feed) === thread`, already pinned by the first test, and its other assertion (`chat.feed.target`) exercises `Chat.make`/`Ref.make`, not code this change touches. Drop it, or reduce it to the one behavior it uniquely covers; per the minimal-precise-tests rule, one test per behavior.

# WARN 17a9e753-73 operations-take-refs-not-ids `packages/plugins/plugin-review/src/types/CommentOperation.ts:183`

The new `RespondToThread` input `messageId` names an ECHO comment message by a raw `Obj.ID` string. Per `operations-take-refs-not-ids`, take `Ref.Ref(Message.Message)` (or the message object schema) so the handler resolves it through the database instead of re-deriving what the id points at.

# WARN 17a9e753-74 empty-container-uses-empty `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:36`

Hand-styled empty message (empty-container-uses-empty). Replace it with <Status.Empty classNames='dx-fill'>{t(...)}</Status.Empty> from @dxos/react-ui/Status so the empty state is uniform and announced as a status.

# WARN 17a9e753-75 empty-container-uses-empty `packages/plugins/plugin-sheet/src/components/ChartCompanion/ChartCompanion.tsx:187`

Hand-styled empty message (empty-container-uses-empty). Replace it with <Status.Empty classNames='dx-fill'>{t(...)}</Status.Empty> from @dxos/react-ui/Status so the empty state is uniform and announced as a status.

# WARN 17a9e753-76 empty-container-uses-empty `packages/plugins/plugin-space/src/containers/SchemaContainer/SchemaContainer.tsx:33`

Hand-styled empty message (empty-container-uses-empty). Replace it with <Status.Empty classNames='dx-fill'>{t(...)}</Status.Empty> from @dxos/react-ui/Status so the empty state is uniform and announced as a status.

# WARN 17a9e753-77 empty-container-uses-empty `packages/plugins/plugin-studio/src/components/VariantGallery/VariantGallery.tsx:71`

Hand-styled empty message (empty-container-uses-empty). Replace it with <Status.Empty classNames='dx-fill'>{t(...)}</Status.Empty> from @dxos/react-ui/Status so the empty state is uniform and announced as a status.

# WARN 17a9e753-78 empty-container-uses-empty `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:158`

Hand-styled empty message (empty-container-uses-empty). Replace it with <Status.Empty classNames='dx-fill'>{t(...)}</Status.Empty> from @dxos/react-ui/Status so the empty state is uniform and announced as a status.

# WARN 17a9e753-79 extract-non-rendering-logic-from-component `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.tsx:41`

The component builds the thread-feed query inline (`useResolveRef` + `useQuery` with a `NO_FEED` fallback + a sort `useMemo`) in its body; the same logic already exists as `useThreadMessages` in plugin-review. Per `extract-non-rendering-logic-from-component`, move it into one shared named hook (e.g. `useThreadMessages(thread)`) and call that here instead of duplicating the query/guard/sort.

# ERROR 17a9e753-80 no-silent-storage-fallback `packages/sdk/app-framework/src/plugin-process-manager/idb-key-value-store.ts:22`

`layerIdb` probes `typeof globalThis.indexedDB` and swaps in `KeyValueStore.layerMemory` when it is missing, so a browser where IndexedDB is unavailable would silently discard process records. Fix: use the memory layer only through explicit test configuration, and in the browser fail with an error naming the original cause.

# WARN 17a9e753-81 todo-has-owner `packages/sdk/app-framework/src/vite-plugin/import-map/index.ts:375`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-82 todo-has-owner `packages/sdk/client-e2e/src/invitations.test.ts:472`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-83 todo-has-owner `packages/sdk/client-services/src/internal/agents/edge-agent-manager.ts:101`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-84 todo-has-owner `packages/sdk/client-services/src/internal/identity/identity-manager.ts:591`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-85 todo-has-owner `packages/sdk/client-services/src/internal/identity/identity-manager.ts:592`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-86 todo-has-owner `packages/sdk/client-services/src/internal/invitations/invitations-handler.ts:93`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-87 todo-has-owner `packages/sdk/client-services/src/internal/metadata/metadata-store.ts:433`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-88 todo-has-owner `packages/sdk/client-services/src/internal/services/network-lifecycle.ts:163`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-89 todo-has-owner `packages/sdk/client-services/src/internal/space/space-protocol.browser.test.ts:87`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-90 todo-has-owner `packages/sdk/client-services/src/Replication.ts:61`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-91 todo-has-owner `packages/sdk/client/src/services/agent-hosting-provider.ts:41`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-92 todo-has-owner `packages/sdk/client/src/services/agent-hosting-provider.ts:53`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-93 todo-has-owner `packages/sdk/client/src/services/agent-hosting-provider.ts:107`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-94 todo-has-owner `packages/sdk/client/src/services/agent-hosting-provider.ts:173`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-95 todo-has-owner `packages/sdk/client/src/services/agent-hosting-provider.ts:427`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-96 todo-has-owner `packages/sdk/examples/src/playwright/basic.spec.ts:74`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-97 todo-has-owner `packages/sdk/examples/src/playwright/playwright.config.ts:5`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-98 todo-has-owner `packages/sdk/observability/src/extensions/otel/metrics.ts:91`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-99 todo-has-owner `packages/sdk/observability/src/extensions/otel/metrics.ts:118`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.

# WARN 17a9e753-100 query-capability-extends-filter-query-dsl `packages/sdk/types/src/types/Thread.ts:74`

`sortMessages` hand-rolls an in-memory `created`/`id` sort beside `messagesQuery`, instead of ordering inside the Query with the shared `Order` helper (`Query.orderBy(Order.property('created'))`). Fold the ordering into `messagesQuery` (or extend `Order` if a tie-break on `id` is missing) so callers get ordered results from the query rather than a parallel sort function.

# WARN 17a9e753-101 comment-hygiene `packages/stories/stories-agent/src/stories/CommentAgent.stories.tsx:298`

The comment "The comment that once went unanswered: ..." narrates the bug history that motivated the constant instead of stating what it is or why it is shaped this way. Rewrite it as one clause about the current behaviour (a lowercase mention asking for an edit of the anchored text), per `comment-hygiene`.

# WARN 17a9e753-102 comment-hygiene `packages/stories/stories-agent/src/stories/DiscordPipeline.stories.tsx:55`

The doc comment names a transient edge working branch (`dm/elegant-euler-at56gd`) as a prerequisite, which goes stale as soon as that branch merges or is deleted. Describe the requirement (an EDGE exposing the brain's fact feed routes) without the branch name, per `comment-hygiene`.

# WARN 17a9e753-103 effect-fn-not-hand-wrapped-gen `packages/stories/stories-agent/src/testing/fake-comment-agent.ts:23:5`

`run: ({ thread }) => Effect.gen(function* () {...})` hand-wraps `Effect.gen`; in test/story code use `Effect.fnUntraced(function* ({ thread }) {...})` instead.

# WARN 17a9e753-104 call-effect-api-not-promise-bridge `packages/stories/stories-agent/src/testing/fake-comment-agent.ts:30`

`Effect.promise(() => thread.feed.load())` followed by `Effect.promise(() => db.appendToFeed(...))` at line 31: use `Database.load(thread.feed)` and `Feed.append(feed, [...])` instead of Promise bridges (rule call-effect-api-not-promise-bridge).

# WARN 17a9e753-105 name-for-general-behavior `packages/stories/stories-agent/src/testing/story-settings.ts:45:14`

`defaultEdgeEnvironment(environment)` reads like a getter of a default (beside `getEdgeEnvironment`), but it actually writes `environment` only when none is stored. Rename it for what it does, e.g. `setEdgeEnvironmentIfUnset`, per the rule on names that suggest a different behavior.

# WARN 17a9e753-106 namespace-export-with-internal-hiding `packages/stories/storybook-testing/src/index.ts:10`

The barrel adds another blanket `export * from './objects.ts'` (alongside the existing `decorators`, `layout`, `ModuleContainer`, `plugins`, `snapshot` and `story-space` wildcards), so every export of the moved `objects.ts` becomes public API without being chosen, per `namespace-export-with-internal-hiding`. Export the intended symbols explicitly (`export { addToRootCollection, ... } from './objects.ts'`, or `export * as Objects` if it is a namespace module) and keep helpers that are not meant for consumers under `internal/`.

# ERROR 17a9e753-107 no-silent-storage-fallback `packages/ui/react-ui-attention/src/core/backends.ts:44`

`safeLocalStorage` swallows the `SecurityError` thrown when localStorage is blocked and returns `undefined`, so `LocalBackend` silently runs as an in-memory store and the user's view state is lost on reload (rule no-silent-storage-fallback). Fix: let the failure surface (fail startup with the original DOMException as the cause), or select the in-memory backend explicitly by configuration rather than by catching the error.

# WARN 17a9e753-108 diagram-links-are-smart `packages/ui/react-ui-canvas-compute/src/scene/scene.ts:33`

Links generated in code for the compute diagram use `type: 'curve'`, which does not route around the cards between its ends. Use `type: 'smart'` per rule `diagram-links-are-smart`.

# WARN 17a9e753-109 containers-share-core-hooks `packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:497:5`

MessageList attaches its own `keydown` listener that maps ArrowUp/ArrowDown/Home/End onto its private `navigation` (and a second `onKeyDown` near line 832). A collection of message tiles should get keyboard navigation and focus from the shared core (`useListNavigation` / `Focus.Item` / Mosaic `Container`) per `containers-share-core-hooks`; extend that instead of a bespoke keymap.

# WARN 17a9e753-110 containers-share-core-hooks `packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:220:7`

Outline implements its own ArrowUp/ArrowDown roving focus over `rowsRef` and calls `.focus()` on rows itself. Route list navigation and focus through the shared `useListNavigation` / `Focus.Item` hooks (`containers-share-core-hooks`) so it behaves like the other containers.

# WARN 17a9e753-111 subscribe-where-you-read `packages/ui/react-ui-thread/src/Message/Message.tsx:182`

`Ref.Array.targets(references)` resolves reference targets in render; targets are undefined until loaded and never notify on arrival, so reference tiles can stay empty (rule `subscribe-where-you-read`). Pass the refs through and let each `Object` tile resolve its own with `useObject(ref)`.

# WARN 17a9e753-112 leaf-owns-its-subscription `packages/ui/react-ui-thread/src/Message/Message.tsx:182`

The list resolves every reference with `Ref.Array.targets(references).map(...)`, so the body subscribes to/loads all items instead of membership only (rule `leaf-owns-its-subscription`). Map over the unresolved refs and have each leaf tile call `useObject(ref)` and render a fallback until loaded.

# WARN 17a9e753-113 prefer-branded-types-over-raw-primitives `packages/ui/react-ui-thread/src/types.ts:52`

`Mention.hue` is typed as a bare `string`, and `mentionPills`'s `hue` callback (`packages/ui/ui-editor/src/extensions/completion/mention.ts`) returns `string | undefined`, although the value is an avatar palette hue (`authorAvatarProps.hue`) that is interpolated into the class `dx-tag-${hue}`. A branded/union type already exists for it (`ChromaticPalette` in `@dxos/ui-types`, `AvatarHue` in react-ui). Type `Mention.hue` and the `hue` option with that palette type so a non-palette string cannot reach the class name.

# WARN 17a9e753-114 no-unused-new-api `packages/ui/react-ui/src/components/Timestamp/Timestamp.tsx:58`

`useRelativeTime` is a new public export (reachable as `Typography.useRelativeTime` via the `export *` chain) with no caller anywhere in the repo, tests included; every consumer in the PR uses `Typography.formatRelative` or `<Typography.Timestamp variant='relative'>`. Remove the hook (and its now-unneeded `useAppLocale` coupling if nothing else needs it) until a caller exists, per `no-unused-new-api`.

# WARN 17a9e753-115 no-premature-abstraction `packages/ui/react-ui/src/components/Timestamp/Timestamp.tsx:58`

`useRelativeTime` is a new public hook "for text composed into a larger string" with no caller anywhere in the repo (`Timestamp` uses `useTick`/`formatRelative` directly). It is a speculative convenience API added for later (rule `no-premature-abstraction`); remove the export, or keep it private/inline until a second concrete caller needs it.

# WARN 17a9e753-116 named-durations-and-budgets `packages/ui/react-ui/src/util/format-time.ts:110`

`RELATIVE_MS = 2 * 24 * 60 * 60_000` mixes unit arithmetic with a raw `60_000` ms literal; per `named-durations-and-budgets`, write `2 * 24 * 60 * 60 * 1_000` or `Duration.days(2)` (and share minute/hour constants).

# WARN 17a9e753-117 named-durations-and-budgets `packages/ui/react-ui/src/util/format-time.ts:177`

`relativeInterval` and `formatRelative` use raw ms literals (`60_000`, `60 * 60_000`, `3_600_000` at lines 149, 177-181) that hide "one minute"/"one hour"; name them once (`MINUTE_MS = 60 * 1_000`, `HOUR_MS = 60 * MINUTE_MS`) or use `Duration.minutes(1)`, per `named-durations-and-budgets`.

# WARN 17a9e753-118 todo-has-owner `packages/ui/solid-ui-geo/src/components/Globe/Globe.tsx:166`

This TODO has no owner handle (or a topic tag instead of one); per `todo-has-owner`, write `TODO(<github-handle>): ...` naming the person who will finish it.
