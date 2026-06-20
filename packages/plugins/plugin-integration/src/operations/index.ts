//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const IntegrationOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-integration'),
  () => import('./set-integration-targets'),
);
