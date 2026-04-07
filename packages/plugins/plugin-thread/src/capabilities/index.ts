//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const CallManager = Capability.lazy('CallManager', () => import('./call-manager'));
export const Markdown = Capability.lazy('Markdown', () => import('./markdown'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactRoot = Capability.lazy('ReactRoot', () => import('./react-root'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const ThreadSettings = Capability.lazy('ThreadSettings', () => import('./settings'));
export const ThreadState = Capability.lazy('ThreadState', () => import('./state'));
export const UndoMappings = Capability.lazy('UndoMappings', () => import('./undo-mappings'));
