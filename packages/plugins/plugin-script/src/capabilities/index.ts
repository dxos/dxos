//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Blueprint, OperationHandlerSet } from '@dxos/compute';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const Compiler = Capability.lazy('Compiler', () => import('./compiler'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const ScriptSettings = Capability.lazy('ScriptSettings', () => import('./settings'));
