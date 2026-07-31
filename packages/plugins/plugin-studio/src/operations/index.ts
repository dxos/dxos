//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { StudioOperation } from '../types';

export const StudioOperationHandlerSet = OperationHandlerSet.keyed([
  [StudioOperation.Generate, () => import('./generate')],
]);
