//
// Copyright 2025 DXOS.org
//

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export const AttentionOperationHandlerSet = OperationHandlerSet.lazy([
  LayoutOperation.Select.pipe(Operation.lazyHandler(() => import('./select.ts'))),
]);
