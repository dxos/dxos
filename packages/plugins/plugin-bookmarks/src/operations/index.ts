//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { BookmarkOperation } from '#types';

export const BookmarkOperationHandlerSet = OperationHandlerSet.keyed([
  [BookmarkOperation.AddFromSnapshot, () => import('./add-from-snapshot')],
  [BookmarkOperation.Summarize, () => import('./summarize')],
]);
