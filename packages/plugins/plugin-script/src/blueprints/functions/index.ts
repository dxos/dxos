//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';
export { ScriptDeploymentService } from './services';

export const ScriptHandlers = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./read'),
  () => import('./update'),
  () => import('./delete'),
  () => import('./deploy'),
  () => import('./invoke'),
  () => import('./inspect-invocations'),
);
