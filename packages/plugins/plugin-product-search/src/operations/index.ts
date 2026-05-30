//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const SearchOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./render-page'),
  () => import('./run-search'),
  () => import('./run-provider-search'),
  () => import('./analyze-provider'),
  () => import('./set-provider-template'),
  () => import('./generate-provider-template'),
);
