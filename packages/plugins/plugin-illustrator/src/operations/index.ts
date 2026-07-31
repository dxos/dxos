//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { DrawingOperation } from '../types';

export const IllustratorOperationHandlerSet = OperationHandlerSet.keyed([
  [DrawingOperation.Create, () => import('./create')],
  [DrawingOperation.Edit, () => import('./edit')],
  [DrawingOperation.Generate, () => import('./generate')],
  [DrawingOperation.Read, () => import('./read')],
]);
