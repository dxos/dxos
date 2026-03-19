//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';

export const EntityExtractionHandlers = OperationHandlerSet.lazy(() => import('./entity-extraction'));
