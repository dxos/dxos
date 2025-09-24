//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const AppGraphBuilder = lazy(() => import('./app-graph-builder'));
export const ComputeRuntime = lazy(() => import('./compute-runtime'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const ReactSurface = lazy(() => import('./react-surface'));

export * from './capabilities';
