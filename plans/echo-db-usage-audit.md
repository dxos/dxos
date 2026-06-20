# `@dxos/echo-db` Usage Audit

Audit of all imports and dependency declarations for `@dxos/echo-db` across the monorepo, grouped by usage kind.

---

## 1. Document Text Editing (Automerge / CRDT)

Symbols: `createDocAccessor`, `DocAccessor`, `updateText`, `getTextInRange`, `getRangeFromCursor`, `toCursor`, `fromCursor`, `toCursorRange`, `IDocHandle`

These provide the bridge between ECHO objects and automerge documents, used heavily by editor and plugin code.

| File                                                                                          | Symbols                                                                  |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `packages/ui/ui-editor/src/extensions/automerge/automerge.ts`                                 | `DocAccessor`                                                            |
| `packages/ui/ui-editor/src/extensions/automerge/cursor.ts`                                    | `type DocAccessor`, `fromCursor`, `toCursor`                             |
| `packages/ui/ui-editor/src/extensions/automerge/sync.ts`                                      | `type IDocHandle`                                                        |
| `packages/ui/ui-editor/src/extensions/automerge/update-automerge.ts`                          | `type IDocHandle`                                                        |
| `packages/ui/ui-editor/src/extensions/automerge/automerge.test.tsx`                           | `type IDocHandle`                                                        |
| `packages/ui/ui-editor/src/extensions/factories.ts`                                           | `type DocAccessor`                                                       |
| `packages/ui/react-ui-editor/src/components/Editor/Editor.stories.tsx`                        | `createDocAccessor`, `createObject`                                      |
| `packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx`                               | `DocAccessor`, `createDocAccessor`                                       |
| `packages/ui/react-ui-form/src/components/Form/fields/MarkdownField.tsx`                      | `createDocAccessor`                                                      |
| `packages/plugins/plugin-markdown/src/capabilities/anchor-sort.ts`                            | `createDocAccessor`, `getRangeFromCursor`                                |
| `packages/plugins/plugin-markdown/src/capabilities/comment-config.ts`                         | `createDocAccessor`, `getTextInRange`                                    |
| `packages/plugins/plugin-markdown/src/hooks/useExtensions.tsx`                                | `createDocAccessor`                                                      |
| `packages/plugins/plugin-markdown/src/operations/update-markdown.ts`                          | `DocAccessor`, `createDocAccessor`                                       |
| `packages/plugins/plugin-native-filesystem/src/capabilities/state/markdown-documents.ts`      | `updateText`                                                             |
| `packages/plugins/plugin-outliner/src/components/Outline/Outline.tsx`                         | `createDocAccessor`                                                      |
| `packages/plugins/plugin-outliner/src/types/Journal.ts`                                       | `updateText`                                                             |
| `packages/plugins/plugin-thread/src/capabilities/agent-runner.ts`                             | `createDocAccessor`, `getRangeFromCursor`, `toCursorRange`, `updateText` |
| `packages/plugins/plugin-thread/src/extensions/threads.ts`                                    | `createDocAccessor`, `getTextInRange`                                    |
| `packages/plugins/plugin-thread/src/operations/create-proposals.ts`                           | `createDocAccessor`                                                      |
| `packages/plugins/plugin-script/src/skills/functions/update.ts`                               | `DocAccessor`, `createDocAccessor`                                       |
| `packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx`                | `createDocAccessor`                                                      |
| `packages/plugins/plugin-script/src/components/QueryEditor/QueryEditor.stories.tsx`           | `createDocAccessor`                                                      |
| `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx` | `createDocAccessor`                                                      |
| `packages/plugins/plugin-script/src/containers/ScriptArticle/ScriptArticle.tsx`               | `createDocAccessor`                                                      |
| `packages/plugins/plugin-script/src/templates/commentary.ts`                                  | `createDocAccessor`                                                      |
| `packages/plugins/plugin-sketch/src/components/actions.ts`                                    | `createDocAccessor`                                                      |
| `packages/plugins/plugin-sketch/src/hooks/useStoreAdapter.ts`                                 | `createDocAccessor`                                                      |
| `packages/plugins/plugin-sketch/src/util/base-adapter.ts`                                     | `type DocAccessor`                                                       |
| `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx`                     | `createDocAccessor`                                                      |
| `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx`                     | `createDocAccessor`                                                      |
| `packages/plugins/plugin-generator/src/components/PromptEditor/PromptEditor.tsx`              | `createDocAccessor`                                                      |
| `packages/plugins/plugin-sheet/src/components/SheetContent/SheetCellEditor.stories.tsx`       | `createDocAccessor`                                                      |
| `packages/plugins/plugin-sheet/src/components/SheetContent/util.ts`                           | `createDocAccessor`                                                      |
| `packages/plugins/plugin-assistant/src/components/TemplateEditor/TemplateEditor.tsx`          | `createDocAccessor`                                                      |
| `packages/core/compute/assistant/src/util/diff.ts`                                            | `DocAccessor`, `toCursorRange`                                           |
| `packages/core/compute/assistant/src/util/diff.test.ts`                                       | `createDocAccessor`                                                      |
| `packages/core/echo/echo-generator/src/data.ts`                                               | `createDocAccessor`                                                      |
| `packages/apps/testbench-app/src/components/ItemList.tsx`                                     | `createDocAccessor`                                                      |
| `packages/stories/stories-assistant/src/components/TasksModule.tsx`                           | `createDocAccessor`                                                      |
| `packages/e2e/blade-runner/src/replicants/echo-replicant.ts`                                  | `createDocAccessor`                                                      |

