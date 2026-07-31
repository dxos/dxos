//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { FileOperation } from '../types';

export const FileOperationHandlerSet = OperationHandlerSet.keyed([
  [FileOperation.Create, () => import('./create')],
  [FileOperation.Read, () => import('./read')],
]);
