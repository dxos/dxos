//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as MapOperation from '../types/MapOperation';

export const MapOperationHandlerSet = OperationHandlerSet.keyed([[MapOperation.Toggle, () => import('./toggle')]]);
