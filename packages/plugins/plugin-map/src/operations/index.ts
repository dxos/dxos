//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { MapOperation } from '../types';

export const MapOperationHandlerSet = OperationHandlerSet.keyed([[MapOperation.Toggle, () => import('./toggle')]]);
