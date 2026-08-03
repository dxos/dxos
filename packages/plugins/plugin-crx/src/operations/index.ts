//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as CrxOperation from '../types/CrxOperation';

export const CrxOperationHandlerSet = OperationHandlerSet.keyed([
  [CrxOperation.AddPersonFromSnapshot, () => import('./add-person-from-snapshot')],
  [CrxOperation.AddOrganizationFromSnapshot, () => import('./add-organization-from-snapshot')],
  [CrxOperation.AddNoteFromSnapshot, () => import('./add-note-from-snapshot')],
]);
