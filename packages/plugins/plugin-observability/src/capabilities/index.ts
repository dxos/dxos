//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const AppGraphBuilder = lazy(() => import('./app-graph-builder'));
export const ClientReady = lazy(() => import('./client-ready'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const ReactSurface = lazy(() => import('./react-surface'));
export const ObservabilitySettings = lazy(() => import('./settings'));
export const ObservabilityState = lazy(() => import('./state'));

export * from './capabilities';
