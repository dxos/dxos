//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework/next';

export const DeckState = lazy(() => import('./deck'));
export const GraphBuilder = lazy(() => import('./graph-builder'));
export const LayoutIntents = lazy(() => import('./intents'));
export const LayoutState = lazy(() => import('./state'));
export const ReactContext = lazy(() => import('./react-context'));
export const ReactRoot = lazy(() => import('./react-root'));

export * from './deck';
