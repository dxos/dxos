//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

const Handlers = OperationHandlerSet.lazy(
  () => import('./verify-spec'),
  () => import('./run-build-agent'),
  () => import('./list-files'),
  () => import('./read-file'),
  () => import('./write-file'),
  () => import('./delete-file'),
  () => import('./scaffold-project'),
);

export { DeleteFile, ListFiles, ReadFile, RunBuildAgent, ScaffoldProject, VerifySpec, WriteFile } from './definitions';

export const CodeHandlers = Handlers;
