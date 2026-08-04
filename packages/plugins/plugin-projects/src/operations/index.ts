//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as ProjectMcpOperation from '../types/ProjectMcpOperation';
import * as ProjectOperation from '../types/ProjectOperation';

export const ProjectOperationHandlerSet = OperationHandlerSet.keyed([
  [ProjectOperation.CreateChat, () => import('./create-chat')],
  [ProjectOperation.Create, () => import('./create-project')],
  [ProjectOperation.CreateRoutine, () => import('./create-routine')],
  [ProjectMcpOperation.GetProject, () => import('./get-project')],
  [ProjectMcpOperation.ListProjects, () => import('./list-projects')],
  [ProjectMcpOperation.UpdateProject, () => import('./update-project')],
]);
