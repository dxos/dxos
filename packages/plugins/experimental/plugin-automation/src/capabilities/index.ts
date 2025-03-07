//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const AiClient = lazy(() => import('./ai-client'));
export const AutomationSettings = lazy(() => import('./settings'));
export const AppGraphBuilder = lazy(() => import('./app-graph-builder'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const ReactSurface = lazy(() => import('./react-surface'));

export * from './capabilities';
