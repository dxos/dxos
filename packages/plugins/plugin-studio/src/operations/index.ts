//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { StudioOperation } from '#types';

export const StudioOperationHandlerSet = OperationHandlerSet.lazy([
  StudioOperation.Generate.pipe(Operation.lazyHandler(() => import('./generate.ts'))),
]);
