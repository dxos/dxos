//
// Copyright 2024 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export { YouTube } from './apis';
export * from './definitions';

export const YouTubeHandlers = OperationHandlerSet.lazy(() => import('./sync'), () => import('./clear-synced-videos'));
