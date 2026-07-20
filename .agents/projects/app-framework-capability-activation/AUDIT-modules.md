# Plugin module audit — Composer runtime inventory (2026-07-19)

Source of truth: `manager.getModules()` probed from a booted Composer dev instance
(432 modules, failed: []). Events fired during boot: app-framework.event.startup, plugin.client.event.spacesReady, plugin.space.event.spaceCreated, plugin.client.event.identityCreated.

The source-level sweep across all 92 packages (incl. plugins not bundled in Composer)
is at `/tmp/audit-source-modules.jsonl`; the activation-event inventory (definitions +
fire sites) is reproduced at the end.

## Summary

- Total modules: 432 — dependency-mode 422, event-mode 10
- Startup roots (dependency-mode, empty requires): 359
- Chain members (dependency-mode with requires): 63
- Modules with no provides (side-effect only): 22

## 1. Modules with no requires (startup roots) — grouped by provided capability

### translations (50)

- `org.dxos.plugin.assistant.module.translations`
- `org.dxos.plugin.blogger.module.translations`
- `org.dxos.plugin.bookmarks.module.translations`
- `org.dxos.plugin.calls.module.translations`
- `org.dxos.plugin.client.module.translations`
- `org.dxos.plugin.code.module.translations`
- `org.dxos.plugin.comments.module.translations`
- `org.dxos.plugin.commerce.module.translations`
- `org.dxos.plugin.connector.module.translations`
- `org.dxos.plugin.crm.module.translations`
- `org.dxos.plugin.debug.module.translations`
- `org.dxos.plugin.deck.module.translations`
- `org.dxos.plugin.devtools.module.translations`
- `org.dxos.plugin.duffel.module.translations`
- `org.dxos.plugin.file.module.translations`
- `org.dxos.plugin.game.module.translations`
- `org.dxos.plugin.inbox.module.translations`
- `org.dxos.plugin.irohBeacon.module.translations`
- `org.dxos.plugin.kanban.module.translations`
- `org.dxos.plugin.magazine.module.translations`
- `org.dxos.plugin.markdown.module.translations`
- `org.dxos.plugin.meeting.module.translations`
- `org.dxos.plugin.navtree.module.translations`
- `org.dxos.plugin.observability.module.translations`
- `org.dxos.plugin.onboarding.module.translations`
- `org.dxos.plugin.outliner.module.translations`
- `org.dxos.plugin.payments.module.translations`
- `org.dxos.plugin.pipeline.module.translations`
- `org.dxos.plugin.preview.module.translations`
- `org.dxos.plugin.progress.module.translations`
- `org.dxos.plugin.registry.module.translations`
- `org.dxos.plugin.routine.module.translations`
- `org.dxos.plugin.sample.module.translations`
- `org.dxos.plugin.search.module.translations`
- `org.dxos.plugin.sequencer.module.translations`
- `org.dxos.plugin.settings.module.translations`
- `org.dxos.plugin.sheet.module.translations`
- `org.dxos.plugin.sidekick.module.translations`
- `org.dxos.plugin.sketch.module.translations`
- `org.dxos.plugin.space.module.translations`
- `org.dxos.plugin.statusBar.module.translations`
- `org.dxos.plugin.studio.module.translations`
- `org.dxos.plugin.support.module.translations`
- `org.dxos.plugin.table.module.translations`
- `org.dxos.plugin.thread.module.translations`
- `org.dxos.plugin.transcription.module.translations`
- `org.dxos.plugin.trip.module.translations`
- `org.dxos.plugin.typefully.module.translations`
- `org.dxos.plugin.video.module.translations`
- `org.dxos.plugin.zen.module.translations`

### reactSurface (46)

