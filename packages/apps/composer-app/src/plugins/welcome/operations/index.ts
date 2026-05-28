//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as WelcomeOperation from './definitions';

export const WelcomeOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./redeem-oauth-recovery'),
  () => import('./register-oauth-recovery'),
);
