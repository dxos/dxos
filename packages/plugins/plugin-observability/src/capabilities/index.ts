//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const ClientReady = Capability.lazy('ClientReady', () => import('./client-ready'));
export const IntentResolver = Capability.lazy('IntentResolver', () => import('./intent-resolver'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const ObservabilitySettings = Capability.lazy('ObservabilitySettings', () => import('./settings'));
export const ObservabilityState = Capability.lazy('ObservabilityState', () => import('./state'));

export * from './capabilities';
