//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const FilesOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./close'),
  () => import('./export'),
  () => import('./import'),
  () => import('./open-directory'),
  () => import('./open-file'),
  () => import('./reconnect'),
  () => import('./save'),
  () => import('./select-root'),
);