- `org.dxos.plugin.assistant.module.ReactSurface`
- `org.dxos.plugin.blogger.module.ReactSurface`
- `org.dxos.plugin.bookmarks.module.ReactSurface`
- `org.dxos.plugin.calls.module.ReactSurface`
- `org.dxos.plugin.client.module.ReactSurface`
- `org.dxos.plugin.code.module.ReactSurface`
- `org.dxos.plugin.comments.module.ReactSurface`
- `org.dxos.plugin.commerce.module.ReactSurface`
- `org.dxos.plugin.connector.module.ReactSurface`
- `org.dxos.plugin.deck.module.ReactSurface`
- `org.dxos.plugin.devtools.module.ReactSurface`
- `org.dxos.plugin.file.module.ReactSurface`
- `org.dxos.plugin.game.module.ReactSurface`
- `org.dxos.plugin.inbox.module.ReactSurface`
- `org.dxos.plugin.irohBeacon.module.ReactSurface`
- `org.dxos.plugin.kanban.module.ReactSurface`
- `org.dxos.plugin.magazine.module.ReactSurface`
- `org.dxos.plugin.markdown.module.ReactSurface`
- `org.dxos.plugin.meeting.module.ReactSurface`
- `org.dxos.plugin.navtree.module.ReactSurface`
- `org.dxos.plugin.observability.module.ReactSurface`
- `org.dxos.plugin.onboarding.module.ReactSurface`
- `org.dxos.plugin.outliner.module.ReactSurface`
- `org.dxos.plugin.payments.module.ReactSurface`
- `org.dxos.plugin.pipeline.module.ReactSurface`
- `org.dxos.plugin.preview.module.ReactSurface`
- `org.dxos.plugin.progress.module.ReactSurface`
- `org.dxos.plugin.registry.module.ReactSurface`
- `org.dxos.plugin.routine.module.ReactSurface`
- `org.dxos.plugin.sample.module.ReactSurface`
- `org.dxos.plugin.search.module.ReactSurface`
- `org.dxos.plugin.sequencer.module.ReactSurface`
- `org.dxos.plugin.settings.module.ReactSurface`
- `org.dxos.plugin.sheet.module.ReactSurface`
- `org.dxos.plugin.sidekick.module.ReactSurface`
- `org.dxos.plugin.sketch.module.ReactSurface`
- `org.dxos.plugin.space.module.ReactSurface`
- `org.dxos.plugin.statusBar.module.ReactSurface`
- `org.dxos.plugin.studio.module.ReactSurface`
- `org.dxos.plugin.support.module.ReactSurface`
- `org.dxos.plugin.table.module.ReactSurface`
- `org.dxos.plugin.thread.module.ReactSurface`
- `org.dxos.plugin.transcription.module.ReactSurface`
- `org.dxos.plugin.trip.module.ReactSurface`
- `org.dxos.plugin.video.module.ReactSurface`
- `org.dxos.plugin.zen.module.ReactSurface`

### operationHandler (38)

- `org.dxos.plugin.assistant.module.OperationHandler`
- `org.dxos.plugin.attention.module.OperationHandler`
- `org.dxos.plugin.blogger.module.OperationHandler`
- `org.dxos.plugin.bookmarks.module.OperationHandler`
- `org.dxos.plugin.client.module.OperationHandler`
- `org.dxos.plugin.code.module.OperationHandler`
- `org.dxos.plugin.comments.module.OperationHandler`
- `org.dxos.plugin.commerce.module.OperationHandler`
- `org.dxos.plugin.connector.module.OperationHandler`
- `org.dxos.plugin.crm.module.OperationHandler`
- `org.dxos.plugin.deck.module.OperationHandler`
- `org.dxos.plugin.file.module.OperationHandler`
- `org.dxos.plugin.inbox.module.OperationHandler`
- `org.dxos.plugin.kanban.module.OperationHandler`
- `org.dxos.plugin.magazine.module.OperationHandler`
- `org.dxos.plugin.markdown.module.OperationHandler`
- `org.dxos.plugin.meeting.module.OperationHandler`
- `org.dxos.plugin.navtree.module.OperationHandler`
- `org.dxos.plugin.observability.module.OperationHandler`
- `org.dxos.plugin.onboarding.module.OperationHandler`
- `org.dxos.plugin.outliner.module.OperationHandler`
- `org.dxos.plugin.registry.module.OperationHandler`
- `org.dxos.plugin.routine.module.OperationHandler`
- `org.dxos.plugin.sample.module.OperationHandler`
- `org.dxos.plugin.sandbox.module.OperationHandler`
- `org.dxos.plugin.search.module.OperationHandler`
- `org.dxos.plugin.sequencer.module.OperationHandler`
- `org.dxos.plugin.settings.module.OperationHandler`
- `org.dxos.plugin.sheet.module.OperationHandler`
- `org.dxos.plugin.sketch.module.OperationHandler`
- `org.dxos.plugin.space.module.OperationHandler`
- `org.dxos.plugin.studio.module.OperationHandler`
- `org.dxos.plugin.support.module.OperationHandler`
- `org.dxos.plugin.table.module.OperationHandler`
- `org.dxos.plugin.thread.module.OperationHandler`
- `org.dxos.plugin.transcription.module.OperationHandler`
- `org.dxos.plugin.trip.module.OperationHandler`
- `org.dxos.plugin.video.module.OperationHandler`

### pluginAsset (38)

