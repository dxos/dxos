//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
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

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AgentHydrator = Capability.lazyModule(
  'AgentHydrator',
  {
    requires: [Capabilities.ProcessManagerRuntime],
    provides: [],
    activatesOn: AssistantEvents.Start,
    environments: ['node'],
  },
  () => import('./agent-hydrator'),
);
export const AgentRuntime = AppCapability.layerSpec(() => import('./agent-service'), {
  name: 'AgentRuntime',
  environments: ['node'],
});
export const AiContext = AppCapability.layerSpec(() => import('./ai-context'), {
  name: 'AiContext',
  environments: ['node'],
});
export const AiService = AppCapability.layerSpec(() => import('./ai-service'), {
  name: 'AiService',
  requires: [AppCapabilities.AiModelResolver],
  environments: ['node'],
});
export const Connector = Capability.lazyModule(
  'AnthropicConnector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connector'),
);
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  environments: ['node'],
});
export const AutomationTemplates = Capability.lazyModule(
  'AutomationTemplates',
  { provides: [RoutineCapabilities.Template], activatesOn: RoutineEvents.Start },
  () => import('./automation-templates'),
);
export const Schema = AppCapability.schema(() => import('./schema-defs'), {
  environments: ['node', 'workerd'],
});
// Workerd loads a reduced declaration via ./overrides.workerd.ts: the workerd entry has no
// ReactSurface to fire `AssistantEvents.Start` (see the maker's own doc comment), so the skill
// must register on the framework's idle-default there instead.
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'), {
  provides: [RoutineCapabilities.AgentDelegationStrategy],
  environments: ['node', 'workerd'],
});
export const CompanionChatProvisioner = Capability.lazyModule(
  'CompanionChatProvisioner',
  {
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
  () => import('./companion-chat-provisioner'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'), {
  environments: ['node'],
});
// Startup, not `AssistantEvents.Start`: `AiService` snapshots its multi-arity `AiModelResolver`
// require once during startup, so a resolver contributed in a later round is invisible to it.
// TODO(burdon): Defer past startup again so a user who never opens a chat does not pay for the
//   provider client bindings; needs the AI service to read resolvers per request, not snapshot them.
export const EdgeModelResolver = Capability.lazyModule(
  'EdgeModelResolver',
  { provides: [AppCapabilities.AiModelResolver], activatesOn: ActivationEvents.Startup },
  () => import('./edge-model-resolver'),
);
export const LocalModelResolver = Capability.lazyModule(
  'LocalModelResolver',
  { provides: [AppCapabilities.AiModelResolver], activatesOn: ActivationEvents.Startup },
  () => import('./local-model-resolver'),
);
export const MarkdownExtension = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: MarkdownEvents.Start },
  () => import('./markdown-extension'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
  environments: ['node', 'workerd'],
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: [
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
export const Settings = AppCapability.settings(() => import('./settings'), {
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
  () => import('./state'),
);
// Workerd loads a reduced declaration via ./overrides.workerd.ts: the workerd entry has no
// ReactSurface to fire `AssistantEvents.Start`, so the toolkit must register on the framework's
// idle-default there instead.
export const Toolkit = Capability.lazyModule(
  'Toolkit',
  {
    provides: [AppCapabilities.Toolkit],
    activatesOn: AssistantEvents.Start,
    environments: ['node', 'workerd'],
  },
  () => import('./toolkit'),
);
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