---

## 2. Feed / Effect Service Layer

Symbols: `createFeedServiceLayer`, `makeFeedService`, `type Queue`, `type QueueFactory`

Used to wire up the Effect-based `Feed.FeedService` for async messaging and operation queues.

| File                                                                                          | Symbols                                       |
| --------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `packages/core/compute/functions/src/protocol/protocol.ts`                                    | `createFeedServiceLayer`, `type QueueFactory` |
| `packages/core/compute-runtime/src/testing/layer.ts`                                          | `makeFeedService`, `type QueueFactory`        |
| `packages/core/compute/functions-runtime/src/testing/services.ts`                             | `makeFeedService`, `type QueueFactory`        |
| `packages/devtools/devtools/src/panels/edge/WorkflowPanel/WorkflowDebugPanel.tsx`             | `makeFeedService`                             |
| `packages/devtools/cli-util/src/util/space.ts`                                                | `createFeedServiceLayer`                      |
| `packages/devtools/cli/src/commands/chat/processor.ts`                                        | `createFeedServiceLayer`                      |
| `packages/plugins/plugin-client/src/capabilities/layer-specs.ts`                              | `createFeedServiceLayer`                      |
| `packages/plugins/plugin-assistant/src/hooks/useChatProcessor.ts`                             | `createFeedServiceLayer`                      |
| `packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts`                             | `createFeedServiceLayer`                      |
| `packages/plugins/plugin-assistant/src/operations/create-chat.ts`                             | `createFeedServiceLayer`                      |
| `packages/plugins/plugin-assistant/src/operations/run-prompt-in-new-chat.ts`                  | `createFeedServiceLayer`                      |
| `packages/plugins/plugin-assistant/src/feed-logger.ts`                                        | `type Queue`                                  |
| `packages/plugins/plugin-discord/src/operations/sync.ts`                                      | `createFeedServiceLayer`                      |
| `packages/plugins/plugin-slack/src/operations/sync.ts`                                        | `createFeedServiceLayer`                      |
| `packages/plugins/plugin-thread/src/containers/ChannelArticle/ChannelArticle.stories.tsx`     | `createFeedServiceLayer`                      |
| `packages/plugins/plugin-thread/src/operations/append-channel-message.ts`                     | `createFeedServiceLayer`                      |
| `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.stories.tsx`    | `createFeedServiceLayer`                      |
| `packages/plugins/plugin-inbox/src/testing/data.ts`                                           | `createFeedServiceLayer`                      |
| `packages/plugins/plugin-pipeline/src/containers/PipelineArticle/PipelineArticle.stories.tsx` | `createFeedServiceLayer`                      |
| `packages/stories/stories-assistant/src/stories/Projects.stories.tsx`                         | `createFeedServiceLayer`                      |
| `packages/stories/stories-assistant/src/testing/ModuleContainer.tsx`                          | `createFeedServiceLayer`                      |
| `packages/stories/stories-assistant/src/testing/testing.tsx`                                  | `createFeedServiceLayer`                      |

