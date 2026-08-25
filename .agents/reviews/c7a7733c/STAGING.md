# Review staging — c7a7733c

- base: `a794822a5304e5de0dc0adbb6ea85a18fe1e421c`
- head: `c7a7733c1c63c8cfdf578ab0ca8a57131dc56912`
- mode: default
- groups: 20 (max 20)
- files: 748

Each group below is one rule over a bounded set of files. A subagent
reviews its files against the rule and appends diagnostics to the named fragment.

## Group 01 — Layer constructors are module-level exports, never class statics (`namespace-service-layers`, severity: warn)

<!-- fragment: groups/01.md -->

**Scope:** full project (first pass for this rule)

**Rule instructions:**

In a module marked `@import-as-namespace`, the `Context.Service` tag class
carries the module's own name, so anything hung off it as a `static` forces
consumers to spell that name twice — `StateStore.StateStore.layerSql` instead
of `StateStore.layerSql`. Export layer constructors (`layerMemory`,
`layerSql`, `layer`, …) as module-level `const`s beside the tag, leaving the
class body empty, and give the service's operations module-level accessors
built on `Context.Service.use` for the same reason. Flag a `static layer…`
member on a `Context.Service` subclass, and flag any call site that repeats a
namespace as `Name.Name.member`. A bare `Name.Name` in a TYPE position is not
a violation — the tag genuinely is the type, and there is nowhere else to put
it.

**Files to review (45):**

- `packages/common/crx-protocol/src/Message.ts`
- `packages/common/crx-protocol/src/PageAction.ts`
- `packages/common/crx-protocol/src/Proxy.ts`
- `packages/common/effect-atom-solid/src/hooks/useAtomSet.ts`
- `packages/common/effect/src/ast.test.ts`
- `packages/common/effect/src/layers.test.ts`
- `packages/common/graph/src/Graph.ts`
- `packages/common/graph/src/GraphModel.test.ts`
- `packages/core/compute/agent-runtime/src/agent-service/agent-process.ts`
- `packages/core/compute/agent-runtime/src/testing/assistant-test-layer.ts`
- `packages/core/compute/ai/src/AiModelResolver.test.ts`
- `packages/core/compute/ai/src/resolvers/anthropic/AnthropicResolver.ts`
- `packages/core/compute/ai/src/resolvers/lmstudio/LMStudioResolver.ts`
- `packages/core/compute/ai/src/resolvers/ollama/OllamaAdmin.ts`
- `packages/core/compute/ai/src/resolvers/ollama/OllamaResolver.test.ts`
- `packages/core/compute/ai/src/resolvers/ollama/OllamaResolver.ts`
- `packages/core/compute/ai/src/resolvers/openai/OpenAiResolver.ts`
- `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.test.ts`
- `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts`
- `packages/core/compute/ai/src/testing/test-layers.ts`
- `packages/core/compute/ai/src/tools/tool-execution-service.ts`
- `packages/core/compute/ai/src/tools/tool-resolver-service.ts`
- `packages/core/compute/ai/src/tools/tool.ts`
- `packages/core/compute/assistant-e2e/src/harness.ts`
- `packages/core/compute/assistant-evals/src/judge.ts`
- `packages/core/compute/assistant-evals/src/runner.ts`
- `packages/core/compute/assistant-toolkit/src/types/Chat.test.ts`
- `packages/core/compute/assistant/src/extraction/extraction-llm-function/proper-noun-extraction.ts`
- `packages/core/compute/assistant/src/extraction/quotes.ts`
- `packages/core/compute/assistant/src/request/AiRequest.test.ts`
- `packages/core/compute/assistant/src/session/AiSession.test.ts`
- `packages/core/compute/assistant/src/templates/system.ts`
- `packages/core/compute/assistant/src/util/artifact.ts`
- `packages/core/compute/compute-runtime/src/ProcessManager.ts`
- `packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts`
- `packages/core/compute/compute-runtime/src/functions-ai-http-client.ts`
- `packages/core/compute/compute-runtime/src/functions-trace.ts`
- `packages/core/compute/compute-runtime/src/process-store.ts`
- `packages/core/compute/compute-runtime/src/protocol.ts`
- `packages/core/compute/compute-runtime/src/storage-service-layer.ts`
- `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts`
- `packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts`
- `packages/core/compute/compute/src/McpServer.ts`
- `packages/core/compute/compute/src/Operation.ts`
- `packages/core/compute/compute/src/Process.ts`

## Group 02 — Layer constructors are module-level exports, never class statics (`namespace-service-layers`, severity: warn)

<!-- fragment: groups/02.md -->

**Scope:** full project (first pass for this rule)

**Rule instructions:**

In a module marked `@import-as-namespace`, the `Context.Service` tag class
carries the module's own name, so anything hung off it as a `static` forces
consumers to spell that name twice — `StateStore.StateStore.layerSql` instead
of `StateStore.layerSql`. Export layer constructors (`layerMemory`,
`layerSql`, `layer`, …) as module-level `const`s beside the tag, leaving the
class body empty, and give the service's operations module-level accessors
built on `Context.Service.use` for the same reason. Flag a `static layer…`
member on a `Context.Service` subclass, and flag any call site that repeats a
namespace as `Name.Name.member`. A bare `Name.Name` in a TYPE position is not
a violation — the tag genuinely is the type, and there is nowhere else to put
it.

**Files to review (45):**

- `packages/core/compute/compute/src/StorageService.ts`
- `packages/core/compute/compute/src/Trace.ts`
- `packages/core/compute/compute/src/types/Instructions.ts`
- `packages/core/compute/compute/src/types/Project.ts`
- `packages/core/compute/compute/src/types/Skill.ts`
- `packages/core/compute/compute/src/types/Template.ts`
- `packages/core/compute/compute/src/types/Trigger.ts`
- `packages/core/compute/compute/src/types/TriggerEvent.ts`
- `packages/core/compute/conductor/src/nodes/gpt/gpt.ts`
- `packages/core/compute/conductor/src/nodes/template/node.ts`
- `packages/core/compute/conductor/src/sequence/Sequence.ts`
- `packages/core/compute/conductor/src/types/compute-events.ts`
- `packages/core/compute/conductor/src/types/compute.ts`
- `packages/core/compute/conductor/src/types/graph.ts`
- `packages/core/compute/conductor/src/types/schema.ts`
- `packages/core/compute/conductor/src/util/ast.ts`
- `packages/core/compute/conductor/src/util/stream.ts`
- `packages/core/compute/extractor/src/ExtractionTemplate.ts`
- `packages/core/compute/link/src/Cursor.ts`
- `packages/core/compute/nlp/src/Document.ts`
- `packages/core/compute/nlp/src/Segmentation.ts`
- `packages/core/compute/nlp/src/segment.ts`
- `packages/core/compute/pipeline-email/src/testing/email-pipeline.test.ts`
- `packages/core/compute/pipeline-email/src/types/Thread.ts`
- `packages/core/compute/pipeline-rdf/src/internal/stages/extract.ts`
- `packages/core/compute/pipeline-rdf/src/types/Assertion.ts`
- `packages/core/compute/pipeline-rdf/src/types/Attribution.ts`
- `packages/core/compute/pipeline-rdf/src/types/Entity.ts`
- `packages/core/compute/pipeline-rdf/src/types/Fact.ts`
- `packages/core/compute/pipeline-rdf/src/types/Factuality.ts`
- `packages/core/compute/pipeline-rdf/src/types/Illocution.ts`
- `packages/core/compute/pipeline-transcription/src/types/pipeline-config.ts`
- `packages/core/compute/pipeline/src/testing/metrics.ts`
- `packages/core/echo/echo-client-e2e/src/static-typed-object.test.ts`
- `packages/core/echo/echo-client/src/proxy-db/database.test.ts`
- `packages/core/echo/echo-client/src/proxy-db/object-migration.test.ts`
- `packages/core/echo/echo-client/src/registry/registry.ts`
- `packages/core/echo/echo-doc/src/edits.ts`
- `packages/core/echo/echo-host/src/query/query-planner.ts`
- `packages/core/echo/echo-panproto/src/lens/entity.ts`
- `packages/core/echo/echo-panproto/src/wire-lens.ts`
- `packages/core/echo/echo-protocol/src/foreign-key.ts`
- `packages/core/echo/echo-protocol/src/query/ast.ts`
- `packages/core/echo/echo-query/src/query-lite/query-lite.ts`
- `packages/core/echo/echo/src/Annotation.ts`

