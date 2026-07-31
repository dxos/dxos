//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export * as ProjectOperations from './definitions';

export const ProjectHandlers = OperationHandlerSet.lazy(
  () => import('./artifact-add'),
  () => import('./artifact-list'),
);
