//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const SlackHandlers = OperationHandlerSet.lazy(
  () => import('./get-slack-channels'),
  () => import('./sync'),
);

export * as SlackOperation from './definitions';
