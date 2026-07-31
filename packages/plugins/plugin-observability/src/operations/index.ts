//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { ObservabilityOperation } from '../types';

export const ObservabilityOperationHandlerSet = OperationHandlerSet.keyed([
  [ObservabilityOperation.SendEvent, () => import('./send-event')],
  [ObservabilityOperation.Toggle, () => import('./toggle')],
]);
