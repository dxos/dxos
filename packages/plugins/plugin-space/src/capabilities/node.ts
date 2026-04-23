//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

export const IdentityCreated = Capability.lazy('IdentityCreated', () => import('./identity-created'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const UndoMappings = Capability.lazy('UndoMappings', () => import('./undo-mappings'));
