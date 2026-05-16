//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const ScriptOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./access-token-created'),
  () => import('./create-script'),
);
