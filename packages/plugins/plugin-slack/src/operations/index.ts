//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const SlackOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./get-slack-channels'),
  () => import('./sync'),
);
