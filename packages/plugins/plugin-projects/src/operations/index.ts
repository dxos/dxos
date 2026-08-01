//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const ProjectOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-chat'),
  () => import('./create-project'),
  () => import('./create-routine'),
);