## Group 03 — Layer constructors are module-level exports, never class statics (`namespace-service-layers`, severity: warn)

<!-- fragment: groups/03.md -->

**Scope:** full project (first pass for this rule)

**Rule instructions:**

In a module marked `@import-as-namespace`, the `Context.Service` tag class
carries the module's own name, so anything hung off it as a `static` forces
consumers to spell that name twice — `StateStore.StateStore.layerSql` instead
of `StateStore.layerSql`. Export layer constructors (`layerMemory`,
`layerSql`, `layer`, …) as module-level `const`s beside the tag, leaving the
class body empty, and give the service's operations module-level accessors
built on `Context.Service.use` for the same reason. Flag a `static layer…`
member on a `Context.Service` subclass, and flag any call site that repeats a
namespace as `Name.Name.member`. A bare `Name.Name` in a TYPE position is not
a violation — the tag genuinely is the type, and there is nowhere else to put
it.

**Files to review (45):**

- `packages/core/echo/echo/src/Blob.ts`
- `packages/core/echo/echo/src/Feed.ts`
- `packages/core/echo/echo/src/Filter.ts`
- `packages/core/echo/echo/src/Query.ts`
- `packages/core/echo/echo/src/Ref.ts`
- `packages/core/echo/echo/src/Type.ts`
- `packages/core/echo/echo/src/View.ts`
- `packages/core/echo/echo/src/internal/Annotation/annotations.test.ts`
- `packages/core/echo/echo/src/internal/Annotation/annotations.ts`
- `packages/core/echo/echo/src/internal/Annotation/dictionary.ts`
- `packages/core/echo/echo/src/internal/Entity/entity.ts`
- `packages/core/echo/echo/src/internal/Entity/object.ts`
- `packages/core/echo/echo/src/internal/Entity/type-uri.ts`
- `packages/core/echo/echo/src/internal/Format/date.ts`
- `packages/core/echo/echo/src/internal/Format/format.test.ts`
- `packages/core/echo/echo/src/internal/Format/object.ts`
- `packages/core/echo/echo/src/internal/Format/select.ts`
- `packages/core/echo/echo/src/internal/JsonSchema/json-schema-type.ts`
- `packages/core/echo/echo/src/internal/Type/type-schema.ts`
- `packages/core/echo/echo/src/internal/common/proxy/typed-object.test.ts`
- `packages/core/echo/echo/src/internal/common/types/base.ts`
- `packages/core/echo/echo/src/internal/common/types/meta.ts`
- `packages/core/echo/echo/src/testing/test-schema.ts`
- `packages/core/echo/index-core/src/index-tracker.ts`
- `packages/core/echo/index-core/src/indexes/entity-meta-index.ts`
- `packages/core/echo/index-core/src/indexes/reverse-ref-index.ts`
- `packages/core/echo/index-core/src/utils.ts`
- `packages/core/mesh/edge-client/src/browser-rendering.ts`
- `packages/core/mesh/edge-client/src/edge-ai-http-client.ts`
- `packages/core/protocols/src/Config2.ts`
- `packages/core/protocols/src/DataService.ts`
- `packages/core/protocols/src/DevicesService.ts`
- `packages/core/protocols/src/DevtoolsHost.ts`
- `packages/core/protocols/src/FeedProtocol.ts`
- `packages/core/protocols/src/FeedService.ts`
- `packages/core/protocols/src/IdentityService.ts`
- `packages/core/protocols/src/InvitationsService.ts`
- `packages/core/protocols/src/LoggingService.ts`
- `packages/core/protocols/src/NetworkService.ts`
- `packages/core/protocols/src/QueryService.ts`
- `packages/core/protocols/src/SpacesService.ts`
- `packages/core/protocols/src/SystemService.ts`
- `packages/core/protocols/src/WorkerService.ts`
- `packages/core/protocols/src/edge/edge.ts`
- `packages/core/protocols/src/edge/registry.ts`

## Group 04 — Layer constructors are module-level exports, never class statics (`namespace-service-layers`, severity: warn)

<!-- fragment: groups/04.md -->

**Scope:** full project (first pass for this rule)

**Rule instructions:**

In a module marked `@import-as-namespace`, the `Context.Service` tag class
carries the module's own name, so anything hung off it as a `static` forces
consumers to spell that name twice — `StateStore.StateStore.layerSql` instead
of `StateStore.layerSql`. Export layer constructors (`layerMemory`,
`layerSql`, `layer`, …) as module-level `const`s beside the tag, leaving the
class body empty, and give the service's operations module-level accessors
built on `Context.Service.use` for the same reason. Flag a `static layer…`
member on a `Context.Service` subclass, and flag any call site that repeats a
namespace as `Name.Name.member`. A bare `Name.Name` in a TYPE position is not
a violation — the tag genuinely is the type, and there is nowhere else to put
it.

**Files to review (45):**

- `packages/devtools/cli-util/src/services/command-config.ts`
- `packages/devtools/cli/src/commands/mcp/client.ts`
- `packages/devtools/cli/src/commands/mcp/space-tools.ts`
- `packages/devtools/cli/src/util/runtime.ts`
- `packages/e2e/blade-runner/src/spec/edge-sync.ts`
- `packages/plugins/plugin-assistant/src/capabilities/ai-service.ts`
- `packages/plugins/plugin-assistant/src/capabilities/connector.ts`
- `packages/plugins/plugin-assistant/src/execution-graph/execution-graph.ts`
- `packages/plugins/plugin-assistant/src/execution-graph/span-tree.ts`
- `packages/plugins/plugin-assistant/src/types/AssistantCapabilities.ts`
- `packages/plugins/plugin-assistant/src/types/AssistantService.ts`
- `packages/plugins/plugin-assistant/src/types/Settings.ts`
- `packages/plugins/plugin-atproto/src/capabilities/connector.ts`
- `packages/plugins/plugin-blogger/src/operations/sync-support.ts`
- `packages/plugins/plugin-blogger/src/types/Blog.ts`
- `packages/plugins/plugin-blogger/src/types/Publisher.ts`
- `packages/plugins/plugin-bluesky/src/capabilities/connector.ts`
- `packages/plugins/plugin-bluesky/src/services/BlueskyApi.ts`
- `packages/plugins/plugin-bluesky/src/types.ts`
- `packages/plugins/plugin-bookmarks/src/types/BookmarkOperation.ts`
- `packages/plugins/plugin-brain/src/types/BrainOperation.ts`
- `packages/plugins/plugin-brain/src/types/BrainSettings.ts`
- `packages/plugins/plugin-chess-com/src/capabilities/create-object.ts`
- `packages/plugins/plugin-chess-com/src/services/chess-com-api.ts`
- `packages/plugins/plugin-chess-com/src/types/ChessComAccount.ts`
- `packages/plugins/plugin-chess/src/types/ChessPositionIndex.ts`
- `packages/plugins/plugin-client/src/containers/ProfileContainer/ProfileContainer.tsx`
- `packages/plugins/plugin-client/src/types/AccountCache.ts`
- `packages/plugins/plugin-code/src/types/Settings.ts`
- `packages/plugins/plugin-commerce/src/types/Provider.ts`
- `packages/plugins/plugin-connector/src/types/ConnectorSpec.ts`
- `packages/plugins/plugin-crx/src/types/CrxOperation.ts`
- `packages/plugins/plugin-crx/src/types/Settings.ts`
- `packages/plugins/plugin-debug/src/types/Settings.ts`
- `packages/plugins/plugin-deck/src/types/CompanionViewState.ts`
- `packages/plugins/plugin-deck/src/types/DeckOperation.ts`
- `packages/plugins/plugin-deck/src/types/DeckSchema.ts`
- `packages/plugins/plugin-deck/src/types/Settings.ts`
- `packages/plugins/plugin-deck/src/util/migrate-persisted-state.ts`
- `packages/plugins/plugin-discord/src/capabilities/connector.ts`
- `packages/plugins/plugin-discord/src/types/DiscordTargetOptions.ts`
- `packages/plugins/plugin-duffel/src/services/duffel-mapping.ts`
- `packages/plugins/plugin-duffel/src/types/Settings.ts`
- `packages/plugins/plugin-excalidraw/src/types/Settings.ts`
- `packages/plugins/plugin-explorer/src/components/Tree/types/tree.ts`

