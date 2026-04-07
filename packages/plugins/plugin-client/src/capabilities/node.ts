//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

export const Client = Capability.lazy('Client', () => import('./client'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const SchemaDefs = Capability.lazy('SchemaDefs', () => import('./schema-defs'));
