//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as BookmarkOperation from '../types/BookmarkOperation';

export const BookmarkOperationHandlerSet = OperationHandlerSet.lazy([
  BookmarkOperation.AddFromSnapshot.pipe(Operation.lazyHandler(() => import('./add-from-snapshot'))),
  BookmarkOperation.Summarize.pipe(Operation.lazyHandler(() => import('./summarize'))),
]);