## Group 05 — Layer constructors are module-level exports, never class statics (`namespace-service-layers`, severity: warn)

<!-- fragment: groups/05.md -->

**Scope:** full project (first pass for this rule)

**Rule instructions:**

In a module marked `@import-as-namespace`, the `Context.Service` tag class
carries the module's own name, so anything hung off it as a `static` forces
consumers to spell that name twice — `StateStore.StateStore.layerSql` instead
of `StateStore.layerSql`. Export layer constructors (`layerMemory`,
`layerSql`, `layer`, …) as module-level `const`s beside the tag, leaving the
class body empty, and give the service's operations module-level accessors
built on `Context.Service.use` for the same reason. Flag a `static layer…`
member on a `Context.Service` subclass, and flag any call site that repeats a
namespace as `Name.Name.member`. A bare `Name.Name` in a TYPE position is not
a violation — the tag genuinely is the type, and there is nowhere else to put
it.

**Files to review (45):**

- `packages/plugins/plugin-file-system/src/containers/WorkspaceSettingsContainer.tsx`
- `packages/plugins/plugin-file/src/types/FileCapabilities.ts`
- `packages/plugins/plugin-file/src/types/Settings.ts`
- `packages/plugins/plugin-freeq/src/services/CredentialProvider.ts`
- `packages/plugins/plugin-freeq/src/services/FreeqRestApi.ts`
- `packages/plugins/plugin-freeq/src/types.ts`
- `packages/plugins/plugin-game/src/types/Game.ts`
- `packages/plugins/plugin-github/src/services/github-api.ts`
- `packages/plugins/plugin-github/src/types/GitHubOperation.ts`
- `packages/plugins/plugin-google/src/apis/GoogleCalendar/api.ts`
- `packages/plugins/plugin-google/src/apis/GoogleCalendar/types.ts`
- `packages/plugins/plugin-google/src/apis/GoogleContacts/types.ts`
- `packages/plugins/plugin-google/src/apis/GoogleMail/types.ts`
- `packages/plugins/plugin-google/src/apis/google-api.ts`
- `packages/plugins/plugin-google/src/capabilities/connector.ts`
- `packages/plugins/plugin-google/src/operations/calendar/list/handler.ts`
- `packages/plugins/plugin-google/src/operations/contacts/list-groups/handler.ts`
- `packages/plugins/plugin-heygen/src/capabilities/connector.ts`
- `packages/plugins/plugin-heygen/src/services/heygen-request.ts`
- `packages/plugins/plugin-ibkr/src/annotations/edgar-field.ts`
- `packages/plugins/plugin-ibkr/src/capabilities/connector.ts`
- `packages/plugins/plugin-ibkr/src/types/Ibkr.ts`
- `packages/plugins/plugin-ideogram/src/capabilities/connector.ts`
- `packages/plugins/plugin-ideogram/src/services/ideogram-request.ts`
- `packages/plugins/plugin-illustrator/src/model/scene.ts`
- `packages/plugins/plugin-illustrator/src/types/DrawingOperation.ts`
- `packages/plugins/plugin-inbox/src/operations/classify/classify-mailbox.ts`
- `packages/plugins/plugin-inbox/src/operations/extractor/ai-gate.test.ts`
- `packages/plugins/plugin-inbox/src/operations/extractor/ai-gate.ts`
- `packages/plugins/plugin-inbox/src/types/InboxOperation.ts`
- `packages/plugins/plugin-inbox/src/types/MailSend.ts`
- `packages/plugins/plugin-inbox/src/types/Mailbox.ts`
- `packages/plugins/plugin-inbox/src/types/ReplyGeneration.ts`
- `packages/plugins/plugin-inbox/src/types/Settings.ts`
- `packages/plugins/plugin-inbox/src/types/SyncOptions.ts`
- `packages/plugins/plugin-jmap/src/apis/Jmap/api.ts`
- `packages/plugins/plugin-jmap/src/apis/Jmap/types.ts`
- `packages/plugins/plugin-jmap/src/apis/JmapMail/api.ts`
- `packages/plugins/plugin-jmap/src/apis/JmapMail/types.ts`
- `packages/plugins/plugin-jmap/src/capabilities/credential-form.ts`
- `packages/plugins/plugin-kanban/src/types/Kanban.ts`
- `packages/plugins/plugin-kanban/src/types/KanbanOperation.ts`
- `packages/plugins/plugin-library/src/operations/bookhive.ts`
- `packages/plugins/plugin-library/src/types/Book.ts`
- `packages/plugins/plugin-linear/src/services/linear-api.ts`

## Group 06 — Layer constructors are module-level exports, never class statics (`namespace-service-layers`, severity: warn)

<!-- fragment: groups/06.md -->

**Scope:** full project (first pass for this rule)

**Rule instructions:**

In a module marked `@import-as-namespace`, the `Context.Service` tag class
carries the module's own name, so anything hung off it as a `static` forces
consumers to spell that name twice — `StateStore.StateStore.layerSql` instead
of `StateStore.layerSql`. Export layer constructors (`layerMemory`,
`layerSql`, `layer`, …) as module-level `const`s beside the tag, leaving the
class body empty, and give the service's operations module-level accessors
built on `Context.Service.use` for the same reason. Flag a `static layer…`
member on a `Context.Service` subclass, and flag any call site that repeats a
namespace as `Name.Name.member`. A bare `Name.Name` in a TYPE position is not
a violation — the tag genuinely is the type, and there is nowhere else to put
it.

**Files to review (45):**

- `packages/plugins/plugin-linear/src/types/LinearOperation.ts`
- `packages/plugins/plugin-lingo/src/types/Language.ts`
- `packages/plugins/plugin-lingo/src/types/LingoOperation.ts`
- `packages/plugins/plugin-lingo/src/types/LingoSettings.ts`
- `packages/plugins/plugin-lingo/src/types/Vocabulary.ts`
- `packages/plugins/plugin-lingo/src/types/Word.ts`
- `packages/plugins/plugin-magazine/src/operations/sources/standard-site.ts`
- `packages/plugins/plugin-magazine/src/operations/sync-feed.ts`
- `packages/plugins/plugin-magazine/src/types/CreateSubscription.ts`
- `packages/plugins/plugin-magazine/src/types/Magazine.ts`
- `packages/plugins/plugin-magazine/src/types/Subscription.ts`
- `packages/plugins/plugin-map/src/types/MapAction.ts`
- `packages/plugins/plugin-map/src/types/Settings.ts`
- `packages/plugins/plugin-markdown/src/types/Markdown.ts`
- `packages/plugins/plugin-markdown/src/types/Settings.ts`
- `packages/plugins/plugin-meeting/src/types/Settings.ts`
- `packages/plugins/plugin-native/src/capabilities/ollama.ts`
- `packages/plugins/plugin-native/src/types/Settings.ts`
- `packages/plugins/plugin-observability/src/types/ObservabilityCapabilities.ts`
- `packages/plugins/plugin-observability/src/types/Settings.ts`
- `packages/plugins/plugin-payments/src/types/Settings.ts`
- `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx`
- `packages/plugins/plugin-presenter/src/types/Settings.ts`
- `packages/plugins/plugin-projects/src/types/ProjectOperation.ts`
- `packages/plugins/plugin-registry/src/commands/registry/publish.ts`
- `packages/plugins/plugin-registry/src/commands/registry/util.ts`
- `packages/plugins/plugin-registry/src/storage.ts`
- `packages/plugins/plugin-registry/src/types.ts`
- `packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.stories.tsx`
- `packages/plugins/plugin-review/src/types/AgentIdentity.ts`
- `packages/plugins/plugin-review/src/types/CommentOperation.ts`
- `packages/plugins/plugin-review/src/types/Settings.ts`
- `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx`
- `packages/plugins/plugin-routine/src/components/Schedule/types.ts`
- `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx`
- `packages/plugins/plugin-routine/src/util/routines-for-object.ts`
- `packages/plugins/plugin-sample/src/types/Settings.ts`
- `packages/plugins/plugin-script/src/types/Notebook.ts`
- `packages/plugins/plugin-script/src/types/Settings.ts`
- `packages/plugins/plugin-search/src/search/exa.ts`
- `packages/plugins/plugin-sequencer/src/components/SequenceGrid/SequenceGrid.tsx`
- `packages/plugins/plugin-sequencer/src/types/Note.ts`
- `packages/plugins/plugin-sequencer/src/types/Patch.ts`
- `packages/plugins/plugin-sequencer/src/types/Sequence.ts`
- `packages/plugins/plugin-sequencer/src/types/Track.ts`

