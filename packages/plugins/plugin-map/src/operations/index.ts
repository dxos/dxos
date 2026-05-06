//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as MapOperation from './definitions';

export const MapOperationHandlerSet = OperationHandlerSet.lazy(() => import('./toggle'));
