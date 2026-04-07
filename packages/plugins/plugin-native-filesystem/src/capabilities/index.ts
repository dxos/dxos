//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

export * from './state';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const Markdown = Capability.lazy('Markdown', () => import('./markdown'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
