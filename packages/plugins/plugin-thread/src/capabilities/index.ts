//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Blueprint, OperationHandlerSet } from '@dxos/compute';

export const AgentRunner = Capability.lazy('AgentRunner', () => import('./agent-runner'));
export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const ChannelBackendFeed = Capability.lazy('ChannelBackendFeed', () => import('./channel-backend-feed'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const Markdown = Capability.lazy('MarkdownExtension', () => import('./markdown-extension'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const ThreadSettings = Capability.lazy('ThreadSettings', () => import('./settings'));
export const ThreadState = Capability.lazy('ThreadState', () => import('./state'));
export const UndoMappings = Capability.lazy('UndoMappings', () => import('./undo-mappings'));
