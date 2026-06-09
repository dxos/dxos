//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const VideoOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./transcribe'),
  () => import('./fetch-description'),
);
