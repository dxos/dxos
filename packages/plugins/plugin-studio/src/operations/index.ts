//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { StudioOperation } from '../types';

export const StudioOperationHandlerSet = OperationHandlerSet.keyed([
  [StudioOperation.Generate, () => import('./generate')],
]);
