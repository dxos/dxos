//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const AppGraphBuilder = lazy(() => import('./app-graph-builder'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const Keyboard = lazy(() => import('./keyboard'));
export const ReactSurface = lazy(() => import('./react-surface'));
export const State = lazy(() => import('./state'));
