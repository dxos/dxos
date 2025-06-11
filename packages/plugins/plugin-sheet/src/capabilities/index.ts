//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const AnchorSort = lazy(() => import('./anchor-sort'));
export const ComputeGraphRegistry = lazy(() => import('./compute-graph-registry'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const Markdown = lazy(() => import('./markdown'));
export const ReactSurface = lazy(() => import('./react-surface'));

export * from './capabilities';
