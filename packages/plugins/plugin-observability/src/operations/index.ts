//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ObservabilityOperation } from '../types';

export const ObservabilityOperationHandlerSet = OperationHandlerSet.keyed([
  [ObservabilityOperation.SendEvent, () => import('./send-event')],
  [ObservabilityOperation.Toggle, () => import('./toggle')],
]);
