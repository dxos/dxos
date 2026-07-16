//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit type import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import { OperationHandlerSet, type LayerSpec } from '@dxos/compute';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const NavigationResolver = Capability.lazy('NavigationResolver', () => import('./navigation-resolver'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const LayerSpecs = Capability.lazyModule(
  'LayerSpecs',
  { provides: [Capabilities.LayerSpec, Capabilities.TraceSink] },
  () => import('./layer-specs'),
);
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const RegistrySync = Capability.lazy('RegistrySync', () => import('./registry-sync'));
export const Templates = Capability.lazy('Templates', () => import('./templates'));
export const TriggerRuntimeController = Capability.lazy(
  'TriggerRuntimeController',
  () => import('./trigger-runtime-controller'),
);
