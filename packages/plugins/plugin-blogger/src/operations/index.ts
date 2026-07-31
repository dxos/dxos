//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SyncPosts } from './definitions';
import { AddPublication } from './definitions';
import { AddPost } from './definitions';

export * as BloggerOperation from './definitions';

export const BloggerOperationHandlerSet = OperationHandlerSet.keyed([
  [AddPost, () => import('./add-post')],
  [AddPublication, () => import('./add-publication')],
  [SyncPosts, () => import('./sync-posts')],
]);
