//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/compute';

import { type NavigationHandlerOptions } from './navigation-handler';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const Client = Capability.lazy('Client', () => import('./client'));
export const LayerSpecs = Capability.lazy<void, Capability.Any[]>('LayerSpecs', () => import('./layer-specs'));
export const Migrations = Capability.lazy('Migrations', () => import('./migrations'));
export const NavigationHandler = Capability.lazy(
  'NavigationHandler',
  () => import('./navigation-handler/navigation-handler'),
);
export type { NavigationHandlerOptions } from './navigation-handler';
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const SchemaDefs = Capability.lazy('SchemaDefs', () => import('./schema-defs'));
