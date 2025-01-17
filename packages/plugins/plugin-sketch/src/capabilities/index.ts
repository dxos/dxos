//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const AppGraphSerializer = lazy(() => import('./app-graph-serializer'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const ReactSurface = lazy(() => import('./react-surface'));
export const SketchSettings = lazy(() => import('./settings'));
