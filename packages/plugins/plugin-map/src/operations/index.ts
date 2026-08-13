//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { MapOperation } from '#types';

export const MapOperationHandlerSet = OperationHandlerSet.lazy([
  MapOperation.Toggle.pipe(Operation.lazyHandler(() => import('./toggle'))),
]);
