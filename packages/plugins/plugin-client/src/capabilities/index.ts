//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/compute';

export const AccountCache = Capability.lazy('AccountCache', () => import('./account-cache'));
export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const HubHttpClient = Capability.lazy('HubHttpClient', () => import('./hub-http-client'));
export const Client = Capability.lazy('Client', () => import('./client'));
export const LayerSpecs = Capability.lazy<void, Capability.Any[]>('LayerSpecs', () => import('./layer-specs'));
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
export const SpaceFeedReplicationProgress = Capability.lazy(
  'SpaceFeedReplicationProgress',
  () => import('./space-feed-replication-progress'),
);
export const SpaceReplicationProgress = Capability.lazy(
  'SpaceReplicationProgress',
  () => import('./space-replication-progress'),
);
