//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

export const Connector = Capability.lazy('IbkrConnector', () => import('./connector'));
export const CreateObject = Capability.lazy('IbkrCreateObject', () => import('./create-object'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'IbkrOperationHandler',
  () => import('./operation-handler'),
);
export const AppGraphBuilder = Capability.lazy('IbkrAppGraphBuilder', () => import('./app-graph-builder'));
export const ReactSurface = Capability.lazy('IbkrReactSurface', () => import('./react-surface'));
export const SkillDefinition = Capability.lazy('IbkrSkillDefinition', () => import('./skill-definition'));
