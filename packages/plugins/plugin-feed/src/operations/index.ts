//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as FeedOperation from './definitions';

export const FeedOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-post-to-magazine'),
  () => import('./curate-magazine'),
  () => import('./fetch-article-content'),
  () => import('./list-candidate-posts'),
  () => import('./load-post-content'),
  () => import('./refresh-magazine'),
  () => import('./sync-feed'),
);
