//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const AnchorSort = lazy(() => import('./anchor-sort'));
export const AppGraphSerializer = lazy(() => import('./app-graph-serializer'));
export const ArtifactDefinition = lazy(() => import('./artifact-definition'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const ReactSurface = lazy(() => import('./react-surface'));
export const MarkdownSettings = lazy(() => import('./settings'));
export const MarkdownState = lazy(() => import('./state'));

export * from './capabilities';
