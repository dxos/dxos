//
// Copyright 2025 DXOS.org
//

import { AiModelResolver } from '@dxos/ai';
import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
import type { Graph, GraphBuilder } from '@dxos/app-graph';
import { AppCapabilities } from '@dxos/app-toolkit';
import type { Credential, LayerSpec, OperationHandlerSet, Skill } from '@dxos/compute';
import type { OperationInvoker } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { RoutineCapabilities } from '@dxos/plugin-routine';
import { SpaceCapabilities } from '@dxos/plugin-space';

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
export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const NavigationResolver = Capability.lazyModule(
  'NavigationResolver',
  { requires: [ClientCapabilities.Client], provides: [AppCapabilities.NavigationPathResolver] },
  () => import('./navigation-resolver'),
);
export const AutomationTemplates = Capability.lazyModule(
  'AutomationTemplates',
  { provides: [RoutineCapabilities.Template] },
  () => import('./automation-templates'),
);
export const SkillDefinition = Capability.lazyModule(
  'SkillDefinition',
  {
    provides: [
      AppCapabilities.SkillDefinition,
      Capabilities.OperationHandler,
      RoutineCapabilities.AgentDelegationStrategy,
    ],
  },
  () => import('./skill-definition'),
);
export const CompanionChatProvisioner = Capability.lazyModule(
  'CompanionChatProvisioner',
  {
    requires: [
      Capabilities.OperationInvoker,
      AppCapabilities.AppGraph,
      Capabilities.AtomRegistry,
      DeckCapabilities.State,
      AssistantCapabilities.CompanionChatCache,
      AssistantCapabilities.State,
      AttentionCapabilities.ViewState,
    ],
    provides: [],
  },
  () => import('./companion-chat-provisioner'),
);
export const CreateObject = Capability.lazyModule(
  'CreateObject',
  { provides: [SpaceCapabilities.CreateObjectEntry] },
  () => import('./create-object'),
);
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
export const Migrations = Capability.lazyModule(
  'AssistantMigrations',
  { provides: [ClientCapabilities.Migration] },
  () => import('./migrations'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
export const Settings = Capability.lazyModule(
  'Settings',
  { provides: [AppCapabilities.Settings, AssistantCapabilities.Settings] },
  () => import('./settings'),
);
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
