//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type OperationHandlerSet } from '@dxos/compute';

import { type CallsCapabilities } from '#types';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const CallManager = Capability.lazy('CallManager', () => import('./call-manager'));
export const ReactRoot = Capability.lazy('ReactRoot', () => import('./react-root'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));

// The contributed capability is declared in #types, so the lazy wrapper needs an
// explicit annotation to keep the inferred type portable (TS2742/TS2883).
export const CallExtension: Capability.LazyCapability<
  void,
  Capability.Capability<typeof CallsCapabilities.EventHandler>
> = Capability.lazy('CallExtension', () => import('./call-extension'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const CallSettings = Capability.lazy('CallSettings', () => import('./settings'));
export const CallRecordState = Capability.lazy('CallRecordState', () => import('./state'));
