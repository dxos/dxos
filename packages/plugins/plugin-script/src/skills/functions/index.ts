//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import {
  Create,
  Delete,
  Deploy,
  InspectInvocations,
  InstallFunction,
  Invoke,
  QueryDeployedFunctions,
  Read,
  Update,
} from './definitions.ts';

export * from './definitions.ts';

export const ScriptHandlers = OperationHandlerSet.lazy([
  Create.pipe(Operation.lazyHandler(() => import('./create.ts'))),
  Read.pipe(Operation.lazyHandler(() => import('./read.ts'))),
  Update.pipe(Operation.lazyHandler(() => import('./update.ts'))),
  Delete.pipe(Operation.lazyHandler(() => import('./delete.ts'))),
  Deploy.pipe(Operation.lazyHandler(() => import('./deploy.ts'))),
  Invoke.pipe(Operation.lazyHandler(() => import('./invoke.ts'))),
  InspectInvocations.pipe(Operation.lazyHandler(() => import('./inspect-invocations.ts'))),
  QueryDeployedFunctions.pipe(Operation.lazyHandler(() => import('./query-deployed-functions.ts'))),
  InstallFunction.pipe(Operation.lazyHandler(() => import('./install-function.ts'))),
]);
