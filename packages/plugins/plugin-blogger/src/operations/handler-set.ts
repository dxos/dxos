//
// Copyright 2026 DXOS.org
//
//
// NOTE: This leaf module is re-exported by the `/plugin` stub, so it must not import the
// operation definitions (or anything else heavy) — that would drag the plugin implementation
// into every host's eager module graph.

import { OperationHandlerSet } from '@dxos/compute';

export const BloggerOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-post'),
  () => import('./add-publication'),
  () => import('./sync-posts'),
);
