//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/compute';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const LayerSpecs = Capability.lazy<void, Capability.Any[]>('LayerSpecs', () => import('./layer-specs'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const NavigationResolver: Capability.LazyCapability = Capability.lazy(
  'NavigationResolver',
  () => import('./navigation-resolver'),
);
export const RegistrySync = Capability.lazy('RegistrySync', () => import('./registry-sync'));
export const Templates = Capability.lazy('Templates', () => import('./templates'));
export const TriggerRuntimeController = Capability.lazy(
  'TriggerRuntimeController',
  () => import('./trigger-runtime-controller'),
);
