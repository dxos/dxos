//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const FileOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./read'),
);
