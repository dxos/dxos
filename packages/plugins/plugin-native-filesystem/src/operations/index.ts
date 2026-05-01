//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as NativeFilesystemOperation from './definitions';

export const NativeFilesystemOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./open-directory'),
  () => import('./close-directory'),
  () => import('./refresh-directory'),
);
