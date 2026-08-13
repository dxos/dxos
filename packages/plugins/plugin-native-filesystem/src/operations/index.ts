//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { NativeFilesystemOperation } from '#types';

export const NativeFilesystemOperationHandlerSet = OperationHandlerSet.lazy([
  NativeFilesystemOperation.OpenDirectory.pipe(Operation.lazyHandler(() => import('./open-directory'))),
  NativeFilesystemOperation.CloseDirectory.pipe(Operation.lazyHandler(() => import('./close-directory'))),
  NativeFilesystemOperation.RefreshDirectory.pipe(Operation.lazyHandler(() => import('./refresh-directory'))),
]);
