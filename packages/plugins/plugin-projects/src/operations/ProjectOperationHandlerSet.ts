//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ProjectMailboxOperation, ProjectOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  ProjectOperation.Create.pipe(Operation.lazyHandler(() => import('./create-project'))),
  ProjectMailboxOperation.CreateTrackingProject.pipe(
    Operation.lazyHandler(() => import('./mailbox/create-tracking-project')),
  ),
  ProjectMailboxOperation.UpdateInvestorLog.pipe(Operation.lazyHandler(() => import('./mailbox/update-investor-log'))),
  ProjectMailboxOperation.UpdateProjectTasks.pipe(
    Operation.lazyHandler(() => import('./mailbox/update-project-tasks')),
  ),
  ProjectMailboxOperation.UpdateTravelLog.pipe(Operation.lazyHandler(() => import('./mailbox/update-travel-log'))),
  ProjectOperation.DelegateTaskToChat.pipe(Operation.lazyHandler(() => import('./delegate-task-to-chat'))),
  ProjectOperation.GetProject.pipe(Operation.lazyHandler(() => import('./get-project'))),
  ProjectOperation.ArtifactAdd.pipe(Operation.lazyHandler(() => import('./artifact-add'))),
  ProjectOperation.ArtifactList.pipe(Operation.lazyHandler(() => import('./artifact-list'))),
]);