---

## 3. Database / Client Interfaces

Symbols: `EchoClient`, `type EchoDatabase`, `EchoDatabaseImpl`, `type CoreDatabase`, `type SpaceSyncState`

Core database and client type surface used in the SDK, runtime adapters, and devtools.

| File                                                                          | Symbols                                                                                                     |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `packages/sdk/client/src/client/client.ts`                                    | `EchoClient`                                                                                                |
| `packages/sdk/client/src/echo/space-list.ts`                                  | `type EchoClient`, `Filter`, `Query`                                                                        |
| `packages/sdk/client/src/echo/space-proxy.ts`                                 | `type EchoClient`, `type EchoDatabase`, `type EchoDatabaseImpl`, `type QueueFactory`, `type SpaceSyncState` |
| `packages/sdk/client/src/echo/util.ts`                                        | `type SpaceSyncState`                                                                                       |
| `packages/sdk/client-protocol/src/space.ts`                                   | `type EchoDatabase`, `type QueueFactory`, `type SpaceSyncState`                                             |
| `packages/core/compute/functions/src/protocol/protocol.ts`                    | `EchoClient`, `type EchoDatabaseImpl`                                                                       |
| `packages/core/compute/functions-runtime-cloudflare/src/functions-client.ts`  | `EchoClient`                                                                                                |
| `packages/core/compute/functions-runtime-cloudflare/src/space-proxy.ts`       | `type CoreDatabase`, `type EchoClient`, `type EchoDatabaseImpl`                                             |
| `packages/core/compute-runtime/src/testing/layer.ts`                          | `type EchoDatabaseImpl`                                                                                     |
| `packages/plugins/plugin-space/src/operations/snapshot.ts`                    | `EchoDatabaseImpl`                                                                                          |
| `packages/devtools/devtools/src/panels/echo/SpaceInfoPanel/SyncStateInfo.tsx` | `type SpaceSyncState`                                                                                       |
| `packages/sdk/client/test/e2e/edge-recovery.test.ts`                          | `type SpaceSyncState`                                                                                       |
| `packages/sdk/client/test/e2e/sync.test.ts`                                   | `type SpaceSyncState`                                                                                       |
| `packages/e2e/blade-runner/src/replicants/echo-replicant.ts`                  | `type EchoDatabaseImpl`                                                                                     |

---

## 4. Query / Filtering

Symbols: `Filter`, `Query`, `type QueryResult`, `QueryResultImpl`, `type QueryContext`

| File                                                         | Symbols                                |
| ------------------------------------------------------------ | -------------------------------------- |
| `packages/sdk/client/src/echo/space-list.ts`                 | `Filter`, `Query`                      |
| `packages/sdk/client/src/echo/import.ts`                     | `Filter`                               |
| `packages/sdk/client/src/tests/client.test.ts`               | `Filter`                               |
| `packages/sdk/client/src/tests/indexing.test.ts`             | `Filter`                               |
| `packages/sdk/client/src/edge/client-edge-api.ts`            | `type QueryContext`, `QueryResultImpl` |
| `packages/e2e/blade-runner/src/replicants/echo-replicant.ts` | `type QueryResult`                     |
| `packages/e2e/blade-runner/src/spec/query.ts`                | `type QueryResult`                     |

---

