//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { RoutineCapabilities } from '@dxos/plugin-routine';
import { SpaceCapability } from '@dxos/plugin-space';

import { AssistantCapabilities } from '#types';

export const AgentHydrator = Capability.lazyModule(
  'AgentHydrator',
  { requires: [Capabilities.ProcessManagerRuntime], provides: [] },
  () => import('./agent-hydrator'),
);
export const AgentRuntime = Capability.lazyModule(
  'AgentRuntime',
  { provides: [Capabilities.LayerSpec] },
  () => import('./agent-service'),
);
export const AiContext = Capability.lazyModule(
  'AiContext',
  { provides: [Capabilities.LayerSpec] },
  () => import('./ai-context'),
);
export const AiService = Capability.lazyModule(
  'AiService',
  { requires: [AppCapabilities.AiModelResolver], provides: [Capabilities.LayerSpec] },
  () => import('./ai-service'),
);
export const Connector = Capability.lazyModule(
  'AnthropicConnector',
  { provides: [ConnectorCapability] },
  () => import('./connector'),
);
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const AutomationTemplates = Capability.lazyModule(
  'AutomationTemplates',
  { provides: [RoutineCapabilities.Template] },
  () => import('./automation-templates'),
);
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'), {
  provides: [Capabilities.OperationHandler, RoutineCapabilities.AgentDelegationStrategy],
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
  },
  () => import('./companion-chat-provisioner'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const EdgeModelResolver = Capability.lazyModule(
  'EdgeModelResolver',
  { provides: [AppCapabilities.AiModelResolver] },
  () => import('./edge-model-resolver'),
);
export const LocalModelResolver = Capability.lazyModule(
  'LocalModelResolver',
  { provides: [AppCapabilities.AiModelResolver] },
  () => import('./local-model-resolver'),
);
export const MarkdownExtension = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider] },
  () => import('./markdown-extension'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
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
  },
  () => import('./state'),
);
export const Toolkit = Capability.lazyModule(
  'Toolkit',
  { provides: [AppCapabilities.Toolkit] },
  () => import('./toolkit'),
);
