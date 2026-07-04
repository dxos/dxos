//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/compute';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const BuiltinConnectors = Capability.lazy('BuiltinConnectors', () => import('./connectors'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const Migrations = Capability.lazy('ConnectorMigrations', () => import('./migrations'));
export const Coordinator = Capability.lazy('ConnectorCoordinator', () => import('./connector-coordinator'));
export const OAuthRedirect = Capability.lazy('OAuthRedirect', () => import('./oauth-redirect'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
