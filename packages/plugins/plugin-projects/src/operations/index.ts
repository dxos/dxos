//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export const ProjectOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-chat'),
  () => import('./create-project'),
  () => import('./create-routine'),
  () => import('./get-project'),
  () => import('./list-projects'),
  () => import('./update-project'),
);