## Group 07 — Layer constructors are module-level exports, never class statics (`namespace-service-layers`, severity: warn)

<!-- fragment: groups/07.md -->

**Scope:** full project (first pass for this rule)

**Rule instructions:**

In a module marked `@import-as-namespace`, the `Context.Service` tag class
carries the module's own name, so anything hung off it as a `static` forces
consumers to spell that name twice — `StateStore.StateStore.layerSql` instead
of `StateStore.layerSql`. Export layer constructors (`layerMemory`,
`layerSql`, `layer`, …) as module-level `const`s beside the tag, leaving the
class body empty, and give the service's operations module-level accessors
built on `Context.Service.use` for the same reason. Flag a `static layer…`
member on a `Context.Service` subclass, and flag any call site that repeats a
namespace as `Name.Name.member`. A bare `Name.Name` in a TYPE position is not
a violation — the tag genuinely is the type, and there is nowhere else to put
it.

**Files to review (45):**

- `packages/plugins/plugin-sheet/src/types/Sheet.ts`
- `packages/plugins/plugin-sheet/src/types/SheetCapabilities.ts`
- `packages/plugins/plugin-sheet/src/types/SheetOperation.ts`
- `packages/plugins/plugin-slack/src/services/slack-api.ts`
- `packages/plugins/plugin-space/src/containers/CreateSpaceDialog/CreateSpaceDialog.tsx`
- `packages/plugins/plugin-space/src/containers/SpaceSettingsContainer/SpaceSettingsContainer.tsx`
- `packages/plugins/plugin-space/src/types/Settings.ts`
- `packages/plugins/plugin-space/src/types/SpaceCapabilities.ts`
- `packages/plugins/plugin-space/src/types/SpaceOperation.ts`
- `packages/plugins/plugin-spacetime/src/types/Model.ts`
- `packages/plugins/plugin-spacetime/src/types/Settings.ts`
- `packages/plugins/plugin-studio/src/types/Generation.ts`
- `packages/plugins/plugin-studio/src/types/GenerationService.ts`
- `packages/plugins/plugin-support/src/types/HelpCapabilities.ts`
- `packages/plugins/plugin-support/src/types/Settings.ts`
- `packages/plugins/plugin-support/src/types/Support.ts`
- `packages/plugins/plugin-support/src/types/SupportOperation.ts`
- `packages/plugins/plugin-table/src/types/TableOperation.ts`
- `packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx`
- `packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx`
- `packages/plugins/plugin-terra/src/types/Terra.ts`
- `packages/plugins/plugin-terra/src/types/TerraObject.ts`
- `packages/plugins/plugin-theme/src/types/Settings.ts`
- `packages/plugins/plugin-tldraw/src/types/Settings.ts`
- `packages/plugins/plugin-transcription/src/normalization/normalization.ts`
- `packages/plugins/plugin-transcription/src/testing/decorators.ts`
- `packages/plugins/plugin-transcription/src/types/Settings.ts`
- `packages/plugins/plugin-transcription/src/types/TranscriptOperation.ts`
- `packages/plugins/plugin-trello/src/services/trello-api.ts`
- `packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.ts`
- `packages/plugins/plugin-trip/src/types/Booking.ts`
- `packages/plugins/plugin-trip/src/types/BookingSearch.ts`
- `packages/plugins/plugin-trip/src/types/Place.ts`
- `packages/plugins/plugin-trip/src/types/Routing.ts`
- `packages/plugins/plugin-trip/src/types/Segment.ts`
- `packages/plugins/plugin-trip/src/types/Settings.ts`
- `packages/plugins/plugin-typefully/src/capabilities/connector.ts`
- `packages/plugins/plugin-typefully/src/services/typefully-api.ts`
- `packages/plugins/plugin-voxel/src/types/Voxel.ts`
- `packages/plugins/plugin-zen/src/generator/generator.ts`
- `packages/plugins/plugin-zen/src/types/Sequence.ts`
- `packages/sdk/app-framework/src/common/translations.ts`
- `packages/sdk/app-framework/src/core/plugin-manifest.ts`
- `packages/sdk/app-framework/src/core/plugin.ts`
- `packages/sdk/app-toolkit/src/app-graph/DeckSpec.ts`

## Group 08 — Layer constructors are module-level exports, never class statics (`namespace-service-layers`, severity: warn)

<!-- fragment: groups/08.md -->

**Scope:** full project (first pass for this rule)

**Rule instructions:**

In a module marked `@import-as-namespace`, the `Context.Service` tag class
carries the module's own name, so anything hung off it as a `static` forces
consumers to spell that name twice — `StateStore.StateStore.layerSql` instead
of `StateStore.layerSql`. Export layer constructors (`layerMemory`,
`layerSql`, `layer`, …) as module-level `const`s beside the tag, leaving the
class body empty, and give the service's operations module-level accessors
built on `Context.Service.use` for the same reason. Flag a `static layer…`
member on a `Context.Service` subclass, and flag any call site that repeats a
namespace as `Name.Name.member`. A bare `Name.Name` in a TYPE position is not
a violation — the tag genuinely is the type, and there is nowhere else to put
it.

**Files to review (45):**

- `packages/sdk/app-toolkit/src/app/Translations.ts`
- `packages/sdk/app-toolkit/src/echo/TypeOptions.ts`
- `packages/sdk/app-toolkit/src/operations/LayoutOperation.ts`
- `packages/sdk/client-protocol/src/types/SpaceProperties.ts`
- `packages/sdk/client/src/client/client-service.ts`
- `packages/sdk/client/src/testing/data.ts`
- `packages/sdk/config/src/config-service.ts`
- `packages/sdk/observability/src/providers/ip-data.ts`
- `packages/sdk/schema/src/StateMap.test.ts`
- `packages/sdk/schema/src/experimental/json-schema.test.ts`
- `packages/sdk/schema/src/projection/format.ts`
- `packages/sdk/schema/src/testing/deprecated.ts`
- `packages/sdk/schema/src/types/APIKey.ts`
- `packages/sdk/schema/src/util/validate.test.ts`
- `packages/sdk/types/src/types/Actor.ts`
- `packages/sdk/types/src/types/ContentBlock.ts`
- `packages/sdk/types/src/types/Message.ts`
- `packages/sdk/types/src/types/Pipeline.ts`
- `packages/sdk/types/src/types/Provider.ts`
- `packages/sdk/types/src/types/Task.ts`
- `packages/sdk/types/src/types/Thread.ts`
- `packages/sdk/types/src/types/Transcript.ts`
- `packages/sdk/versioning/src/branch.test.ts`
- `packages/sdk/versioning/src/internal/types.ts`
- `packages/sdk/versioning/src/model.test.ts`
- `packages/stories/stories-brain/src/components/CrawlPanel/CrawlPanel.tsx`
- `packages/stories/stories-lens/src/rich-text.ts`
- `packages/ui/react-ui-assistant/src/types.ts`
- `packages/ui/react-ui-attention/src/types/Selection.ts`
- `packages/ui/react-ui-board/src/components/Board/engine.ts`
- `packages/ui/react-ui-board/src/components/Board/types.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/Boolean.tsx`
- `packages/ui/react-ui-canvas-compute/src/shapes/append-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/array-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/audio-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/beacon-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/chat-def.tsx`
- `packages/ui/react-ui-canvas-compute/src/shapes/constant-def.tsx`
- `packages/ui/react-ui-canvas-compute/src/shapes/database-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/defs.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/feed-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/function-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/gpt-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/gpt-realtime-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/json-def.ts`

## Group 09 — Layer constructors are module-level exports, never class statics (`namespace-service-layers`, severity: warn)

