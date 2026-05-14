//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const SupportOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-ticket'),
  () => import('./resolve-ticket'),
  () => import('./search-docs'),
);
