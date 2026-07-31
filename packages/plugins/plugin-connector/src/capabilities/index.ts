//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/compute';

export * from './connector-coordinator';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const BuiltinConnectors = Capability.lazy('BuiltinConnectors', () => import('./connectors'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const OAuthRedirect = Capability.lazy('OAuthRedirect', () => import('./oauth-redirect'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
