//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

export * from './app-graph-builder';

export const AppGraphSerializer = Capability.lazy('AppGraphSerializer', () => import('./app-graph-serializer'));
export const IdentityCreated = Capability.lazy('IdentityCreated', () => import('./identity-created'));
export const Migrations = Capability.lazy('SpaceMigrations', () => import('./migrations'));
export { NavigationHandler } from './navigation-handler';
export type { NavigationHandlerOptions } from './navigation-handler';
export const NavigationResolver = Capability.lazy('NavigationResolver', () => import('./navigation-resolver'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactRoot = Capability.lazy('ReactRoot', () => import('./react-root'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const Repair = Capability.lazy('Repair', () => import('./repair'));
export const SpaceSettings = Capability.lazy('SpaceSettings', () => import('./settings'));
export const SpacesReady = Capability.lazy('SpacesReady', () => import('./spaces-ready'));
export const SpaceState = Capability.lazy('SpaceState', () => import('./state'));
export const UndoMappings = Capability.lazy('UndoMappings', () => import('./undo-mappings'));
