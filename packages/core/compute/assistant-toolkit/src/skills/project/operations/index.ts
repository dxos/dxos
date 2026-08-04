//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ArtifactAdd, ArtifactList } from './definitions';

export * as ProjectOperations from './definitions';

export const ProjectHandlers = OperationHandlerSet.keyed([
  [ArtifactAdd, () => import('./artifact-add')],
  [ArtifactList, () => import('./artifact-list')],
]);