<!-- fragment: groups/09.md -->

**Scope:** full project (first pass for this rule)

**Rule instructions:**

In a module marked `@import-as-namespace`, the `Context.Service` tag class
carries the module's own name, so anything hung off it as a `static` forces
consumers to spell that name twice — `StateStore.StateStore.layerSql` instead
of `StateStore.layerSql`. Export layer constructors (`layerMemory`,
`layerSql`, `layer`, …) as module-level `const`s beside the tag, leaving the
class body empty, and give the service's operations module-level accessors
built on `Context.Service.use` for the same reason. Flag a `static layer…`
member on a `Context.Service` subclass, and flag any call site that repeats a
namespace as `Name.Name.member`. A bare `Name.Name` in a TYPE position is not
a violation — the tag genuinely is the type, and there is nowhere else to put
it.

**Files to review (37):**

- `packages/ui/react-ui-canvas-compute/src/shapes/logic-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/rng-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/scope-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/surface-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/switch-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/table-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/template-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/text-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/text-to-image-def.ts`
- `packages/ui/react-ui-canvas-compute/src/shapes/thread-def.ts`
- `packages/ui/react-ui-canvas-editor/src/types/schema.ts`
- `packages/ui/react-ui-canvas-editor/src/types/shapes.ts`
- `packages/ui/react-ui-canvas/src/components/CellGrid/render/static-layer.ts`
- `packages/ui/react-ui-canvas/src/types.ts`
- `packages/ui/react-ui-components/src/components/QueryForm/QueryForm.tsx`
- `packages/ui/react-ui-diagram/src/types/diagram.ts`
- `packages/ui/react-ui-form/src/components/Form/Form.stories.tsx`
- `packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/ArrayField.stories.tsx`
- `packages/ui/react-ui-form/src/components/Form/FormField/fields/BooleanField/BooleanField.stories.tsx`
- `packages/ui/react-ui-form/src/components/Form/FormField/fields/DateField/DateField.stories.tsx`
- `packages/ui/react-ui-form/src/components/Form/FormField/fields/GeoPointField/GeoPointField.stories.tsx`
- `packages/ui/react-ui-form/src/components/Form/FormField/fields/NumberField/NumberField.stories.tsx`
- `packages/ui/react-ui-form/src/components/Form/FormField/fields/PasswordField/PasswordField.stories.tsx`
- `packages/ui/react-ui-form/src/components/Form/FormField/fields/SelectField/SelectField.stories.tsx`
- `packages/ui/react-ui-form/src/components/Form/FormField/fields/TextAreaField/TextAreaField.stories.tsx`
- `packages/ui/react-ui-form/src/components/Form/FormField/fields/TextField/TextField.stories.tsx`
- `packages/ui/react-ui-form/src/components/Form/FormField/fields/TupleField/TupleField.stories.tsx`
- `packages/ui/react-ui-form/src/components/ObjectTree/ObjectTree.stories.tsx`
- `packages/ui/react-ui-form/src/hooks/useFormHandler.test.ts`
- `packages/ui/react-ui-form/src/types.ts`
- `packages/ui/react-ui-form/src/util/omit.ts`
- `packages/ui/react-ui-form/src/util/properties.test.ts`
- `packages/ui/react-ui-list/src/components/Tree/tree-data.ts`
- `packages/ui/react-ui-mcp/src/ToolForm.tsx`
- `packages/ui/react-ui-table/src/model/table-view-state.ts`
- `packages/ui/react-ui-terminal/src/cli/console.ts`
- `packages/ui/ui-editor/src/types/types.ts`

## Group 10 — No sleep or polling in tests (`no-sleep-in-test`, severity: warn)

<!-- fragment: groups/10.md -->

**Scope:** changed since `a794822a5304e5de0dc0adbb6ea85a18fe1e421c`

**Rule instructions:**

Tests must not use `sleep`, `setTimeout`/`setInterval` waits, or busy-poll
loops to synchronize with async work — they are slow and flaky. Prefer a
`Trigger`, `waitForCondition`, an ECHO query subscription, or Effect
`TestClock` (which virtualizes `Effect.sleep`). A real macrotask turn is
acceptable only when a test needs one across runtimes — say so if a flagged
case is that exception.

**Files to review (21):**

- `packages/common/async/src/stream.test.ts`
- `packages/core/compute/compute-runtime/src/ProcessManager.test.ts`
- `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts`
- `packages/core/compute/nlp/src/align-segments.test.ts`
- `packages/core/compute/operation/src/invoker.test.ts`
- `packages/core/compute/operation/src/operation.test.ts`
- `packages/core/echo/echo-client-e2e/src/query.test.ts`
- `packages/core/echo/echo-client/src/proxy-db/database.test.ts`
- `packages/core/echo/echo-host/src/automerge/collection-synchronizer.test.ts`
- `packages/core/mesh/rpc/src/rpc.test.ts`
- `packages/core/mesh/rpc/src/service.test.ts`
- `packages/devtools/cli/src/commands/mcp/serve.test.ts`
- `packages/plugins/plugin-computer/src/operations/operations.test.ts`
- `packages/plugins/plugin-connector/src/Binding.test.ts`
- `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts`
- `packages/plugins/plugin-space/src/operations/open-object-form.test.ts`
- `packages/plugins/plugin-space/src/util/object-form.test.ts`
- `packages/sdk/app-framework/src/core/plugin-manager/plugin-manager.test.ts`
- `packages/sdk/client-services/src/packlets/services/effect-rpc.test.ts`
- `packages/sdk/client/test/e2e/sync.test.ts`
- `packages/sdk/worker-framework/src/Client.test.ts`

## Group 11 — No casts to silence the type-checker (`no-casts`, severity: error)

<!-- fragment: groups/11.md -->

**Scope:** changed since `a794822a5304e5de0dc0adbb6ea85a18fe1e421c`

**Rule instructions:**

Casts that suppress the type system hide the real error. Flag `as any`,
`as unknown as T` (the double-cast escape hatch), widened `any` in signatures,
and the non-null assertion `!` (as in `foo!.bar` or `arr![0]`). Fix the type
at its source. `as const` is allowed — do not flag it, nor a `!` inside a
string literal or comment.

**Files to review (40):**

- `packages/apps/composer-app/src/main.tsx`
- `packages/apps/composer-app/src/playwright/harness-helpers.ts`
- `packages/apps/composer-app/vite.config.ts`
- `packages/common/async/src/stream.ts`
- `packages/common/codec-protobuf/src/service.ts`
- `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts`
- `packages/core/compute/agent-runtime/src/testing/assistant-test-layer.ts`
- `packages/core/compute/ai/src/testing/effect-ai.test.ts`
- `packages/core/compute/ai/src/tools/call.ts`
- `packages/core/compute/ai/src/tools/tool-resolver-service.ts`
- `packages/core/compute/assistant/src/session/toolkit.ts`
- `packages/core/compute/assistant/src/tool-runtime/services.test.ts`
- `packages/core/compute/assistant/src/tool-runtime/services.ts`
- `packages/core/compute/compute-runtime/src/ProcessManager.test.ts`
- `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts`
- `packages/core/compute/compute/src/Operation.test.ts`
- `packages/core/compute/compute/src/Operation.ts`
- `packages/core/compute/compute/src/Trace.ts`
- `packages/core/compute/compute/src/types/Project.test.ts`
- `packages/core/compute/compute/src/types/Template.test.ts`
- `packages/core/compute/compute/src/types/Template.ts`
- `packages/core/compute/crawler/src/testing/index.ts`
- `packages/core/compute/edge-compute/src/bundler/bundler.test.ts`
- `packages/core/compute/functions-testing/src/edge-routine.test.ts`
- `packages/core/compute/mcp-server/src/McpServer.test.ts`
- `packages/core/compute/mcp-server/src/internal/input.test.ts`
- `packages/core/compute/mcp-server/src/internal/input.ts`
- `packages/core/compute/mcp-server/src/internal/wire.test.ts`
- `packages/core/compute/operation/src/invoker.test.ts`
- `packages/core/compute/operation/src/scheduler.test.ts`
- `packages/core/compute/pipeline-discord/src/stages/answer-questions.test.ts`
- `packages/core/echo/echo-client-e2e/src/integration.test.ts`
- `packages/core/echo/echo-client-e2e/src/query.test.ts`
- `packages/core/echo/echo-client-e2e/src/registry.test.ts`
- `packages/core/echo/echo-client/src/proxy-db/database.test.ts`
- `packages/core/echo/echo-client/src/proxy-db/database.ts`
- `packages/core/echo/echo-client/src/proxy-db/rename-migration.test.ts`
- `packages/core/echo/echo-client/src/registry/registry.ts`
- `packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts`
- `packages/core/echo/echo-host/src/filter/filter-match.ts`

