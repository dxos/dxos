//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AiService = Capability.lazy('AiService', () => import('./ai-service'));
export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const AssistantState = Capability.lazy('AssistantState', () => import('./state'));
export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const EdgeModelResolver = Capability.lazy('EdgeModelResolver', () => import('./edge-model-resolver'));
export const IntentResolver = Capability.lazy('IntentResolver', () => import('./intent-resolver'));
export const LocalModelResolver = Capability.lazy('LocalModelResolver', () => import('./local-model-resolver'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const Repair = Capability.lazy('Repair', () => import('./repair'));
export const Settings = Capability.lazy('Settings', () => import('./settings'));
export const Toolkit = Capability.lazy('Toolkit', () => import('./toolkit'));

export * from './blueprint-definition';
export * from './capabilities';
