//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { FileSystemOperation } from '#types';

export const FileSystemOperationHandlerSet = OperationHandlerSet.lazy([
  FileSystemOperation.OpenDirectory.pipe(Operation.lazyHandler(() => import('./open-directory.ts'))),
  FileSystemOperation.CloseDirectory.pipe(Operation.lazyHandler(() => import('./close-directory.ts'))),
  FileSystemOperation.RefreshDirectory.pipe(Operation.lazyHandler(() => import('./refresh-directory.ts'))),
]);
