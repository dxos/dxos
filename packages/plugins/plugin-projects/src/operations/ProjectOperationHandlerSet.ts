//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { FeatureOperation, ProjectMailboxOperation, ProjectOperation } from '#types';

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
  ProjectOperation.CopyTaskPrompt.pipe(Operation.lazyHandler(() => import('./copy-task-prompt.ts'))),
  ProjectOperation.GetProject.pipe(Operation.lazyHandler(() => import('./get-project.ts'))),
  ProjectOperation.ArtifactAdd.pipe(Operation.lazyHandler(() => import('./artifact-add.ts'))),
  ProjectOperation.ArtifactList.pipe(Operation.lazyHandler(() => import('./artifact-list.ts'))),
  FeatureOperation.Create.pipe(Operation.lazyHandler(() => import('./feature/create.ts'))),
  FeatureOperation.Update.pipe(Operation.lazyHandler(() => import('./feature/update.ts'))),
  FeatureOperation.Delete.pipe(Operation.lazyHandler(() => import('./feature/delete.ts'))),
  FeatureOperation.CreateSpec.pipe(Operation.lazyHandler(() => import('./feature/create-spec.ts'))),
  FeatureOperation.UpdateSpec.pipe(Operation.lazyHandler(() => import('./feature/update-spec.ts'))),
  FeatureOperation.AddDependency.pipe(Operation.lazyHandler(() => import('./feature/add-dependency.ts'))),
  FeatureOperation.RemoveDependency.pipe(Operation.lazyHandler(() => import('./feature/remove-dependency.ts'))),
  FeatureOperation.LinkTask.pipe(Operation.lazyHandler(() => import('./feature/link-task.ts'))),
  FeatureOperation.GetFeatures.pipe(Operation.lazyHandler(() => import('./feature/get-features.ts'))),
  FeatureOperation.ImportLinks.pipe(Operation.lazyHandler(() => import('./feature/import-links.ts'))),
  FeatureOperation.ImportSpec.pipe(Operation.lazyHandler(() => import('./feature/import-spec.ts'))),
]);
