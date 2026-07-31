//
// Copyright 2025 DXOS.org
//

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export const AttentionOperationHandlerSet = OperationHandlerSet.keyed([
  [LayoutOperation.Select, () => import('./select')],
]);
