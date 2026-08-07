//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SyncPosts } from './definitions';
import { AddPublication } from './definitions';
import { AddPost } from './definitions';

export * as BloggerOperation from './definitions';

export const BloggerOperationHandlerSet = OperationHandlerSet.lazy([
  AddPost.pipe(Operation.lazyHandler(() => import('./add-post'))),
  AddPublication.pipe(Operation.lazyHandler(() => import('./add-publication'))),
  SyncPosts.pipe(Operation.lazyHandler(() => import('./sync-posts'))),
]);
