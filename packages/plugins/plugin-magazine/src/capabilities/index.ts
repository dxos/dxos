//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const RoutineTemplates = Capability.lazy('RoutineTemplates', () => import('./routine-templates'));
export const SkillDefinition = Capability.lazy('SkillDefinition', () => import('./skill-definition'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const NavigationResolver = Capability.lazy('NavigationResolver', () => import('./navigation-resolver'));
