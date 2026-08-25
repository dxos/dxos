//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ProjectMcpOperation, ProjectOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  ProjectOperation.Create.pipe(Operation.lazyHandler(() => import('./create-project'))),
  ProjectOperation.CreateTrackingProject.pipe(Operation.lazyHandler(() => import('./mailbox/create-tracking-project'))),
  ProjectOperation.UpdateInvestorLog.pipe(Operation.lazyHandler(() => import('./mailbox/update-investor-log'))),
  ProjectOperation.UpdateProjectTasks.pipe(Operation.lazyHandler(() => import('./mailbox/update-project-tasks'))),
  ProjectOperation.UpdateTravelLog.pipe(Operation.lazyHandler(() => import('./mailbox/update-travel-log'))),
  ProjectMcpOperation.GetProject.pipe(Operation.lazyHandler(() => import('./get-project'))),
  ProjectMcpOperation.ListProjects.pipe(Operation.lazyHandler(() => import('./list-projects'))),
  ProjectMcpOperation.UpdateProject.pipe(Operation.lazyHandler(() => import('./update-project'))),
]);
