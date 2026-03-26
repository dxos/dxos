//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as ClientOperation from './definitions';

export const ClientOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-agent'),
  () => import('./create-identity'),
  () => import('./create-passkey'),
  () => import('./create-recovery-code'),
  () => import('./join-identity'),
  () => import('./recover-identity'),
  () => import('./redeem-passkey'),
  () => import('./redeem-token'),
  () => import('./reset-storage'),
  () => import('./share-identity'),
);
