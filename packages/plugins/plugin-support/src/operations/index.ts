//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const SupportOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./capture-feedback'),
  () => import('./create-ticket'),
  () => import('./hide-welcome'),
  () => import('./mark-in-progress'),
  () => import('./on-create-space'),
  () => import('./resolve-ticket'),
  () => import('./search-docs'),
  () => import('./start'),
);
