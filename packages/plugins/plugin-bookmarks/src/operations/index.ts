//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { BookmarkOperation } from '#types';

export const BookmarkOperationHandlerSet = OperationHandlerSet.keyed([
  [BookmarkOperation.AddFromSnapshot, () => import('./add-from-snapshot')],
  [BookmarkOperation.Summarize, () => import('./summarize')],
]);
