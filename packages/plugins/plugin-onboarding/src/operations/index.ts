//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { RegisterOAuthRecovery } from './definitions.ts';
import { RedeemOAuthRecovery } from './definitions.ts';
import { ImportSampleSpace } from './definitions.ts';
import { CompleteOAuthRegistration } from './definitions.ts';

export * as OnboardingOperation from './definitions.ts';

export const OnboardingOperationHandlerSet = OperationHandlerSet.lazy([
  CompleteOAuthRegistration.pipe(Operation.lazyHandler(() => import('./complete-oauth-registration.ts'))),
  ImportSampleSpace.pipe(Operation.lazyHandler(() => import('./import-sample-space.ts'))),
  RedeemOAuthRecovery.pipe(Operation.lazyHandler(() => import('./redeem-oauth-recovery.ts'))),
  RegisterOAuthRecovery.pipe(Operation.lazyHandler(() => import('./register-oauth-recovery.ts'))),
]);
