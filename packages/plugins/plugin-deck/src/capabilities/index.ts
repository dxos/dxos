//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const AppGraphBuilder = lazy(() => import('./app-graph-builder'));
export const CheckAppScheme = lazy(() => import('./check-app-scheme'));
export const DeckSettings = lazy(() => import('./settings'));
export const DeckState = lazy(() => import('./state'));
export const LayoutIntentResolver = lazy(() => import('./intent-resolver'));
export const ReactRoot = lazy(() => import('./react-root'));
export const ReactSurface = lazy(() => import('./react-surface'));
// export const Tools = lazy(() => import('./tools'));
export const Toolkit = lazy(() => import('./toolkit'));
export const UrlHandler = lazy(() => import('./url-handler'));

export * from './capabilities';
// TODO(wittjosiah): Remove.
export * from './state';