- `org.dxos.plugin.assistant.module.plugin-asset`
- `org.dxos.plugin.blogger.module.plugin-asset`
- `org.dxos.plugin.bookmarks.module.plugin-asset`
- `org.dxos.plugin.calls.module.plugin-asset`
- `org.dxos.plugin.code.module.plugin-asset`
- `org.dxos.plugin.comments.module.plugin-asset`
- `org.dxos.plugin.commerce.module.plugin-asset`
- `org.dxos.plugin.connector.module.plugin-asset`
- `org.dxos.plugin.crm.module.plugin-asset`
- `org.dxos.plugin.debug.module.plugin-asset`
- `org.dxos.plugin.deck.module.plugin-asset`
- `org.dxos.plugin.devtools.module.plugin-asset`
- `org.dxos.plugin.file.module.plugin-asset`
- `org.dxos.plugin.game.module.plugin-asset`
- `org.dxos.plugin.kanban.module.plugin-asset`
- `org.dxos.plugin.magazine.module.plugin-asset`
- `org.dxos.plugin.meeting.module.plugin-asset`
- `org.dxos.plugin.navtree.module.plugin-asset`
- `org.dxos.plugin.outliner.module.plugin-asset`
- `org.dxos.plugin.pipeline.module.plugin-asset`
- `org.dxos.plugin.routine.module.plugin-asset`
- `org.dxos.plugin.sample.module.plugin-asset`
- `org.dxos.plugin.sandbox.module.plugin-asset`
- `org.dxos.plugin.search.module.plugin-asset`
- `org.dxos.plugin.sequencer.module.plugin-asset`
- `org.dxos.plugin.sheet.module.plugin-asset`
- `org.dxos.plugin.sidekick.module.plugin-asset`
- `org.dxos.plugin.sketch.module.plugin-asset`
- `org.dxos.plugin.space.module.plugin-asset`
- `org.dxos.plugin.studio.module.plugin-asset`
- `org.dxos.plugin.support.module.plugin-asset`
- `org.dxos.plugin.table.module.plugin-asset`
- `org.dxos.plugin.thread.module.plugin-asset`
- `org.dxos.plugin.transcription.module.plugin-asset`
- `org.dxos.plugin.trip.module.plugin-asset`
- `org.dxos.plugin.typefully.module.plugin-asset`
- `org.dxos.plugin.video.module.plugin-asset`
- `org.dxos.plugin.zen.module.plugin-asset`

### schema (34)

- `org.dxos.plugin.assistant.module.schema`
- `org.dxos.plugin.blogger.module.schema`
- `org.dxos.plugin.bookmarks.module.schema`
- `org.dxos.plugin.code.module.schema`
- `org.dxos.plugin.comments.module.schema`
- `org.dxos.plugin.commerce.module.schema`
- `org.dxos.plugin.connector.module.schema`
- `org.dxos.plugin.crm.module.schema`
- `org.dxos.plugin.file.module.schema`
- `org.dxos.plugin.game.module.schema`
- `org.dxos.plugin.inbox.module.schema`
- `org.dxos.plugin.kanban.module.schema`
- `org.dxos.plugin.magazine.module.schema`
- `org.dxos.plugin.markdown.module.schema`
- `org.dxos.plugin.meeting.module.schema`
- `org.dxos.plugin.outliner.module.schema`
- `org.dxos.plugin.pipeline.module.schema`
- `org.dxos.plugin.preview.module.schema`
- `org.dxos.plugin.routine.module.schema`
- `org.dxos.plugin.sample.module.schema`
- `org.dxos.plugin.sandbox.module.schema`
- `org.dxos.plugin.sequencer.module.schema`
- `org.dxos.plugin.sheet.module.schema`
- `org.dxos.plugin.sidekick.module.schema`
- `org.dxos.plugin.sketch.module.schema`
- `org.dxos.plugin.space.module.schema`
- `org.dxos.plugin.studio.module.schema`
- `org.dxos.plugin.support.module.schema`
- `org.dxos.plugin.table.module.schema`
- `org.dxos.plugin.thread.module.schema`
- `org.dxos.plugin.transcription.module.schema`
- `org.dxos.plugin.trip.module.schema`
- `org.dxos.plugin.video.module.schema`
- `org.dxos.plugin.zen.module.schema`

### create-object (26)

- `org.dxos.plugin.assistant.module.CreateObject`
- `org.dxos.plugin.blogger.module.CreateObject`
- `org.dxos.plugin.code.module.CreateObject`
- `org.dxos.plugin.commerce.module.CreateObject`
- `org.dxos.plugin.connector.module.CreateObject`
- `org.dxos.plugin.file.module.CreateObject`
- `org.dxos.plugin.game.module.CreateObject`
- `org.dxos.plugin.inbox.module.CreateObject`
- `org.dxos.plugin.kanban.module.CreateObject`
- `org.dxos.plugin.magazine.module.CreateObject`
- `org.dxos.plugin.markdown.module.CreateObject`
- `org.dxos.plugin.outliner.module.CreateObject`
- `org.dxos.plugin.pipeline.module.CreateObject`
- `org.dxos.plugin.routine.module.CreateObject`
- `org.dxos.plugin.sample.module.CreateObject`
- `org.dxos.plugin.sequencer.module.CreateObject`
- `org.dxos.plugin.sheet.module.CreateObject`
- `org.dxos.plugin.sketch.module.CreateObject`
- `org.dxos.plugin.space.module.CreateObject`
- `org.dxos.plugin.studio.module.CreateObject`
- `org.dxos.plugin.support.module.CreateObject`
- `org.dxos.plugin.table.module.CreateObject`
- `org.dxos.plugin.thread.module.CreateObject`
- `org.dxos.plugin.trip.module.CreateObject`
- `org.dxos.plugin.video.module.CreateObject`
- `org.dxos.plugin.zen.module.CreateObject`

