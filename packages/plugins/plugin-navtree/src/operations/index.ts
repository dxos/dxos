//
// Copyright 2025 DXOS.org
//

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export const NavTreeOperationHandlerSet = OperationHandlerSet.keyed([
  [LayoutOperation.Expose, () => import('./expose')],
]);
