//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as ProjectOperations from './definitions';

export const ProjectHandlers = OperationHandlerSet.lazy(
  () => import('./artifact-add'),
  () => import('./artifact-list'),
);
