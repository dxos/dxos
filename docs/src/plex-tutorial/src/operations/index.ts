//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { MarkRead } from '../types/StashedLinkOperation.ts';

// #region handler-set
export const StashOperationHandlerSet = OperationHandlerSet.lazy([
  MarkRead.pipe(Operation.lazyHandler(() => import('./mark-read.ts'))),
]);
// #endregion
