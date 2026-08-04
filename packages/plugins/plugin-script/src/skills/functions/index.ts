//
// Copyright 2025 DXOS.org
//

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

export const ScriptHandlers = OperationHandlerSet.keyed([
  [Create, () => import('./create')],
  [Read, () => import('./read')],
  [Update, () => import('./update')],
  [Delete, () => import('./delete')],
  [Deploy, () => import('./deploy')],
  [Invoke, () => import('./invoke')],
  [InspectInvocations, () => import('./inspect-invocations')],
  [QueryDeployedFunctions, () => import('./query-deployed-functions')],
  [InstallFunction, () => import('./install-function')],
]);
