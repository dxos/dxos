//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const SkillDefinition = Capability.lazy('SkillDefinition', () => import('./skill-definition'));
export const BuildRunState = Capability.lazy('BuildRunState', () => import('./build-run-state'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const Settings = Capability.lazy('Settings', () => import('./settings'));
