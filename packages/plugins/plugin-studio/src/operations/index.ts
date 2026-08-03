//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as StudioOperation from '../types/StudioOperation';

export const StudioOperationHandlerSet = OperationHandlerSet.keyed([
  [StudioOperation.Generate, () => import('./generate')],
]);
