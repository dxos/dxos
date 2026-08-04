//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as FileOperation from '../types/FileOperation';

export const FileOperationHandlerSet = OperationHandlerSet.keyed([
  [FileOperation.Create, () => import('./create')],
  [FileOperation.Read, () => import('./read')],
]);
