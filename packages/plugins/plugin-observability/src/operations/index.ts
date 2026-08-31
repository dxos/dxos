//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ObservabilityOperation } from '#types';

export const ObservabilityOperationHandlerSet = OperationHandlerSet.lazy([
  ObservabilityOperation.SendEvent.pipe(Operation.lazyHandler(() => import('./send-event'))),
  ObservabilityOperation.SetEnabled.pipe(Operation.lazyHandler(() => import('./set-enabled'))),
]);