### appGraphBuilder (20)

- `org.dxos.plugin.assistant.module.AppGraphBuilder`
- `org.dxos.plugin.blogger.module.AppGraphBuilder`
- `org.dxos.plugin.client.module.AppGraphBuilder`
- `org.dxos.plugin.comments.module.AppGraphBuilder`
- `org.dxos.plugin.crm.module.AppGraphBuilder`
- `org.dxos.plugin.debug.module.AppGraphBuilder`
- `org.dxos.plugin.deck.module.AppGraphBuilder`
- `org.dxos.plugin.markdown.module.AppGraphBuilder`
- `org.dxos.plugin.navtree.module.AppGraphBuilder`
- `org.dxos.plugin.onboarding.module.AppGraphBuilder`
- `org.dxos.plugin.outliner.module.AppGraphBuilder`
- `org.dxos.plugin.registry.module.AppGraphBuilder`
- `org.dxos.plugin.routine.module.AppGraphBuilder`
- `org.dxos.plugin.sample.module.AppGraphBuilder`
- `org.dxos.plugin.search.module.AppGraphBuilder`
- `org.dxos.plugin.settings.module.SettingsAppGraphBuilder`
- `org.dxos.plugin.space.module.AppGraphBuilder`
- `org.dxos.plugin.studio.module.AppGraphBuilder`
- `org.dxos.plugin.transcription.module.AppGraphBuilder`
- `org.dxos.plugin.video.module.AppGraphBuilder`

### settings (17)

- `org.dxos.plugin.assistant.module.Settings`
- `org.dxos.plugin.code.module.Settings`
- `org.dxos.plugin.debug.module.Settings`
- `org.dxos.plugin.deck.module.Settings`
- `org.dxos.plugin.file.module.Settings`
- `org.dxos.plugin.inbox.module.Settings`
- `org.dxos.plugin.markdown.module.Settings`
- `org.dxos.plugin.meeting.module.MeetingSettings`
- `org.dxos.plugin.observability.module.Settings`
- `org.dxos.plugin.onboarding.module.Settings`
- `org.dxos.plugin.payments.module.Settings`
- `org.dxos.plugin.registry.module.Settings`
- `org.dxos.plugin.sample.module.Settings`
- `org.dxos.plugin.sketch.module.Settings`
- `org.dxos.plugin.space.module.Settings`
- `org.dxos.plugin.support.module.settings`
- `org.dxos.plugin.transcription.module.Settings`

### skillDefinition (17)

- `org.dxos.plugin.code.module.SkillDefinition`
- `org.dxos.plugin.comments.module.SkillDefinition`
- `org.dxos.plugin.commerce.module.SkillDefinition`
- `org.dxos.plugin.crm.module.SkillDefinition`
- `org.dxos.plugin.file.module.SkillDefinition`
- `org.dxos.plugin.inbox.module.SkillDefinition`
- `org.dxos.plugin.kanban.module.SkillDefinition`
- `org.dxos.plugin.magazine.module.SkillDefinition`
- `org.dxos.plugin.markdown.module.SkillDefinition`
- `org.dxos.plugin.sandbox.module.SkillDefinition`
- `org.dxos.plugin.sequencer.module.SkillDefinition`
- `org.dxos.plugin.sheet.module.SkillDefinition`
- `org.dxos.plugin.sidekick.module.SkillDefinition`
- `org.dxos.plugin.support.module.SkillDefinition`
- `org.dxos.plugin.table.module.SkillDefinition`
- `org.dxos.plugin.transcription.module.SkillDefinition`
- `org.dxos.plugin.trip.module.SkillDefinition`

### connector (6)

- `org.dxos.plugin.assistant.module.AnthropicConnector`
- `org.dxos.plugin.connector.module.BuiltinConnectors`
- `org.dxos.plugin.heygen.module.Connector`
- `org.dxos.plugin.ideogram.module.Connector`
- `org.dxos.plugin.inbox.module.Connector`
- `org.dxos.plugin.typefully.module.TypefullyConnector`

### commentConfig (6)

