//
// Copyright 2024 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export { YouTube } from './apis';
export * from './definitions';

export const YouTubeHandlers = OperationHandlerSet.lazy(
  () => import('./clear-synced-videos'),
  () => import('./sync'),
);
