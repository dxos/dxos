//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type OperationHandlerSet } from '@dxos/compute';

export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