- `org.dxos.plugin.bookmarks.module.CommentConfig`
- `org.dxos.plugin.markdown.module.CommentConfig`
- `org.dxos.plugin.sheet.module.CommentConfig`
- `org.dxos.plugin.sketch.module.CommentConfig`
- `org.dxos.plugin.table.module.CommentConfig`
- `org.dxos.plugin.video.module.CommentConfig`

### template (4)

- `org.dxos.plugin.assistant.module.automation-templates`
- `org.dxos.plugin.crm.module.AutomationTemplates`
- `org.dxos.plugin.magazine.module.magazine-automation-templates`
- `org.dxos.plugin.routine.module.Templates`

### extensions (4)

- `org.dxos.plugin.assistant.module.markdown`
- `org.dxos.plugin.file.module.MarkdownExtension`
- `org.dxos.plugin.sheet.module.MarkdownExtension`
- `org.dxos.plugin.transcription.module.MarkdownExtension`

### reactContext (4)

- `org.dxos.plugin.attention.module.ReactContext`
- `org.dxos.plugin.client.module.ReactContext`
- `org.dxos.plugin.devtools.module.ReactContext`
- `org.dxos.plugin.transcription.module.ReactContext`

### reactRoot (4)

- `org.dxos.plugin.calls.module.ReactRoot`
- `org.dxos.plugin.deck.module.ReactRoot`
- `org.dxos.plugin.space.module.ReactRoot`
- `org.dxos.plugin.support.module.ReactRoot`

### layerSpec (3)

- `org.dxos.plugin.assistant.module.AgentRuntime`
- `org.dxos.plugin.assistant.module.AiContext`
- `org.dxos.plugin.client.module.LayerSpecs`

### undoMapping (3)

- `org.dxos.plugin.comments.module.UndoMappings`
- `org.dxos.plugin.kanban.module.UndoMappings`
- `org.dxos.plugin.sheet.module.UndoMappings`

### (none) (3)

- `org.dxos.plugin.devtools.module.setup-devtools`
- `org.dxos.plugin.onboarding.module.oauth-recovery-redirect`
- `org.dxos.plugin.preview.module.preview-popover`

### objectExtractor (3)

- `org.dxos.plugin.inbox.module.contact-extractor`
- `org.dxos.plugin.inbox.module.summarize-extractor`
- `org.dxos.plugin.trip.module.trip-extractor`

### aiModelResolver (2)

- `org.dxos.plugin.assistant.module.EdgeModelResolver`
- `org.dxos.plugin.assistant.module.LocalModelResolver`

### generation-service (2)

- `org.dxos.plugin.heygen.module.GenerationService`
- `org.dxos.plugin.ideogram.module.GenerationService`

### migration (1)

- `org.dxos.plugin.assistant.module.AssistantMigrations`

### companion-chat-cache, home-suggestions-cache, state (1)

- `org.dxos.plugin.assistant.module.AssistantState` → also provides: assistant.capability.state, assistant.capability.companion-chat-cache, assistant.capability.home-suggestions-cache

### agentDelegationStrategy, operationHandler, skillDefinition (1)

- `org.dxos.plugin.assistant.module.SkillDefinition` → also provides: fw:skillDefinition, fw:operationHandler, routine.capability.agentDelegationStrategy

### aiToolkit (1)

- `org.dxos.plugin.assistant.module.Toolkit`

### page-action (1)

- `org.dxos.plugin.bookmarks.module.PageActionProvider`

### accountCache (1)

- `org.dxos.plugin.client.module.AccountCache`

### client, layer (1)

- `org.dxos.plugin.client.module.Client` → also provides: client.capability.client, fw:layer

### build-run (1)

- `org.dxos.plugin.code.module.BuildRunState`

### agent-runner (1)

- `org.dxos.plugin.comments.module.AgentRunner`

### state, view-state (1)

- `org.dxos.plugin.comments.module.CommentState` → also provides: comments.capability.state, comments.capability.view-state

### agent-identity (1)

- `org.dxos.plugin.comments.module.agent-identity`

### backend (1)

- `org.dxos.plugin.file.module.InlineBackend`

### log-downloader (1)

- `org.dxos.plugin.observability.module.log-downloader`

### namespace (1)

- `org.dxos.plugin.observability.module.namespace`

### observability (1)

- `org.dxos.plugin.observability.module.observability`

### routingService (1)

- `org.dxos.plugin.osrm.module.RoutingService`

### traceSink (1)

- `org.dxos.plugin.progress.module.TraceProgressSink`

### layerSpec, traceSink (1)

- `org.dxos.plugin.routine.module.LayerSpecs` → also provides: fw:layerSpec, fw:traceSink

### navigationPathResolver (1)

- `org.dxos.plugin.routine.module.NavigationResolver`

### grid-instances (1)

- `org.dxos.plugin.sheet.module.SheetState`

