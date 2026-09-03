//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ProjectMailboxOperation, ProjectOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  ProjectOperation.Create.pipe(Operation.lazyHandler(() => import('./create-project.ts'))),
  ProjectMailboxOperation.CreateTrackingProject.pipe(
    Operation.lazyHandler(() => import('./mailbox/create-tracking-project.ts')),
  ),
  ProjectMailboxOperation.UpdateInvestorLog.pipe(
    Operation.lazyHandler(() => import('./mailbox/update-investor-log.ts')),
  ),
  ProjectMailboxOperation.UpdateProjectTasks.pipe(
    Operation.lazyHandler(() => import('./mailbox/update-project-tasks.ts')),
  ),
  ProjectMailboxOperation.UpdateTravelLog.pipe(Operation.lazyHandler(() => import('./mailbox/update-travel-log.ts'))),
  ProjectOperation.DelegateTaskToChat.pipe(Operation.lazyHandler(() => import('./delegate-task-to-chat.ts'))),
  ProjectOperation.GetProject.pipe(Operation.lazyHandler(() => import('./get-project.ts'))),
  ProjectOperation.ArtifactAdd.pipe(Operation.lazyHandler(() => import('./artifact-add.ts'))),
  ProjectOperation.ArtifactList.pipe(Operation.lazyHandler(() => import('./artifact-list.ts'))),
]);