## 5. Object Creation & Internal Access

Symbols: `createObject`, `getObjectCore`, `ObjectCore`

| File                                                                      | Symbols         |
| ------------------------------------------------------------------------- | --------------- |
| `packages/core/echo/echo-atom/src/atom.test.ts`                           | `createObject`  |
| `packages/core/echo/echo-atom/src/batching.test.ts`                       | `createObject`  |
| `packages/core/echo/echo-atom/src/reactivity.test.ts`                     | `createObject`  |
| `packages/core/echo/echo-react/src/useObject.test.tsx`                    | `createObject`  |
| `packages/core/echo/echo-solid/src/useObject.test.tsx`                    | `createObject`  |
| `packages/plugins/plugin-script/src/testing/test-notebook.ts`             | `createObject`  |
| `packages/plugins/plugin-sketch/src/components/Sketch/Sketch.stories.tsx` | `createObject`  |
| `packages/ui/react-ui-editor/src/components/Editor/Editor.stories.tsx`    | `createObject`  |
| `packages/core/echo/echo-generator/src/generator.test.ts`                 | `getObjectCore` |
| `packages/plugins/plugin-sheet/src/serializer.ts`                         | `getObjectCore` |
| `packages/plugins/plugin-sketch/src/util/serializer.ts`                   | `getObjectCore` |
| `packages/sdk/client/src/tests/spaces.test.ts`                            | `getObjectCore` |
| `packages/sdk/migrations/src/migration-builder.ts`                        | `ObjectCore`    |

---

## 6. Schema Registry

Symbols: `RuntimeSchemaRegistry`, `DatabaseSchemaRegistry`

| File                                                    | Symbols                                           |
| ------------------------------------------------------- | ------------------------------------------------- |
| `packages/core/echo/echo-atom/src/query-atom.test.ts`   | `RuntimeSchemaRegistry`                           |
| `packages/sdk/schema/src/projection/projection.test.ts` | `DatabaseSchemaRegistry`, `RuntimeSchemaRegistry` |
| `packages/sdk/schema/src/types/View.test.ts`            | `RuntimeSchemaRegistry`                           |

---

## 7. Object Versioning / History

Symbols: `type ObjectVersion`, `ObjectVersion`, `getVersion`, `checkoutVersion`, `getEditHistory`

Used by the AI assistant for artifact diffs and the devtools for version history.

| File                                                                       | Symbols                             |
| -------------------------------------------------------------------------- | ----------------------------------- |
| `packages/core/compute/assistant/src/request/artifact-diff.ts`             | `type ObjectVersion`                |
| `packages/core/compute/assistant/src/request/format.ts`                    | `ObjectVersion`                     |
| `packages/core/compute/assistant/src/request/version-pin.ts`               | `type ObjectVersion`, `getVersion`  |
| `packages/devtools/devtools/src/panels/echo/ObjectsPanel/ObjectsPanel.tsx` | `checkoutVersion`, `getEditHistory` |

---

## 8. Serialization / Space Export

Symbols: `Serializer`, `type SerializedSpace`, `type SerializedFeed`, `decodeDXNFromJSON`

| File                                                                                | Symbols                                                   |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `packages/sdk/client/src/echo/import.ts`                                            | `type SerializedSpace`, `Serializer`, `decodeDXNFromJSON` |
| `packages/sdk/client/src/tests/spaces.test.ts`                                      | `Serializer`                                              |
| `packages/sdk/client-services/src/packlets/space-export/serialized-space-reader.ts` | `type SerializedSpace`                                    |
| `packages/sdk/client-services/src/packlets/space-export/serialized-space-writer.ts` | `type SerializedFeed`, `type SerializedSpace`             |
| `packages/sdk/client-services/src/packlets/space-export/space-archive.test.ts`      | `type SerializedSpace`                                    |
| `packages/plugins/plugin-space/src/operations/snapshot.ts`                          | `Serializer`                                              |
| `packages/devtools/devtools/src/panels/echo/SpaceListPanel/backup.ts`               | `type SerializedSpace`                                    |
| `packages/apps/testbench-app/src/util/backup.ts`                                    | `type SerializedSpace`, `Serializer`                      |
| `packages/e2e/proto-guard/src/space-json-dump.ts`                                   | `Serializer`                                              |
| `packages/devtools/cli-util/src/util/space.ts`                                      | (via `createFeedServiceLayer`)                            |