### operationConfig, undoMapping (1)

- `org.dxos.plugin.space.module.UndoMappings` → also provides: fw:undoMapping, space.operationConfig

### state (1)

- `org.dxos.plugin.support.module.HelpState`

### channel-backend (1)

- `org.dxos.plugin.thread.module.ChannelBackendFeed`

### entity-lookup (1)

- `org.dxos.plugin.transcription.module.EntityLookup`

### pipeline-status (1)

- `org.dxos.plugin.transcription.module.PipelineStatus`

### recording-session (1)

- `org.dxos.plugin.transcription.module.RecordingSession`

### textContent (1)

- `org.dxos.plugin.transcription.module.TextContent`

### marker-provider (1)

- `org.dxos.plugin.trip.module.MarkerProvider`

### publisher-service (1)

- `org.dxos.plugin.typefully.module.TypefullyPublisherService`

## 2. Modules with no provides (pure consumers / side effects)

- `org.dxos.plugin.assistant.module.AgentHydrator` [dependency] requires: fw:processManagerRuntime
- `org.dxos.plugin.assistant.module.CompanionChatProvisioner` [dependency] requires: fw:operationInvoker, fw:appGraph, fw:atomRegistry, deck.capability.state, assistant.capability.companion-chat-cache, assistant.capability.state, attention.capability.view-state
- `org.dxos.plugin.attention.module.Keyboard` [dependency] requires: fw:appGraph, attention.capability.attention
- `org.dxos.plugin.client.module.Migrations` [dependency] requires: fw:atomRegistry, client.capability.client, client.capability.migration
- `org.dxos.plugin.client.module.SchemaDefs` [dependency] requires: fw:atomRegistry, client.capability.client, fw:schema
- `org.dxos.plugin.client.module.SpaceReplicationProgress` [event] requires: client.capability.client, app-toolkit.capability.progressRegistry, fw:processManagerRuntime
- `org.dxos.plugin.connector.module.OAuthRedirect` [dependency] requires: connector.capability.connector-coordinator
- `org.dxos.plugin.deck.module.CheckAppScheme` [dependency] requires: deck.capability.settings, fw:operationInvoker, app-toolkit.capability.navigationHandler
- `org.dxos.plugin.deck.module.NotificationTracker` [dependency] requires: fw:atomRegistry, deck.capability.ephemeral-state, fw:processMonitor, fw:pluginManager, fw:operationInvoker, fw:operationHandler
- `org.dxos.plugin.deck.module.UrlHandler` [dependency] requires: fw:operationInvoker, app-toolkit.capability.navigationHandler, fw:atomRegistry, deck.capability.state, deck.capability.settings, fw:appGraph
- `org.dxos.plugin.devtools.module.setup-devtools` [dependency] requires: (none)
- `org.dxos.plugin.navtree.module.Keyboard` [dependency] requires: fw:appGraph, fw:operationInvoker
- `org.dxos.plugin.navtree.module.expose` [dependency] requires: fw:appGraph, fw:layout, fw:operationInvoker
- `org.dxos.plugin.observability.module.ClientReady` [dependency] requires: fw:pluginManager, fw:operationInvoker, client.capability.client, observability.capability.observability, observability.capability.state
- `org.dxos.plugin.observability.module.PrivacyNotice` [event] requires: fw:operationInvoker, fw:atomRegistry, observability.capability.state, client.capability.client
- `org.dxos.plugin.onboarding.module.default-content` [event] requires: fw:operationInvoker, fw:appGraph, client.capability.client, space.capability.on-space-created, space.capability.personal-space
- `org.dxos.plugin.onboarding.module.oauth-recovery-redirect` [dependency] requires: (none)
- `org.dxos.plugin.preview.module.preview-popover` [dependency] requires: (none)
- `org.dxos.plugin.registry.module.DevPluginLoader` [dependency] requires: fw:pluginManager, fw:atomRegistry, registry.capability.settings
- `org.dxos.plugin.routine.module.RegistrySync` [dependency] requires: client.capability.client, fw:atomRegistry, fw:skillDefinition, fw:operationHandler
- `org.dxos.plugin.routine.module.TriggerRuntimeController` [event] requires: client.capability.client, fw:processManagerRuntime
- `org.dxos.plugin.space.module.SpacesReady` [event] requires: fw:operationInvoker, fw:appGraph, fw:atomRegistry, fw:layout, attention.capability.attention, space.capability.state, space.capability.ephemeral-state, client.capability.client

## 3. Event-mode modules

