//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { FileOperation } from '#types';

export const FileOperationHandlerSet = OperationHandlerSet.lazy([
  FileOperation.Create.pipe(Operation.lazyHandler(() => import('./create'))),
  FileOperation.CreateFromSource.pipe(Operation.lazyHandler(() => import('./create-from-source'))),
  FileOperation.Read.pipe(Operation.lazyHandler(() => import('./read'))),
]);
