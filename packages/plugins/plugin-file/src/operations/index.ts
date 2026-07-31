//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { FileOperation } from '../types';

export const FileOperationHandlerSet = OperationHandlerSet.keyed([
  [FileOperation.Create, () => import('./create')],
  [FileOperation.Read, () => import('./read')],
]);
