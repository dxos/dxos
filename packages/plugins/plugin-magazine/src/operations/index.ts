//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as FeedOperation from '../types/FeedOperation';

export const MagazineOperationHandlerSet = OperationHandlerSet.lazy([
  FeedOperation.ClearMagazine.pipe(Operation.lazyHandler(() => import('./clear-magazine'))),
  FeedOperation.CurateMagazine.pipe(Operation.lazyHandler(() => import('./curate-magazine'))),
  FeedOperation.FetchArticleContent.pipe(Operation.lazyHandler(() => import('./fetch-article-content'))),
  FeedOperation.LoadPostContent.pipe(Operation.lazyHandler(() => import('./load-post-content'))),
  FeedOperation.SyncFeed.pipe(Operation.lazyHandler(() => import('./sync-feed'))),
]);
