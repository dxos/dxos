//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as StudioOperation from '../types/StudioOperation';

export const StudioOperationHandlerSet = OperationHandlerSet.lazy([
  StudioOperation.Generate.pipe(Operation.lazyHandler(() => import('./generate'))),
]);
