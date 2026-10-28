//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
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

import { meta } from '#meta';
import { translations } from '#translations';
import { AssistantCapabilities, AssistantEvents } from '#types';

export const AgentHydrator = Capability.lazyModule(
  'AgentHydrator',
  {
    requires: [Capabilities.ProcessManagerRuntime],
    provides: [],
    activatesOn: AssistantEvents.Start,
    environments: ['browser', 'node', 'tauri'],
  },
  () => import('./agent-hydrator.ts'),
);
export const AgentRuntime = AppCapability.layerSpec(() => import('./agent-service.ts'), {
  name: 'AgentRuntime',
});
export const Agents = Capability.lazyModule(
  'Agents',
  {
    provides: [AssistantCapabilities.Agent, AssistantCapabilities.CodeModeAvailable],
    activatesOn: ActivationEvents.Startup,
  },
  () => import('./agents.ts'),
);
export const SlashCommands = Capability.lazyModule(
  'SlashCommands',
  { provides: [AssistantCapabilities.SlashCommands], activatesOn: ActivationEvents.Startup },
  () => import('./slash-commands.ts'),
);
// Present from startup so a comment posted before the assistant UI opens can still be answered. Headless hosts
// (EDGE) provide no operation invoker and host no comment UI.
export const CommentAgentRunner = Capability.lazyModule(
  'CommentAgentRunner',
  {
    requires: [Capabilities.OperationInvoker],
    provides: [AppCapabilities.CommentAgentRunner],
    activatesOn: ActivationEvents.Startup,
    environments: ['browser', 'node', 'tauri'],
  },
  () => import('./comment-agent-runner.ts'),
);
export const AiContext = AppCapability.layerSpec(() => import('./ai-context.ts'), {
  name: 'AiContext',
});
export const AiService = AppCapability.layerSpec(() => import('./ai-service.ts'), {
  name: 'AiService',
  requires: [AppCapabilities.AiModelResolver],
});
export const Connector = Capability.lazyModule(
  'AnthropicConnector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connector.ts'),
);
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'), {
  environments: ['browser', 'node', 'tauri'],
});
export const AutomationTemplates = Capability.lazyModule(
  'AutomationTemplates',
  { provides: [RoutineCapabilities.Template], activatesOn: RoutineEvents.Start },
  () => import('./automation-templates.ts'),
);
export const McpServer = AppCapability.mcpServer(() => import('./mcp-server.ts'));
export const McpServerRegistry = Capability.lazyModule(
  'McpServerRegistry',
  {
    requires: [ClientCapabilities.Client, Capabilities.AtomRegistry, AppCapabilities.McpServer],
    provides: [],
    environments: ['browser', 'node', 'tauri'],
  },
  () => import('./mcp-server-registry.ts'),
);
export const Schema = AppCapability.schema(() => import('./schema-defs.ts'));
export const SubjectContext = Capability.lazyModule(
  'SubjectContext',
  { provides: [AssistantCapabilities.SubjectContext], activatesOn: AssistantEvents.Start },
  () => import('./subject-context.ts'),
);
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'), {
  provides: [RoutineCapabilities.AgentDelegationStrategy],
});
export const CompanionChatProvisioner = Capability.lazyModule(
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
  () => import('./companion-chat-provisioner.ts'),
);
// Ungated: an agent blocked on a question is waiting whether or not any assistant UI is on screen.
export const QuestionResumer = Capability.lazyModule(
  'QuestionResumer',
  // Headless hosts (EDGE) provide no operation invoker; it resumes questions only in the app.
  { requires: [Capabilities.OperationInvoker], provides: [], environments: ['browser', 'node', 'tauri'] },
  () => import('./question-resumer.ts'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'), {
  environments: ['browser', 'node', 'tauri'],
});
// Startup, not `AssistantEvents.Start`: `AiService` snapshots its multi-arity `AiModelResolver`
// require once during startup, so a resolver contributed in a later round is invisible to it.
// TODO(burdon): Defer past startup again so a user who never opens a chat does not pay for the
//   provider client bindings; needs the AI service to read resolvers per request, not snapshot them.
export const EdgeModelResolver = Capability.lazyModule(
  'EdgeModelResolver',
  { provides: [AppCapabilities.AiModelResolver], activatesOn: ActivationEvents.Startup },
  () => import('./edge-model-resolver.ts'),
);
export const LocalModelResolver = Capability.lazyModule(
  'LocalModelResolver',
  { provides: [AppCapabilities.AiModelResolver], activatesOn: ActivationEvents.Startup },
  () => import('./local-model-resolver.ts'),
);
export const MarkdownExtension = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: MarkdownEvents.Start },
  () => import('./markdown-extension.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
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
});
export const Settings = AppCapability.settings(() => import('./settings.ts'), {
  activatesOn: ActivationEvents.Idle,
  provides: [AssistantCapabilities.Settings],
});
export const AssistantState = Capability.lazyModule(
  'AssistantState',
  {
    provides: [
      AssistantCapabilities.State,
      AssistantCapabilities.CompanionChatCache,
      AssistantCapabilities.HomeSuggestionsCache,
    ],
    activatesOn: AssistantEvents.Start,
  },
  () => import('./state.ts'),
);
export const Toolkit = Capability.lazyModule(
  'Toolkit',
  {
    provides: [AppCapabilities.Toolkit],
    activatesOn: AssistantEvents.Start,
    environments: ['browser', 'node', 'tauri', 'workerd'],
  },
  () => import('./toolkit.ts'),
);
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: () => import('../../PLUGIN.mdl?raw'),
  mimeType: 'application/x-mdl',
});
