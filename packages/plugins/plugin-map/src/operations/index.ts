//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { MapOperation } from '../types';

export const MapOperationHandlerSet = OperationHandlerSet.keyed([[MapOperation.Toggle, () => import('./toggle')]]);
