//
// Copyright 2025 DXOS.org
//

import { LayoutOperation } from '@dxos/app-toolkit';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export const AttentionOperationHandlerSet = OperationHandlerSet.keyed([
  [LayoutOperation.Select, () => import('./select')],
]);
