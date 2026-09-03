//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { CrxOperation } from '#types';

export const CrxOperationHandlerSet = OperationHandlerSet.lazy([
  CrxOperation.AddPersonFromSnapshot.pipe(Operation.lazyHandler(() => import('./add-person-from-snapshot.ts'))),
  CrxOperation.AddOrganizationFromSnapshot.pipe(
    Operation.lazyHandler(() => import('./add-organization-from-snapshot.ts')),
  ),
  CrxOperation.AddNoteFromSnapshot.pipe(Operation.lazyHandler(() => import('./add-note-from-snapshot.ts'))),
]);
