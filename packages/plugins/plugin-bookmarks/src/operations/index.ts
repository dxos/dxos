//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const BookmarkOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-from-snapshot'),
  () => import('./summarize'),
);
