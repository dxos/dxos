//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as ProjectMcpOperation from '../types/ProjectMcpOperation';
import * as ProjectOperation from '../types/ProjectOperation';

export const ProjectOperationHandlerSet = OperationHandlerSet.lazy([
  ProjectOperation.CreateChat.pipe(Operation.lazyHandler(() => import('./create-chat'))),
  ProjectOperation.Create.pipe(Operation.lazyHandler(() => import('./create-project'))),
  ProjectOperation.CreateRoutine.pipe(Operation.lazyHandler(() => import('./create-routine'))),
  ProjectMcpOperation.GetProject.pipe(Operation.lazyHandler(() => import('./get-project'))),
  ProjectMcpOperation.ListProjects.pipe(Operation.lazyHandler(() => import('./list-projects'))),
  ProjectMcpOperation.UpdateProject.pipe(Operation.lazyHandler(() => import('./update-project'))),
]);
