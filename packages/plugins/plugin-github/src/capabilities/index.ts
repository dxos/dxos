//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/compute';

export const AppGraphBuilder = Capability.lazy('GitHubAppGraphBuilder', () => import('./app-graph-builder'));
export const Connector = Capability.lazy('GitHubConnector', () => import('./connector'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('GitHubReactSurface', () => import('./react-surface'));
