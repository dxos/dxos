//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './definitions';

export const WebSearchHandlers = OperationHandlerSet.lazy(() => import('./fetch'));
