//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ArtifactAdd, ArtifactList } from './definitions';

export * as ProjectOperations from './definitions';

export const ProjectHandlers = OperationHandlerSet.lazy([
  ArtifactAdd.pipe(Operation.lazyHandler(() => import('./artifact-add'))),
  ArtifactList.pipe(Operation.lazyHandler(() => import('./artifact-list'))),
]);
