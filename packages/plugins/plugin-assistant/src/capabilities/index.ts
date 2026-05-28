//
// Copyright 2025 DXOS.org
//

import type { AssistantPluginOptions } from '#types';
import { Capability } from '@dxos/app-framework';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Blueprint, OperationHandlerSet } from '@dxos/compute';

export const AiContext = Capability.lazy<void, Capability.Any[]>('AiContext', () => import('./ai-context'));
export const AiService = Capability.lazy<AssistantPluginOptions | void, Capability.Any[]>('AiService', () => import('./ai-service'));
export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const CompanionChatProvisioner = Capability.lazy(
  'CompanionChatProvisioner',
  () => import('./companion-chat-provisioner'),
);
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
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
