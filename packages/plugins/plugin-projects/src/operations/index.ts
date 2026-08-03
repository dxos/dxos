//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as ProjectOperation from '../types/ProjectOperation';

export const ProjectOperationHandlerSet = OperationHandlerSet.keyed([
  [ProjectOperation.CreateChat, () => import('./create-chat')],
  [ProjectOperation.Create, () => import('./create-project')],
  [ProjectOperation.CreateRoutine, () => import('./create-routine')],
]);