- `org.dxos.plugin.client.module.SpaceReplicationProgress` on `plugin.client.event.spacesReady` (active after boot: True)
- `org.dxos.plugin.irohBeacon.module.BeaconServiceModule` on `plugin.client.event.spacesReady` (active after boot: True)
- `org.dxos.plugin.observability.module.PrivacyNotice` on `plugin.client.event.identityCreated` (active after boot: True)
- `org.dxos.plugin.onboarding.module.default-content` on `plugin.client.event.identityCreated` (active after boot: True)
- `org.dxos.plugin.routine.module.TriggerRuntimeController` on `plugin.client.event.spacesReady` (active after boot: True)
- `org.dxos.plugin.space.module.IdentityCreated` on `plugin.client.event.identityCreated` (active after boot: True)
- `org.dxos.plugin.space.module.Repair` on `plugin.client.event.spacesReady` (active after boot: True)
- `org.dxos.plugin.space.module.SpacesReady` on `plugin.client.event.spacesReady` (active after boot: True)
- `org.dxos.plugin.support.module.on-space-created` on `plugin.space.event.spaceCreated` (active after boot: True)
- `org.dxos.plugin.table.module.on-type-added` on `plugin.space.event.typeAdded` (active after boot: False)

## 4. Activation events (definitions and fire sites)

# Activation-event inventory

Scope: repo-wide `packages/**/src`, excluding `*.stories.*` and `*.test.*`.

## 1. Event definitions (`ActivationEvent.make(...)`, plus the one bare `make(...)` in the defining module itself)

| #   | File:line                                                                   | Exported name                                                                                          | Event id (as resolved)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `packages/sdk/app-framework/src/core/activation-event.ts:82`                | `Startup` (re-exported as `ActivationEvents.Startup` / `Capabilities`-adjacent `activation-events.ts`) | `org.dxos.app-framework.event.startup` (defined via the bare, unqualified `make(...)` inside `activation-event.ts` itself, not a qualified `ActivationEvent.make(` call — only exception to the pattern)                                                                                                                                                                                                                                                                                            |
| 2   | `packages/plugins/plugin-script/src/types/ScriptEvents.ts:11`               | `ScriptEvents.SetupCompiler`                                                                           | `` `${meta.profile.key}.event.setupCompiler` `` → `org.dxos.plugin.script.event.setupCompiler`                                                                                                                                                                                                                                                                                                                                                                                                      |
| 3   | `packages/plugins/plugin-space/src/types/events.ts:11`                      | `SpaceEvents.SpaceCreated`                                                                             | `` `${meta.profile.key}.event.spaceCreated` `` → `org.dxos.plugin.space.event.spaceCreated`                                                                                                                                                                                                                                                                                                                                                                                                         |
| 4   | `packages/plugins/plugin-space/src/types/events.ts:13`                      | `SpaceEvents.TypeAdded`                                                                                | `` `${meta.profile.key}.event.typeAdded` `` → `org.dxos.plugin.space.event.typeAdded`                                                                                                                                                                                                                                                                                                                                                                                                               |
| 5   | `packages/plugins/plugin-client/src/types/events.ts:10`                     | `ClientEvents.IdentityCreated`                                                                         | `` `${meta.profile.key}.event.identityCreated` `` → `org.dxos.plugin.client.event.identityCreated`                                                                                                                                                                                                                                                                                                                                                                                                  |
| 6   | `packages/plugins/plugin-client/src/types/events.ts:11`                     | `ClientEvents.SpacesReady`                                                                             | `` `${meta.profile.key}.event.spacesReady` `` → `org.dxos.plugin.client.event.spacesReady`                                                                                                                                                                                                                                                                                                                                                                                                          |
| 7   | `packages/plugins/plugin-observability/src/types/ObservabilityEvents.ts:15` | `ObservabilityEvents.IdentityCreatedEvent`                                                             | literal `'org.dxos.plugin.client.event.identityCreated'` — **deliberately the same id string as #5** (comment: "Mirrors `ClientEvents.IdentityCreated`... Cloned by identifier to avoid a circular workspace dependency"); since `PluginManager` matches purely by `eventKey` (the id string, see `activation-event.ts` `eventKey`/`plugin-manager.ts` key comparisons), firing #5 also satisfies any module `activatesOn: ObservabilityEvents.IdentityCreatedEvent`. Not a distinct runtime event. |
| 8   | `packages/sdk/app-toolkit/src/playground/generator/generator.ts:14`         | `CountEvent`                                                                                           | literal `'org.dxos.test.generator.count'` — playground/demo fixture, not a test file, but not production either                                                                                                                                                                                                                                                                                                                                                                                     |

Excluded: 12 more `ActivationEvent.make(...)` call sites in `packages/sdk/app-framework/src/core/plugin-manager.test.ts` and `plugin.test.ts` (test-local events, out of scope per the `*.test.*` exclusion).

## 2. Fire sites (where an event is actually activated at runtime)

