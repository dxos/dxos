//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

import type { ClientReadyOptions } from './client-ready';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const ClientReady = Capability.lazy<ClientReadyOptions>('ClientReady', () => import('./client-ready'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const ObservabilitySettings = Capability.lazy('ObservabilitySettings', () => import('./settings'));
export const ObservabilityState = Capability.lazy('ObservabilityState', () => import('./state'));
