//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as FeedOperation from './definitions';

export const FeedOperationHandlerSet = OperationHandlerSet.lazy(() => import('./sync-feed'));
