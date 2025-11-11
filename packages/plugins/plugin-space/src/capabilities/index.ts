//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const AppGraphBuilder = lazy(() => import('./app-graph-builder'));
export const AppGraphSerializer = lazy(() => import('./app-graph-serializer'));
export const IdentityCreated = lazy(() => import('./identity-created'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const ReactRoot = lazy(() => import('./react-root'));
export const ReactSurface = lazy(() => import('./react-surface'));
export const Repair = lazy(() => import('./repair'));
export const SchemaDefs = lazy(() => import('./schema-defs'));
export const SpaceSettings = lazy(() => import('./settings'));
export const SpaceState = lazy(() => import('./state'));
export const SpacesReady = lazy(() => import('./spaces-ready'));

export * from './capabilities';
