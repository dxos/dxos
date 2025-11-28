//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const AppGraphBuilder = lazy(() => import('./app-graph-builder'));
export const CallExtension = lazy(() => import('./call-extension'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const ReactSurface = lazy(() => import('./react-surface'));
export const Repair = lazy(() => import('./repair'));
export const MeetingSettings = lazy(() => import('./settings'));
export const MeetingState = lazy(() => import('./state'));
