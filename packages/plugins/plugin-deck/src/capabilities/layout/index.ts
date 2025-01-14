//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const DeckState = lazy(() => import('./deck'));
export const AppGraphBuilder = lazy(() => import('./app-graph-builder'));
export const LayoutIntentResolver = lazy(() => import('./intent-resolver'));
export const LayoutState = lazy(() => import('./state'));
export const ReactContext = lazy(() => import('./react-context'));
export const ReactRoot = lazy(() => import('./react-root'));

export * from './deck';
