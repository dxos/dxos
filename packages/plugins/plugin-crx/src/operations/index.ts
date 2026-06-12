//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const CrxOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-person-from-snapshot'),
  () => import('./add-organization-from-snapshot'),
  () => import('./add-note-from-snapshot'),
);
