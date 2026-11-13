//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as SteOperation from './SteOperation.ts';

export const SteHandlers = OperationHandlerSet.lazy([
  SteOperation.Verify.pipe(Operation.lazyHandler(() => import('./verify.ts'))),
]);
