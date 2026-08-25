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
  ProjectOperation.GetProject.pipe(Operation.lazyHandler(() => import('./get-project'))),
  // The project skill's own verbs: one set, so a host that registers the plugin's handlers gets
  // everything the skill declares rather than the two halves separately.
  ProjectOperation.ArtifactAdd.pipe(Operation.lazyHandler(() => import('./artifact-add'))),
  ProjectOperation.ArtifactList.pipe(Operation.lazyHandler(() => import('./artifact-list'))),
]);
