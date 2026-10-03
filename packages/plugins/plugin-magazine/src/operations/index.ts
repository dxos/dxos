//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { FeedOperation } from '#types';

export const MagazineOperationHandlerSet = OperationHandlerSet.lazy([
  FeedOperation.ClearMagazine.pipe(Operation.lazyHandler(() => import('./clear-magazine.ts'))),
  FeedOperation.CurateMagazine.pipe(Operation.lazyHandler(() => import('./curate-magazine.ts'))),
  FeedOperation.FetchArticleContent.pipe(Operation.lazyHandler(() => import('./fetch-article-content.ts'))),
  FeedOperation.LoadPostContent.pipe(Operation.lazyHandler(() => import('./load-post-content.ts'))),
  FeedOperation.SyncFeed.pipe(Operation.lazyHandler(() => import('./sync-feed.ts'))),
]);
