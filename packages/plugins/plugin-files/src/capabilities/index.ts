//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const AppGraphBuilder = lazy(() => import('./app-graph-builder'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const Markdown = lazy(() => import('./markdown'));
export const ReactSurface = lazy(() => import('./react-surface'));
export const FileSettings = lazy(() => import('./settings'));
export const FileState = lazy(() => import('./state'));

export * from './capabilities';
