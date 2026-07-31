//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { RegisterOAuthRecovery } from './definitions';
import { RedeemOAuthRecovery } from './definitions';
import { ImportExemplarSpace } from './definitions';
import { CompleteOAuthRegistration } from './definitions';

export * as OnboardingOperation from './definitions';

export const OnboardingOperationHandlerSet = OperationHandlerSet.keyed([
  [CompleteOAuthRegistration, () => import('./complete-oauth-registration')],
  [ImportExemplarSpace, () => import('./import-exemplar-space')],
  [RedeemOAuthRecovery, () => import('./redeem-oauth-recovery')],
  [RegisterOAuthRecovery, () => import('./register-oauth-recovery')],
]);
