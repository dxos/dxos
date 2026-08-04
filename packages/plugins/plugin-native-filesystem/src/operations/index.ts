//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as NativeFilesystemOperation from '../types/NativeFilesystemOperation';

export const NativeFilesystemOperationHandlerSet = OperationHandlerSet.keyed([
  [NativeFilesystemOperation.OpenDirectory, () => import('./open-directory')],
  [NativeFilesystemOperation.CloseDirectory, () => import('./close-directory')],
  [NativeFilesystemOperation.RefreshDirectory, () => import('./refresh-directory')],
]);
