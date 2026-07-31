//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { CodeOperation } from '../types';

export const CodeOperationHandlerSet = OperationHandlerSet.keyed([
  [CodeOperation.VerifySpec, () => import('./verify-spec')],
  [CodeOperation.RunBuildAgent, () => import('./run-build-agent')],
  [CodeOperation.ListFiles, () => import('./list-files')],
  [CodeOperation.ReadFile, () => import('./read-file')],
  [CodeOperation.WriteFile, () => import('./write-file')],
  [CodeOperation.DeleteFile, () => import('./delete-file')],
  [CodeOperation.ScaffoldProject, () => import('./scaffold-project')],
  [CodeOperation.HelloWorld, () => import('./hello-world')],
  [CodeOperation.ResetProject, () => import('./reset-project')],
  [CodeOperation.BuildProject, () => import('./build-project')],
  [CodeOperation.RunBuild, () => import('./run-build')],
]);
