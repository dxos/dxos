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
  () => import('./hello-world'),
  () => import('./reset-project'),
);

export {
  DeleteFile,
  HelloWorld,
  ListFiles,
  ReadFile,
  ResetProject,
  RunBuildAgent,
  ScaffoldProject,
  VerifySpec,
  WriteFile,
} from './definitions';

export const CodeHandlers = Handlers;
