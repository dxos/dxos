//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

export const AiService = Capability.lazy('AiService', () => import('./ai-service'));
export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const CompanionChatProvisioner = Capability.lazy(
  'CompanionChatProvisioner',
  () => import('./companion-chat-provisioner'),
);
export const EdgeModelResolver = Capability.lazy('EdgeModelResolver', () => import('./edge-model-resolver'));
export const LocalModelResolver = Capability.lazy('LocalModelResolver', () => import('./local-model-resolver'));
export const MarkdownExtension = Capability.lazy('MarkdownExtension', () => import('./markdown'));
export const Migrations = Capability.lazy('AssistantMigrations', () => import('./migrations'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const Settings = Capability.lazy('Settings', () => import('./settings'));
export const AssistantState = Capability.lazy('AssistantState', () => import('./state'));
export const Toolkit = Capability.lazy('Toolkit', () => import('./toolkit'));
