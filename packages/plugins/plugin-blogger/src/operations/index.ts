//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SyncPosts } from './definitions.ts';
import { AddPublication } from './definitions.ts';
import { AddPost } from './definitions.ts';

export * as BloggerOperation from './definitions.ts';

export const BloggerOperationHandlerSet = OperationHandlerSet.lazy([
  AddPost.pipe(Operation.lazyHandler(() => import('./add-post.ts'))),
  AddPublication.pipe(Operation.lazyHandler(() => import('./add-publication.ts'))),
  SyncPosts.pipe(Operation.lazyHandler(() => import('./sync-posts.ts'))),
]);
