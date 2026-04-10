//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactRoot = Capability.lazy('ReactRoot', () => import('./react-root'));
export const SpotlightDismiss = Capability.lazy('SpotlightDismiss', () => import('./spotlight-dismiss'));
export const State = Capability.lazy('State', () => import('./state'));
