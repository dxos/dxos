//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { FeedOperation } from '../types';

export const MagazineOperationHandlerSet = OperationHandlerSet.keyed([
  [FeedOperation.ClearMagazine, () => import('./clear-magazine')],
  [FeedOperation.CurateMagazine, () => import('./curate-magazine')],
  [FeedOperation.FetchArticleContent, () => import('./fetch-article-content')],
  [FeedOperation.LoadPostContent, () => import('./load-post-content')],
  [FeedOperation.SyncFeed, () => import('./sync-feed')],
]);
