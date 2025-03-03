//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const Artifact = lazy(() => import('./artifact'));
export const AppGraphBuilder = lazy(() => import('./app-graph-builder'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const ReactSurface = lazy(() => import('./react-surface'));
export const MapState = lazy(() => import('./state'));

export * from './capabilities';