| File:line                                                                   | Event fired                                                                                                | Trigger condition                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/plugins/plugin-space/src/operations/add-type.ts:31`               | `SpaceEvents.TypeAdded`                                                                                    | Inside the `SpaceOperation.AddType` handler, immediately after a new type is registered on a space's database (`db.addType`) and its metadata patched — fires once per type-add operation, before running `SpaceCapabilities.OnTypeAdded` callbacks.                                            |
| `packages/plugins/plugin-space/src/operations/create.ts:54`                 | `SpaceEvents.SpaceCreated`                                                                                 | Inside the space-create operation, right after a brand-new space is created, made ready (`waitUntilReady`), and given a root collection — fires once per `client.spaces.create()` call, before running `SpaceCapabilities.OnCreateSpace` callbacks.                                             |
| `packages/plugins/plugin-client/src/capabilities/client.ts:61`              | `ClientEvents.SpacesReady`                                                                                 | Inside a `client.spaces.subscribe()` callback, guarded by a `spacesReadyFired` flag so it fires exactly once — the first time the client's space list becomes available after startup.                                                                                                          |
| `packages/plugins/plugin-onboarding/src/capabilities/default-content.ts:52` | `SpaceEvents.SpaceCreated`                                                                                 | Inside the onboarding default-content module's activation body, run against the identity's personal space (not a freshly `client.spaces.create()`-d space) so that `OnCreateSpace`-driven capabilities (e.g. skills) also wire up for the personal space, which never goes through `create.ts`. |
| `packages/plugins/plugin-script/src/hooks/useCompiler.ts:21`                | `ScriptEvents.SetupCompiler`                                                                               | Inside the `useCompiler()` React hook's effect, run on mount/`manager` change — lazily triggers compiler setup the first time a component asks for the script compiler.                                                                                                                         |
| `packages/plugins/plugin-client/src/operations/create-identity.ts:26`       | `ClientEvents.IdentityCreated`                                                                             | Inside the `CreateIdentity` operation handler, immediately after `client.halo.createIdentity(profile)` succeeds — fires once per newly-created identity (this also satisfies `ObservabilityEvents.IdentityCreatedEvent`, see row 7 above, since both share the same event id).                  |
| `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:285`                    | every event in the caller-supplied `setupEvents` array (dynamic, not a fixed named event)                  | Inside `useApp`'s startup effect, run once when the app boots — activates each configured setup event in parallel with `Startup` before the UI is considered ready.                                                                                                                             |
| `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:286`                    | `ActivationEvents.Startup`                                                                                 | Same startup effect as above — always fired alongside the `setupEvents` list on every app boot.                                                                                                                                                                                                 |
| `packages/sdk/app-framework/src/cli/cli.ts:83`                              | `ActivationEvents.Startup`                                                                                 | Inside the CLI bootstrap function, after framework capabilities (`PluginManager`, `AtomRegistry`) are contributed — loads CLI commands and Effect layers once per CLI invocation.                                                                                                               |
| `packages/sdk/app-framework/src/testing/harness.ts:134`                     | every event in the caller-supplied `setupEvents` array (dynamic)                                           | Inside `TestHarness` creation, only when `autoStart` is true — mirrors `useApp`'s pattern for tests that need specific setup events activated before assertions run.                                                                                                                            |
| `packages/sdk/app-framework/src/testing/harness.ts:135`                     | `ActivationEvents.Startup`                                                                                 | Same `autoStart` block as above — always fired for a harness created with `autoStart: true` (the default).                                                                                                                                                                                      |
| `packages/sdk/app-framework/src/testing/harness.ts:159`                     | any event passed to `TestHarness.fire(event)` (dynamic, generic helper)                                    | Public test-harness API: `fire()` lets a test explicitly activate an arbitrary event/module on demand; not tied to a specific event by name.                                                                                                                                                    |
| `packages/sdk/app-framework/src/testing/service.ts:48`                      | `ActivationEvents.Startup`                                                                                 | Inside `AssistantTestLayer`-style service setup (`Effect.gen`), after framework capabilities are contributed — always fired once when the test service builds its `PluginManager`.                                                                                                              |
| `packages/sdk/app-framework/src/core/plugin.ts:43`                          | whatever `event` is passed to the public `Plugin.activate(event)` helper (generic, not a fire site itself) | This is the framework's public API — `Effect.flatMap(Service, (manager) => manager.activate(event))` — every other `Plugin.activate(...)` call in the table above (rows 1-4) resolves through this function; listed for completeness, not as an additional independent fire site.               |

Note: `manager.activate(...)`/`Plugin.activate(...)` calls inside
`packages/sdk/app-framework/src/core/plugin-manager.ts` itself (`.eventKey(ActivationEvent.Startup)` comparisons at lines 936/997/1664/1678) are internal bookkeeping (computing/comparing the Startup event's key), not additional fire sites, and are excluded from the table.
