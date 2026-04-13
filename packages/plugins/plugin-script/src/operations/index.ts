//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as ScriptOperation from './definitions';

export const ScriptOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./access-token-created'),
  () => import('./create-script'),
);
