//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as FeedOperation from './definitions';

export const FeedOperationHandlerSet = OperationHandlerSet.lazy(() => import('./sync-feed'));
