//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));

export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
