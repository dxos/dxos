//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const AppGraphBuilder = lazy(() => import('./app-graph-builder'));
export const BlueprintDefinition = lazy(() => import('./blueprint-definition'));
export const Compiler = lazy(() => import('./compiler'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const ReactSurface = lazy(() => import('./react-surface'));
export const ScriptSettings = lazy(() => import('./settings'));

export * from './capabilities';
