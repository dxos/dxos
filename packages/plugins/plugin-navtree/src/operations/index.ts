//
// Copyright 2025 DXOS.org
//

import { LayoutOperation } from '@dxos/app-toolkit';
import { OperationHandlerSet } from '@dxos/compute';

export const NavTreeOperationHandlerSet = OperationHandlerSet.keyed([
  [LayoutOperation.Expose, () => import('./expose')],
]);
