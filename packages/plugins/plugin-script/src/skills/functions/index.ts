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
} from './definitions';

export * from './definitions';

export const ScriptHandlers = OperationHandlerSet.lazy([
  Create.pipe(Operation.lazyHandler(() => import('./create'))),
  Read.pipe(Operation.lazyHandler(() => import('./read'))),
  Update.pipe(Operation.lazyHandler(() => import('./update'))),
  Delete.pipe(Operation.lazyHandler(() => import('./delete'))),
  Deploy.pipe(Operation.lazyHandler(() => import('./deploy'))),
  Invoke.pipe(Operation.lazyHandler(() => import('./invoke'))),
  InspectInvocations.pipe(Operation.lazyHandler(() => import('./inspect-invocations'))),
  QueryDeployedFunctions.pipe(Operation.lazyHandler(() => import('./query-deployed-functions'))),
  InstallFunction.pipe(Operation.lazyHandler(() => import('./install-function'))),
]);
