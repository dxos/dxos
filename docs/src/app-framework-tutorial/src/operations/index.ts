//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { RecordVisit } from '../types/BookmarkOperation.ts';

// #region handler-set
export const BookmarkOperationHandlerSet = OperationHandlerSet.lazy([
  RecordVisit.pipe(Operation.lazyHandler(() => import('./record-visit.ts'))),
]);
// #endregion
