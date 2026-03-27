// Copyright 2025 DXOS.org

import { OperationHandlerSet } from '@dxos/operation';

export * as MeetingOperation from './definitions';

export const MeetingOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./handle-payload'),
  () => import('./set-active'),
  () => import('./summarize'),
);