---

## 9. Document Migration (Automerge internals)

Symbols: `migrateDocument`, `type DocHandleProxy`, `type RepoProxy`

Only used by the SDK migrations package.

| File                                               | Symbols                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| `packages/sdk/migrations/src/migration-builder.ts` | `type DocHandleProxy`, `ObjectCore`, `type RepoProxy`, `migrateDocument` |

---

## 10. Re-exports (SDK barrel)

`packages/sdk/client/src/echo/index.ts` re-exports the following from `@dxos/echo-db` under the public `@dxos/client` surface:

- `createFeedServiceLayer`
- `createObject`
- `createSubscription`
- `type ObjectMigration`
- `type Selection`
- `type SubscriptionHandle`

---

## 11. Test Utilities (`@dxos/echo-db/testing`)

Symbols: `EchoTestBuilder`, `TestDatabaseLayer`, `EchoTestPeer`, `TestReplicator`, `TestReplicatorConnection`, `createDataAssertion`

| File                                                                                         | Symbols                                                                                |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `packages/core/echo/echo-atom/src/atom.test.ts`                                              | `EchoTestBuilder`                                                                      |
| `packages/core/echo/echo-atom/src/query-atom.test.ts`                                        | `EchoTestBuilder`                                                                      |
| `packages/core/echo/echo-atom/src/ref-atom.test.ts`                                          | `EchoTestBuilder`                                                                      |
| `packages/core/echo/echo-solid/src/useQuery.test.tsx`                                        | `EchoTestBuilder`                                                                      |
| `packages/core/echo/echo-solid/src/useSchema.test.tsx`                                       | `EchoTestBuilder`                                                                      |
| `packages/core/compute/assistant/src/util/diff.test.ts`                                      | `EchoTestBuilder`                                                                      |
| `packages/core/compute/conductor/src/compiler/fiber-compiler.test.ts`                        | `TestDatabaseLayer`                                                                    |
| `packages/core/compute/conductor/src/nodes/gpt/gpt.test.ts`                                  | `EchoTestBuilder`                                                                      |
| `packages/core/compute/conductor/src/sequence/Sequence.test.ts`                              | `EchoTestBuilder`                                                                      |
| `packages/core/compute/conductor/src/tests/gpt.test.ts`                                      | `TestDatabaseLayer`                                                                    |
| `packages/core/compute/conductor/src/tests/streaming.test.ts`                                | `TestDatabaseLayer`                                                                    |
| `packages/core/compute/conductor/src/types/compute.test.ts`                                  | `TestDatabaseLayer`                                                                    |
| `packages/core/compute/conductor/src/workflow/workflow.test.ts`                              | `TestDatabaseLayer`                                                                    |
| `packages/core/compute/functions-runtime/src/assistant-session-tests/session.test.ts`        | `TestDatabaseLayer`                                                                    |
| `packages/core/compute/functions-runtime/src/services/function-invocation-service.test.ts`   | `TestDatabaseLayer`                                                                    |
| `packages/core/compute/functions-runtime/src/triggers/trigger-dispatcher.test.ts`            | `TestDatabaseLayer`                                                                    |
| `packages/core/compute-runtime/src/testing/layer.ts`                                         | `EchoTestBuilder`                                                                      |
| `packages/sdk/schema/src/projection/projection.test.ts`                                      | `EchoTestBuilder`                                                                      |
| `packages/sdk/schema/src/types/View.test.ts`                                                 | `EchoTestBuilder`                                                                      |
| `packages/sdk/types/src/testing/generator.test.ts`                                           | `EchoTestBuilder`                                                                      |
| `packages/plugins/plugin-feed/src/operations/curate-magazine.test.ts`                        | `EchoTestBuilder`                                                                      |
| `packages/plugins/plugin-github/src/operations/sync.test.ts`                                 | `EchoTestBuilder`                                                                      |
| `packages/plugins/plugin-inbox/src/operations/extract-message.test.ts`                       | `EchoTestBuilder`                                                                      |
| `packages/plugins/plugin-integration/src/operations/set-integration-targets.test.ts`         | `EchoTestBuilder`                                                                      |
| `packages/plugins/plugin-kanban/src/types/migrations.test.ts`                                | `EchoTestBuilder`                                                                      |
| `packages/plugins/plugin-linear/src/operations/sync.test.ts`                                 | `EchoTestBuilder`                                                                      |
| `packages/plugins/plugin-outliner/src/types/Journal.test.ts`                                 | `EchoTestBuilder`                                                                      |
| `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/shared.test.ts` | `EchoTestBuilder`                                                                      |
| `packages/plugins/plugin-trello/src/operations/handlers.test.ts`                             | `EchoTestBuilder`                                                                      |
| `packages/plugins/plugin-trello/src/operations/sync.test.ts`                                 | `EchoTestBuilder`                                                                      |
| `packages/plugins/plugin-trip/src/operations/extractor/TravelMessageExtractor.test.ts`       | `EchoTestBuilder`                                                                      |
| `packages/plugins/plugin-trip/src/types/Trip.test.ts`                                        | `EchoTestBuilder`                                                                      |
| `packages/e2e/blade-runner/src/redis/redis.node.test.ts`                                     | `EchoTestBuilder`, `TestReplicator`, `TestReplicatorConnection`, `createDataAssertion` |
| `packages/e2e/blade-runner/src/replicants/echo-replicant.ts`                                 | `EchoTestPeer`                                                                         |