## Group 12 — No casts to silence the type-checker (`no-casts`, severity: error)

<!-- fragment: groups/12.md -->

**Scope:** changed since `a794822a5304e5de0dc0adbb6ea85a18fe1e421c`

**Rule instructions:**

Casts that suppress the type system hide the real error. Flag `as any`,
`as unknown as T` (the double-cast escape hatch), widened `any` in signatures,
and the non-null assertion `!` (as in `foo!.bar` or `arr![0]`). Fix the type
at its source. `as const` is allowed — do not flag it, nor a `!` inside a
string literal or comment.

**Files to review (40):**

- `packages/core/echo/echo-host/src/query/query-executor.ts`
- `packages/core/echo/echo-host/src/query/query-planner.test.ts`
- `packages/core/echo/echo-host/src/query/query-planner.ts`
- `packages/core/echo/echo-protocol/src/document-structure.ts`
- `packages/core/echo/echo-query/src/query-lite/query-lite.ts`
- `packages/core/echo/echo/src/Database.ts`
- `packages/core/echo/echo/src/Filter.ts`
- `packages/core/echo/echo/src/Migration.ts`
- `packages/core/echo/echo/src/Obj.ts`
- `packages/core/echo/echo/src/Query.test.ts`
- `packages/core/echo/echo/src/Registry.ts`
- `packages/core/echo/echo/src/internal/Annotation/annotations.ts`
- `packages/core/echo/echo/src/internal/Filter/match.ts`
- `packages/core/echo/echo/src/internal/JsonSchema/json-schema.test.ts`
- `packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts`
- `packages/core/echo/echo/src/internal/common/types/meta.ts`
- `packages/core/echo/feed/src/feed-store.ts`
- `packages/core/echo/index-core/src/indexes/fts-index.test.ts`
- `packages/core/echo/index-core/src/indexes/reverse-ref-index.ts`
- `packages/core/mesh/edge-client/src/base-http-client.ts`
- `packages/core/mesh/edge-client/src/edge-client.ts`
- `packages/core/mesh/edge-client/src/edge-http-client.test.ts`
- `packages/core/mesh/edge-client/src/edge-http-client.ts`
- `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.ts`
- `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-service.ts`
- `packages/core/mesh/rpc/src/rpc.test.ts`
- `packages/core/mesh/rpc/src/rpc.ts`
- `packages/core/mesh/rpc/src/service.test.ts`
- `packages/core/protocols/src/buf/shape-compat.ts`
- `packages/devtools/cli/src/bin.ts`
- `packages/devtools/cli/src/commands/hub/util.ts`
- `packages/devtools/cli/src/commands/mcp/serve.test.ts`
- `packages/devtools/cli/src/util/runtime.ts`
- `packages/devtools/devtools/src/panels/echo/SpaceInfoPanel/SpaceInfoPanel.tsx`
- `packages/devtools/devtools/src/panels/mesh/SignalPanel/SignalMessageTable.tsx`
- `packages/devtools/devtools/src/panels/mesh/SignalPanel/SignalStatusTable.tsx`
- `packages/plugins/plugin-assistant/src/execution-graph/pending-block-status.test.ts`
- `packages/plugins/plugin-assistant/src/operations/fork-chat.ts`
- `packages/plugins/plugin-client/src/commands/halo/index.ts`
- `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx`

## Group 13 — No casts to silence the type-checker (`no-casts`, severity: error)

<!-- fragment: groups/13.md -->

**Scope:** changed since `a794822a5304e5de0dc0adbb6ea85a18fe1e421c`

**Rule instructions:**

Casts that suppress the type system hide the real error. Flag `as any`,
`as unknown as T` (the double-cast escape hatch), widened `any` in signatures,
and the non-null assertion `!` (as in `foo!.bar` or `arr![0]`). Fix the type
at its source. `as const` is allowed — do not flag it, nor a `!` inside a
string literal or comment.

**Files to review (40):**

- `packages/plugins/plugin-connector/src/Binding.ts`
- `packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts`
- `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/create-single-cursor.test.ts`
- `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/reconcile-cursors.test.ts`
- `packages/plugins/plugin-connector/src/capabilities/create-object.ts`
- `packages/plugins/plugin-crx/src/page-actions.test.ts`
- `packages/plugins/plugin-debug/src/components/SpaceGenerator/ObjectGenerator.tsx`
- `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx`
- `packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx`
- `packages/plugins/plugin-deck/src/types/DeckSchema.ts`
- `packages/plugins/plugin-discord/src/services/discord-source.test.ts`
- `packages/plugins/plugin-file-system/src/capabilities/app-graph-builder.ts`
- `packages/plugins/plugin-file/src/extensions/image.tsx`
- `packages/plugins/plugin-inbox/src/capabilities/app-graph-builder.ts`
- `packages/plugins/plugin-inbox/src/components/Initialize/Initialize.tsx`
- `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts`
- `packages/plugins/plugin-lingo/src/containers/index.ts`
- `packages/plugins/plugin-lingo/src/types/Word.test.ts`
- `packages/plugins/plugin-magazine/src/operations/sources/rss.ts`
- `packages/plugins/plugin-map/src/capabilities/app-graph-builder.ts`
- `packages/plugins/plugin-markdown/src/hooks/useExtensions.tsx`
- `packages/plugins/plugin-markdown/src/hooks/useLinkQuery.ts`
- `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts`
- `packages/plugins/plugin-presenter/src/useExitPresenter.ts`
- `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.test.ts`
- `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx`
- `packages/plugins/plugin-routine/src/commands/trigger/util.ts`
- `packages/plugins/plugin-script/src/hooks/useCreateAndDeployScriptTemplates.ts`
- `packages/plugins/plugin-script/src/templates/commentary.ts`
- `packages/plugins/plugin-script/src/templates/forex-effect.ts`
- `packages/plugins/plugin-script/src/templates/gmail.ts`
- `packages/plugins/plugin-search/src/hooks/sync.ts`
- `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts`
- `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts`
- `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts`
- `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.stories.tsx`
- `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx`
- `packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx`
- `packages/plugins/plugin-space/src/containers/index.ts`
- `packages/plugins/plugin-space/src/operations/serialize.test.ts`

## Group 14 — No casts to silence the type-checker (`no-casts`, severity: error)

<!-- fragment: groups/14.md -->

**Scope:** changed since `a794822a5304e5de0dc0adbb6ea85a18fe1e421c`

**Rule instructions:**

Casts that suppress the type system hide the real error. Flag `as any`,
`as unknown as T` (the double-cast escape hatch), widened `any` in signatures,
and the non-null assertion `!` (as in `foo!.bar` or `arr![0]`). Fix the type
at its source. `as const` is allowed — do not flag it, nor a `!` inside a
string literal or comment.

**Files to review (38):**

