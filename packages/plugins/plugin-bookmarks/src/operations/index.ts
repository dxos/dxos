//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as BookmarkOperation from '../types/BookmarkOperation';

export const BookmarkOperationHandlerSet = OperationHandlerSet.keyed([
  [BookmarkOperation.AddFromSnapshot, () => import('./add-from-snapshot')],
  [BookmarkOperation.Summarize, () => import('./summarize')],
]);
