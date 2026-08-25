//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ProjectMcpOperation, ProjectOperation } from '#types';

import { ArtifactAdd, ArtifactList } from '../skills/project/operations/definitions';

export const handlers = OperationHandlerSet.lazy([
  ProjectOperation.Create.pipe(Operation.lazyHandler(() => import('./create-project'))),
  ProjectOperation.CreateTrackingProject.pipe(Operation.lazyHandler(() => import('./mailbox/create-tracking-project'))),
  ProjectOperation.UpdateInvestorLog.pipe(Operation.lazyHandler(() => import('./mailbox/update-investor-log'))),
  ProjectOperation.UpdateProjectTasks.pipe(Operation.lazyHandler(() => import('./mailbox/update-project-tasks'))),
  ProjectOperation.UpdateTravelLog.pipe(Operation.lazyHandler(() => import('./mailbox/update-travel-log'))),
  ProjectMcpOperation.GetProject.pipe(Operation.lazyHandler(() => import('./get-project'))),
  ProjectMcpOperation.UpdateProject.pipe(Operation.lazyHandler(() => import('./update-project'))),
  // The project skill's own verbs: one set, so a host that registers the plugin's handlers gets
  // everything the skill declares rather than the two halves separately.
  ArtifactAdd.pipe(Operation.lazyHandler(() => import('../skills/project/operations/artifact-add'))),
  ArtifactList.pipe(Operation.lazyHandler(() => import('../skills/project/operations/artifact-list'))),
]);
