//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const Client = Capability.lazy('Client', () => import('./client'));
export const Migrations = Capability.lazy('Migrations', () => import('./migrations'));
export { NavigationHandler } from './navigation-handler';
export type { NavigationHandlerOptions } from './navigation-handler';
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactContext = Capability.lazy('ReactContext', () => import('./react-context'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const SchemaDefs = Capability.lazy('SchemaDefs', () => import('./schema-defs'));
