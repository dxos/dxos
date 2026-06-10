//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const FeedOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./clear-magazine'),
  () => import('./curate-magazine'),
  () => import('./fetch-article-content'),
  () => import('./load-post-content'),
  () => import('./sync-feed'),
);
