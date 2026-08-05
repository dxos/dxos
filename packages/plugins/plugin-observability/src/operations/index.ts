//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as ObservabilityOperation from '../types/ObservabilityOperation';

export const ObservabilityOperationHandlerSet = OperationHandlerSet.lazy([
  ObservabilityOperation.SendEvent.pipe(Operation.lazyHandler(() => import('./send-event'))),
  ObservabilityOperation.Toggle.pipe(Operation.lazyHandler(() => import('./toggle'))),
]);
