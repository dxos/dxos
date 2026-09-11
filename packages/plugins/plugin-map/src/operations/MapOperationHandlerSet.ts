//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { MapOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  MapOperation.SetControlType.pipe(Operation.lazyHandler(() => import('./set-control-type.ts'))),
]);
