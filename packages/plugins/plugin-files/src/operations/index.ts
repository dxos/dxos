//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as FilesOperation from './definitions';

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
