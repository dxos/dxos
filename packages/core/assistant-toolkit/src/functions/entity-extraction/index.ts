//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './definitions';

export const EntityExtractionHandlers = OperationHandlerSet.lazy(() => import('./entity-extraction'));
