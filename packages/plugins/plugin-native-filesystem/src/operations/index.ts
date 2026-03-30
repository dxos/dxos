//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export const NativeFilesystemOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./open-directory'),
  () => import('./close-directory'),
  () => import('./save-file'),
  () => import('./refresh-directory'),
);
