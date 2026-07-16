//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as BloggerOperation from './definitions';

export const BloggerOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-post'),
  () => import('./add-publication'),
  () => import('./sync-posts'),
);
