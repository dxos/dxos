//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const LinearHandlers = OperationHandlerSet.lazy(
  () => import('./get-teams'),
  () => import('./sync'),
);

export * as LinearOperation from './definitions';
