//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as AutomationOperation from './definitions';

export const AutomationOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-trigger-from-template'),
);
