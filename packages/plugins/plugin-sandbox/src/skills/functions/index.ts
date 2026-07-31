//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './definitions';

export const SandboxHandlers = OperationHandlerSet.lazy(
  () => import('./create-sandbox'),
  () => import('./exec'),
  () => import('./upload-file'),
  () => import('./download-file'),
);
