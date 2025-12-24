//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const AppGraphBuilder = lazy(async () => import('./app-graph-builder'));
export const Client = lazy(async () => import('./client'));
export const IntentResolver = lazy(async () => import('./intent-resolver'));
export const Migrations = lazy(async () => import('./migrations'));
export const ReactContext = lazy(async () => import('./react-context'));
export const ReactSurface = lazy(async () => import('./react-surface'));
export const SchemaDefs = lazy(async () => import('./schema-defs'));
