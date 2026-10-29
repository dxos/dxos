//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as RoutineEvents from '@dxos/plugin-routine/RoutineEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { AssistantNamespace } from './src/namespace.ts';
import * as AssistantCapabilities from './src/types/AssistantCapabilities.ts';
import * as AssistantEvents from './src/types/AssistantEvents.ts';
import type * as AssistantOptions from './src/types/AssistantOptions.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig<AssistantOptions.AssistantPluginOptions | void> =
  Plugin.config<AssistantOptions.AssistantPluginOptions | void>({
    plugin: {
      key: AssistantNamespace.key,
      name: 'Assistant',
      author: 'DXOS',
      description: trim`
      AssistantPlugin brings a conversational AI assistant into DXOS Composer, letting users chat naturally
      with objects in their spaces. Every Chat is a first-class ECHO object — messages are persisted,
      replicated across peers in real time, and can be bound to any document or collection as a companion
      panel that appears alongside the primary view.

      AI capabilities are delivered through a flexible multi-provider model layer. Users can route requests
      to the DXOS Edge service, a locally running Ollama instance, or LM Studio, and switch providers at
      any time in Settings. Each provider can be configured with a preferred model, and the runtime
      automatically falls back when a provider is unavailable.

      Skills give every chat a specialised identity. Built-in skills cover general assistance,
      web browsing, database interaction, web search, Discord and Linear integration, autonomous agents,
      planning, memory, automation, and a wizard for authoring new skills. Binding a skill
      changes the system instructions and the tool set exposed to the model in a single step.

      Tool execution runs through the DXOS compute runtime so every AI action — opening a document,
      searching the web, querying a database — produces a structured execution trace. The optional
      TracePanel visualises that trace as a commit graph or raw JSON, giving developers full observability
      into what the model did and why.
    `,
      icon: { key: 'ph--sparkle--regular', hue: 'sky' },
      source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-assistant',
      spec: 'PLUGIN.mdl',
      tags: ['alpha'],
    },
    modules: [
      AppCapability.appGraphBuilder(
        () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
        {
          environments: ['browser', 'node', 'tauri'],
        },
      ),
      AppCapability.skillDefinition(
        () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
        {
          provides: [AppCapabilities.HookDefinition, RoutineCapabilities.AgentDelegationStrategy],
        },
      ),
      AppCapability.mcpServer(() => import('./src/capabilities/mcp-server.ts', { with: { type: 'module-url' } })),
      Capability.lazyModule(
        'McpServerRegistry',
        {
          requires: [ClientCapabilities.Client, Capabilities.AtomRegistry, AppCapabilities.McpServer],
          provides: [],
          environments: ['browser', 'node', 'tauri'],
        },
        () => import('./src/capabilities/mcp-server-registry.ts', { with: { type: 'module-url' } }),
      ),
      SpaceCapability.createObject(
        () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
        {
          environments: ['browser', 'node', 'tauri'],
        },
      ),
      AppCapability.operationHandler(
        () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
        {
          activatesOn: ActivationEvents.Idle,
        },
      ),
      AppCapability.schema(() => import('./src/capabilities/schema-defs.ts', { with: { type: 'module-url' } })),
      AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
        activatesOn: ActivationEvents.Idle,
        provides: [AssistantCapabilities.Settings],
      }),
      AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
        roles: [
          'org.dxos.plugin.assistant.role.chatDetails',
          'org.dxos.plugin.assistant.role.chatSurface',
          'org.dxos.plugin.space.role.homeContent',
          'org.dxos.plugin.space.role.homePinBottom',
          'org.dxos.role.article',
          'org.dxos.role.deckCompanion.trace',
          'org.dxos.role.dialog',
          'org.dxos.role.objectProperties',
          'org.dxos.role.statusIndicator',
        ],
      }),
      AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
      Capability.lazyModule(
        'AutomationTemplates',
        { provides: [RoutineCapabilities.Template], activatesOn: RoutineEvents.Start },
        () => import('./src/capabilities/automation-templates.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'MarkdownExtension',
        { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: MarkdownEvents.Start },
        () => import('./src/capabilities/markdown-extension.ts', { with: { type: 'module-url' } }),
      ),
      // TODO(wittjosiah): Does not integrate with settings store.
      //   Should this be a different event?
      //   Should settings store be renamed to be more generic?
      Capability.lazyModule(
        'AssistantState',
        {
          provides: [
            AssistantCapabilities.State,
            AssistantCapabilities.CompanionChatCache,
            AssistantCapabilities.HomeSuggestionsCache,
          ],
          activatesOn: AssistantEvents.Start,
        },
        () => import('./src/capabilities/state.ts', { with: { type: 'module-url' } }),
      ),
      // Startup, not `AssistantEvents.Start`: `AiService` snapshots its multi-arity `AiModelResolver`
      // require once during startup, so a resolver contributed in a later round is invisible to it.
      // TODO(burdon): Defer past startup again so a user who never opens a chat does not pay for the
      //   provider client bindings; needs the AI service to read resolvers per request, not snapshot them.
      Capability.lazyModule(
        'EdgeModelResolver',
        { provides: [AppCapabilities.AiModelResolver], activatesOn: ActivationEvents.Startup },
        () => import('./src/capabilities/edge-model-resolver.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'LocalModelResolver',
        { provides: [AppCapabilities.AiModelResolver], activatesOn: ActivationEvents.Startup },
        () => import('./src/capabilities/local-model-resolver.ts', { with: { type: 'module-url' } }),
      ),
      AppCapability.layerSpec(() => import('./src/capabilities/ai-service.ts', { with: { type: 'module-url' } }), {
        name: 'AiService',
        requires: [AppCapabilities.AiModelResolver],
      }),
      // Process-affinity `Harness.HarnessService` LayerSpec — needed so operations
      // dispatched as their own processes (e.g. via `Operation.invoke` from
      // `AiSession.createRequest` or `TriggerDispatcher`) can resolve
      // conversation-scoped services without an inline `Effect.provideService`
      // upstream. See `capabilities/ai-context.ts` for the rationale.
      AppCapability.layerSpec(() => import('./src/capabilities/ai-context.ts', { with: { type: 'module-url' } }), {
        name: 'AiContext',
      }),
      AppCapability.layerSpec(() => import('./src/capabilities/agent-service.ts', { with: { type: 'module-url' } }), {
        name: 'AgentRuntime',
      }),
      // Present from startup so a comment posted before the assistant UI opens can still be answered. Headless hosts
      // (EDGE) provide no operation invoker and host no comment UI.
      Capability.lazyModule(
        'CommentAgentRunner',
        {
          requires: [Capabilities.OperationInvoker],
          provides: [AppCapabilities.CommentAgentRunner],
          activatesOn: ActivationEvents.Startup,
          environments: ['browser', 'node', 'tauri'],
        },
        () => import('./src/capabilities/comment-agent-runner.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'Agents',
        {
          provides: [AssistantCapabilities.Agent, AssistantCapabilities.CodeModeAvailable],
          activatesOn: ActivationEvents.Startup,
        },
        () => import('./src/capabilities/agents.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'Toolkit',
        {
          provides: [AppCapabilities.Toolkit],
          activatesOn: AssistantEvents.Start,
          environments: ['browser', 'node', 'tauri', 'workerd'],
        },
        () => import('./src/capabilities/toolkit.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'AgentHydrator',
        {
          requires: [Capabilities.ProcessManagerRuntime],
          provides: [],
          activatesOn: AssistantEvents.Start,
          environments: ['browser', 'node', 'tauri'],
        },
        () => import('./src/capabilities/agent-hydrator.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'CompanionChatProvisioner',
        {
          environments: ['browser', 'tauri'],
          requires: [
            Capabilities.OperationInvoker,
            AppCapabilities.AppGraph,
            Capabilities.AtomRegistry,
            // DeckCapabilities.State is read optionally in the body: provisioning is driven by deck
            // planks, so a host without a deck (e.g. a story) has nothing to provision for and should
            // lose this module, not fail to activate AssistantPlugin.
            AssistantCapabilities.CompanionChatCache,
            AssistantCapabilities.State,
            AttentionCapabilities.ViewState,
          ],
          provides: [],
          activatesOn: AssistantEvents.Start,
        },
        () => import('./src/capabilities/companion-chat-provisioner.ts', { with: { type: 'module-url' } }),
      ),
      // Ungated: an agent blocked on a question is waiting whether or not any assistant UI is on screen.
      Capability.lazyModule(
        'QuestionResumer',
        // Headless hosts (EDGE) provide no operation invoker; it resumes questions only in the app.
        { requires: [Capabilities.OperationInvoker], provides: [], environments: ['browser', 'node', 'tauri'] },
        () => import('./src/capabilities/question-resumer.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'SubjectContext',
        { provides: [AssistantCapabilities.SubjectContext], activatesOn: AssistantEvents.Start },
        () => import('./src/capabilities/subject-context.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'AnthropicConnector',
        { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
        () => import('./src/capabilities/connector.ts', { with: { type: 'module-url' } }),
      ),
      AppCapability.pluginAsset({
        pluginId: AssistantNamespace.key,
        path: 'PLUGIN.mdl',
        content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
        mimeType: 'application/x-mdl',
      }),
      Capability.lazyModule(
        'SlashCommands',
        { provides: [AssistantCapabilities.SlashCommands], activatesOn: ActivationEvents.Startup },
        () => import('./src/capabilities/slash-commands.ts', { with: { type: 'module-url' } }),
      ),
    ],
  });

export const { meta, make } = config;

export default config;