- `packages/plugins/plugin-space/src/types/SpaceSchema.ts`
- `packages/plugins/plugin-transcription/src/types/TranscriptOperation.ts`
- `packages/sdk/app-framework/src/common/capabilities.ts`
- `packages/sdk/app-framework/src/core/plugin-manager/module-loader.ts`
- `packages/sdk/app-framework/src/core/plugin-manager/plugin-manager.test.ts`
- `packages/sdk/app-framework/src/core/plugin.ts`
- `packages/sdk/app-framework/src/testing/harness.ts`
- `packages/sdk/app-framework/src/testing/react.tsx`
- `packages/sdk/app-framework/src/ui/components/Surface/SurfaceComponent.test.tsx`
- `packages/sdk/app-framework/src/ui/components/Surface/SurfaceComponent.tsx`
- `packages/sdk/app-framework/src/ui/hooks/useApp.tsx`
- `packages/sdk/app-graph/src/graph-builder.ts`
- `packages/sdk/app-toolkit/src/app-framework/AppCapabilities.ts`
- `packages/sdk/app-toolkit/src/app-framework/ObservabilityMapping.ts`
- `packages/sdk/app-toolkit/src/app-framework/progress-trace-sink.test.ts`
- `packages/sdk/client-protocol/src/service-rpc.ts`
- `packages/sdk/client-services/src/packlets/diagnostics/diagnostics.ts`
- `packages/sdk/client-services/src/packlets/services/effect-rpc.test.ts`
- `packages/sdk/client/src/devtools/debug-port-controller.ts`
- `packages/sdk/client/src/edge/edge-blob-backend.test.ts`
- `packages/sdk/client/src/invitations/invitations-proxy.ts`
- `packages/sdk/client/test/e2e/sync.test.ts`
- `packages/sdk/observability/src/extensions/otel/extension.ts`
- `packages/sdk/observability/src/providers/client-observability.ts`
- `packages/sdk/observability/test/e2e/metrics-export.test.ts`
- `packages/sdk/worker-framework/src/Client.ts`
- `packages/sdk/worker-framework/src/Worker.ts`
- `packages/sdk/worker-framework/src/playwright/stress-fleet.ts`
- `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx`
- `packages/ui/react-ui-form/src/components/Form/Form.stories.tsx`
- `packages/ui/react-ui-form/src/components/Form/FormField/FormField.tsx`
- `packages/ui/react-ui-form/src/components/ObjectPicker/ObjectPicker.tsx`
- `packages/ui/react-ui-form/src/components/ObjectTree/ObjectTree.tsx`
- `packages/ui/react-ui-form/src/hooks/useFormHandler.ts`
- `packages/ui/react-ui-form/src/types.ts`
- `packages/ui/ui-editor/src/extensions/language/markdown/formatting.ts`
- `packages/ui/ui-editor/src/extensions/language/xml/xml-tags.test.ts`
- `packages/ui/ui-editor/src/extensions/language/xml/xml-tags.ts`

## Group 15 — No compatibility re-exports when moving code (`no-compat-shims`, severity: warn)

<!-- fragment: groups/15.md -->

**Scope:** changed since `a794822a5304e5de0dc0adbb6ea85a18fe1e421c`

**Rule instructions:**

When code moves, every call site must be updated in the same change — do not
leave a compatibility re-export or shim behind at the old location. Flag
re-export shims kept only for backwards compatibility (e.g. `export * from
'./new-location'` where the implementation used to live) and comments
announcing a temporary compat layer. Genuine barrel/`index.ts` public-API
re-exports are expected — do not flag those.

**Files to review (32):**

- `packages/apps/composer-app/src/functions/_worker.ts`
- `packages/apps/composer-app/src/main.tsx`
- `packages/apps/composer-app/src/pages/recovery.ts`
- `packages/apps/composer-app/src/recovery/dxos-globals.ts`
- `packages/common/async/src/index.ts`
- `packages/common/codec-protobuf/src/index.ts`
- `packages/common/util/src/index.ts`
- `packages/core/compute/assistant-toolkit/src/skills/chat-context/operations/index.ts`
- `packages/core/compute/assistant-toolkit/src/skills/index.ts`
- `packages/core/compute/assistant-toolkit/src/skills/project/skill.ts`
- `packages/core/compute/assistant/src/util/artifact.ts`
- `packages/core/compute/compute/src/Operation.ts`
- `packages/core/compute/compute/src/types/Skill.ts`
- `packages/core/compute/crawler/src/index.ts`
- `packages/core/compute/mcp-server/src/McpServer.ts`
- `packages/core/compute/mcp-server/src/index.ts`
- `packages/core/compute/nlp/src/index.ts`
- `packages/core/compute/pipeline-discord/src/stores/index.ts`
- `packages/core/echo/echo-client/src/proxy-db/database.ts`
- `packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts`
- `packages/core/echo/echo-host/src/query/query-planner.ts`
- `packages/core/echo/echo-protocol/src/document-structure.ts`
- `packages/core/echo/echo-query/src/query-lite/query-lite.ts`
- `packages/core/echo/echo/src/Database.ts`
- `packages/core/echo/echo/src/index.ts`
- `packages/core/echo/echo/src/internal/common/types/meta.ts`
- `packages/core/halo/keyring/src/keyring.ts`
- `packages/core/halo/keyring/src/sqlite-keyring.ts`
- `packages/core/mesh/edge-client/src/base-http-client.ts`
- `packages/core/protocols/src/buf/shape-compat.test.ts`
- `packages/core/protocols/src/buf/shape-compat.ts`
- `packages/devtools/cli/src/util/skills.ts`

## Group 16 — No compatibility re-exports when moving code (`no-compat-shims`, severity: warn)

<!-- fragment: groups/16.md -->

**Scope:** changed since `a794822a5304e5de0dc0adbb6ea85a18fe1e421c`

**Rule instructions:**

When code moves, every call site must be updated in the same change — do not
leave a compatibility re-export or shim behind at the old location. Flag
re-export shims kept only for backwards compatibility (e.g. `export * from
'./new-location'` where the implementation used to live) and comments
announcing a temporary compat layer. Genuine barrel/`index.ts` public-API
re-exports are expected — do not flag those.

**Files to review (32):**

- `packages/plugins/plugin-connector/src/capabilities/connector-coordinator/connector-coordinator.ts`
- `packages/plugins/plugin-connector/src/capabilities/index.ts`
- `packages/plugins/plugin-connector/src/skills/index.ts`
- `packages/plugins/plugin-debug/src/operations/index.ts`
- `packages/plugins/plugin-debug/src/types/index.ts`
- `packages/plugins/plugin-file-system/src/capabilities/index.ts`
- `packages/plugins/plugin-file-system/src/capabilities/state/index.ts`
- `packages/plugins/plugin-file-system/src/containers/index.ts`
- `packages/plugins/plugin-file-system/src/hooks/index.ts`
- `packages/plugins/plugin-file-system/src/index.ts`
- `packages/plugins/plugin-file-system/src/types/index.ts`
- `packages/plugins/plugin-google/src/operations/mail/sync/fetch.ts`
- `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx`
- `packages/plugins/plugin-inbox/src/operations/extractor/extract-contact.ts`
- `packages/plugins/plugin-inbox/src/sync/mail-sync.ts`
- `packages/plugins/plugin-inbox/src/types/InboxOperation.ts`
- `packages/plugins/plugin-jmap/src/operations/mail/sync/sync-provider.ts`
- `packages/plugins/plugin-lingo/src/components/Flashcard/index.ts`
- `packages/plugins/plugin-lingo/src/components/ReaderPane/index.ts`
- `packages/plugins/plugin-lingo/src/components/WordList/index.ts`
- `packages/plugins/plugin-lingo/src/components/index.ts`
- `packages/plugins/plugin-lingo/src/extensions/index.ts`
- `packages/plugins/plugin-lingo/src/index.ts`
- `packages/plugins/plugin-lingo/src/types/index.ts`
- `packages/plugins/plugin-lingo/src/util/index.ts`
- `packages/plugins/plugin-magazine/src/types/Magazine.ts`
- `packages/plugins/plugin-magazine/src/types/Subscription.ts`
- `packages/plugins/plugin-onboarding/src/capabilities/index.ts`
- `packages/plugins/plugin-projects/src/types/ProjectMcpOperation.ts`
- `packages/plugins/plugin-registry/src/operations/index.ts`
- `packages/plugins/plugin-registry/src/skills/index.ts`
- `packages/plugins/plugin-search/src/hooks/index.ts`

## Group 17 — No compatibility re-exports when moving code (`no-compat-shims`, severity: warn)

<!-- fragment: groups/17.md -->

**Scope:** changed since `a794822a5304e5de0dc0adbb6ea85a18fe1e421c`

**Rule instructions:**

When code moves, every call site must be updated in the same change — do not
leave a compatibility re-export or shim behind at the old location. Flag
re-export shims kept only for backwards compatibility (e.g. `export * from
'./new-location'` where the implementation used to live) and comments
announcing a temporary compat layer. Genuine barrel/`index.ts` public-API
re-exports are expected — do not flag those.

