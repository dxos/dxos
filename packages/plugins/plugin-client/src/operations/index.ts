//
// Copyright 2025 DXOS.org
//

import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as ClientOperation from '../types/ClientOperation.ts';

export * as ClientOperation from '../types/ClientOperation.ts';

export const ClientOperationHandlerSet = OperationHandlerSet.lazy([
  ClientOperation.CreateAgent.pipe(Operation.lazyHandler(() => import('./create-agent.ts'))),
  ClientOperation.CreateIdentity.pipe(Operation.lazyHandler(() => import('./create-identity.ts'))),
  ClientOperation.CreatePasskey.pipe(Operation.lazyHandler(() => import('./create-passkey.ts'))),
  ClientOperation.CreateRecoveryCode.pipe(Operation.lazyHandler(() => import('./create-recovery-code.ts'))),
  ClientOperation.GrantServiceAccess.pipe(Operation.lazyHandler(() => import('./grant-service-access.ts'))),
  ClientOperation.JoinIdentity.pipe(Operation.lazyHandler(() => import('./join-identity.ts'))),
  ClientOperation.OpenUsage.pipe(Operation.lazyHandler(() => import('./open-usage.ts'))),
  ClientOperation.RecoverIdentity.pipe(Operation.lazyHandler(() => import('./recover-identity.ts'))),
  ClientOperation.RedeemPasskey.pipe(Operation.lazyHandler(() => import('./redeem-passkey.ts'))),
  ClientOperation.RedeemToken.pipe(Operation.lazyHandler(() => import('./redeem-token.ts'))),
  ClientOperation.ResetStorage.pipe(Operation.lazyHandler(() => import('./reset-storage.ts'))),
  ClientOperation.RevokeRecoveryCredential.pipe(Operation.lazyHandler(() => import('./revoke-recovery-credential.ts'))),
  ClientOperation.ShareIdentity.pipe(Operation.lazyHandler(() => import('./share-identity.ts'))),
  NavigationOperation.ResolveNavigationTargets.pipe(
    Operation.lazyHandler(() => import('./resolve-navigation-targets.ts')),
  ),
  ClientOperation.UpdateProfile.pipe(Operation.lazyHandler(() => import('./update-profile.ts'))),
]);
