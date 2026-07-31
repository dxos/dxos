//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export * from './definitions';

export const ScriptHandlers = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./read'),
  () => import('./update'),
  () => import('./delete'),
  () => import('./deploy'),
  () => import('./invoke'),
  () => import('./inspect-invocations'),
  () => import('./query-deployed-functions'),
  () => import('./install-function'),
);