**Files to review (30):**

- `packages/plugins/plugin-space/src/capabilities/index.ts`
- `packages/plugins/plugin-space/src/capabilities/workerd.ts`
- `packages/plugins/plugin-space/src/operations/index.ts`
- `packages/plugins/plugin-space/src/skills/index.ts`
- `packages/plugins/plugin-space/src/types/SpaceSchema.ts`
- `packages/plugins/plugin-space/src/util/index.ts`
- `packages/sdk/app-framework/src/core/plugin-manager/plugin-manager.ts`
- `packages/sdk/app-graph/src/graph-builder.ts`
- `packages/sdk/app-toolkit/src/app-framework/AppCapability.ts`
- `packages/sdk/app-toolkit/src/app-framework/index.ts`
- `packages/sdk/app-toolkit/src/app/index.ts`
- `packages/sdk/app-toolkit/src/echo/AppSpace.ts`
- `packages/sdk/app-toolkit/src/echo/index.ts`
- `packages/sdk/app-toolkit/src/ui/components/index.ts`
- `packages/sdk/client-protocol/src/service.ts`
- `packages/sdk/observability/src/observability-extension.ts`
- `packages/sdk/observability/src/observability.ts`
- `packages/sdk/observability/src/providers/index.ts`
- `packages/ui/react-ui-components/src/components/ProgressMeter/index.ts`
- `packages/ui/react-ui-components/src/components/index.ts`
- `packages/ui/react-ui/src/components/Popover/Popover.tsx`
- `packages/ui/react-ui/src/components/Progress/Progress.tsx`
- `packages/ui/react-ui/src/components/Progress/index.ts`
- `packages/ui/react-ui/src/components/Stepper/index.ts`
- `packages/ui/react-ui/src/components/TextCrawl/index.ts`
- `packages/ui/react-ui/src/components/TextCrawl/sizes.ts`
- `packages/ui/react-ui/src/components/index.ts`
- `packages/ui/react-ui/src/theme/index.ts`
- `packages/ui/ui-editor/src/extensions/decoration/index.ts`
- `packages/ui/ui-editor/src/extensions/language/markdown/index.ts`

## Group 18 — SDK and app code uses the public ECHO API (`no-echo-internal-in-sdk`, severity: warn)

<!-- fragment: groups/18.md -->

**Scope:** changed since `a794822a5304e5de0dc0adbb6ea85a18fe1e421c`

**Rule instructions:**

`@dxos/echo/internal` is ECHO's private surface and carries no compatibility
guarantee, so sdk, plugin, and app code must import from the public entry
(`@dxos/echo`) whenever an equivalent exists — e.g. `Annotation.make` in place
of `createAnnotationHelper`, `Obj`/`Ref`/`Type` in place of their internal
counterparts. Flag an `@dxos/echo/internal` import and name the public
alternative. Do not flag an import with no public equivalent; say so instead.
Packages under `packages/core/echo/**` are ECHO itself — never flag those.

**Files to review (2):**

- `packages/plugins/plugin-review/src/operations/add-message.ts`
- `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx`

## Group 19 — New packages must be private (`private-new-packages`, severity: error)

<!-- fragment: groups/19.md -->

**Scope:** changed since `a794822a5304e5de0dc0adbb6ea85a18fe1e421c`

**Rule instructions:**

Every newly-added package must set `"private": true` in its `package.json`;
the flag is removed manually only once a trusted publisher exists. Flag a
`package.json` that is newly added in this change and lacks `"private": true`.
Do not flag existing published packages that are merely modified. If you
cannot tell whether the package is new, note the uncertainty rather than
asserting a violation.

**Files to review (38):**

- `packages/apps/composer-app/package.json`
- `packages/apps/composer-crx/package.json`
- `packages/common/codec-protobuf/package.json`
- `packages/common/eslint-plugin-rules/src/__fixtures__/operation-keys/package.json`
- `packages/common/protobuf-compiler/package.json`
- `packages/common/util/package.json`
- `packages/core/compute/assistant-e2e/package.json`
- `packages/core/compute/assistant-evals/package.json`
- `packages/core/compute/assistant-toolkit/package.json`
- `packages/core/compute/functions-testing/package.json`
- `packages/core/compute/mcp-server/package.json`
- `packages/core/echo/echo-host/package.json`
- `packages/core/echo/echo/package.json`
- `packages/core/halo/keyring/package.json`
- `packages/core/mesh/edge-client/package.json`
- `packages/core/mesh/network-manager/package.json`
- `packages/core/protocols/package.json`
- `packages/devtools/cli/package.json`
- `packages/e2e/rpc-tunnel-e2e/package.json`
- `packages/plugins/plugin-connector/package.json`
- `packages/plugins/plugin-debug/package.json`
- `packages/plugins/plugin-file-system/package.json`
- `packages/plugins/plugin-lingo/package.json`
- `packages/plugins/plugin-magazine/package.json`
- `packages/plugins/plugin-observability/package.json`
- `packages/plugins/plugin-progress/package.json`
- `packages/plugins/plugin-projects/package.json`
- `packages/plugins/plugin-registry/package.json`
- `packages/plugins/plugin-space/package.json`
- `packages/sdk/app-toolkit/package.json`
- `packages/sdk/client/package.json`
- `packages/sdk/observability/package.json`
- `packages/sdk/react-client/package.json`
- `packages/sdk/worker-framework/package.json`
- `packages/stories/stories-inbox/package.json`
- `packages/ui/react-primitives/react-hooks/package.json`
- `packages/ui/react-ui-components/package.json`
- `packages/ui/react-ui-form/package.json`

## Group 20 — In-repo deps use the workspace protocol (`workspace-deps`, severity: error)

<!-- fragment: groups/20.md -->

**Scope:** changed since `a794822a5304e5de0dc0adbb6ea85a18fe1e421c`

**Rule instructions:**

Any in-repo `@dxos/*` dependency must use the workspace protocol, never a
version range or the catalog. Flag an `@dxos/*` entry in
`dependencies`/`devDependencies` that is not `workspace:*`. In
`peerDependencies` it must be `workspace:^` (caret) — a `workspace:*` peer
reads as out-of-range on any bump and cascades a spurious major, so flag a
`*` peer too. Ignore `@dxos/*` names external to this monorepo.

**Files to review (38):**

- `packages/apps/composer-app/package.json`
- `packages/apps/composer-crx/package.json`
- `packages/common/codec-protobuf/package.json`
- `packages/common/eslint-plugin-rules/src/__fixtures__/operation-keys/package.json`
- `packages/common/protobuf-compiler/package.json`
- `packages/common/util/package.json`
- `packages/core/compute/assistant-e2e/package.json`
- `packages/core/compute/assistant-evals/package.json`
- `packages/core/compute/assistant-toolkit/package.json`
- `packages/core/compute/functions-testing/package.json`
- `packages/core/compute/mcp-server/package.json`
- `packages/core/echo/echo-host/package.json`
- `packages/core/echo/echo/package.json`
- `packages/core/halo/keyring/package.json`
- `packages/core/mesh/edge-client/package.json`
- `packages/core/mesh/network-manager/package.json`
- `packages/core/protocols/package.json`
- `packages/devtools/cli/package.json`
- `packages/e2e/rpc-tunnel-e2e/package.json`
- `packages/plugins/plugin-connector/package.json`
- `packages/plugins/plugin-debug/package.json`
- `packages/plugins/plugin-file-system/package.json`
- `packages/plugins/plugin-lingo/package.json`
- `packages/plugins/plugin-magazine/package.json`
- `packages/plugins/plugin-observability/package.json`
- `packages/plugins/plugin-progress/package.json`
- `packages/plugins/plugin-projects/package.json`
- `packages/plugins/plugin-registry/package.json`
- `packages/plugins/plugin-space/package.json`
- `packages/sdk/app-toolkit/package.json`
- `packages/sdk/client/package.json`
- `packages/sdk/observability/package.json`
- `packages/sdk/react-client/package.json`
- `packages/sdk/worker-framework/package.json`
- `packages/stories/stories-inbox/package.json`
- `packages/ui/react-primitives/react-hooks/package.json`
- `packages/ui/react-ui-components/package.json`
- `packages/ui/react-ui-form/package.json`
