//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const NavigationResolver = Capability.lazy(
  'NavigationResolver',
  () => import('./navigation-resolver'),
);
export const ChannelBackendFeed = Capability.lazy('ChannelBackendFeed', () => import('./channel-backend-feed'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
