//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const FeedOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-post-to-magazine'),
  () => import('./curate-magazine'),
  () => import('./fetch-article-content'),
  () => import('./list-candidate-posts'),
  () => import('./load-post-content'),
  () => import('./on-create-space'),
  () => import('./sync-feed'),
);
