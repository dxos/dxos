//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DrawingOperation } from '../types';

export const IllustratorOperationHandlerSet = OperationHandlerSet.keyed([
  [DrawingOperation.Create, () => import('./create')],
  [DrawingOperation.Edit, () => import('./edit')],
  [DrawingOperation.Generate, () => import('./generate')],
  [DrawingOperation.Read, () => import('./read')],
]);
