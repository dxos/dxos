//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const CodeOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./verify-spec'),
  () => import('./run-build-agent'),
  () => import('./list-files'),
  () => import('./read-file'),
  () => import('./write-file'),
  () => import('./delete-file'),
  () => import('./scaffold-project'),
  () => import('./hello-world'),
  () => import('./reset-project'),
  () => import('./build-project'),
  () => import('./run-build'),
);
