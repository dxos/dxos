//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as CrxOperation from '../types/CrxOperation';

export const CrxOperationHandlerSet = OperationHandlerSet.lazy([
  CrxOperation.AddPersonFromSnapshot.pipe(Operation.lazyHandler(() => import('./add-person-from-snapshot'))),
  CrxOperation.AddOrganizationFromSnapshot.pipe(
    Operation.lazyHandler(() => import('./add-organization-from-snapshot')),
  ),
  CrxOperation.AddNoteFromSnapshot.pipe(Operation.lazyHandler(() => import('./add-note-from-snapshot'))),
]);
