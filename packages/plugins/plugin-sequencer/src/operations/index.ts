//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const SequencerOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./read'),
  () => import('./write'),
);
