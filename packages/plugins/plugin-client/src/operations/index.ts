//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as ClientOperation from './definitions';
export * from './errors';

export const ClientOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-agent'),
  () => import('./create-identity'),
  () => import('./create-passkey'),
  () => import('./create-recovery-code'),
  () => import('./join-identity'),
  () => import('./open-usage'),
  () => import('./recover-identity'),
  () => import('./redeem-passkey'),
  () => import('./redeem-token'),
  () => import('./reset-storage'),
  () => import('./resolve-navigation-targets'),
  () => import('./share-identity'),
  () => import('./update-profile'),
);
