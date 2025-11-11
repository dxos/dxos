//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const AiService = lazy(() => import('./ai-service'));
export const AppGraphBuilder = lazy(() => import('./app-graph-builder'));
export const AssistantState = lazy(() => import('./state'));
export const BlueprintDefinition = lazy(() => import('./blueprint-definition'));
export const EdgeModelResolver = lazy(() => import('./edge-model-resolver'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const LocalModelResolver = lazy(() => import('./local-model-resolver'));
export const ReactSurface = lazy(() => import('./react-surface'));
export const Repair = lazy(() => import('./repair'));
export const Settings = lazy(() => import('./settings'));
export const Toolkit = lazy(() => import('./toolkit'));

export * from './blueprint-definition';
export * from './capabilities';