---

## 12. Dependency Declarations (package.json)

71 packages declare `@dxos/echo-db` as a dependency. All use `workspace:*` except `plugin-trip` which pins `workspace:^0.8.3`.

**By domain:**

| Domain       | Packages                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Echo core    | `echo-atom`, `echo-db` (self), `echo-generator`, `echo-react`, `echo-solid`                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Compute      | `ai`, `assistant`, `assistant-toolkit`, `compute-hyperformula`, `compute-runtime`, `conductor`, `functions`, `functions-runtime`, `functions-runtime-cloudflare`, `operation`                                                                                                                                                                                                                                                                                                                                                                    |
| SDK          | `app-framework`, `app-graph`, `client`, `client-protocol`, `client-services`, `migrations`, `react-edge-client`, `schema`, `types`                                                                                                                                                                                                                                                                                                                                                                                                               |
| Plugins      | `plugin-assistant` (×2), `plugin-automation`, `plugin-chess`, `plugin-client`, `plugin-code`, `plugin-discord`, `plugin-feed`, `plugin-generator`, `plugin-github`, `plugin-inbox`, `plugin-integration`, `plugin-kanban`, `plugin-linear`, `plugin-markdown`, `plugin-meeting`, `plugin-native-filesystem`, `plugin-outliner`, `plugin-pipeline`, `plugin-preview`, `plugin-script`, `plugin-sheet`, `plugin-sketch`, `plugin-slack`, `plugin-space`, `plugin-support`, `plugin-thread`, `plugin-transcription`, `plugin-trello`, `plugin-trip` |
| UI           | `react-ui-canvas-compute`, `react-ui-editor`, `react-ui-form`, `react-ui-stack`, `react-ui-thread`, `ui-editor`                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Devtools     | `cli`, `cli-util`, `devtools`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Apps         | `composer-app`, `testbench-app`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Stories      | `stories-assistant` (×2), `stories-ui`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Common       | `graph`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| E2E          | `blade-runner`, `proto-guard`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Experimental | `env-tests`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
