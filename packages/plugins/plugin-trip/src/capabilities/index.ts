//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export { default as BlueprintDefinition } from './blueprint-definition';
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
// Explicit return type keeps the emitted declaration portable (TS2883).
export const MarkerProvider: Capability.LazyCapability<
  void,
  Capability.Capability<typeof MapCapabilities.MarkerProvider>
> = Capability.lazy('MarkerProvider', () => import('./marker-provider'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const Settings = Capability.lazy('Settings', () => import('./settings'));
