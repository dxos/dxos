//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as OnboardingOperation from './definitions';

export const OnboardingOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./complete-oauth-registration'),
  () => import('./import-exemplar-space'),
  () => import('./redeem-oauth-recovery'),
  () => import('./register-oauth-recovery'),
);
