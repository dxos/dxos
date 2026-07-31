//
// Copyright 2025 DXOS.org
//

import { LayoutOperation } from '@dxos/app-toolkit';
import { OperationHandlerSet } from '@dxos/compute';

export const AttentionOperationHandlerSet = OperationHandlerSet.keyed([
  [LayoutOperation.Select, () => import('./select')],
]);
