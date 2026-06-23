//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/compute';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const BuiltinConnectors = Capability.lazy('BuiltinConnectors', () => import('./connectors'));
export const Coordinator = Capability.lazy('ConnectorCoordinator', () => import('./connector-coordinator'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
