//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as CodeOperation from '../types/CodeOperation';

export const CodeOperationHandlerSet = OperationHandlerSet.lazy([
  CodeOperation.VerifySpec.pipe(Operation.lazyHandler(() => import('./verify-spec'))),
  CodeOperation.RunBuildAgent.pipe(Operation.lazyHandler(() => import('./run-build-agent'))),
  CodeOperation.ListFiles.pipe(Operation.lazyHandler(() => import('./list-files'))),
  CodeOperation.ReadFile.pipe(Operation.lazyHandler(() => import('./read-file'))),
  CodeOperation.WriteFile.pipe(Operation.lazyHandler(() => import('./write-file'))),
  CodeOperation.DeleteFile.pipe(Operation.lazyHandler(() => import('./delete-file'))),
  CodeOperation.ScaffoldProject.pipe(Operation.lazyHandler(() => import('./scaffold-project'))),
  CodeOperation.HelloWorld.pipe(Operation.lazyHandler(() => import('./hello-world'))),
  CodeOperation.ResetProject.pipe(Operation.lazyHandler(() => import('./reset-project'))),
  CodeOperation.BuildProject.pipe(Operation.lazyHandler(() => import('./build-project'))),
  CodeOperation.RunBuild.pipe(Operation.lazyHandler(() => import('./run-build'))),
]);
