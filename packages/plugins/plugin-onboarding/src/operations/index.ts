//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { RegisterOAuthRecovery } from './definitions';
import { RedeemOAuthRecovery } from './definitions';
import { ImportExemplarSpace } from './definitions';
import { CompleteOAuthRegistration } from './definitions';

export * as OnboardingOperation from './definitions';

export const OnboardingOperationHandlerSet = OperationHandlerSet.lazy([
  CompleteOAuthRegistration.pipe(Operation.lazyHandler(() => import('./complete-oauth-registration'))),
  ImportExemplarSpace.pipe(Operation.lazyHandler(() => import('./import-exemplar-space'))),
  RedeemOAuthRecovery.pipe(Operation.lazyHandler(() => import('./redeem-oauth-recovery'))),
  RegisterOAuthRecovery.pipe(Operation.lazyHandler(() => import('./register-oauth-recovery'))),
]);
