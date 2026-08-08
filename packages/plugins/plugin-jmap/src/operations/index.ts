//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const JmapOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./mail/materialize/handler'),
  () => import('./mail/send'),
  () => import('./mail/sync'),
);
