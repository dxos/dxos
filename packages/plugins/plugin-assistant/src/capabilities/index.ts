//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';
import { AutomationCapabilities } from '@dxos/plugin-automation';

import type { AssistantPluginOptions } from '#types';

export const AgentHydrator = Capability.lazy('AgentHydrator', () => import('./agent-hydrator'));
export const AgentRuntime = Capability.lazy<void, Capability.Any[]>('AgentRuntime', () => import('./agent-service'));
export const AiContext = Capability.lazy<void, Capability.Any[]>('AiContext', () => import('./ai-context'));
export const AiService = Capability.lazy<AssistantPluginOptions | void, Capability.Any[]>(
  'AiService',
  () => import('./ai-service'),
);
export const IntegrationProvider = Capability.lazy(
  'AnthropicIntegrationProvider',
  () => import('./integration-provider'),
);
export const AppGraphBuilder: Capability.LazyCapability = Capability.lazy(
  'AppGraphBuilder',
  () => import('./app-graph-builder'),
);
// Explicit annotation: the contributed capability type references `Template` from @dxos/plugin-automation,
// so the inferred lazy type needs annotating to stay portable (TS2883).
export const AutomationTemplates: Capability.LazyCapability<
  void,
  Capability.Capability<typeof AutomationCapabilities.Template>[]
> = Capability.lazy('AutomationTemplates', () => import('./automation-templates'));
export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const CompanionChatProvisioner = Capability.lazy(
  'CompanionChatProvisioner',
  () => import('./companion-chat-provisioner'),
);
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const EdgeModelResolver = Capability.lazy('EdgeModelResolver', () => import('./edge-model-resolver'));
export const LocalModelResolver = Capability.lazy('LocalModelResolver', () => import('./local-model-resolver'));
export const MarkdownExtension = Capability.lazy('MarkdownExtension', () => import('./markdown-extension'));
export const Migrations = Capability.lazy('AssistantMigrations', () => import('./migrations'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const Settings: Capability.LazyCapability = Capability.lazy('Settings', () => import('./settings'));
export const AssistantState = Capability.lazy('AssistantState', () => import('./state'));
export const Toolkit: Capability.LazyCapability = Capability.lazy('Toolkit', () => import('./toolkit'));
