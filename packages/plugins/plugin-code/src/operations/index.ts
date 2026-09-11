//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { CodeOperation } from '#types';

export const CodeOperationHandlerSet = OperationHandlerSet.lazy([
  CodeOperation.VerifySpec.pipe(Operation.lazyHandler(() => import('./verify-spec.ts'))),
  CodeOperation.RunBuildAgent.pipe(Operation.lazyHandler(() => import('./run-build-agent.ts'))),
  CodeOperation.ListFiles.pipe(Operation.lazyHandler(() => import('./list-files.ts'))),
  CodeOperation.ReadFile.pipe(Operation.lazyHandler(() => import('./read-file.ts'))),
  CodeOperation.WriteFile.pipe(Operation.lazyHandler(() => import('./write-file.ts'))),
  CodeOperation.DeleteFile.pipe(Operation.lazyHandler(() => import('./delete-file.ts'))),
  CodeOperation.ScaffoldProject.pipe(Operation.lazyHandler(() => import('./scaffold-project.ts'))),
  CodeOperation.HelloWorld.pipe(Operation.lazyHandler(() => import('./hello-world.ts'))),
  CodeOperation.ResetProject.pipe(Operation.lazyHandler(() => import('./reset-project.ts'))),
  CodeOperation.BuildProject.pipe(Operation.lazyHandler(() => import('./build-project.ts'))),
  CodeOperation.RunBuild.pipe(Operation.lazyHandler(() => import('./run-build.ts'))),
]);
