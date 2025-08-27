//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export * from './capabilities';

export const AiService = lazy(() => import('./ai-service'));
export const AppGraphBuilder = lazy(() => import('./app-graph-builder'));
export const BlueprintDefinition = lazy(() => import('./blueprint-definition'));
export const EdgeModelResolver = lazy(() => import('./edge-model-resolver'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const ReactSurface = lazy(() => import('./react-surface'));
export const Settings = lazy(() => import('./settings'));
export const AssistantState = lazy(() => import('./state'));
export const Toolkit = lazy(() => import('./toolkit'));
